// src/tabP/PortfolioAssetsTab.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { C } from "../utils/designForProfile";
import { formatTokenAmount, formatUsdPrice, formatUsd, formatPercent } from "../utils/format";

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

  return (
    <DashboardCard
      title="Your holdings"
      subtitle="Tokens you currently hold"
      icon={TrendingUp}
      count={filteredData.length}
      isLoading={loading}
      data={filteredData}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by name or symbol..."
      emptyState={
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <TrendingUp size={20} style={{ color: C.faint }} />
          <span className="text-sm" style={{ color: C.sub }}>
            No tokens in your portfolio yet
          </span>
        </div>
      }
      renderItem={(token) => {
        const changeLabel = formatPercent(token.change_24h);
        const changeColor =
          token.change_24h > 0 ? C.green : token.change_24h < 0 ? C.rose : C.sub;

        return (
          <button
            key={token.token_address}
            onClick={() => navigate(`/token/${token.token_address}`)}
            className="grid grid-cols-3 items-center gap-3 p-3.5 rounded-xl w-full text-left transition-colors hover:bg-white/[0.02]"
            style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden rounded-full"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}` }}
              >
                {token.logo ? (
                  <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-sm" style={{ color: C.sub }}>
                    {(token.symbol || "T").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 space-y-0.5">
                <h4 className="font-semibold truncate text-sm" style={{ color: C.bright }}>
                  {token.symbol}
                </h4>
                <p className="text-xs font-mono truncate" style={{ color: C.sub }}>
                  {token.name || "—"}
                </p>
              </div>
            </div>

            <div className="text-left min-w-0">
              <span className="text-sm font-medium tabular-nums block truncate" style={{ color: C.bright }}>
                {formatTokenAmount(token.balance)}
              </span>
              <span className="text-xs block truncate" style={{ color: C.sub }}>
                {token.price_usd != null ? formatUsdPrice(token.price_usd) : "Price unavailable"}
              </span>
            </div>

            <div className="text-right min-w-0">
              <span className="text-sm font-semibold tabular-nums block truncate" style={{ color: C.bright }}>
                {token.value_usd != null ? formatUsd(token.value_usd) : "—"}
              </span>
              <span className="text-xs font-medium block" style={{ color: changeLabel ? changeColor : C.faint }}>
                {changeLabel || "24h change unavailable"}
              </span>
            </div>
          </button>
        );
      }}
    />
  );
};

export default PortfolioAssetsTab;
