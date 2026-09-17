/**
 * components/createTokenConfig.jsx
 * =================================================================================
 * Task 4 (Create Token refactor): the reusable form building-blocks and UI-only
 * "advanced configuration" scaffold used to live inline inside pages/CreateToken.jsx,
 * making that file harder to scan than it needed to be. They live here now so
 * CreateToken.jsx only has to import and compose them.
 *
 * IMPORTANT — kept from the original file's note: the advanced-feature rows this
 * file renders (fee/tax, creator vault, sniper protection, whitelist) are UI only.
 * There is no backend/contract support for them yet. All of their state still
 * lives in CreateToken.jsx's single `advanced` object, clearly separate from the
 * real submission state.
 *
 * On-chain/contract constants (TOTAL_SUPPLY, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH,
 * TOKENS_PER_ETH) are NOT here — those aren't "UI configuration", they're contract
 * facts, and they stay in CreateToken.jsx next to the validation/submit logic that
 * depends on them being exactly right.
 * =================================================================================
 */
import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassSurface } from "./TokenCard";

// ---------------------------------------------------------------------------------
// UI-only constants (no backend/contract support yet)
// ---------------------------------------------------------------------------------
export const MAX_TAX_PERCENT = 4;

export const SHORT_DURATION_PRESETS = [
  { key: "1h", label: "1 Hour" },
  { key: "1d", label: "1 Day" },
  { key: "1mo", label: "1 Month" },
  { key: "infinity", label: "Infinity" },
  { key: "custom", label: "Custom" },
];

export const VESTING_DURATION_PRESETS = [
  { key: "1mo", label: "1 Month" },
  { key: "3mo", label: "3 Months" },
  { key: "6mo", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "custom", label: "Custom" },
];

