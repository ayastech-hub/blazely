/**
 * =================================================================================
 * components/TopHolders.jsx
 * =================================================================================
 * BUG IN THE OLD VERSION: this component required a `providerUrl` prop to do anything —
 * `if (!tokenAddress || !providerUrl) return;` — but TokenInfoPage.jsx called it as
 * `<TopHolders tokenAddress={token.address} />`, never passing `providerUrl`. That guard
 * silently short-circuited every single time; this component never actually fetched
 * anything in production. On top of that, the on-chain approach (re-scanning the ENTIRE
 * Transfer event history from block 0 via `queryFilter`, every time the component mounts)
 * would have been extremely slow and RPC-expensive even once fixed.
 *
 * FIXED: reads directly from `token_holder_balances`, the table your indexer project
 * already maintains in real time (see indexer/FRONTEND_GUIDE.md, section 4) — a single
 * indexed query, no RPC calls, no full history scan, no missing-prop foot-gun.
 * =================================================================================
 */

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { shortenAddress, explorerAddressUrl, formatCompact } from "../utils/format";

const TOP_N = 20;

export default function TopHolders({ tokenAddress, circulatingSupply }) {
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function fetchHolders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("token_holder_balances")
        .select("wallet_address, balance")
        .eq("token_address", normalized)
        .order("balance", { ascending: false })
        .limit(TOP_N);

      if (!cancelled) {
        if (error) {
          console.error("[TopHolders] fetch failed:", error.message);
          setHolders([]);
        } else {
          setHolders(data || []);
        }
        setLoading(false);
      }
    }

    fetchHolders();

    // Holder balances change on every transfer — refetch the top list when any row for
    // this token changes, rather than trying to patch individual rows client-side (the
    // ranking itself can change on any update, so a full refetch of the top 20 is simpler
    // and cheap at this scale).
    const channel = supabase
      .channel(`holders-${normalized}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_holder_balances", filter: `token_address=eq.${normalized}` },
        () => fetchHolders()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tokenAddress]);

  if (!tokenAddress) {
    return (
      <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest py-4">
        NULL DESCRIPTOR // TARGET_ADDRESS_MISSING
      </div>
    );
  }

  if (loading) {
    return (
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest py-4 animate-pulse">
        SYNCHRONIZING_LEDGER_BALANCES...
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest py-4 border border-dashed border-slate-900/60 bg-[#0b0f19]/10 text-center">
        NULL DESCRIPTOR // NO DISTRIBUTION DATA AVAILABLE
      </div>
    );
  }

  const supply = Number(circulatingSupply) || null;

  return (
    <div className="font-mono text-xs bg-[#0b0f19]/40 p-3 rounded-sm border border-slate-900 text-slate-300">
      <div className="flex justify-between items-end mb-2.5 border-b border-slate-900 pb-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
        <span>DISTRIBUTION_INDEX</span>
        <span>{supply ? "% SUPPLY" : "BALANCE"}</span>
      </div>

      <div className="divide-y divide-slate-900/40 max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
        {holders.map((h, i) => {
          const rank = String(i + 1).padStart(2, "0");
          const pct = supply ? ((Number(h.balance) / supply) * 100).toFixed(2) : null;
          return (
            <div
              key={h.wallet_address}
              className="flex items-center justify-between py-1.5 hover:bg-[#0b0f19]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 font-bold">[{rank}]</span>
                <a
                  href={explorerAddressUrl(h.wallet_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-slate-100 underline decoration-slate-900 hover:decoration-slate-700 uppercase tracking-wide transition-colors"
                >
                  {shortenAddress(h.wallet_address)}
                </a>
              </div>
              <div style={{ color: i === 0 ? "#96d6cd" : "" }} className="font-bold text-right text-slate-200">
                {pct !== null ? `${pct}%` : formatCompact(h.balance)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
