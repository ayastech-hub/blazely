/**
 * components/tokenpage/DevTokensPanel.jsx
 * * Updated: Now uses pre-calculated USD metrics from the useDevTokens hook.
 */
import React from "react";
import { Link } from "react-router-dom";
import { C } from "../../utils/designTokens";
import { Icon } from "./Icons";
import { useDevTokens } from "../../hooks/useDevTokens";
import { formatCompact, formatWei, shortenAddress } from "../../utils/format";

function CopyBtn({ text }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1600);
      }}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: ok ? C.teal : C.mid, display: "flex", alignItems: "center" }}
    >
      {ok ? <Icon.Check /> : <Icon.Copy />}
    </button>
  );
}

export default function DevTokensPanel({ creatorWallet, currentTokenAddress }) {
  const { tokens, loading } = useDevTokens(creatorWallet, currentTokenAddress);

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", background: C.panel2, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 9, color: C.mid, fontFamily: C.mono }}>DEV:</span>
        <span style={{ fontSize: 9, color: C.sub, fontFamily: C.mono }}>{shortenAddress(creatorWallet)}</span>
        <CopyBtn text={creatorWallet} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", padding: "5px 14px", background: C.panel, borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.mid, fontWeight: 700, fontFamily: C.mono, letterSpacing: "0.07em" }}>
        <span>TOKEN</span>
        <span style={{ textAlign: "right" }}>MC</span>
        <span style={{ textAlign: "right" }}>VAULT</span>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>Loading...</div>}
        {!loading && tokens.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>No other tokens from this creator.</div>
        )}
        {tokens.map((t) => (
          <Link
            key={t.address}
            to={`/token/${t.address}`}
            style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", padding: "11px 14px", borderBottom: `1px solid ${C.border}`, alignItems: "center", textDecoration: "none", color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, background: "linear-gradient(135deg,#0d1320,#030712)", border: `1px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 7, fontWeight: 700, color: C.teal }}>
                {t.symbol?.slice(0, 2)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.bright, fontWeight: 600, fontFamily: C.mono, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                {t.isCurrent && <span style={{ fontSize: 8, fontWeight: 700, color: C.teal, background: C.tealDim, border: `1px solid ${C.teal}`, borderRadius: 3, padding: "1px 4px", fontFamily: C.mono }}>LIVE</span>}
                {t.graduated && !t.isCurrent && <span style={{ fontSize: 8, color: C.mid, fontFamily: C.mono }}>graduated</span>}
              </div>
            </div>
            {/* Using the pre-calculated USD values from the hook */}
            <span style={{ textAlign: "right", fontSize: 10, color: C.bright, fontFamily: C.mono, fontWeight: 600 }}>
              {t.marketCapUsd != null ? `${formatCompact(t.marketCapUsd, true)}` : "—"}
            </span>
            <span style={{ textAlign: "right", fontSize: 10, color: C.sub, fontFamily: C.mono }}>
              {t.vaultUsd != null ? `${formatCompact(t.vaultUsd, true)}` : "—"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
