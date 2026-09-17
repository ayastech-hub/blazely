// src/tabP/TransactionHistoryTab.jsx
//
// Row styling matches components/tokenpage/TradesPanel.jsx (the trades feed
// on the token detail page) — compact monospace grid rows instead of a
// padded <table>, so the same kind of data reads consistently whether
// you're looking at it from a token's page or from your own profile.
import React from "react";
import { History, RefreshCw, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { C } from "../utils/designForProfile";
import { shortenAddress, formatUnits, timeAgo, explorerTxUrl } from "../utils/formatProfile";
import Loading from "../components/ui/Loading";

const GRID_COLS = "72px 56px 1fr 1fr 90px";

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
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
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

      {!address ? (
        <div className="text-center py-14 border border-dashed rounded-xl" style={{ borderColor: C.borderDashed }}>
          <span className="text-sm" style={{ color: C.sub }}>
            Connect your wallet to see your history
          </span>
        </div>
      ) : loading ? (
        <Loading label="Loading transactions..." />
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
        <div className="overflow-x-auto -mx-1 px-1">
          <div
            className="grid text-[10px] uppercase tracking-wide font-medium border-b pb-2 mb-1 min-w-[560px]"
            style={{ gridTemplateColumns: GRID_COLS, color: C.faint, borderColor: C.borderSoft }}
          >
            <span>Token</span>
            <span>Type</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Value</span>
            <span>Tx / When</span>
          </div>

          <div className="min-w-[560px]">
            {transactions.map((r) => (
              <div
                key={r.tx_hash}
                className="grid items-center py-2.5 border-b transition-colors hover:bg-white/[0.02]"
                style={{ gridTemplateColumns: GRID_COLS, borderColor: C.borderSoft }}
              >
                <Link to={`/token/${r.token_address}`} className="text-xs font-semibold font-mono truncate" style={{ color: C.bright }}>
                  {r.token_symbol || shortenAddress(r.token_address)}
                </Link>
                <span
                  className="text-[11px] font-bold font-mono"
                  style={{ color: r.type?.toLowerCase() === "buy" ? C.teal : C.rose }}
                >
                  {r.type?.toLowerCase() === "buy" ? "Buy" : "Sell"}
                </span>
                <span className="text-xs font-mono text-right tabular-nums" style={{ color: C.bright }}>
                  {formatUnits(r.token_amount, 18)}
                </span>
                <span className="text-xs font-mono text-right tabular-nums" style={{ color: C.bright }}>
                  {/* usd_value is never populated by the indexer today — ETH is the reliable value here. */}
                  {formatUnits(r.eth_amount, 18)} ETH
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <a
                    href={explorerTxUrl(r.tx_hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono shrink-0"
                    style={{ color: C.sub }}
                  >
                    {shortenAddress(r.tx_hash)}
                    <LinkIcon size={10} />
                  </a>
                  <span className="text-[10px] font-mono truncate" style={{ color: C.faint }}>
                    {timeAgo(r.created_at)}
                  </span>
                </div>
              </div>
            ))}
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
  );
};

export default TransactionHistoryTab;
