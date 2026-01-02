import React from "react";
import { Sparkles, Edit3, Eye } from "lucide-react";

const CreatedTokensTab = ({
  data = [],
  loading = false,
  searchTerm = "",
  setSearchTerm = () => {},
  openUpdateModal = () => {},
  DashboardCard, // Received from Profile.jsx
  isPublicView = false, // show fewer actions for public mode
}) => {
  const shortAddress = (addr = "") =>
    addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  // SPA-safe navigation: tries to use client-side push where possible, falls back to full location change.
  const navigateToToken = (address) => {
    try {
      // If using Next.js, prefer router push if available on window.__NEXT_DATA__ (best-effort)
      if (
        typeof window !== "undefined" &&
        (window.__NEXT_DATA__ || window.next)
      ) {
        window.location.href = `/token/${address}`;
        return;
      }
      // If react-router is used, dispatch a popstate to keep SPA behavior (best-effort)
      if (
        typeof window !== "undefined" &&
        window.history &&
        typeof window.history.pushState === "function"
      ) {
        // Use pushState so SPA routers can pick it up, then dispatch a popstate event for listeners.
        window.history.pushState({}, "", `/token/${address}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }
      // Fallback: full navigation
      window.location.href = `/token/${address}`;
    } catch (e) {
      // ultimate fallback
      window.location.href = `/token/${address}`;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <DashboardCard
        title="Tokens Created"
        icon={Sparkles}
        iconBgColor="border-purple-400/30 text-purple-400"
        count={Array.isArray(data) ? data.length : 0}
        isLoading={loading}
        data={data}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        listClassName="space-y-4 max-h-[650px] overflow-y-auto pr-2"
        emptyState={
          <div className="flex flex-col items-center justify-center py-8">
            <Sparkles className="w-10 h-10 text-slate-700 mb-2" />
            <p className="text-slate-500">No tokens created yet.</p>
          </div>
        }
        renderItem={(token) => (
          <div
            key={token.address}
            className="p-3 md:p-4 rounded-2xl
                       bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/60
                       border border-slate-800/60
                       shadow-sm
                       transition-none
                       no-hover"
          >
            <div className="flex items-center gap-3 no-hover">
              {/* Logo + Token info (same-tab navigation) */}
              <a
                href={`/token/${token.address}`}
                className="flex items-center gap-3 min-w-0 flex-1 no-hover"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToToken(token.address);
                }}
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-md bg-purple-500/8 flex items-center justify-center shrink-0 overflow-hidden border-2 border-purple-400/20 no-hover">
                  {token.logo ? (
                    <img
                      src={token.logo}
                      alt={token.symbol || token.address}
                      className="w-full h-full object-cover rounded-md no-hover"
                    />
                  ) : (
                    <span className="font-bold text-purple-300 text-lg">
                      {(token.symbol || "T").charAt(0)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-semibold text-white truncate text-sm md:text-base">
                    {token.symbol || "UNKNOWN"}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {shortAddress(token.address)}
                  </p>
                </div>
              </a>

              {/* Market Cap (hidden on small screens) */}
              <div className="hidden md:flex md:flex-col md:items-end md:justify-center md:mr-4 min-w-[120px] no-hover">
                <p className="text-sm font-extrabold text-cyan-400 truncate">
                  $
                  {(token.marketcap_usd || 0).toLocaleString(undefined, {
                    notation: "compact",
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-slate-500">Market Cap</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 no-hover">
                {!isPublicView && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openUpdateModal(token);
                    }}
                    className="p-2 bg-transparent hover:bg-transparent rounded-lg transition-none"
                    title="Edit token metadata"
                  >
                    <Edit3 className="w-4 h-4 text-purple-400" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToToken(token.address);
                  }}
                  className="p-2 bg-transparent hover:bg-transparent rounded-lg transition-none"
                  title="View token page"
                >
                  <Eye className="w-4 h-4 text-slate-400" />
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
