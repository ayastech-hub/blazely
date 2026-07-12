// src/tabP/CreatedTokensTab.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Edit3, Eye } from "lucide-react";
import { C } from "../utils/designforprofile.js";
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
    <div className="font-mono text-[11px]">
      <DashboardCard
        title="Tokens created"
        icon={Sparkles}
        count={Array.isArray(data) ? data.length : 0}
        isLoading={loading}
        data={data}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name or symbol..."
        emptyState={
          <div className="flex flex-col items-center justify-center py-8">
            <Sparkles size={16} className="mb-1" style={{ color: C.faint }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: C.sub }}>
              No tokens yet
            </span>
          </div>
        }
        renderItem={(token) => (
          <div
            key={token.address}
            className="p-3 rounded-none"
            style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => navigate(`/token/${token.address}`)}
                className="flex items-center gap-3 min-w-0 flex-1 group text-left"
              >
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
                  <h4
                    className="font-black uppercase tracking-wide truncate text-xs transition-colors"
                    style={{ color: C.bright }}
                  >
                    {token.symbol || "Unnamed token"}
                  </h4>
                  <p className="text-[10px] font-mono tracking-normal truncate" style={{ color: C.sub }}>
                    {shortenAddress(token.address)}
                  </p>
                </div>
              </button>

              <div className="hidden md:flex flex-col items-end justify-center min-w-[100px]">
                <span className="text-xs font-black tracking-wider" style={{ color: C.bright }}>
                  {token.market_cap != null ? `${formatCompact(Number(token.market_cap))} ETH` : "—"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.sub }}>
                  Market cap
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!isPublicView && (
                  <button
                    onClick={() => openUpdateModal(token)}
                    className="p-1.5 rounded-none transition-colors"
                    style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.sub }}
                    title="Edit token details"
                  >
                    <Edit3 size={12} />
                  </button>
                )}

                <button
                  onClick={() => navigate(`/token/${token.address}`)}
                  className="p-1.5 rounded-none transition-colors"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.sub }}
                  title="View token"
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
