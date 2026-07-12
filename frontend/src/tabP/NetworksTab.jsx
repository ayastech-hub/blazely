// src/tabP/NetworksTab.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Eye } from "lucide-react";
import { C } from "../utils/designforprofile.js";
import { shortenAddress } from "../utils/format";

const NetworksTab = ({
  following = [],
  watchlist = [],
  onUnfollow = () => {},
  onRemoveWatchlist = () => {},
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 font-mono text-[11px]">
      <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: C.panelAlt, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 border-b pb-2 mb-2" style={{ borderColor: C.border }}>
          <Users size={12} style={{ color: C.teal }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.mid }}>
            People you follow
          </span>
        </div>
        {following.length === 0 ? (
          <p className="text-[10px] py-4" style={{ color: C.faint }}>
            You're not following anyone yet.
          </p>
        ) : (
          following.map((item) => (
            <div
              key={item.following_wallet}
              onClick={() => navigate(`/user/${item.following_wallet}`)}
              className="flex items-center justify-between p-2 rounded cursor-pointer transition-all group"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
            >
              <div className="min-w-0">
                <span className="text-xs font-bold block" style={{ color: C.bright }}>
                  {item.users?.display_name || "Anonymous"}
                </span>
                <span className="text-[9px] font-mono block" style={{ color: C.sub }}>
                  {shortenAddress(item.following_wallet, 6)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnfollow(item.following_wallet);
                }}
                className="text-[9px] font-bold px-2 py-1 rounded transition-all uppercase"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.sub }}
              >
                Unfollow
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: C.panelAlt, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 border-b pb-2 mb-2" style={{ borderColor: C.border }}>
          <Eye size={12} style={{ color: C.teal }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.mid }}>
            Your watchlist
          </span>
        </div>
        {watchlist.length === 0 ? (
          <p className="text-[10px] py-4" style={{ color: C.faint }}>
            No tokens on your watchlist yet.
          </p>
        ) : (
          watchlist.map((item) => (
            <div
              key={item.token_address}
              onClick={() => navigate(`/token/${item.token_address}`)}
              className="flex items-center justify-between p-2 rounded cursor-pointer transition-all group"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wide block" style={{ color: C.bright }}>
                    ${item.tokens?.symbol || "TOKEN"}
                  </span>
                  <span className="text-[9px] font-mono truncate" style={{ color: C.sub }}>
                    ({item.tokens?.name || "Unknown"})
                  </span>
                </div>
                <span className="text-[9px] font-mono block mt-0.5" style={{ color: C.faint }}>
                  {shortenAddress(item.token_address, 6)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveWatchlist(item.token_address);
                }}
                className="text-[9px] font-bold px-2 py-1 rounded transition-all uppercase"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.sub }}
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
