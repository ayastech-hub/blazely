/**
 * components/tokenpage/HoldersPanel.jsx
 *
 * One thing worth understanding about this data, not a bug: pre-graduation, the #1 "holder"
 * is almost always the launchpad contract itself (it holds all unsold + sold-back curve
 * inventory) — that's correct and expected, not an error. This panel labels that row
 * explicitly rather than showing a mysterious wallet address for what's actually the curve.
 */
import React from "react";
import { C } from "../../utils/designTokens";
import { useTokenHolders } from "../../hooks/useTokenHolders";

const LAUNCHPAD_ADDRESS = (import.meta.env.VITE_LAUNCHPAD_ADDRESS || "").toLowerCase();

export default function HoldersPanel({ tokenAddress, circulatingSupply, liquidityPair, graduated }) {
  const { holders, loading } = useTokenHolders(tokenAddress, 50);

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>Loading holders...</div>;
  }
  if (holders.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>No holders yet.</div>;
  }

  const colHdr = {
    display: "grid",
    gridTemplateColumns: "26px 1fr 66px",
    padding: "5px 14px",
    background: C.panel,
    borderBottom: `1px solid ${C.border}`,
    fontSize: 9,
    color: C.mid,
    fontWeight: 700,
    fontFamily: C.mono,
    letterSpacing: "0.07em",
    flexShrink: 0,
  };

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={colHdr}>
        <span>#</span>
        <span>HOLDER</span>
        <span style={{ textAlign: "right" }}>%</span>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {holders.map((h, i) => {
          // Robust math: handle null/undefined/zero supply explicitly
          const balanceBig = BigInt(h.balance || "0");
          const supplyBig = circulatingSupply ? BigInt(circulatingSupply) : 0n;

          // Prevent division by zero and logical impossibilities (>100%)
          const pct = (supplyBig > 0n && balanceBig <= supplyBig) 
            ? Number((balanceBig * 10000n) / supplyBig) / 100 
            : (balanceBig > 0n && supplyBig > 0n ? 100.00 : 0.00);

          const isLaunchpad = h.wallet_address.toLowerCase() === LAUNCHPAD_ADDRESS;
          const isPair = graduated && liquidityPair && h.wallet_address.toLowerCase() === liquidityPair.toLowerCase();
          const tag = isLaunchpad ? "CURVE" : isPair ? "LP" : null;

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
                  {tag && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: C.teal,
                        background: C.tealDim,
                        border: `1px solid ${C.teal}`,
                        borderRadius: 3,
                        padding: "2px 5px",
                        fontFamily: C.mono,
                      }}
                    >
                      {tag}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 2,
                    borderRadius: 1,
                    background: `linear-gradient(to right,${C.teal},transparent)`,
                    // Hard cap the UI bar width at 100%
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
