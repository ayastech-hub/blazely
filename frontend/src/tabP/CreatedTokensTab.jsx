// src/components/CreatedTokensTab.jsx
import React from "react";
import { Sparkles, Edit3, Eye } from "lucide-react";

const CreatedTokensTab = ({
  data = [],
  loading = false,
  searchTerm = "",
  setSearchTerm = () => {},
  openUpdateModal = () => {},
  DashboardCard,
  isPublicView = false,
}) => {
  const shortAddress = (a = "") => a && a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;

  const navigateToToken = (addr) => {
    try {
      if (typeof window !== "undefined" && (window.__NEXT_DATA__ || window.next)) {
        window.location.href = `/token/${addr}`;
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
  };

  return (
    <div className="font-mono text-[11px]">
      <DashboardCard
        title="SYS_CREATED_TOKENS"
        icon={Sparkles}
        iconBgColor="border-slate-900 text-slate-500"
        count={Array.isArray(data) ? data.length : 0}
        isLoading={loading}
        data={data}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        listClassName="space-y-2 max-h-[650px] overflow-y-auto pr-1"
        emptyState={
          <div className="flex flex-col items-center justify-center py-8 border border-slate-900 bg-[#0b0f19]/20">
            <Sparkles size={16} className="text-slate-700 mb-1" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">NULL_SET // NO_TOKENS_FOUND</span>
          </div>
        }
        renderItem={(token) => (
          <div key={token.address} className="p-3 bg-[#0b0f19]/40 border border-slate-900 rounded-none transition-none">
            <div className="flex items-center justify-between gap-3">
              
              {/* Identity Routing Engine Endpoint Anchor */}
              <a
                href={`/token/${token.address}`}
                onClick={(e) => { e.preventDefault(); navigateToToken(token.address); }}
                className="flex items-center gap-3 min-w-0 flex-1 group"
              >
                <div className="w-10 h-10 bg-[#030712] border border-slate-900 flex items-center justify-center shrink-0 overflow-hidden rounded-none">
                  {token.logo ? (
                    <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover rounded-none" />
                  ) : (
                    <span className="font-bold text-slate-500 text-xs">{(token.symbol || "T").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-black text-slate-200 uppercase tracking-wide truncate text-xs group-hover:text-[#96d6cd] transition-colors">
                    {token.symbol || "UNKNOWN_ID"}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono tracking-normal truncate">
                    {shortAddress(token.address)}
                  </p>
                </div>
              </a>

              {/* Token Capitalization Tracking Index Module */}
              <div className="hidden md:flex flex-col items-end justify-center min-w-[100px]">
                <span className="text-xs font-black text-slate-300 tracking-wider">
                  ${(token.marketcap_usd || 0).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">MARKET_CAP</span>
              </div>

              {/* Action Trigger Handlers Panel */}
              <div className="flex items-center gap-1 shrink-0">
                {!isPublicView && (
                  <button
                    onClick={(e) => { e.preventDefault(); openUpdateModal(token); }}
                    className="p-1.5 border border-slate-900 bg-[#030712] text-slate-500 hover:text-slate-300 rounded-none transition-none"
                    title="Edit token metadata configuration"
                  >
                    <Edit3 size={12} />
                  </button>
                )}

                <button
                  onClick={(e) => { e.preventDefault(); navigateToToken(token.address); }}
                  className="p-1.5 border border-slate-900 bg-[#030712] text-slate-500 hover:text-slate-300 rounded-none transition-none"
                  title="Open viewport matrix"
                >
                  <Eye size={12} />
                </button>
              </div>

            </div>
          </div>
        )}
      />
    </div>
  );
};

export default CreatedTokensTab;
