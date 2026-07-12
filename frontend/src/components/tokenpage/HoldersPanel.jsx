/**
 * components/tokenpage/HoldersPanel.jsx
 *
 * Fixed-supply logic: We use a constant 1B total supply (1e9 * 1e18) to calculate
 * ownership percentages. This ensures consistency and prevents percentage 
 * fluctuations caused by indexer lag.
 */
import React from "react";
import { C } from "../../utils/designTokens";
import { useTokenHolders } from "../../hooks/useTokenHolders";

const LAUNCHPAD_ADDRESS = (import.meta.env.VITE_LAUNCHPAD_ADDRESS || "").toLowerCase();
const BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n;

export default function HoldersPanel({ tokenAddress, creatorWallet, liquidityPair, graduated }) {
  const { holders, loading } = useTokenHolders(tokenAddress, 50);

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>Loading holders...</div>;
  }
  if (holders.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>No holders yet.</div>;
  }

  const getTagStyle = (tag) => {
    const isBurn = tag === "BURNED";
    const isDev = tag === "DEV";
    return {
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: "0.08em",
      color: isBurn ? "#ff4d4d" : isDev ? "#f59e0b" : C.teal,
      background: isBurn ? "rgba(255, 77, 77, 0.1)" : isDev ? "rgba(245, 158, 11, 0.1)" : C.tealDim,
      border: `1px solid ${isBurn ? "#ff4d4d" : isDev ? "#f59e0b" : C.teal}`,
      borderRadius: 3,
      padding: "2px 5px",
      fontFamily: C.mono,
    };
  };

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 66px", padding: "5px 14px", background: C.panel, borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.mid, fontWeight: 700, fontFamily: C.mono, letterSpacing: "0.07em", flexShrink: 0 }}>
        <span>#</span>
        <span>HOLDER</span>
        <span style={{ textAlign: "right" }}>%</span>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {holders.map((h, i) => {
          const balanceBig = BigInt(h.balance || "0");
          const pct = Number((balanceBig * 10000n) / TOTAL_SUPPLY) / 100;

          const addr = h.wallet_address.toLowerCase();
          const isLaunchpad = addr === LAUNCHPAD_ADDRESS;
          const isBurn = addr === BURN_ADDRESS;
          const isDev = creatorWallet && addr === creatorWallet.toLowerCase();
          const isPair = graduated && liquidityPair && addr === liquidityPair.toLowerCase();
          
          const tag = isLaunchpad ? "CURVE" : isBurn ? "BURNED" : isDev ? "DEV" : isPair ? "LP" : null;

          return (
            <div
              key={h.wallet_address}
              style={{
                display: "grid",
                gridTemplateColumns: "26px 1fr 66px",
                padding: "9px 14px",
                borderBottom: `1px solid ${C.border}`,
                alignItems: "center",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.008)",
              }}
            >
              <span style={{ color: C.dim, fontSize: 9, fontFamily: C.mono }}>{i + 1}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: C.sub, fontFamily: C.mono }}>
                    {h.wallet_address.slice(0, 6)}...{h.wallet_address.slice(-4)}
                  </span>
                  {tag && <span style={getTagStyle(tag)}>{tag}</span>}
                </div>
                <div
                  style={{
                    height: 2,
                    borderRadius: 1,
                    background: `linear-gradient(to right,${C.teal},transparent)`,
                    width: `${Math.min(pct, 100)}%`,
                    opacity: 0.5,
                  }}
                />
              </div>
              <span style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: C.bright, fontFamily: C.mono }}>
                {pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
