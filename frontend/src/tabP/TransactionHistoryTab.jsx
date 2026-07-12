import React from "react";
import { History, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { C } from "../utils/designforprofile.js";
import { shortenAddress, formatCompact, timeAgo, explorerTxUrl } from "../utils/format";

const TransactionHistoryTab = ({
  transactions = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore = () => {},
  onRefresh = () => {},
  address = null,
}) => {
  // Helper to maintain the previous display logic for token amounts
  const formatTokenDisplay = (amount) => {
    const n = Number(amount);
    if (amount == null || Number.isNaN(n)) return "—";
    if (Math.abs(n) >= 1000) return formatCompact(n);
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <div
      className="font-mono text-[11px] p-4 rounded-none min-h-[400px] flex flex-col justify-between"
      style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center justify-between border-b pb-3 mb-3 shrink-0" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-none"
            style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.sub }}
          >
            <History size={14} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: C.bright }}>
            Transaction history
          </h3>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading || !address}
          className="p-1.5 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider rounded-none"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.sub }}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} style={{ color: loading ? C.teal : undefined }} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center">
        {!address ? (
          <div className="text-center py-12 border border-dashed" style={{ borderColor: C.borderDashed }}>
            <span className="uppercase font-bold" style={{ color: C.sub }}>
              Connect your wallet to see your history
            </span>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: C.teal, borderTopColor: "transparent" }} />
          </div>
        ) : transactions.length === 0 ? (
          <div
            className="text-center py-12 border border-dashed flex flex-col items-center justify-center space-y-1"
            style={{ borderColor: C.borderDashed }}
          >
            <History size={16} style={{ color: C.faint }} />
            <span className="font-bold uppercase tracking-wider" style={{ color: C.sub }}>
              No transactions yet
            </span>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[420px] pr-1">
            <table className="w-full text-left table-auto border-collapse">
              <thead
                className="text-[10px] uppercase font-bold tracking-widest sticky top-0 z-10 border-b"
                style={{ color: C.sub, backgroundColor: C.bg, borderColor: C.border }}
              >
                <tr>
                  <th className="py-2 px-2">Token</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                  <th className="py-2 px-2 text-right">Value (ETH)</th>
                  <th className="py-2 px-2">Tx</th>
                  <th className="py-2 px-2 text-right">When</th>
                </tr>
              </thead>
              <tbody className="font-mono" style={{ color: C.mid }}>
                {transactions.map((r) => (
                  <tr key={r.tx_hash} className="hover:opacity-90 transition-opacity">
                    <td className="py-2.5 px-2">
                      <Link to={`/token/${r.token_address}`} className="font-bold" style={{ color: C.mid }}>
                        {shortenAddress(r.token_address)}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className="px-1 py-0.5 text-[9px] font-black uppercase tracking-wide border rounded-none"
                        style={
                          r.type?.toLowerCase() === "buy"
                            ? { borderColor: "rgba(6,95,70,0.5)", backgroundColor: "rgba(6,95,70,0.15)", color: C.teal }
                            : { borderColor: C.roseBorder, backgroundColor: C.roseDim, color: C.rose }
                        }
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right" style={{ color: C.bright }}>
                      {formatTokenDisplay(r.token_amount)}
                    </td>
                    <td className="py-2.5 px-2 text-right" style={{ color: C.bright }}>
                      {r.eth_amount != null ? Number(r.eth_amount).toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <a
                        href={explorerTxUrl(r.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1"
                        style={{ color: C.sub }}
                      >
                        <ExternalLink size={10} />
                        <span>{shortenAddress(r.tx_hash)}</span>
                      </a>
                    </td>
                    <td className="py-2.5 px-2 text-right" style={{ color: C.sub }}>
                      {timeAgo(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-center pt-4 shrink-0">
              {hasMore ? (
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.mid }}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.faint }}>
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
