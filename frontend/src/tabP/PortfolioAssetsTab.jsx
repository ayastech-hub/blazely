import React from "react";
import { TrendingUp } from "lucide-react";

const PortfolioAssetsTab = ({
  data = [],
  loading = false,
  searchTerm = "",
  setSearchTerm = () => {},
  DashboardCard,
}) => {
  // SPA-safe navigation
  function navigateToToken(address) {
    try {
      if (typeof window !== "undefined" && window.__NEXT_DATA__) {
        window.location.href = `/token/${address}`;
        return;
      }
      if (typeof window !== "undefined" && window.__REACT_ROUTER_NAVIGATE__) {
        window.__REACT_ROUTER_NAVIGATE__(`/token/${address}`);
        return;
      }
      if (
        typeof window !== "undefined" &&
        window.history &&
        typeof window.history.pushState === "function"
      ) {
        window.history.pushState({}, "", `/token/${address}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }
      window.location.href = `/token/${address}`;
    } catch (e) {
      window.location.href = `/token/${address}`;
    }
  }

  // Filter out any zero balances just in case, and apply search term
  const filteredData = Array.isArray(data)
    ? data.filter(
        (token) =>
          Number(token.amount) > 0 &&
          (token.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <div className="grid grid-cols-1 gap-6">
      <DashboardCard
        title="Portfolio Assets"
        icon={TrendingUp}
        iconBgColor="border-cyan-400/30 text-cyan-400"
        count={filteredData.length}
        isLoading={loading}
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        emptyState={
          <div className="flex flex-col items-center justify-center py-8">
            <TrendingUp className="w-10 h-10 text-slate-700 mb-2" />
            <p className="text-slate-500">No assets with a balance found.</p>
          </div>
        }
        renderItem={(token) => (
          <div
            key={token.address}
            className="block p-3 md:p-4 rounded-2xl 
                       bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/60
                       border border-slate-800/60 shadow-md
                       transition-none no-hover"
          >
            <a
              href={`/token/${token.address}`}
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                navigateToToken(token.address);
              }}
              className="grid grid-cols-3 items-center gap-3"
            >
              {/* Logo + Token Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-cyan-400/20">
                  {token.logo_path || token.logo ? (
                    <img
                      src={token.logo_path || token.logo}
                      alt={token.symbol}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <span className="font-bold text-cyan-300 text-lg">
                      {(token.symbol || "T").charAt(0)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-semibold text-white truncate text-sm md:text-base">
                    {token.symbol || "UNKNOWN"}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {token.name || "—"}
                  </p>
                </div>
              </div>

              {/* Amount & Unit Price */}
              <div className="text-left min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {Number(token.amount || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  $
                  {Number(token.price || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>
              {/* Total Value + 24h Change */}
              <div className="text-right">
                <p className="font-bold text-white truncate">
                  $
                  {Number(token.value || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>

                <p
                  className={`text-xs font-semibold ${
                    // Handles cases where change might be "+5%", "-5%", or just "0.00%"
                    String(token.change24h || "").startsWith("+")
                      ? "text-green-400"
                      : String(token.change24h || "").startsWith("-")
                        ? "text-red-400"
                        : "text-slate-400" // Neutral color for 0%
                  }`}
                >
                  {token.change24h || "0.00%"}
                </p>
              </div>
            </a>
          </div>
        )}
      />
    </div>
  );
};

export default PortfolioAssetsTab;
