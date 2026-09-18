// Compact row style matched to tokenpage/TradesPanel.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Link as LinkIcon } from "lucide-react";
import { C } from "../utils/designForProfile";
import { formatUnits, timeAgo, explorerTxUrl } from "../utils/formatProfile";
import Loading from "../components/ui/Loading";

const colHdr = {
  display: "grid",
  gridTemplateColumns: "44px 40px 1fr 72px 56px",
  padding: "5px 10px",
  fontSize: 9,
  color: C.mid,
  fontWeight: 700,
  fontFamily: C.mono,
  letterSpacing: "0.07em",
  borderBottom: `1px solid ${C.border}`,
};

const TransactionHistoryTab = ({
  transactions = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore = () => {},
  address = null,
}) => {
  if (loading && !transactions.length) {
    return (
      <div className="py-12">
        <Loading label="Loading…" />
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="py-16 text-center text-xs" style={{ color: C.faint, fontFamily: C.mono }}>
        No transactions yet
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <div style={colHdr}>
        <span>AGE</span>
        <span>TYPE</span>
        <span>TOKEN</span>
        <span style={{ textAlign: "right" }}>ETH</span>
        <span>TX</span>
      </div>

      <div className="overflow-y-auto flex-1" style={{ maxHeight: "60vh" }}>
        {transactions.map((r) => {
          const isBuy = r.type?.toLowerCase() === "buy";
          const tx = r.tx_hash || "";
          return (
            <div
              key={r.id || r.tx_hash || `${r.token_address}-${r.created_at}`}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 40px 1fr 72px 56px",
                padding: "5px 10px",
                borderBottom: `1px solid ${C.border}`,
                alignItems: "center",
                gap: 4,
                fontFamily: C.mono,
              }}
            >
              <span style={{ color: C.dim, fontSize: 9 }}>{timeAgo(r.created_at)}</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: isBuy ? C.teal : C.rose,
                }}
              >
                {isBuy ? "Buy" : "Sell"}
              </span>
              <Link
                to={`/token/${r.token_address}`}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.bright,
                  textDecoration: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.token_symbol || (r.token_address ? `${r.token_address.slice(0, 4)}…` : "—")}
              </Link>
              <span style={{ fontSize: 10, color: C.bright, textAlign: "right", fontWeight: 600 }}>
                {formatUnits(r.eth_amount, 18)}
              </span>
              {tx ? (
                <a
                  href={explorerTxUrl(tx)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 9, color: C.dim, textDecoration: "none" }}
                >
                  {`${tx.slice(0, 4)}…${tx.slice(-3)}`}
                </a>
              ) : (
                <span style={{ fontSize: 9, color: C.dim }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-3 py-1.5 text-[11px] font-medium rounded-lg"
            style={{ backgroundColor: C.panelRaised, color: C.mid }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        ) : (
          <span className="text-[10px]" style={{ color: C.faint }}>
            End
          </span>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryTab;
