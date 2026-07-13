// src/tabP/FollowButton.jsx
import React from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { C } from "../utils/designForProfile";

const FollowButton = ({ isFollowing, busy, disabled, onToggle, connectPrompt = false }) => {
  if (connectPrompt) {
    return (
      <button
        disabled
        title="Connect your wallet to follow"
        className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 opacity-50 cursor-not-allowed"
        style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, color: C.sub }}
      >
        <UserPlus size={15} />
        Connect to follow
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled || busy}
      className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-60"
      style={
        isFollowing
          ? { backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, color: C.mid }
          : { backgroundColor: C.teal, color: C.bg }
      }
    >
      {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
      {busy ? "Working..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
};

export default FollowButton;
