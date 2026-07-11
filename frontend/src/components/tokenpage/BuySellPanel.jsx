import React, { useState } from "react";
import { C } from "../../utils/designTokens";
import { useBuySellLogic } from "../../hooks/useBuySellLogic";
import { ConnectKitButton } from "connectkit";
import { Loader2, CheckCircle } from "lucide-react";

function Label({ children }) {
  return (
    <div style={{ fontSize: 9, color: C.mid, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6, fontFamily: C.mono }}>
      {children}
    </div>
  );
}

export default function BuySellPanel({ token }) {
  const [showSlippage, setShowSlippage] = useState(false);
  const {
    activeTab,
    setActiveTab,
    amount,
    setAmount,
    slippage,
    setSlippage,
    getInputBalance,
    getReceiveSymbol,
    fixedPresets,
    setPresetAmount,
    handleAmountChange,
    handleSwap,
    isButtonDisabled,
    buttonStatus,
    transactionMessage,
  } = useBuySellLogic(token);

  const isBuy = activeTab === "Buy";
  const acc = isBuy ? C.teal : C.red;
  const accDim = isBuy ? C.tealDim : C.redDim;

  return (
    <div style={{ background: C.panel }}>
      <div style={{ display: "flex", padding: "6px 10px", gap: 4, background: C.bgDeep, borderBottom: `1px solid ${C.border}` }}>
        {["Buy", "Sell"].map((t) => {
          const active = activeTab === t;
          const c = t === "Buy" ? C.teal : C.red;
          return (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t);
                setAmount("");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 5,
                background: active ? (t === "Buy" ? C.tealDim : C.redDim) : "transparent",
                border: `1px solid ${active ? c : C.border}`,
                color: active ? c : C.mid,
                fontSize: 10,
                fontWeight: 800,
                cursor: "pointer",
                letterSpacing: "0.12em",
                fontFamily: C.mono,
              }}
            >
              {t.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "10px 10px 6px" }}>
        <Label>{isBuy ? "PAY (ETH)" : `SELL ${token?.symbol ?? "TOKEN"}`}</Label>
        <div style={{ display: "flex", alignItems: "center", background: C.bgDeep, border: `1px solid ${C.borderHi}`, borderRadius: 5, padding: "8px 10px", marginBottom: 6 }}>
          <span style={{ color: C.mid, marginRight: 6, fontSize: 12, fontFamily: C.mono }}>{isBuy ? "Ξ" : ""}</span>
          <input
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.bright, fontSize: 16, fontWeight: 700, fontFamily: C.mono }}
          />
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 8, textAlign: "right" }}>
            <div style={{ fontSize: 7, color: C.mid, fontFamily: C.mono }}>BAL</div>
            <button
              onClick={() => setAmount(getInputBalance().toString())}
              style={{ fontSize: 9, color: C.teal, fontWeight: 600, fontFamily: C.mono, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {getInputBalance().toFixed(4)}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {isBuy
            ? fixedPresets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPresetAmount(p.value)}
                  style={{ flex: 1, padding: "5px 0", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, color: C.mid, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: C.mono }}
                >
                  {p.label}
                </button>
              ))
            : [25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setAmount(((getInputBalance() * pct) / 100).toString())}
                  style={{ flex: 1, padding: "5px 0", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, color: C.mid, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: C.mono }}
                >
                  {pct}%
                </button>
              ))}
        </div>

        <div
          style={{
            background: C.bgDeep,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "7px 10px",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: C.mono,
          }}
        >
          <span style={{ fontSize: 8, color: C.mid }}>RECEIVE (est.)</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: acc }}>≈ {getReceiveSymbol()}</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowSlippage((v) => !v)}
            style={{ fontSize: 9, color: C.mid, background: "none", border: "none", cursor: "pointer", fontFamily: C.mono, padding: 0, marginBottom: showSlippage ? 6 : 0 }}
          >
            Slippage: {slippage}% ▾
          </button>
          {showSlippage && (
            <div style={{ display: "flex", gap: 4 }}>
              {[0.1, 0.5, 1.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    background: slippage === s ? C.tealDim : "transparent",
                    border: `1px solid ${slippage === s ? C.teal : C.border}`,
                    borderRadius: 3,
                    color: slippage === s ? C.teal : C.mid,
                    fontSize: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: C.mono,
                  }}
                >
                  {s}%
                </button>
              ))}
            </div>
          )}
        </div>

        {transactionMessage && (
          <div
            style={{
              marginBottom: 8,
              padding: "7px 10px",
              borderRadius: 4,
              fontSize: 10,
              fontFamily: C.mono,
              background: transactionMessage.type === "error" ? "rgba(251,113,133,0.08)" : C.tealDim,
              color: transactionMessage.type === "error" ? C.red : C.teal,
              border: `1px solid ${transactionMessage.type === "error" ? C.red : C.teal}`,
            }}
          >
            {transactionMessage.text}
          </div>
        )}

        <ConnectKitButton.Custom>
          {({ isConnected, show }) => (
            <button
              onClick={() => (isConnected ? handleSwap() : show())}
              disabled={isConnected && isButtonDisabled}
              style={{
                width: "100%",
                padding: "11px 0",
                background:
                  !isConnected || !isButtonDisabled
                    ? isBuy
                      ? `linear-gradient(135deg, ${C.teal} 0%, #5eead4 100%)`
                      : `linear-gradient(135deg, ${C.red} 0%, #fda4af 100%)`
                    : C.panel2,
                border: "none",
                borderRadius: 5,
                color: !isConnected || !isButtonDisabled ? "#030712" : C.dim,
                fontWeight: 800,
                fontSize: 11,
                cursor: isConnected && isButtonDisabled ? "not-allowed" : "pointer",
                letterSpacing: "0.1em",
                fontFamily: C.mono,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {["pending", "approving", "confirming"].includes(buttonStatus.type) && <Loader2 size={13} className="animate-spin" />}
              {buttonStatus.type === "success" && <CheckCircle size={13} />}
              {isConnected ? buttonStatus.text.toUpperCase() : "CONNECT WALLET"}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </div>
  );
}
