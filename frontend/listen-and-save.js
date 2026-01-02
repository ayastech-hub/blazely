/**
 * listen-and-save.js
 *
 * Backfill + realtime listener for Bought / Sold events of BlazelyLaunchpad,
 * compute USD value via contract.getPriceUsd(token) and upsert into Supabase.
 *
 * Env vars:
 *  SUPABASE_URL               - your supabase project URL
 *  SUPABASE_KEY               - Supabase SERVICE_ROLE key (server key)
 *  RPC_HTTP                   - HTTP RPC endpoint (https://...)
 *  RPC_WS                     - WebSocket RPC endpoint (wss://...)
 *  CONTRACT_ADDRESS           - deployed BlazelyLaunchpad address
 *  START_BLOCK                - block to start backfill from (e.g. deployment block)
 *  END_BLOCK                  - optional end block for backfill (defaults to 'latest' dynamically)
 *  CHUNK_SIZE                 - block chunk size for backfill (default 5000)
 *  USD_THRESHOLD              - minimum USD to store (default 5)
 *  BACKFILL_ONLY              - if 'true' then run backfill and exit
 */

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RPC_HTTP = process.env.RPC_HTTP;
const RPC_WS = process.env.RPC_WS;
const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS || "").trim();
const START_BLOCK = Number(process.env.START_BLOCK || 0);
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE || 5000);
const USD_THRESHOLD = Number(process.env.USD_THRESHOLD || 5);
const BACKFILL_ONLY =
  String(process.env.BACKFILL_ONLY || "false").toLowerCase() === "true";