// ---------------------------------------------------------------------------------
// Reusable form field — glass system (translucent surface, soft border, teal
// focus/error states).
// ---------------------------------------------------------------------------------
export const Field = ({ label, isError, maxLength, value = "", isTextarea, ...rest }) => {
  const Comp = isTextarea ? "textarea" : "input";
  return (
    <div className="flex flex-col text-[11px] w-full">
      <div className="flex justify-between items-center text-[var(--text-faint-2)] font-bold uppercase tracking-wider mb-1">
        <span>{label}</span>
        {maxLength && (
          <span>
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>
      <Comp
        {...rest}
        value={value}
        maxLength={maxLength}
        className={`w-full p-2.5 bg-[var(--input-bg)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border rounded-lg font-mono text-xs focus:outline-none transition-colors ${
          isError ? "border-[var(--rose)] focus:border-[var(--rose)]" : "border-[var(--input-border)] focus:border-[var(--input-border-focus)]"
        }`}
      />
      {isError && <span className="text-[var(--rose)] text-[10px] mt-1">{isError}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------------
// Initial buy section — PURE display component. All validation lives in the parent
// (`ethValidation`), passed down as `errorMessage`, so there is exactly one place
// that decides whether an ETH amount is valid. `tokensPerEth`/`totalSupply` are
// passed in rather than imported, since those are contract facts owned by the page.
// ---------------------------------------------------------------------------------
export const InitialBuySection = ({ ethAmount, setEthAmount, walletBalance, errorMessage, tokensPerEth, totalSupply }) => {
  const balance = Number(walletBalance || 0);
  const [expanded, setExpanded] = useState(!!ethAmount);

  const setPercent = (pct) => {
    if (!balance || balance <= 0) return setEthAmount("");
    // Leave a small buffer for gas so "MAX" doesn't leave the user unable to pay for gas.
    const val = Math.max(0, balance - 0.001) * pct;
    setEthAmount(val.toFixed(6).replace(/\.?0+$/, ""));
  };

  const stats = useMemo(() => {
    const eth = parseFloat(ethAmount);
    if (!eth) return { tokens: "0", pct: "0.00" };
    return {
      tokens: (eth * tokensPerEth).toLocaleString(undefined, { maximumFractionDigits: 0 }),
      pct: (((eth * tokensPerEth) / totalSupply) * 100).toFixed(4),
    };
  }, [ethAmount, tokensPerEth, totalSupply]);

  return (
    <GlassSurface className="rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-[var(--text-mid-2)] font-bold uppercase tracking-wider font-mono text-[11px]">
          Initial Buy (optional){ethAmount ? ` — ${ethAmount} ETH` : ""}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-faint-2)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3.5 pt-0">
              <div className="flex flex-wrap justify-between items-center gap-1 mb-2.5 font-mono text-[11px]">
                <span className="text-[var(--text-faint-2)]">BAL: {balance.toFixed(6)} ETH</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-2.5">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.1"
                  step="0.000001"
                  min="0"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className={`w-full p-2.5 bg-[var(--input-bg)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border rounded-lg text-xs focus:outline-none transition-colors ${
                    errorMessage ? "border-[var(--rose)]" : "border-[var(--input-border)] focus:border-[var(--input-border-focus)]"
                  }`}
                />
                <div className="flex gap-1.5 shrink-0">
                  {[0.25, 0.5, 1].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercent(p)}
                      className="flex-1 sm:flex-initial px-2.5 py-2 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-lg text-[var(--text-mid-2)] hover:text-teal hover:border-teal/30 hover:bg-white/[0.06] transition-all text-[10px] font-bold"
                    >
                      {p === 1 ? "MAX" : `${p * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && <p className="text-[var(--rose)] mb-2 text-[10px] font-mono">{errorMessage}</p>}

              <div className="bg-[var(--bg)]/20 border border-white/[0.06] rounded-xl p-2.5 text-[10px] text-[var(--text-mid-2)] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>EST_TOKENS:</span>
                  <span className="text-[var(--text-bright-2)] font-bold">{stats.tokens}</span>
                </div>
                <div className="flex justify-between">
                  <span>SUPPLY_FILL:</span>
                  <span className="text-[var(--text-bright-2)] font-bold">{stats.pct}%</span>
                </div>
                <div className="text-[var(--border-mid)] text-[9px] pt-1">
                  Estimate only — excludes the 1% protocol fee, actual tokens received will be
                  slightly lower.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassSurface>
  );
};

// ---------------------------------------------------------------------------------
// ADVANCED CONFIG — shared presentational pieces (UI only, see file-level note above)
// ---------------------------------------------------------------------------------

export const ToggleSwitch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-[38px] h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
      checked ? "bg-teal" : "bg-white/[0.14]"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-[var(--bg)] transition-transform duration-200 ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

export const DurationSelector = ({ presets, value, onChange, customValue, customUnit, onCustomValueChange, onCustomUnitChange }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
      {presets.map((d) => (
        <button
          key={d.key}
          type="button"
          onClick={() => onChange(d.key)}
          className={`py-2 px-2 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all ${
            value === d.key
              ? "bg-teal/10 border-teal/40 text-teal"
              : "bg-[var(--bg)]/20 border-white/[0.08] text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] hover:border-white/[0.14]"
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>

    {value === "custom" && (
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          value={customValue}
          onChange={(e) => onCustomValueChange(e.target.value)}
          placeholder="Amount"
          className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
        />
        <select
          value={customUnit}
          onChange={(e) => onCustomUnitChange(e.target.value)}
          className="p-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
        >
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
      </div>
    )}
  </div>
);

export const FieldLabel = ({ children }) => (
  <label className="block text-[10px] text-[var(--text-faint-2)] uppercase tracking-widest font-bold mb-1.5">
    {children}
  </label>
);

// One collapsible feature row: icon, title, description, enable switch, and an
// expand/collapse chevron. Fields inside dim + go inert whenever the switch is off,
// even if the row is expanded — so "expanded but disabled" reads clearly.
export const AdvancedFeatureRow = ({ icon: Icon, title, description, enabled, onEnabledChange, expanded, onToggleExpanded, children }) => (
  <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[var(--bg)]/20 backdrop-blur-md">
    <button
      type="button"
      onClick={onToggleExpanded}
      className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/[0.03] transition-colors"
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          enabled ? "bg-teal/10 border-teal/30 text-teal" : "bg-white/[0.03] border-white/[0.08] text-[var(--text-faint-2)]"
        }`}
      >
        <Icon size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-[var(--text-bright-2)]">{title}</span>
        <p className="text-[10px] text-[var(--text-faint-2)] mt-0.5 truncate">{description}</p>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <ToggleSwitch checked={enabled} onChange={onEnabledChange} label={`Enable ${title}`} />
      </div>

      <ChevronDown
        size={14}
        className={`shrink-0 text-[var(--text-faint-2)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      />
    </button>

    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div
            className={`p-4 pt-3 border-t border-white/[0.06] space-y-3 transition-opacity ${
              enabled ? "" : "opacity-40 pointer-events-none"
            }`}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
