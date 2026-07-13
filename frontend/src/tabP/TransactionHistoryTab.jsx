// src/tabP/TransactionHistoryTab.jsx
import React from "react";
import { History, RefreshCw, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { C } from "../utils/designForProfile";
import { shortenAddress, formatUnits, timeAgo, explorerTxUrl } from "../utils/formatProfile";

const TransactionHistoryTab = ({
  transactions = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore = () => {},
  onRefresh = () => {},
  address = null,
}) => {
  return (
    <div
      className="p-5 sm:p-6 min-h-[420px] flex flex-col justify-between"
      style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, borderRadius: C.radiusCard, boxShadow: C.shadowCard }}
    >
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: C.tealDim, color: C.teal }}
          >
            <History size={16} />
          </div>
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: C.bright }}>
            Transaction history
          </h3>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading || !address}
          className="p-2 flex items-center gap-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-white/5"
          style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, color: C.mid }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} style={{ color: loading ? C.teal : undefined }} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center">
        {!address ? (
          <div className="text-center py-14 border border-dashed rounded-xl" style={{ borderColor: C.borderDashed }}>
            <span className="text-sm" style={{ color: C.sub }}>
              Connect your wallet to see your history
            </span>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-14">
            <div className="animate-spin rounded-full h-6 w-6 border-2" style={{ borderColor: C.teal, borderTopColor: "transparent" }} />
          </div>
        ) : transactions.length === 0 ? (
          <div
            className="text-center py-14 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2"
            style={{ borderColor: C.borderDashed }}
          >
            <History size={20} style={{ color: C.faint }} />
            <span className="text-sm" style={{ color: C.sub }}>
              No transactions yet
            </span>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[440px] pr-1 -mr-1">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left table-auto border-collapse">
                <thead
                  className="text-[11px] uppercase tracking-wide font-medium sticky top-0 z-10 border-b"
                  style={{ color: C.sub, backgroundColor: C.panelSoft, borderColor: C.borderSoft }}
                >
                  <tr>
                    <th className="py-2.5 px-2">Token</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-2 text-right">Amount</th>
                    <th className="py-2.5 px-2 text-right">Value</th>
                    <th className="py-2.5 px-2">Tx</th>
                    <th className="py-2.5 px-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody style={{ color: C.mid }}>
                  {transactions.map((r) => (
                    <tr key={r.tx_hash} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2">
                        <Link to={`/token/${r.token_address}`} className="font-medium text-sm" style={{ color: C.mid }}>
                          {r.token_symbol || shortenAddress(r.token_address)}
                        </Link>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className="px-2 py-0.5 text-[11px] font-medium rounded-full"
                          style={
                            r.type?.toLowerCase() === "buy"
                              ? { backgroundColor: C.greenDim, color: C.green }
                              : { backgroundColor: C.roseDim, color: C.rose }
                          }
                        >
                          {r.type}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-sm tabular-nums" style={{ color: C.bright }}>
                        {formatUnits(r.token_amount, 18)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm tabular-nums" style={{ color: C.bright }}>
                        {/* usd_value is never populated by the indexer today — ETH is the reliable value here. */}
                        {formatUnits(r.eth_amount, 18)} ETH
                      </td>
                      <td className="py-3 px-2">
                        <a
                          href={explorerTxUrl(r.tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm"
                          style={{ color: C.sub }}
                        >
                          {shortenAddress(r.tx_hash)}
                          <ArrowUpRight size={11} />
                        </a>
                      </td>
                      <td className="py-3 px-2 text-right text-sm" style={{ color: C.sub }}>
                        {timeAgo(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center pt-5 shrink-0">
              {hasMore ? (
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-white/5"
                  style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, color: C.mid }}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              ) : (
                <span className="text-xs" style={{ color: C.faint }}>
                  You've reached the end
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryTab;
