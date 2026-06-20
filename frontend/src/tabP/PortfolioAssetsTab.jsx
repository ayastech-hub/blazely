// src/components/PortfolioAssetsTab.jsx
import React from "react";
import { TrendingUp } from "lucide-react";

const PortfolioAssetsTab = ({
  data = [],
  loading = false,
  searchTerm = "",
  setSearchTerm = () => {},
  DashboardCard,
}) => {
  function navigateToToken(addr) {
    try {
      if (typeof window !== "undefined" && window.__NEXT_DATA__) {
        window.location.href = `/token/${addr}`;
        return;
      }
      if (typeof window !== "undefined" && window.__REACT_ROUTER_NAVIGATE__) {
        window.__REACT_ROUTER_NAVIGATE__(`/token/${addr}`);
        return;
      }
      if (typeof window !== "undefined" && window.history && typeof window.history.pushState === "function") {
        window.history.pushState({}, "", `/token/${addr}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }
      window.location.href = `/token/${addr}`;
    } catch {
      window.location.href = `/token/${addr}`;
    }
  }

  const filteredData = Array.isArray(data)
    ? data.filter(
        (t) =>
          Number(t.amount) > 0 &&
          (t.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <div className="font-mono text-[11px]">
      <DashboardCard
        title="SYS_PORTFOLIO_ASSETS"
        icon={TrendingUp}
        iconBgColor="border-slate-900 text-slate-500"
        count={filteredData.length}
        isLoading={loading}
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        emptyState={
          <div className="flex flex-col items-center justify-center py-8 border border-slate-900 bg-[#0b0f19]/20">
            <TrendingUp size={16} className="text-slate-700 mb-1" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">NULL_SET // NO_ASSETS_FOUND</span>
          </div>
        }
        renderItem={(token) => (
          <div key={token.address} className="bg-[#0b0f19]/40 border border-slate-900 rounded-none transition-none">
            <a
              href={`/token/${token.address}`}
              onClick={(e) => { e.preventDefault(); navigateToToken(token.address); }}
              className="grid grid-cols-3 items-center gap-3 p-3 group"
            >
              {/* Column 1: Core Token Registry Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[#030712] border border-slate-900 flex items-center justify-center shrink-0 overflow-hidden rounded-none">
                  {token.logo_path || token.logo ? (
                    <img src={token.logo_path || token.logo} alt={token.symbol} className="w-full h-full object-cover rounded-none" />
                  ) : (
                    <span className="font-bold text-slate-500 text-xs">{(token.symbol || "T").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-black text-slate-200 uppercase tracking-wide truncate text-xs group-hover:text-[#96d6cd] transition-colors">
                    {token.symbol || "UNKNOWN_ID"}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono tracking-normal truncate">
                    {token.name || "—"}
                  </p>
                </div>
              </div>

              {/* Column 2: Engine Block Quantities & Spot Rates */}
              <div className="text-left min-w-0">
                <span className="text-xs font-bold text-slate-300 tracking-wider block truncate">
                  {Number(token.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
                <span className="text-[9px] text-slate-600 font-bold block truncate uppercase">
                  ${Number(token.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>

              {/* Column 3: Gross Aggregation Value & 24h Yield Delta Track */}
              <div className="text-right min-w-0">
                <span className="text-xs font-black text-slate-200 tracking-wider block truncate">
                  ${Number(token.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide block ${
                    String(token.change24h || "").startsWith("+")
                      ? "text-[#96d6cd]"
                      : String(token.change24h || "").startsWith("-")
                        ? "text-rose-500"
                        : "text-slate-500"
                  }`}
                >
                  {token.change24h || "0.00%"}
                </span>
              </div>

            </a>
          </div>
        )}
      />
    </div>
  );
};

export default PortfolioAssetsTab;