if (
  !SUPABASE_URL ||
  !SUPABASE_KEY ||
  !RPC_HTTP ||
  !RPC_WS ||
  !CONTRACT_ADDRESS
) {
  console.error(
    "Missing required env vars. Set SUPABASE_URL, SUPABASE_KEY, RPC_HTTP, RPC_WS, CONTRACT_ADDRESS."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const abi = [
  "event Bought(address indexed token, address buyer, uint256 ethIn, uint256 tokensOut)",
  "event Sold(address indexed token, address seller, uint256 tokensIn, uint256 ethOut)",
  "function getPriceUsd(address token) view returns (uint256)",
];

const httpProvider = new ethers.JsonRpcProvider(RPC_HTTP);
const wsProvider = new ethers.WebSocketProvider(RPC_WS);

const contractHttp = new ethers.Contract(CONTRACT_ADDRESS, abi, httpProvider);
const contractWs = new ethers.Contract(CONTRACT_ADDRESS, abi, wsProvider);

/** Convert BigNumber tokenAmount and priceUsdScaled (1e18) => usd decimal string with 6 decimals
 *  usd = tokenAmount * priceUsdScaled / 1e36
 */
function computeUsdFromToken(tokenAmountBn, priceUsdScaledBn) {
  const BN = ethers.BigNumber;
  const SCALE = BN.from("10").pow(18); // 1e18
  const SCALE36 = SCALE.mul(SCALE); // 1e36

  if (priceUsdScaledBn.isZero() || tokenAmountBn.isZero()) return "0";

  const numerator = tokenAmountBn.mul(priceUsdScaledBn); // big integer
  const intPart = numerator.div(SCALE36);
  const rem = numerator.mod(SCALE36);

  // produce 6 fractional digits
  const fracDigits = 6;
  const fracScale = BN.from("10").pow(36 - fracDigits); // 10^(36-6)
  const frac = rem.div(fracScale).toString().padStart(fracDigits, "0");

  return `${intPart.toString()}.${frac}`;
}

/** Convert wei BigNumber -> decimal string ETH with 18 decimals (kept as string) */
function bnWeiToEthString(weiBn) {
  return ethers.utils.formatUnits(weiBn, 18);
}

/** Upsert tx row into supabase (uses tx_hash as unique key) */
async function upsertTransaction(row) {
  // ensure lowercased addresses
  if (row.address) row.address = row.address.toLowerCase();
  if (row.user_address) row.user_address = row.user_address.toLowerCase();

  const insertRow = {
    tx_hash: row.tx_hash,
    address: row.address,
    user_address: row.user_address,
    type: row.type,
    token_amount: row.token_amount, // integer string
    eth_amount: row.eth_amount, // decimal ETH string
    usd_value: row.usd_value, // decimal USD string (6 decimals)
    price_source: row.price_source || "launchpad_getPriceUsd",
    block_number: row.block_number,
  };

  const { error } = await supabase
    .from("transactions")
    .upsert([insertRow], { onConflict: "tx_hash" });

  if (error) {
    console.error("Supabase upsert error:", error);
    return false;
  }
  return true;
}

/** Process Bought event log */
async function processBoughtEvent(log) {
  try {
    const parsed = contractHttp.interface.parseLog(log);
    const { token, buyer, ethIn, tokensOut } = parsed.args;

    // get block details
    const block = await httpProvider.getBlock(log.blockNumber);
    const timestamp = block.timestamp;

    // get price per token (scaled 1e18)
    let priceUsdScaledBn;
    try {
      priceUsdScaledBn = await contractHttp.getPriceUsd(token);
    } catch (err) {
      console.warn(
        "getPriceUsd failed for",
        token,
        " — skipping event:",
        err.message || err
      );
      return; // skip if we cannot compute price
    }

    const usdStr = computeUsdFromToken(tokensOut, priceUsdScaledBn);
    const usdNum = Number(usdStr);

    if (usdNum < USD_THRESHOLD) {
      console.log(
        `Skipping Bought ${log.transactionHash} USD=${usdStr} < ${USD_THRESHOLD}`
      );
      return;
    }

    const row = {
      tx_hash: log.transactionHash,
      address: token,
      user_address: buyer,
      type: "buy",
      token_amount: tokensOut.toString(),
      eth_amount: bnWeiToEthString(ethIn),
      usd_value: usdStr,
      price_source: "launchpad_getPriceUsd",
      block_number: log.blockNumber,
      created_at: new Date(timestamp * 1000).toISOString(),
    };

    const ok = await upsertTransaction(row);
    if (ok) console.log("Saved Bought:", log.transactionHash, "usd=", usdStr);
  } catch (err) {
    console.error("processBoughtEvent error:", err);
  }
}

/** Process Sold event log */
async function processSoldEvent(log) {
  try {
    const parsed = contractHttp.interface.parseLog(log);
    const { token, seller, tokensIn, ethOut } = parsed.args;

    const block = await httpProvider.getBlock(log.blockNumber);
    const timestamp = block.timestamp;

    // get price per token (scaled 1e18)
    let priceUsdScaledBn;
    try {
      priceUsdScaledBn = await contractHttp.getPriceUsd(token);
    } catch (err) {
      console.warn(
        "getPriceUsd failed for",
        token,
        " — skipping event:",
        err.message || err
      );
      return;
    }

    const usdStr = computeUsdFromToken(tokensIn, priceUsdScaledBn);
    const usdNum = Number(usdStr);

    if (usdNum < USD_THRESHOLD) {
      console.log(
        `Skipping Sold ${log.transactionHash} USD=${usdStr} < ${USD_THRESHOLD}`
      );
      return;
    }

    const row = {
      tx_hash: log.transactionHash,
      address: token,
      user_address: seller,
      type: "sell",
      token_amount: tokensIn.toString(),
      eth_amount: bnWeiToEthString(ethOut),
      usd_value: usdStr,
      price_source: "launchpad_getPriceUsd",
      block_number: log.blockNumber,
      created_at: new Date(timestamp * 1000).toISOString(),
    };

    const ok = await upsertTransaction(row);
    if (ok) console.log("Saved Sold:", log.transactionHash, "usd=", usdStr);
  } catch (err) {
    console.error("processSoldEvent error:", err);
  }
}

/** Backfill logs for event filter between blocks (handles chunking) */
async function backfillBoughtAndSold(fromBlock) {
  const latest = await httpProvider.getBlockNumber();
  let toBlock = latest;
  console.log(
    `Starting backfill from block ${fromBlock} to ${toBlock} (latest)`
  );

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
    console.log(`Fetching logs ${start}..${end}`);
    try {
      // Bought filter
      const boughtFilter = contractHttp.filters.Bought();
      boughtFilter.fromBlock = start;
      boughtFilter.toBlock = end;
      const boughtLogs = await httpProvider.getLogs(boughtFilter);
      for (const log of boughtLogs) {
        await processBoughtEvent(log);
      }

      // Sold filter
      const soldFilter = contractHttp.filters.Sold();
      soldFilter.fromBlock = start;
      soldFilter.toBlock = end;
      const soldLogs = await httpProvider.getLogs(soldFilter);
      for (const log of soldLogs) {
        await processSoldEvent(log);
      }
    } catch (err) {
      console.error(`Backfill chunk ${start}-${end} error:`, err);
      // continue on error but you may want to retry or reduce CHUNK_SIZE
    }
  }

  console.log("Backfill completed.");
}

/** Set up realtime listeners on websocket provider */
function startRealtimeListeners() {
  console.log("Registering real-time listeners (websocket)...");
  contractWs.on("Bought", async (token, buyer, ethIn, tokensOut, event) => {
    try {
      // event is the last arg
      const log = event; // ethers gives event-like object
      console.log("Realtime Bought event:", log.transactionHash);
      // process using the log object (we need blockNumber etc)
      await processBoughtEvent(log);
    } catch (err) {
      console.error("Realtime Bought handler error:", err);
    }
  });

  contractWs.on("Sold", async (token, seller, tokensIn, ethOut, event) => {
    try {
      const log = event;
      console.log("Realtime Sold event:", log.transactionHash);
      await processSoldEvent(log);
    } catch (err) {
      console.error("Realtime Sold handler error:", err);
    }
  });

  wsProvider._websocket.on("close", (code) => {
    console.error("WS closed:", code, "attempting reconnect...");
    setTimeout(() => {
      // quick reconnect by reinitializing provider & contract
      process.exit(1); // rely on process manager (pm2/systemd) to restart, or implement reconnection logic
    }, 2000);
  });

  wsProvider._websocket.on("error", (err) => {
    console.error("WS error:", err);
  });

  console.log("Realtime listeners registered.");
}

/** Entrypoint */
(async () => {
  try {
    // sanity: ensure table exists? (assume you ran SQL). Could optionally check.
    const fromBlock = START_BLOCK || 0;
    await backfillBoughtAndSold(fromBlock);

    if (BACKFILL_ONLY) {
      console.log("Backfill-only mode; exiting.");
      process.exit(0);
    }

    startRealtimeListeners();
    console.log("Listener running — will save qualifying events to Supabase.");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
