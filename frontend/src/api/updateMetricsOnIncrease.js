/**
 * updateMetricsOnIncrease.js
 *
 * Usage:
 *   npm i node-fetch @supabase/supabase-js dotenv
 *   node updateMetricsOnIncrease.js
 *
 * This script:
 *  - fetches tokens (with pair_address or some price source)
 *  - queries Dexscreener for price/volume/liquidity
 *  - computes marketcap = price * (total_supply / 10**decimals)
 *  - updates Supabase only when marketcap or volume_24h increases
 *
 * NOTE: Run server-side only. Use SUPABASE_SERVICE_KEY env var.
 */

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPA_URL = process.env.SUPABASE_URL; // e.g. https://xxxxx.supabase.co
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key (secret)

if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

const DEXSCREENER_CHAIN = "ethereum"; // change to 'base' or the chain slug you use if needed

// helper: sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// fetch token price/volume/liquidity from dexscreener (example)
// expects pairAddress for the token pair used for pricing
async function fetchDexMetrics(pairAddress) {
  if (!pairAddress) return null;
  try {
    const url = `https://api.dexscreener.com/latest/dex/pairs/${DEXSCREENER_CHAIN}/${pairAddress}`;
    const r = await fetch(url);
    if (!r.ok) {
      console.warn("Dexscreener HTTP", r.status, await r.text());
      return null;
    }
    const json = await r.json();
    // dexscreener returns either pair or pairs; adapt defensively:
    const pair =
      json.pair || (Array.isArray(json.pairs) && json.pairs[0]) || null;
    if (!pair) return null;
    const price = Number(pair.priceUsd ?? pair.priceUsdChange?.priceUsd ?? 0);
    const volume24 = Number(pair.volumeUsd ?? pair.volumeUsd24h ?? 0);
    const liquidityUsd = Number(pair.liquidityUsd ?? 0);
    return { price, volume24, liquidityUsd };
  } catch (err) {
    console.error("fetchDexMetrics err", err);
    return null;
  }
}

// compute market cap from price and totalSupply (string/number) and decimals
function computeMarketCap(priceUsd, totalSupplyRaw, decimals = 18) {
  if (!priceUsd || !totalSupplyRaw) return 0;
  // Accept totalSupply as string like "1000000000000000000000000"
  const supplyNum = Number(totalSupplyRaw) / Math.pow(10, decimals);
  if (!isFinite(supplyNum)) return 0;
  return priceUsd * supplyNum;
}

async function main() {
  try {
    // Fetch tokens to update. Select fields you need; limit to avoid rate limit bursts.
    // You must have a column like 'pair_address' or 'price_source' to query Dexscreener.
    const { data: tokens, error } = await supabase
      .from("tokens")
      .select(
        "id, address, pair_address, total_supply, decimals, marketcap_usd, market_cap, volume_24h, price_usd"
      )
      .limit(200);

    if (error) {
      console.error("Failed to fetch tokens:", error);
      return;
    }
    if (!tokens || tokens.length === 0) {
      console.log("No tokens returned from DB");
      return;
    }

    console.log(`Fetched ${tokens.length} tokens; processing...`);

    for (const t of tokens) {
      try {
        // Rate-limit: small sleep between API calls to dexscreener
        await sleep(400); // 400ms between requests ~ 2.5 req/s (adjust to your API limits)

        // Choose pair_address or other price source. If missing, skip or handle separately
        const pairAddress = t.pair_address || t.pair || null;
        if (!pairAddress) {
          console.log(`Skipping ${t.address} (no pair_address)`);
          continue;
        }

        const metrics = await fetchDexMetrics(pairAddress);
        if (!metrics) {
          console.log(`No metrics for ${t.address} / pair ${pairAddress}`);
          continue;
        }

        const priceUsd = metrics.price || 0;
        const volume24h = metrics.volume24 || 0;
        const liquidityUsd = metrics.liquidityUsd || 0;

        // compute market cap using total_supply and decimals if present
        const marketcapUsd = computeMarketCap(
          priceUsd,
          t.total_supply ?? "0",
          t.decimals ?? 18
        );

        // decide if update is needed (only update if increase)
        const oldMarket = Number(t.marketcap_usd ?? t.market_cap ?? 0);
        const oldVol = Number(t.volume_24h ?? t.volume24h ?? 0);

        const shouldUpdateMarket = marketcapUsd > oldMarket + 0; // strictly greater
        const shouldUpdateVolume = volume24h > oldVol + 0; // strictly greater

        if (!shouldUpdateMarket && !shouldUpdateVolume) {
          console.log(
            `No increase for ${t.address} (market ${oldMarket} -> ${marketcapUsd}, vol ${oldVol} -> ${volume24h})`
          );
          continue;
        }

        // Build update object
        const updates = { id: t.id };
        if (shouldUpdateMarket) {
          updates.marketcap_usd = marketcapUsd;
          updates.market_cap = marketcapUsd;
          updates.price_usd = priceUsd;
        }
        if (shouldUpdateVolume) {
          updates.volume_24h = volume24h;
        }
        if (liquidityUsd) updates.liquidity_usd = liquidityUsd;
        updates.updated_at = new Date().toISOString();

        // Perform update (use .update to only update existing row by id)
        const { error: upErr } = await supabase
          .from("tokens")
          .update(updates)
          .eq("id", t.id);
        if (upErr) {
          console.error("Upsert failed for", t.address, upErr);
        } else {
          console.log(
            `Updated ${t.address}: market increased? ${shouldUpdateMarket} volume increased? ${shouldUpdateVolume}`
          );
        }
      } catch (inner) {
        console.error("Error processing token", t.address, inner);
      }
    }

    console.log("Worker run complete");
  } catch (err) {
    console.error("Main worker error", err);
  }
}

// run
main();
