// src/components/tokenpage/BuySellPanel.jsx — v2
// Clean buy / sell panel. High-end, minimal chrome.
import React, { useState } from "react";
import { useBuySellLogic } from "../../hooks/useBuySellLogic";
import { ConnectKitButton } from "connectkit";
import { Loader2, CheckCircle2 } from "lucide-react";
import { GLASS } from "../ui/GlassCard";
import LiquidTabs from "../ui/LiquidTabs";

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
  const accent = isBuy ? "teal" : "rose";
  const accentText = isBuy ? "text-teal" : "text-rose";
  const accentBg = isBuy ? "bg-teal/10 border-teal/30" : "bg-rose/10 border-rose/30";
  const accentBtn = isBuy
    ? "bg-teal text-[var(--bg)] hover:brightness-110"
    : "bg-rose text-white hover:brightness-110";

  return (
    <div className={`${GLASS} rounded-2xl overflow-hidden`}>
      {/* Tabs — liquid glass */}
      <div className="p-2">
        <LiquidTabs
          size="full"
          variant="buySell"
          value={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            setAmount("");
          }}
          items={[
            { id: "Buy", label: "Buy" },
            { id: "Sell", label: "Sell" },
          ]}
        />
      </div>

      <div className="p-4 space-y-3.5">
        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-mid-2)]">
              {isBuy ? "You pay" : "You sell"}
            </span>
            <button
              type="button"
              onClick={() => setAmount(getInputBalance().toString())}
              className="text-[11px] text-[var(--text-faint-2)] hover:text-teal transition-colors tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Bal {getInputBalance().toFixed(4)}
            </button>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-[var(--bg)]/50 border border-white/[0.08] focus-within:border-teal/30 transition-colors">
            {isBuy && (
              <span
                className="text-[var(--text-faint-2)] text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Ξ
              </span>
            )}
            <input
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="flex-1 bg-transparent border-none outline-none text-[var(--text-bright)] text-lg font-medium tabular-nums placeholder:text-[var(--text-faint-2)]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <span
              className="text-xs text-[var(--text-faint-2)] shrink-0"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {isBuy ? "ETH" : token?.symbol ?? "TOKEN"}
            </span>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-1.5">
          {isBuy
            ? fixedPresets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPresetAmount(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] text-[var(--text-mid-2)] border border-white/[0.06] hover:border-teal/25 hover:text-teal transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {p.label}
                </button>
              ))
            : [25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setAmount(((getInputBalance() * pct) / 100).toString())}
                  className="flex-1 py-1.5 rounded-lg text-[11px] text-[var(--text-mid-2)] border border-white/[0.06] hover:border-rose/25 hover:text-rose transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {pct}%
                </button>
              ))}
        </div>

        {/* Receive estimate */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/30 border border-white/[0.05]">
          <span className="text-[11px] text-[var(--text-faint-2)]">You receive</span>
          <span
            className={`text-sm font-medium tabular-nums ${accentText}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            ≈ {getReceiveSymbol()}
          </span>
        </div>

        {/* Slippage */}
        <div>
          <button
            type="button"
            onClick={() => setShowSlippage((v) => !v)}
            className="text-[11px] text-[var(--text-faint-2)] hover:text-[var(--text-mid)] transition-colors"
          >
            Slippage {slippage}%
          </button>
          {showSlippage && (
            <div className="flex gap-1.5 mt-2">
              {[0.1, 0.5, 1.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] transition-colors ${
                    slippage === s
                      ? "bg-teal/10 text-teal border border-teal/30"
                      : "text-[var(--text-mid-2)] border border-white/[0.06] hover:border-white/[0.1]"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message */}
        {transactionMessage && (
          <div
            className={`px-3 py-2.5 rounded-xl text-xs ${
              transactionMessage.type === "error"
                ? "bg-rose/10 text-rose border border-rose/20"
                : "bg-teal/10 text-teal border border-teal/20"
            }`}
          >
            {transactionMessage.text}
          </div>
        )}

        {/* CTA */}
        <ConnectKitButton.Custom>
          {({ isConnected, show }) => {
            const busy = ["pending", "approving", "confirming"].includes(buttonStatus.type);
            const success = buttonStatus.type === "success";
            const disabled = isConnected && isButtonDisabled;

            return (
              <button
                type="button"
                onClick={() => (isConnected ? handleSwap() : show())}
                disabled={disabled}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  !isConnected
                    ? "bg-teal text-[var(--bg)] hover:brightness-110"
                    : disabled
                    ? "bg-[var(--panel-raised)] text-[var(--text-faint-2)] cursor-not-allowed"
                    : accentBtn
                }`}
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                {success && <CheckCircle2 size={15} />}
                {isConnected ? buttonStatus.text : "Connect wallet"}
              </button>
            );
          }}
        </ConnectKitButton.Custom>
      </div>
    </div>
  );
}
