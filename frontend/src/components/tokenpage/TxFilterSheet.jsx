import React, { useState } from "react";
import { C } from "../../utils/designTokens";
import { Icon } from "./Icons";

function Label({ children }) {
  return (
    <div style={{ fontSize: 9, color: C.mid, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6, fontFamily: C.mono }}>
      {children}
    </div>
  );
}

export default function TxFilterSheet({ onClose, onApply }) {
  const [tab, setTab] = useState("Type");
  const [txType, setTxType] = useState("All");
  const [maker, setMaker] = useState("");
  const [usdMin, setUsdMin] = useState("");
  const [usdMax, setUsdMax] = useState("");

  const apply = () => {
    onApply({ txType, maker, usdMin, usdMax });
    onClose();
  };
  const reset = () => {
    setTxType("All");
    setMaker("");
    setUsdMin("");
    setUsdMax("");
  };

  const inp = {
    width: "100%",
    padding: "9px 11px",
    boxSizing: "border-box",
    background: C.bgDeep,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    color: C.bright,
    fontSize: 11,
    outline: "none",
    fontFamily: C.mono,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          background: C.panel,
          borderRadius: "10px 10px 0 0",
          border: `1px solid ${C.border}`,
          borderBottom: "none",
          paddingBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "11px 0 8px" }}>
          <div style={{ width: 30, height: 3, borderRadius: 2, background: C.border }} />
        </div>
        <div
          style={{
            padding: "0 18px 12px",
            fontSize: 11,
            fontWeight: 700,
            color: C.bright,
            fontFamily: C.mono,
            letterSpacing: "0.08em",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Icon.Filter /> TRANSACTIONS FILTER
        </div>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {["Type", "Amount"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent",
                color: tab === t ? C.teal : C.mid,
                padding: "9px 0",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: -1,
                letterSpacing: "0.06em",
                fontFamily: C.mono,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 18px 0" }}>
          {tab === "Type" && (
            <>
              <Label>TRANSACTION TYPE</Label>
              <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
                {["All", "Buy", "Sell"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTxType(v)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      background: txType === v ? C.tealDim : "transparent",
                      border: `1px solid ${txType === v ? C.teal : C.border}`,
                      borderRadius: 5,
                      color: txType === v ? C.teal : C.sub,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: C.mono,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Label>MAKER ADDRESS</Label>
              <input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="0x..." style={inp} />
            </>
          )}
          {tab === "Amount" && (
            <div>
              <Label>USD</Label>
              <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                {["Min", "Max"].map((ph, idx) => (
                  <div
                    key={ph}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      background: C.bgDeep,
                      border: `1px solid ${C.border}`,
                      borderRadius: 5,
                      padding: "8px 10px",
                    }}
                  >
                    <span style={{ color: C.mid, marginRight: 4, fontFamily: C.mono, fontSize: 11 }}>$</span>
                    <input
                      placeholder={ph}
                      value={idx === 0 ? usdMin : usdMax}
                      onChange={(e) => (idx === 0 ? setUsdMin(e.target.value) : setUsdMax(e.target.value))}
                      style={{ background: "none", border: "none", outline: "none", color: C.bright, fontSize: 11, width: "100%", fontFamily: C.mono }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 0" }}>
          <button onClick={reset} style={{ background: "none", border: "none", color: C.sub, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: C.mono }}>
            <Icon.Reset /> RESET
          </button>
          <button
            onClick={apply}
            style={{
              background: C.teal,
              border: "none",
              borderRadius: 5,
              color: "#030712",
              fontWeight: 700,
              fontSize: 11,
              padding: "10px 32px",
              cursor: "pointer",
              fontFamily: C.mono,
              letterSpacing: "0.06em",
            }}
          >
            APPLY
          </button>
        </div>
      </div>
    </div>
  );
}
