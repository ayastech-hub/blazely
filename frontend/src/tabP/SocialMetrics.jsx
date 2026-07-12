// src/tabP/SocialMetrics.jsx
import React from "react";
import { Users, Eye } from "lucide-react";
import { C } from "../utils/designforprofile.js";

export const SocialMetrics = ({ followingCount = 0, watchlistCount = 0 }) => {
  return (
    <div className="grid grid-cols-2 gap-2 text-left font-mono text-[11px] w-full max-w-sm">
      <div
        className="p-2 rounded flex items-center gap-2"
        style={{ backgroundColor: "rgba(3,7,18,0.6)", border: `1px solid ${C.border}` }}
      >
        <div className="p-1.5 rounded" style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.mid }}>
          <Users size={12} />
        </div>
        <div>
          <span className="uppercase font-bold text-[9px] block tracking-wider" style={{ color: C.sub }}>
            Following
          </span>
          <span className="text-xs font-black block" style={{ color: C.bright }}>
            {followingCount} {followingCount === 1 ? "person" : "people"}
          </span>
        </div>
      </div>

      <div
        className="p-2 rounded flex items-center gap-2"
        style={{ backgroundColor: "rgba(3,7,18,0.6)", border: `1px solid ${C.border}` }}
      >
        <div className="p-1.5 rounded" style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.mid }}>
          <Eye size={12} />
        </div>
        <div>
          <span className="uppercase font-bold text-[9px] block tracking-wider" style={{ color: C.sub }}>
            Watchlist
          </span>
          <span className="text-xs font-black block" style={{ color: C.bright }}>
            {watchlistCount} {watchlistCount === 1 ? "token" : "tokens"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SocialMetrics;
