// src/components/profile/SocialMetrics.jsx
import React from "react";
import { Users, Eye } from "lucide-react";

export const SocialMetrics = ({ followingCount = 0, watchlistCount = 0 }) => {
  return (
    <div className="grid grid-cols-2 gap-2 text-left font-mono text-[11px] w-full max-w-sm">
      <div className="p-2 bg-[#030712]/60 border border-slate-950 rounded flex items-center gap-2">
        <div className="p-1.5 bg-[#0b0f19] border border-slate-900 rounded text-slate-400">
          <Users size={12} />
        </div>
        <div>
          <span className="text-slate-500 uppercase font-bold text-[9px] block tracking-wider">FOLLOWING</span>
          <span className="text-xs font-black text-slate-200 block">{followingCount} users</span>
        </div>
      </div>

      <div className="p-2 bg-[#030712]/60 border border-slate-950 rounded flex items-center gap-2">
        <div className="p-1.5 bg-[#0b0f19] border border-slate-900 rounded text-slate-400">
          <Eye size={12} />
        </div>
        <div>
          <span className="text-slate-500 uppercase font-bold text-[9px] block tracking-wider">WATCHLIST</span>
          <span className="text-xs font-black text-slate-200 block">{watchlistCount} assets</span>
        </div>
      </div>
    </div>
  );
};
