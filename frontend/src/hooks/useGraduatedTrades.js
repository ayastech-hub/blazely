/**
 * hooks/useGraduatedTrades.js
 *
 * Task 3 (graduated token restructure): a graduated token's transaction feed
 * needs to show BOTH halves of its life —
 *   1. pre-graduation history: bonding-curve Bought/Sold events, already
 *      indexed into Supabase `transactions` by listen-and-save.js. Reused
 *      as-is via useTokenTrades (same source the standard TradesPanel uses).
 *   2. post-graduation swaps: once the token migrates, trading moves to a
 *      Uniswap V2 pair that our own indexer doesn't watch yet (see "Known
 *      unimplemented features" — post-migration price updates). Until that
 *      indexing exists, this hook reads Swap events directly from the pair
 *      contract over RPC and normalizes them into the same row shape as a
 *      `transactions` record, so both sources can render in one list with
 *      the existing TradesPanel UI.
 *
 * Both sources are merged and re-sorted by time, newest first.
 */
import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { useTokenTrades } from "./useTokenTrades";

const PAIR_ABI = [
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

const RPC_URL = import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org";
const SWAP_LOOKBACK_BLOCKS = 50_000; // ~a few days on Base; enough for a recent-activity feed

export function useGraduatedTrades(tokenAddress, pairAddress, { graduated } = {}) {
  const { trades: curveTrades, loading: curveLoading } = useTokenTrades(tokenAddress);
  const [swaps, setSwaps] = useState([]);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [swapsError, setSwapsError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!graduated || !pairAddress || !tokenAddress) {
      setSwaps([]);
      return;
    }
    let cancelled = false;

    async function loadSwaps() {
      setSwapsLoading(true);
      setSwapsError(null);
      try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const [token0] = await Promise.all([pair.token0()]);
        const tokenIsToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();

        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - SWAP_LOOKBACK_BLOCKS);
        const filter = pair.filters.Swap();
        const rawLogs = await pair.queryFilter(filter, fromBlock, latestBlock);

        const normalized = await Promise.all(
          rawLogs.slice(-100).reverse().map(async (log) => {
            const { amount0In, amount1In, amount0Out, amount1Out, to } = log.args;
            // If the token is token0: buying the token means it flows OUT of
            // the pair as amount0Out (trader pays the paired asset in as amount1In).
            const tokenOut = tokenIsToken0 ? amount0Out : amount1Out;
            const tokenIn = tokenIsToken0 ? amount0In : amount1In;
            const pairedOut = tokenIsToken0 ? amount1Out : amount0Out;
            const pairedIn = tokenIsToken0 ? amount1In : amount0In;

            const isBuy = tokenOut.gt(0);
            const block = await log.getBlock();

            return {
              id: `uniswap-${log.transactionHash}-${log.logIndex}`,
              tx_hash: log.transactionHash,
              type: isBuy ? "buy" : "sell",
              token_amount: (isBuy ? tokenOut : tokenIn).toString(),
              eth_amount: (isBuy ? pairedIn : pairedOut).toString(),
              usd_value: null, // requires a paired-asset USD price feed — left for the metrics layer (Dexscreener) to surface, not fabricated here
              created_at: new Date(block.timestamp * 1000).toISOString(),
              user_address: to,
              source: "uniswap",
            };
          })
        );

        if (!cancelled && mountedRef.current) {
          setSwaps(normalized);
        }
      } catch (err) {
        console.error("[useGraduatedTrades] Uniswap swap fetch failed:", err);
        if (!cancelled && mountedRef.current) setSwapsError(err.message);
      } finally {
        if (!cancelled && mountedRef.current) setSwapsLoading(false);
      }
    }

    loadSwaps();
    return () => { cancelled = true; };
  }, [graduated, pairAddress, tokenAddress]);

  const curveTagged = curveTrades.map((t) => ({ ...t, source: "curve" }));
  const merged = [...curveTagged, ...swaps].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    trades: merged,
    loading: curveLoading || swapsLoading,
    error: swapsError,
  };
}
