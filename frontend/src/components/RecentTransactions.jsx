import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";

/* -------------------- Helpers -------------------- */
const formatNumber = (num) => {
  if (num === null || num === undefined) return "-";
  const n = Number(num);
  if (Number.isNaN(n)) return num;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toLocaleString();
};

const formatTimeAgo = (isoDate, nowTs) => {
  if (!isoDate) return "-";
  let standardized = isoDate.replace(" ", "T");
  if (!standardized.includes("Z") && !standardized.includes("+"))
    standardized += "Z";
  const txDate = new Date(standardized).getTime();
  const seconds = Math.floor(Math.max(0, nowTs - txDate) / 1000);
  if (seconds < 60) return seconds + "s ago";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
};

const formatShort = (addr = "") =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

const getAvatarUrl = (addr = "") =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(addr.toLowerCase())}`;

/* -------------------- Component -------------------- */

export default function RecentTransactions({
  tokenAddress,
  creatorAddress,
  pageSize = 10,
  hideHeader = false, // Added prop to control visibility
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
        // 1. Get Total Count
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("token_address", normalizedToken);

        setTotalCount(count || 0);

        // 2. Fetch Page Data
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
        setErrorMsg(err?.message || "Failed to fetch transactions");
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
          // Always prepend new tx only if we're on page 1
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
  }, [normalizedToken, pageSize]); // Removed currentPage

  return (
    <div
      className={`relative ${hideHeader ? "mt-0 p-0 bg-transparent border-none shadow-none" : "mt-6 bg-slate-950/60 rounded-2xl shadow p-4 border border-slate-800/50"}`}
    >
      {/* CONDITIONAL HEADER: Hidden when hideHeader is true */}
      {!hideHeader && (
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-base font-semibold text-white">
            Recent Transactions
          </h3>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            Live Updates
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20"
      >
        <table className="w-full min-w-[600px] text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-700 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Account</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">USD</th>
              <th className="px-4 py-3 text-right font-medium">ETH</th>
              <th className="px-4 py-3 text-right font-medium">Tokens</th>
              <th className="px-4 py-3 text-right font-medium">Time</th>
              <th className="px-4 py-3 text-center font-medium">TX</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-20 text-center text-slate-500 animate-pulse"
                >
                  Loading transactions...
                </td>
              </tr>
            ) : txs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              txs.map((tx) => {
                const isCreator =
                  creatorAddress &&
                  tx.user_address?.toLowerCase() ===
                    creatorAddress?.toLowerCase();

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${tx.user_address}`}
                          className="flex items-center gap-2 text-slate-300 hover:text-blue-400"
                        >
                          <img
                            src={getAvatarUrl(tx.user_address)}
                            className="w-5 h-5 rounded-full border border-slate-700"
                            alt=""
                          />
                          {formatShort(tx.user_address)}
                        </Link>

                        {isCreator && (
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                            dev
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.type === "buy"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {tx.type === "buy" ? (
                          <TrendingUp size={10} />
                        ) : (
                          <TrendingDown size={10} />
                        )}
                        {tx.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400/90">
                      ${tx.usd_value ? Number(tx.usd_value).toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-100">
                      {tx.eth_amount ?? "0.00"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-100">
                      {formatNumber(tx.token_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {formatTimeAgo(tx.created_at, now)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.tx_hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-blue-400 transition-colors inline-block"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-6 flex justify-center items-center gap-4 text-slate-400">
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1 || loading}
            onClick={() => fetchTxs(1)}
            className="p-1.5 hover:text-white disabled:opacity-20 transition-all hover:bg-slate-800 rounded-lg"
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            disabled={currentPage === 1 || loading}
            onClick={() => fetchTxs(currentPage - 1)}
            className="p-1.5 hover:text-white disabled:opacity-20 transition-all hover:bg-slate-800 rounded-lg"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <span className="text-sm font-mono bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-800 text-slate-200 shadow-inner">
          {currentPage} <span className="text-slate-600 mx-1">/</span>{" "}
          {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === totalPages || loading}
            onClick={() => fetchTxs(currentPage + 1)}
            className="p-1.5 hover:text-white disabled:opacity-20 transition-all hover:bg-slate-800 rounded-lg"
          >
            <ChevronRight size={18} />
          </button>
          <button
            disabled={currentPage === totalPages || loading}
            onClick={() => fetchTxs(totalPages)}
            className="p-1.5 hover:text-white disabled:opacity-20 transition-all hover:bg-slate-800 rounded-lg"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 text-center text-xs text-rose-400 bg-rose-400/10 py-2 rounded-lg border border-rose-400/20">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
