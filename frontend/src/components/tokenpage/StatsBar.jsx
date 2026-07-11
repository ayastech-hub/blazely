/**
 * components/tokenpage/StatsBar.jsx
 * The preview's stats bar had a fabricated "NET VOL" figure. This computes real 24h buy/sell
 * counts and ETH volume from `transactions` directly — the one thing worth flagging: this is
 * a live client-side query over the last 24h of trades for this token, not a pre-aggregated
 * column (there's no `volume_24h` rollup in this schema yet, same gap flagged in the indexer
 * project's ARCHITECTURE.md). Fine at normal trade volumes; would want a SQL-side rollup if a
 * single token racks up an extreme number of trades in a day.
 */
import React, { useEffect, useState } from "react";
import { C } from "../../utils/designTokens";
import { supabase } from "../../lib/supabaseClient";

export default function StatsBar({ tokenAddress }) {
  const [stats, setStats] = useState({ buys: 0, sells: 0, buyVolume: 0, sellVolume: 0 });

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function load() {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("transactions")
        .select("type, eth_amount")
        .eq("token_address", normalized)
        .gte("created_at", since)
        .in("type", ["buy", "sell"])
        .limit(20000);

      if (cancelled) return;
      if (error) {
        console.error("[StatsBar] fetch failed:", error.message);
        return;
      }

      let buys = 0, sells = 0, buyVolume = 0, sellVolume = 0;
      for (const row of data || []) {
        const eth = Number(row.eth_amount) || 0;
        if (row.type === "buy") { buys++; buyVolume += eth; }
        else { sells++; sellVolume += eth; }
      }
      setStats({ buys, sells, buyVolume, sellVolume });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  const netVol = stats.buyVolume - stats.sellVolume;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 14px", background: C.panel, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
      {[
        { l: "24H BUYS", v: `${stats.buys} / ${stats.buyVolume.toFixed(2)} ETH`, c: C.teal },
        { l: "24H SELLS", v: `${stats.sells} / ${stats.sellVolume.toFixed(2)} ETH`, c: C.red },
        { l: "24H NET", v: `${netVol >= 0 ? "+" : ""}${netVol.toFixed(2)} ETH`, c: netVol >= 0 ? C.teal : C.red },
      ].map(({ l, v, c }) => (
        <div key={l}>
          <div style={{ color: C.dim, fontSize: 7, marginBottom: 2, fontFamily: C.mono, letterSpacing: "0.08em" }}>{l}</div>
          <div style={{ fontWeight: 700, color: c, fontSize: 10, fontFamily: C.mono }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
