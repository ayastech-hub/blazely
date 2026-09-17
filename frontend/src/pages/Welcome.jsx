// src/pages/Welcome.jsx
//
// Deliberately small: a compact card over a blurred backdrop, not a full-page
// hero. It overlays the app shell (see App.jsx) so the navbar stays visible
// (blurred) behind it, and dismisses in one click.

import React, { useState } from "react";
import { Rocket, X } from "lucide-react";
import { C } from "../utils/designTokens";
import { GLASS } from "../components/ui/GlassCard";

export default function Welcome({ onDismiss }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleEnter = () => {
    if (dontShowAgain) localStorage.setItem("hideWelcomeScreen", "true");
    onDismiss?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100, // top of the documented z-index scale — see index.css
        background: "rgba(3, 7, 18, 0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={handleEnter}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={GLASS}
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 20,
          padding: 24,
          fontFamily: C.sans,
          position: "relative",
        }}
      >
        <button
          onClick={handleEnter}
          aria-label="Dismiss"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            color: C.mid,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: C.tealDim,
            border: `1px solid ${C.teal}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Rocket size={18} color={C.teal} />
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>
          Welcome to Blazely
        </h2>
        <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, margin: "0 0 18px" }}>
          Fair-launch tokens on a bonding curve — no presale. Price moves with
          the curve, and liquidity migrates to Uniswap automatically once a
          token graduates.
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: C.mid,
            marginBottom: 16,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            style={{ accentColor: C.teal }}
          />
          Don't show this again
        </label>

        <button
          onClick={handleEnter}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 10,
            background: C.teal,
            color: C.bg,
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Enter App
        </button>
      </div>
    </div>
  );
}
