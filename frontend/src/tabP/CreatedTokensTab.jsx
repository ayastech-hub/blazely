// src/tabP/CreatedTokensTab.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Edit3, ArrowUpRight } from "lucide-react";
import { C } from "../utils/designForProfile";
import { shortenAddress, formatCompact } from "../utils/format";

const CreatedTokensTab = ({
  data = [],
  loading = false,
  searchTerm = "",
  setSearchTerm = () => {},
  openUpdateModal = () => {},
  DashboardCard,
  isPublicView = false,
}) => {
  const navigate = useNavigate();

  return (
    <DashboardCard
      title="Tokens created"
      subtitle="Projects you've launched on Blazely"
      icon={Sparkles}
      count={Array.isArray(data) ? data.length : 0}
      isLoading={loading}
      data={data}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by name or symbol..."
      emptyState={
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Sparkles size={20} style={{ color: C.faint }} />
          <span className="text-sm" style={{ color: C.sub }}>
            You haven't created any tokens yet
          </span>
        </div>
      }
      renderItem={(token) => (
        <div
          key={token.address}
          className="p-3.5 rounded-xl transition-colors hover:bg-white/[0.02]"
          style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/token/${token.address}`)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left group"
            >
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
                <h4 className="font-semibold truncate text-sm transition-colors" style={{ color: C.bright }}>
                  {token.name || token.symbol || "Unnamed token"}
                </h4>
                <p className="text-xs font-mono truncate" style={{ color: C.sub }}>
                  {token.symbol} · {shortenAddress(token.address)}
                </p>
              </div>
            </button>

            <div className="hidden md:flex flex-col items-end justify-center min-w-[110px]">
              <span className="text-sm font-semibold tabular-nums" style={{ color: C.bright }}>
                {token.market_cap != null ? `${formatCompact(Number(token.market_cap))} ETH` : "—"}
              </span>
              <span className="text-[11px]" style={{ color: C.sub }}>
                Market cap
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isPublicView && (
                <button
                  onClick={() => openUpdateModal(token)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.sub }}
                  title="Edit token details"
                >
                  <Edit3 size={13} />
                </button>
              )}

              <button
                onClick={() => navigate(`/token/${token.address}`)}
                className="p-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.sub }}
                title="View token"
              >
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default CreatedTokensTab;
