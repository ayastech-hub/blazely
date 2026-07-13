// src/tabP/SocialMetrics.jsx
import React from "react";
import { Users, Eye } from "lucide-react";
import { C } from "../utils/designForProfile";

export const SocialMetrics = ({ followingCount = 0, watchlistCount = 0 }) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
      >
        <Users size={13} style={{ color: C.sub }} />
        <span className="text-xs font-medium" style={{ color: C.mid }}>
          {followingCount} following
        </span>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
      >
        <Eye size={13} style={{ color: C.sub }} />
        <span className="text-xs font-medium" style={{ color: C.mid }}>
          {watchlistCount} watching
        </span>
      </div>
    </div>
  );
};

export default SocialMetrics;
