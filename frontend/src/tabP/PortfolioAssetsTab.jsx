import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { C } from "../utils/designforprofile.js";
import { formatCompact, formatUsdPrice, formatUsd } from "../utils/format";

const PortfolioAssetsTab = ({
  data = [],
  loading = false,
  searchTerm = "",
  setSearchTerm = () => {},
  DashboardCard,
}) => {
  const navigate = useNavigate();

  const filteredData = Array.isArray(data)
    ? data.filter(
        (t) =>
          (t.symbol || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Helper to maintain the "TokenAmount" display logic using the new formatCompact
  const displayTokenBalance = (balance) => {
    const n = Number(balance);
    if (balance == null || Number.isNaN(n)) return "—";
    // If large, use compact (e.g., 1.2K); otherwise, show standard number
    if (Math.abs(n) >= 1000) return formatCompact(n);
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <div className="font-mono text-[11px]">
      <DashboardCard
        title="Your holdings"
        icon={TrendingUp}
        count={filteredData.length}
        isLoading={loading}
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name or symbol..."
        emptyState={
          <div className="flex flex-col items-center justify-center py-8">
            <TrendingUp size={16} className="mb-1" style={{ color: C.faint }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: C.sub }}>
              No tokens in your portfolio yet
            </span>
          </div>
        }
        renderItem={(token) => (
          <div
            key={token.token_address}
            className="rounded-none"
            style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.border}` }}
          >
            <button
              onClick={() => navigate(`/token/${token.token_address}`)}
              className="grid grid-cols-3 items-center gap-3 p-3 group w-full text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden rounded-none"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                >
                  {token.logo ? (
                    <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xs" style={{ color: C.sub }}>
                      {(token.symbol || "T").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-black uppercase tracking-wide truncate text-xs" style={{ color: C.bright }}>
                    {token.symbol}
                  </h4>
                  <p className="text-[10px] font-mono tracking-normal truncate" style={{ color: C.sub }}>
                    {token.name || "—"}
                  </p>
                </div>
              </div>

              <div className="text-left min-w-0">
                <span className="text-xs font-bold tracking-wider block truncate" style={{ color: C.bright }}>
                  {displayTokenBalance(token.balance)}
                </span>
                <span className="text-[9px] font-bold block truncate uppercase" style={{ color: C.sub }}>
                  {token.price_usd != null ? formatUsdPrice(token.price_usd) : "Price unavailable"}
                </span>
              </div>

              <div className="text-right min-w-0">
                <span className="text-xs font-black tracking-wider block truncate" style={{ color: C.bright }}>
                  {token.value_usd != null ? formatUsd(token.value_usd) : "—"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide block" style={{ color: C.faint }}>
                  24h change not available yet
                </span>
              </div>
            </button>
          </div>
        )}
      />
    </div>
  );
};

export default PortfolioAssetsTab;
