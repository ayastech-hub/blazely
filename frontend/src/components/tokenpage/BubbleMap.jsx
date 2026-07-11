import React, { useState } from "react";
import { C } from "../../utils/designTokens";
import { useTokenHolders } from "../../hooks/useTokenHolders";
import { computeBubbleLayout } from "../../utils/bubblePacking";

const LAUNCHPAD_ADDRESS = (import.meta.env.VITE_LAUNCHPAD_ADDRESS || "").toLowerCase();
const BUBBLE_COLORS = ["#96d6cd", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#fbbf24", "#fb7185", "#475569"];

export default function BubbleMap({ tokenAddress, circulatingSupply }) {
  const { holders, loading } = useTokenHolders(tokenAddress, 30);
  const [hovered, setHovered] = useState(null);

  const width = 540;
  const height = 320;
  const layout = computeBubbleLayout(holders, Number(circulatingSupply) || 0, width, height);

  return (
    <div style={{ flex: 1, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: C.sub, fontFamily: C.mono, letterSpacing: "0.1em" }}>HOLDER DISTRIBUTION</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 9, color: C.mid, fontFamily: C.mono }}>{holders.length} shown</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 280,
          position: "relative",
          background: C.bgDeep,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.mid, fontSize: 10, fontFamily: C.mono }}>
            Loading...
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
            {[0, width / 5, (2 * width) / 5, (3 * width) / 5, (4 * width) / 5, width].map((x) => (
              <line key={x} x1={x} y1={0} x2={x} y2={height} stroke="#1e293b" strokeWidth="0.3" />
            ))}
            {[0, height / 5, (2 * height) / 5, (3 * height) / 5, (4 * height) / 5, height].map((y) => (
              <line key={y} x1={0} y1={y} x2={width} y2={y} stroke="#1e293b" strokeWidth="0.3" />
            ))}

            {layout.map((b, i) => {
              const isLaunchpad = b.wallet_address.toLowerCase() === LAUNCHPAD_ADDRESS;
              const col = isLaunchpad ? C.teal : BUBBLE_COLORS[i % BUBBLE_COLORS.length];
              const isHovered = hovered === i;
              return (
                <g key={b.wallet_address} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
                  <circle cx={b.x} cy={b.y} r={b.r + 5} fill={col} opacity="0.04" />
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill={col}
                    fillOpacity={isHovered ? 0.3 : 0.14}
                    stroke={col}
                    strokeWidth={isHovered ? 1.5 : 0.7}
                    strokeOpacity={isHovered ? 1 : 0.45}
                  />
                  {b.r > 15 && (
                    <>
                      <text x={b.x} y={b.y - 3} textAnchor="middle" fill={col} fontSize={Math.min(b.r * 0.27, 10)} fontFamily="monospace" fontWeight="700">
                        {b.wallet_address.slice(0, 6)}
                      </text>
                      <text x={b.x} y={b.y + 9} textAnchor="middle" fill={col} fontSize={Math.min(b.r * 0.24, 9)} fontFamily="monospace">
                        {b.pct.toFixed(1)}%
                      </text>
                      {isLaunchpad && (
                        <text x={b.x} y={b.y + 20} textAnchor="middle" fill={col} fontSize="7" fontFamily="monospace">
                          CURVE
                        </text>
                      )}
                    </>
                  )}
                  {isHovered && b.r <= 15 && (
                    <text x={b.x} y={b.y - b.r - 5} textAnchor="middle" fill={col} fontSize="8" fontFamily="monospace">
                      {b.pct.toFixed(2)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(2,4,10,0.9)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "7px 10px" }}>
          {[
            { col: C.teal, l: "Bonding Curve / LP" },
            { col: "#fbbf24", l: "Large Holder" },
            { col: "#475569", l: "Other" },
          ].map((x) => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: x.col, opacity: 0.7 }} />
              <span style={{ fontSize: 8, color: C.sub, fontFamily: C.mono }}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 8, color: C.dim, fontFamily: C.mono }}>
        Bubble sizes are area-proportional to holding %. Layout is a deterministic spiral, not a
        collision-resolved physics simulation — see utils/bubblePacking.js for the upgrade path if
        you want guaranteed non-overlap.
      </div>
    </div>
  );
}
