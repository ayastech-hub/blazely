import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ExternalLink, Filter } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";

/* -------------------- Telemetry Helpers -------------------- */
const formatNumber = (num) => {
  const n = Number(num);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatTimeAgo = (isoDate, nowTs) => {
  if (!isoDate) return "-";
  const txDate = new Date(isoDate.replace(" ", "T") + "Z").getTime();
  const seconds = Math.floor(Math.max(0, nowTs - txDate) / 1000);
  if (seconds < 60) return seconds + "s";
  return Math.floor(seconds / 60) + "m";
};

/* -------------------- Main Component -------------------- */
export default function RecentTransactions({ tokenAddress, creatorAddress }) {
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState("all"); // all | buy | sell
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchTxs = useCallback(async () => {
    if (!tokenAddress) return;
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("id, tx_hash, type, token_amount, usd_value, created_at, user_address")
      .eq("token_address", tokenAddress.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(10);

    if (filter !== "all") query = query.eq("type", filter);
    
    const { data } = await query;
    setTxs(data || []);
    setLoading(false);
  }, [tokenAddress, filter]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  return (
    <div className="font-mono text-[10px] bg-[#030712] border border-slate-900 overflow-hidden">
      
      {/* TERMINAL HEADER & FILTER */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-900 bg-[#0b0f19]/50">
        <h3 className="font-bold text-slate-400 tracking-wider">LATEST_EXECUTIONS</h3>
        <div className="flex items-center gap-1 bg-[#030712] rounded border border-slate-800 p-0.5">
          {["all", "buy", "sell"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 uppercase font-bold transition-all ${filter === f ? "bg-slate-800 text-cyan-400" : "text-slate-600 hover:text-slate-300"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* COMPACT TABLE */}
      <table className="w-full text-left">
        <thead>
          <tr className="text-slate-600 border-b border-slate-900/50 uppercase">
            <th className="px-2 py-1.5 font-normal">Account</th>
            <th className="px-2 py-1.5 font-normal">Side</th>
            <th className="px-2 py-1.5 font-normal text-right">USD</th>
            <th className="px-2 py-1.5 font-normal text-right">Tokens</th>
            <th className="px-2 py-1.5 font-normal text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900/30">
          {txs.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-900/20">
              <td className="px-2 py-1.5 font-medium text-slate-400">
                {tx.user_address.slice(0, 4)}..{tx.user_address.slice(-4)}
              </td>
              <td className={`px-2 py-1.5 font-bold ${tx.type === "buy" ? "text-emerald-500" : "text-rose-500"}`}>
                {tx.type.toUpperCase()}
              </td>
              <td className="px-2 py-1.5 text-right text-slate-300">${formatNumber(tx.usd_value)}</td>
              <td className="px-2 py-1.5 text-right text-slate-400">{formatNumber(tx.token_amount)}</td>
              <td className="px-2 py-1.5 text-right text-slate-600">{formatTimeAgo(tx.created_at, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
