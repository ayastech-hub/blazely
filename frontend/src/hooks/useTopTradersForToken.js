/**
 * =================================================================================
 * hooks/useTopTradersForToken.js
 * =================================================================================
 * The preview design's Top Traders table showed a PnL% column with fabricated numbers.
 * Real PnL requires a cost-basis methodology (FIFO vs. average-cost) — this is explicitly
 * flagged as NOT built anywhere in this stack yet (see indexer/ARCHITECTURE.md's documented
 * extension points from earlier in this project). Rather than show a fake number here too,
 * this ranks traders by trading volume for this specific token instead, which IS something
 * we can compute correctly from real data. When PnL tracking is built, swap the ranking
 * metric here — the rest of the panel doesn't need to change.
 *
 * Aggregated client-side from this token's own `transactions` rows. Fine at the trade
 * volumes a single token will see; if this ever needs to scale to a very high-volume token,
 * move the aggregation into a SQL function (same pattern as the indexer's `top_traders_by_volume`
 * materialized view, just scoped to one token instead of platform-wide).
 * =================================================================================
 */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTopTradersForToken(tokenAddress) {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function load() {
      setLoading(true);
      // Bounded fetch — a genuinely huge trade count for one token would want a SQL-side
      // aggregation instead of pulling every row down to the browser.
      const { data, error } = await supabase
        .from("transactions")
        .select("user_address, type, eth_amount")
        .eq("token_address", normalized)
        .in("type", ["buy", "sell"])
        .limit(20000);

      if (cancelled) return;
      if (error) {
        console.error("[useTopTradersForToken] fetch failed:", error.message);
        setTraders([]);
        setLoading(false);
        return;
      }

      const byWallet = new Map();
      for (const row of data || []) {
        const key = row.user_address;
        const entry = byWallet.get(key) || { wallet: key, buys: 0, sells: 0, bought: 0, sold: 0 };
        const ethAmount = Number(row.eth_amount) || 0;
        if (row.type === "buy") {
          entry.buys += 1;
          entry.bought += ethAmount;
        } else {
          entry.sells += 1;
          entry.sold += ethAmount;
        }
        byWallet.set(key, entry);
      }

      const ranked = Array.from(byWallet.values())
        .map((t) => ({ ...t, totalVolume: t.bought + t.sold }))
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 20)
        .map((t, i) => ({ ...t, rank: i + 1 }));

      setTraders(ranked);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  return { traders, loading };
}
