// src/tabP/NetworksTab.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Eye } from "lucide-react";
import { C } from "../utils/designForProfile";
import { shortenAddress } from "../utils/format";

const NetworksTab = ({
  following = [],
  watchlist = [],
  onUnfollow = () => {},
  onRemoveWatchlist = () => {},
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        className="p-5 sm:p-6 space-y-3"
        style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, borderRadius: C.radiusCard, boxShadow: C.shadowCard }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: C.borderSoft }}>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ backgroundColor: C.tealDim, color: C.teal }}>
            <Users size={16} />
          </div>
          <span className="text-sm font-semibold" style={{ color: C.bright }}>
            People you follow
          </span>
        </div>
        {following.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: C.sub }}>
            You're not following anyone yet.
          </p>
        ) : (
          following.map((item) => (
            <div
              key={item.followed_wallet}
              onClick={() => navigate(`/user/${item.followed_wallet}`)}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]"
              style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
            >
              <div className="min-w-0">
                <span className="text-sm font-medium block" style={{ color: C.bright }}>
                  {item.users?.display_name || "Anonymous"}
                </span>
                <span className="text-xs font-mono block" style={{ color: C.sub }}>
                  {shortenAddress(item.followed_wallet, 6)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnfollow(item.followed_wallet);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.sub }}
              >
                Unfollow
              </button>
            </div>
          ))
        )}
      </div>

      <div
        className="p-5 sm:p-6 space-y-3"
        style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, borderRadius: C.radiusCard, boxShadow: C.shadowCard }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: C.borderSoft }}>
          <div className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ backgroundColor: C.tealDim, color: C.teal }}>
            <Eye size={16} />
          </div>
          <span className="text-sm font-semibold" style={{ color: C.bright }}>
            Your watchlist
          </span>
        </div>
        {watchlist.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: C.sub }}>
            No tokens on your watchlist yet.
          </p>
        ) : (
          watchlist.map((item) => (
            <div
              key={item.token_address}
              onClick={() => navigate(`/token/${item.token_address}`)}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]"
              style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold" style={{ color: C.bright }}>
                    ${item.tokens?.symbol || "TOKEN"}
                  </span>
                  <span className="text-xs font-mono truncate" style={{ color: C.sub }}>
                    {item.tokens?.name || "Unknown"}
                  </span>
                </div>
                <span className="text-xs font-mono block mt-0.5" style={{ color: C.faint }}>
                  {shortenAddress(item.token_address, 6)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveWatchlist(item.token_address);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.sub }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NetworksTab;
