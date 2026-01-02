import { useState, useEffect } from "react";

export function useTokenStats(chain, address) {
  const [stats, setStats] = useState({
    priceUsd: 0,
    marketCap: 0,
    volume24h: 0,
    liquidityUsd: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!chain || !address) return;

    async function fetchStats() {
      try {
        const url = `https://api.dexscreener.com/token-pairs/v1/${chain}/${address}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No pairs available for this token");
        }

        // pick the pair with the highest liquidity (safest)
        const bestPair = data.reduce(
          (prev, curr) =>
            (curr.liquidity?.usd ?? 0) > (prev.liquidity?.usd ?? 0)
              ? curr
              : prev,
          data[0]
        );

        setStats({
          priceUsd: bestPair.priceUsd ?? 0,
          marketCap: bestPair.marketCapUsd ?? 0,
          volume24h: bestPair.volumeUsd ?? 0,
          liquidityUsd: bestPair.liquidity?.usd ?? 0,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Dexscreener fetch error:", err);
        setStats((s) => ({
          ...s,
          loading: false,
          error: err.message,
        }));
      }
    }

    fetchStats();
  }, [chain, address]);

  return stats;
}
