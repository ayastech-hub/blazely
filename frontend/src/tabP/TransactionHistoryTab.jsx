// src/components/TransactionHistoryTab.jsx
import React, { useEffect, useState, useCallback } from "react";
import { History, RefreshCw, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient"; // adjust path if needed

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
      if (!address) {
        setRows([]);
        return;
      }

      try {
        setLoadingTx(true);
        const from = reset ? 0 : page * pageSize;

        const { data, error: sbError } = await supabase
          .from("transactions")
          .select(
            `
          tx_hash,
          block_number,
          created_at,
          token_address, 
          user_address,
          type,
          token_amount, 
          eth_amount
        `
          )
          .eq("user_address", address)
          .order("created_at", { ascending: false }) // sort by time instead
          .range(from, from + pageSize - 1);

        if (sbError) throw sbError;

        if (reset) {
          setRows(data || []);
        } else {
          setRows((prev) => {
            const map = new Map(prev.map((r) => [r.created_at, r])); // use created_at as key
            (data || []).forEach((r) => map.set(r.created_at, r));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at) // descending by time
            );
          });
        }

        setHasMore((data || []).length === pageSize);
        setPage((p) => (reset ? 1 : p + 1));
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setError(err.message || "Failed to load transactions");
      } finally {
        setLoadingTx(false);
      }
    },
    [address, page, pageSize]
  );

  useEffect(() => {
    if (!address) {
      setRows([]);
      setPage(0);
      setHasMore(false);
      return;
    }
    setPage(0);
    fetchTxs({ reset: true });
  }, [address]);
  useEffect(() => {
    if (!address) return;

    const channel = supabase
      .channel(`realtime-profile-${address}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          const tx = payload.new;

          // Only this wallet
          if (tx.user_address !== address) return;

          setRows((prev) => {
            // Deduplicate (important)
            if (prev.some((r) => r.tx_hash === tx.tx_hash)) return prev;

            // Prepend new tx
            return [tx, ...prev].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [address]);

  /* -------------------------- Helper Functions -------------------------- */

  const formatShort = (str = "") => {
    if (!str) return "";
    if (str.length <= 10) return str;
    return `${str.slice(0, 3)}..${str.slice(-4)}`;
  };

  const getAvatarUrl = (addr = "") =>
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
      addr.toLowerCase()
    )}`;

  const formatRelativeTime = (isoDate) => {
    if (!isoDate) return "-";
    const standardized = isoDate.replace(" ", "T") + "Z";
    const seconds = Math.floor((new Date() - new Date(standardized)) / 1000);

    if (seconds < 0) return "Just now";
    if (seconds >= 31536000) return Math.floor(seconds / 31536000) + "y ago";
    if (seconds >= 2592000) return Math.floor(seconds / 2592000) + "mo ago";
    if (seconds >= 86400) return Math.floor(seconds / 86400) + "d ago";
    if (seconds >= 3600) return Math.floor(seconds / 3600) + "h ago";
    if (seconds >= 60) return Math.floor(seconds / 60) + "m ago";
    return seconds + "s ago";
  };

  const formatEth = (val) => {
    if (val == null) return "-";
    try {
      const n = Number(val);
      if (Number.isNaN(n)) return val;
      return n >= 0.000001
        ? n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 6,
          })
        : n.toFixed(8);
    } catch {
      return val;
    }
  };

  const formatTokens = (val) => {
    if (val == null) return "-";
    try {
      const n = Number(val);
      if (Number.isNaN(n)) return val;

      if (Math.abs(n) >= 1000) {
        const lookup = [
          { value: 1e12, symbol: "T" },
          { value: 1e9, symbol: "B" },
          { value: 1e6, symbol: "M" },
          { value: 1e3, symbol: "k" },
        ];
        const item = lookup.find((i) => Math.abs(n) >= i.value) || {
          value: 1,
          symbol: "",
        };

        let formatted = (n / item.value).toFixed(2);
        formatted = formatted.replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1");
        return formatted + item.symbol;
      }
      return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
    } catch {
      return val;
    }
  };

  const handleRefresh = async () => {
    setPage(0);
    await fetchTxs({ reset: true });
  };

  const loadMore = async () => {
    await fetchTxs({ reset: false });
  };

  /* ---------------------------- Render ---------------------------- */

  return (
    <motion.div
      className="card p-6 flex flex-col items-stretch justify-center min-h-[400px] border border-slate-800/50 bg-slate-900/50 rounded-xl"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <History className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-extrabold text-white">
            Transaction History
          </h3>

          <span className="text-sm text-slate-500 hidden sm:inline">
            {address && (
              <span className="inline-flex items-center gap-2">
                <img
                  src={getAvatarUrl(address)}
                  alt="addr avatar"
                  className="w-4 h-4 rounded-full"
                />
                <span>{formatShort(address)}</span>
              </span>
            )}
          </span>
        </div>

        <button
          onClick={handleRefresh}
          className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50"
          title="Refresh"
          disabled={loading || loadingTx || !address}
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loadingTx ? "animate-spin text-purple-400" : "text-slate-400"
            }`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="flex-1">
        {!address && hideIfNoAddress ? (
          <div className="flex h-72 flex-col items-center justify-center text-center px-4">
            <p className="text-slate-400">
              Connect a wallet to view transaction history.
            </p>
          </div>
        ) : loading || loadingTx ? (
          <div className="flex h-72 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : error ? (
          <div className="flex h-72 flex-col items-center justify-center text-center px-4">
            <p className="text-red-400 mb-2 font-semibold">
              Error loading transactions
            </p>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-center px-4">
            <History className="w-10 h-10 text-slate-700 mb-3" />
            <h4 className="text-white font-semibold mb-1">
              No transactions found
            </h4>
            <p className="text-slate-500 text-sm max-w-sm">
              We will show pad buys/sells here.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[420px] pr-1">
            <table className="w-full text-left table-auto">
              <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10 border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Tokens</th>
                  <th className="py-3 px-3 text-right">ETH</th>
                  <th className="py-3 px-3">Tx</th>
                  <th className="py-3 px-3">When</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <motion.tr
                    key={r.tx_hash}
                    className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                  >
                    {/* ACCOUNT COLUMN (with DiceBear avatar) */}

                    <td className="py-3 px-3 align-middle">
                      <Link
                        to={`/token/${r.address}`} // <-- dynamic route
                        className="text-slate-400 text-xs inline-flex items-center gap-2 hover:text-purple-400 transition-colors"
                        title={r.address}
                      >
                        <img
                          src={getAvatarUrl(r.address)}
                          alt="wallet avatar"
                          className="w-5 h-5 rounded-full flex-shrink-0"
                        />
                        <span className="text-slate-300">
                          {formatShort(r.address)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                          r.type === "buy"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>

                    <td className="py-3 px-3 align-middle text-right text-sm text-slate-200 font-mono">
                      {formatTokens(r.token_amount)}
                    </td>

                    <td className="py-3 px-3 align-middle text-right text-sm text-slate-200 font-mono">
                      {formatEth(r.eth_amount)}
                    </td>

                    <td className="py-3 px-3 align-middle">
                      <a
                        className="text-purple-400 text-xs inline-flex items-center gap-1 hover:text-purple-300 transition-colors"
                        href={`${chainExplorerBase}${r.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        title={r.tx_hash}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{formatShort(r.tx_hash)}</span>
                      </a>
                    </td>

                    <td className="py-3 px-3 align-middle">
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(r.created_at)}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-center gap-2 mt-6 pb-4">
              {hasMore ? (
                <button
                  className="px-4 py-2 border border-slate-700 text-slate-400 text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  onClick={loadMore}
                  disabled={loadingTx}
                >
                  {loadingTx ? "Loading..." : "Load more"}
                </button>
              ) : (
                <div className="text-slate-600 text-xs py-2">
                  End of history
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TransactionHistoryTab;
