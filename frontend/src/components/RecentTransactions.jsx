// src/components/RecentTransactions.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";

/* -------------------- Quantitative Telemetry Helpers -------------------- */
const formatNumber = (num) => {
  if (num === null || num === undefined) return "-";
  const n = Number(num);
  if (Number.isNaN(n)) return num;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
};

const formatTimeAgo = (isoDate, nowTs) => {
  if (!isoDate) return "-";
  let standardized = isoDate.replace(" ", "T");
  if (!standardized.includes("Z") && !standardized.includes("+"))
    standardized += "Z";
  const txDate = new Date(standardized).getTime();
  const seconds = Math.floor(Math.max(0, nowTs - txDate) / 1000);
  if (seconds < 60) return seconds + "S";
  if (seconds < 3600) return Math.floor(seconds / 60) + "M";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "H";
  return Math.floor(seconds / 86400) + "D";
};

const formatShort = (addr = "") =>
  addr.length > 10 ? `${addr.slice(0, 5)}..${addr.slice(-4)}` : addr;

/* -------------------- Core Component Module -------------------- */
export default function RecentTransactions({
  tokenAddress,
  creatorAddress,
  pageSize = 10,
  hideHeader = false,
}) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  const containerRef = useRef(null);
  const lastTokenRef = useRef(null);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const normalizedToken = useMemo(
    () => tokenAddress?.toLowerCase(),
    [tokenAddress]
  );

  const fetchTxs = useCallback(
    async (pageToFetch) => {
      if (!normalizedToken) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("token_address", normalizedToken);

        setTotalCount(count || 0);

        const from = (pageToFetch - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from("transactions")
          .select(
            "id, tx_hash, type, token_amount, eth_amount, usd_value, created_at, user_address"
          )
          .eq("token_address", normalizedToken)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;
        setTxs(data || []);
        setCurrentPage(pageToFetch);
      } catch (err) {
        setErrorMsg(err?.message || "Data pipeline query error");
      } finally {
        setLoading(false);
      }
    },
    [normalizedToken, pageSize]
  );

  useEffect(() => {
    if (!normalizedToken) return;
    if (normalizedToken !== lastTokenRef.current) {
      lastTokenRef.current = normalizedToken;
      fetchTxs(1);
    }
  }, [normalizedToken, fetchTxs]);

  useEffect(() => {
    if (!normalizedToken) return;

    const channel = supabase
      .channel(`rt-tx-${normalizedToken}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `token_address=eq.${normalizedToken}`,
        },
        (payload) => {
          setTxs((prevTxs) => {
            if (prevTxs.find((tx) => tx.id === payload.new.id)) return prevTxs;
            const updated = [payload.new, ...prevTxs];
            return updated.slice(0, pageSize);
          });
          setTotalCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedToken, pageSize]);

  return (
    <div
      className={`font-mono text-xs ${
        hideHeader 
          ? "mt-0 p-0 bg-transparent border-none" 
          : "mt-4 p-4 bg-[#0b0f19]/40 border border-slate-900 rounded-sm"
      }`}
    >
      {/* Structural Telemetry Header Block */}
      {!hideHeader && (
        <div className="flex justify-between items-end mb-3 border-b border-slate-900 pb-2">
          <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">
            LEDGER_RECORD // RECENT
          </h3>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-none bg-[#96d6cd] animate-pulse" />
            LIVE FEED INDEX
          </span>
        </div>
      )}

      {/* Flat Data View Grid Container */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto border border-slate-900 bg-[#030712]/40 rounded-sm scrollbar-none"
      >
        <table className="w-full min-w-[650px] border-collapse">
          <thead>
            <tr className="bg-[#0b0f19]/80 border-b border-slate-900 text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <th className="px-3 py-2 text-left font-bold">IDENTITY_HASH</th>
              <th className="px-3 py-2 text-left font-bold">CMD_TYPE</th>
              <th className="px-3 py-2 text-right font-bold">VAL_USD</th>
              <th className="px-3 py-2 text-right font-bold">VAL_ETH</th>
              <th className="px-3 py-2 text-right font-bold">UNITS_TOKEN</th>
              <th className="px-3 py-2 text-right font-bold">DELTA_TIME</th>
              <th className="px-3 py-2 text-center font-bold">SIG</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-900/60 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-600 tracking-widest text-[10px]">
                  SYNCHRONIZING RECENT RECORD DATASETS...
                </td>
              </tr>
            ) : txs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-600 tracking-widest text-[10px]">
                  NULL DESCRIPTOR // NO TRANSACTION RECORDS
                </td>
              </tr>
            ) : (
              txs.map((tx) => {
                const isCreator =
                  creatorAddress &&
                  tx.user_address?.toLowerCase() === creatorAddress?.toLowerCase();
                const isBuy = tx.type === "buy";

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#0b0f19]/30 transition-colors"
                  >
                    {/* Account Target Node */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/profile/${tx.user_address}`}
                          className="text-slate-300 hover:text-slate-100 underline decoration-slate-800 hover:decoration-slate-400 transition-colors"
                        >
                          {formatShort(tx.user_address).toUpperCase()}
                        </Link>
                        {isCreator && (
                          <span 
                            style={{ color: '#96d6cd', borderColor: '#96d6cd30' }}
                            className="text-[8px] font-black uppercase bg-[#96d6cd]/5 px-1 py-0.5 rounded-none border border-transparent font-mono"
                          >
                            [DEV]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Operational Directive Type */}
                    <td className="px-3 py-2">
                      <span className={`font-black text-[10px] tracking-wider ${isBuy ? "text-[#96d6cd]" : "text-rose-500/90"}`}>
                        {isBuy ? "[BUY]" : "[SELL]"}
                      </span>
                    </td>

                    {/* Financial Columns */}
                    <td className="px-3 py-2 text-right text-slate-200 font-bold">
                      ${tx.usd_value ? Number(tx.usd_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">
                      {tx.eth_amount ?? "0.00"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400 font-bold">
                      {formatNumber(tx.token_amount)}
                    </td>

                    {/* System Temporal Offsets */}
                    <td className="px-3 py-2 text-right text-slate-500 text-[10px]">
                      {formatTimeAgo(tx.created_at, now)}
                    </td>

                    {/* Network Signature Reference Anchor */}
                    <td className="px-3 py-2 text-center">
                      {tx.tx_hash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-600 hover:text-slate-300 transition-colors inline-block"
                        >
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-800">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Interface Pagination Controller */}
      <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-900 pt-2.5">
        <div className="uppercase font-bold tracking-wide">
          TOTAL_RECORDS: <span className="text-slate-300 font-mono">{totalCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => fetchTxs(1)}
              className="p-1 hover:text-slate-200 disabled:opacity-10 transition-opacity"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => fetchTxs(currentPage - 1)}
              className="p-1 hover:text-slate-200 disabled:opacity-10 transition-opacity"
            >
              <ChevronLeft size={13} />
            </button>
          </div>

          <div className="px-2 py-0.5 bg-[#030712] border border-slate-900 text-slate-300 text-[9px] font-bold">
            PAGE {currentPage} / {totalPages}
          </div>

          <div className="flex items-center">
            <button
              disabled={currentPage === totalPages || loading}
              onClick={() => fetchTxs(currentPage + 1)}
              className="p-1 hover:text-slate-200 disabled:opacity-10 transition-opacity"
            >
              <ChevronRight size={13} />
            </button>
            <button
              disabled={currentPage === totalPages || loading}
              onClick={() => fetchTxs(totalPages)}
              className="p-1 hover:text-slate-200 disabled:opacity-10 transition-opacity"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Execution Diagnostics Display block */}
      {errorMsg && (
        <div className="mt-2 text-center text-[10px] font-bold tracking-wide uppercase text-rose-500 bg-rose-950/20 py-1.5 border border-rose-900/40 rounded-sm">
          CRITICAL INDEX EXCEPTION: {errorMsg}
        </div>
      )}
    </div>
  );
}
