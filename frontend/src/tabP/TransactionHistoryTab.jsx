// src/components/TransactionHistoryTab.jsx
import React, { useEffect, useState, useCallback } from "react";
import { History, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const TransactionHistoryTab = ({
  loading = false,
  address = null,
  chainExplorerBase = "https://basescan.io/tx/",
  pageSize = 25,
  hideIfNoAddress = false,
}) => {
  const [rows, setRows] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchTxs = useCallback(
    async ({ reset = false } = {}) => {
      setError(null);
      if (!address) { setRows([]); return; }

      try {
        setLoadingTx(true);
        const from = reset ? 0 : page * pageSize;
        const walletLower = address.toLowerCase();

        // FIX: Modified matching filters using cross-case parameters to bridge mixed-case web3 address structures
        const { data, error: sbError } = await supabase
          .from("transactions")
          .select("tx_hash, block_number, created_at, token_address, user_address, type, token_amount, eth_amount")
          .or(`user_address.eq.${walletLower},user_address.eq.${address}`)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (sbError) throw sbError;

        if (reset) {
          setRows(data || []);
        } else {
          setRows((prev) => {
            const map = new Map(prev.map((r) => [r.tx_hash, r])); // Fixed key assignment map reference to use transaction hashes rather than timestamps
            (data || []).forEach((r) => map.set(r.tx_hash, r));
            return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          });
        }

        setHasMore((data || []).length === pageSize);
        setPage((p) => (reset ? 1 : p + 1));
      } catch (err) {
        setError(err.message || "Failed to load ledger stream.");
      } finally {
        setLoadingTx(false);
      }
    },
    [address, page, pageSize]
  );

  useEffect(() => {
    if (!address) { setRows([]); setPage(0); setHasMore(false); return; }
    setPage(0);
    fetchTxs({ reset: true });
  }, [address]);

  useEffect(() => {
    if (!address) return;

    const walletLower = address.toLowerCase();
    const channel = supabase
      .channel(`realtime-profile-${walletLower}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const tx = payload.new;
        if (tx.user_address?.toLowerCase() !== walletLower) return;

        setRows((prev) => {
          if (prev.some((r) => r.tx_hash === tx.tx_hash)) return prev;
          return [tx, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [address]);

  const formatShort = (s = "") => s && s.length > 10 ? `${s.slice(0, 4)}..${s.slice(-4)}` : s;
  
  // FIX: Fixed chronological calculation offsets by standardizing runtime values to pure UTC milliseconds
  const formatRelativeTime = (iso) => {
    if (!iso) return "-";
    const recordTime = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").getTime();
    const delta = Math.floor((Date.now() - recordTime) / 1000);
    
    if (delta < 0) return "0s";
    if (delta < 60) return `${delta}s`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
    return `${Math.floor(delta / 86400)}d`;
  };

  const formatEth = (val) => {
    const n = Number(val);
    if (Number.isNaN(n) || val == null) return "-";
    return n >= 0.000001 ? n.toLocaleString(undefined, { maximumFractionDigits: 6 }) : n.toFixed(8);
  };

  const formatTokens = (val) => {
    const n = Number(val);
    if (Number.isNaN(n) || val == null) return "-";
    if (Math.abs(n) >= 1000) {
      const lookup = [
        { value: 1e12, symbol: "T" },
        { value: 1e9, symbol: "B" },
        { value: 1e6, symbol: "M" },
        { value: 1e3, symbol: "k" },
      ];
      const item = lookup.find((i) => Math.abs(n) >= i.value) || { value: 1, symbol: "" };
      return (n / item.value).toFixed(2).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1") + item.symbol;
    }
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <div className="font-mono text-[11px] bg-[#0b0f19]/40 border border-slate-900 p-4 rounded-none min-h-[400px] flex flex-col justify-between">
      
      {/* Module Title Registry Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#030712] border border-slate-900 flex items-center justify-center text-slate-500 rounded-none">
            <History size={14} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">LEDGER_TRANSACTION_HISTORY</h3>
        </div>

        <button
          onClick={() => { setPage(0); fetchTxs({ reset: true }); }}
          disabled={loading || loadingTx || !address}
          className="p-1.5 border border-slate-900 bg-[#030712] text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider"
        >
          <RefreshCw size={11} className={loadingTx ? "animate-spin text-[#96d6cd]" : ""} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Terminal Grid Output Workspace Context Frame */}
      <div className="flex-grow flex flex-col justify-center">
        {!address && hideIfNoAddress ? (
          <div className="text-center py-12 border border-dashed border-slate-900"><span className="text-slate-600 uppercase font-bold">!! RUNTIME_ERROR // WALLET_NOT_LINKED</span></div>
        ) : loading || (loadingTx && page === 0) ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-none h-5 w-5 border border-[#96d6cd] border-t-transparent"></div></div>
        ) : error ? (
          <div className="text-center py-12 border border-slate-900 text-rose-500 font-bold uppercase"><span>ERR_LOAD_FAIL // {error}</span></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-900 flex flex-col items-center justify-center space-y-1">
            <History size={16} className="text-slate-700" />
            <span className="text-slate-600 font-bold uppercase tracking-wider">NULL_SET // EMPTY_LEDGER_STREAM</span>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[420px] pr-1">
            <table className="w-full text-left table-auto border-collapse">
              <thead className="text-slate-500 text-[10px] uppercase font-bold tracking-widest sticky top-0 bg-[#030712] z-10 border-b border-slate-900">
                <tr>
                  <th className="py-2 px-2">ASSET_ID</th>
                  <th className="py-2 px-2">OP_TYPE</th>
                  <th className="py-2 px-2 text-right">QUANTITY</th>
                  <th className="py-2 px-2 text-right">VALUE_ETH</th>
                  <th className="py-2 px-2">TX_HASH</th>
                  <th className="py-2 px-2 text-right">DELTA_T</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 font-mono text-slate-300">
                {rows.map((r) => (
                  <tr key={r.tx_hash} className="hover:bg-[#0b0f19]/60 transition-colors">
                    <td className="py-2.5 px-2">
                      <Link to={`/token/${r.token_address}`} className="text-slate-400 hover:text-[#96d6cd] font-bold">
                        {formatShort(r.token_address)}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`px-1 py-0.5 text-[9px] font-black uppercase tracking-wide border ${r.type?.toLowerCase() === "buy" ? "border-emerald-900 bg-emerald-950/20 text-[#96d6cd]" : "border-rose-900 bg-rose-950/20 text-rose-400"}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200">{formatTokens(r.token_amount)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-200">{formatEth(r.eth_amount)}</td>
                    <td className="py-2.5 px-2">
                      <a href={`${chainExplorerBase}${r.tx_hash}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300 inline-flex items-center gap-1">
                        <ExternalLink size={10} />
                        <span>{formatShort(r.tx_hash)}</span>
                      </a>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{formatRelativeTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls Footer Tracker */}
            <div className="flex items-center justify-center pt-4 shrink-0">
              {hasMore ? (
                <button
                  onClick={() => fetchTxs({ reset: false })}
                  disabled={loadingTx}
                  className="px-3 py-1.5 border border-slate-900 bg-[#030712] hover:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider"
                >
                  {loadingTx ? "FETCHING..." : "LOAD_NEXT_BATCH"}
                </button>
              ) : (
                <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">[END_OF_HISTORIC_STREAM_BUFFER]</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryTab;
