import React, { useState } from "react";
import { C } from "../../utils/designTokens";
import { Icon } from "./Icons";
import AnimatedNumber from "./AnimatedNumber";
import { formatCompact, formatWei, resolveLogoUrl, shortenAddress, timeAgo } from "../../utils/format";
import { supabase } from "../../lib/supabaseClient";

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1600);
      }}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: ok ? C.teal : C.mid, display: "flex", alignItems: "center", borderRadius: 3 }}
    >
      {ok ? <Icon.Check /> : <Icon.Copy />}
    </button>
  );
}

function InfoPopup({ onClose, metrics, token }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={onClose} />
      <div
        style={{
          position: "absolute",
          top: 50,
          right: 12,
          zIndex: 50,
          background: C.panel2,
          border: `1px solid ${C.borderHi}`,
          borderRadius: 8,
          padding: "14px 18px",
          minWidth: 190,
          boxShadow: `0 0 28px ${C.tealGlow},0 12px 40px rgba(0,0,0,0.8)`,
          fontFamily: C.mono,
        }}
      >
        <div style={{ fontSize: 8, color: C.mid, letterSpacing: "0.12em", marginBottom: 10 }}>TOKEN INFO</div>
        {[
          { l: "Price", v: `$${Number(metrics?.price_usd ? metrics.price_usd / 1e8 : 0).toFixed(8)}` },
          { l: "Vault", v: `${formatWei(metrics?.vault_balance_wei, 3)} ETH` },
          { l: "Progress", v: token?.graduated ? "Graduated" : `${(metrics?.pool_progress || 0).toFixed(1)}%` },
          { l: "Holders", v: `${metrics?.holder_count ?? 0}` },
        ].map((r) => (
          <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, color: C.sub }}>{r.l}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.bright }}>{r.v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function TokenHeaderBar({ token, metrics }) {
  const [showInfo, setShowInfo] = useState(false);
  const logoUrl = resolveLogoUrl(token, supabase);
  const shortCA = shortenAddress(token?.address, 6);
  // market_cap on token_metrics_latest is wei-denominated ETH (price * circulating supply),
  // NOT USD — there's no market_cap_usd field in this schema. Labeling this with a $ sign
  // would misrepresent an ETH amount as a dollar amount, so this displays "X.XX ETH" instead.
  const marketCapEth = Number(formatWei(metrics?.market_cap, 6)) || 0;

  return (
    <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, position: "relative" }}>
      <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${C.teal},transparent)`, opacity: 0.5 }} />
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            flexShrink: 0,
            background: "linear-gradient(135deg,#0d1320,#030712)",
            border: `1px solid ${C.borderHi}`,
            overflow: "hidden",
          }}
        >
          <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.bright, letterSpacing: "-0.5px", fontFamily: C.mono }}>{token?.name}</span>
            <span style={{ fontSize: 11, color: C.mid, fontFamily: C.mono }}>${token?.symbol}</span>
            {token?.created_at && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: C.sub,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 3,
                  padding: "2px 5px",
                  fontFamily: C.mono,
                }}
              >
                {timeAgo(token.created_at)} old
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 6,
              background: C.bgDeep,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "3px 7px",
              width: "fit-content",
            }}
          >
            <span style={{ fontSize: 9, color: C.mid, fontFamily: C.mono }}>{shortCA}</span>
            <CopyBtn text={token?.address} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {token?.twitter && (
              <a href={token.twitter} target="_blank" rel="noreferrer" style={socialStyle}>
                <Icon.X /> X
              </a>
            )}
            {token?.website && (
              <a href={token.website} target="_blank" rel="noreferrer" style={socialStyle}>
                <Icon.Globe /> Web
              </a>
            )}
            {token?.telegram && (
              <a href={token.telegram} target="_blank" rel="noreferrer" style={socialStyle}>
                <Icon.TG /> TG
              </a>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setShowInfo((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: 0 }}>
            <span style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.bright, letterSpacing: "-0.5px" }}>
              <AnimatedNumber value={marketCapEth} format={(v) => `${formatCompact(v)} ETH`} />
            </span>
            <span style={{ fontSize: 9, color: C.mid }}>{showInfo ? "▲" : "▾"}</span>
          </button>
          <span style={{ fontSize: 8, color: C.mid, fontFamily: C.mono }}>MARKET CAP</span>
        </div>
      </div>
      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} metrics={metrics} token={token} />}
    </div>
  );
}

const socialStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  color: "#64748b",
  fontSize: 9,
  fontFamily: C.mono,
  fontWeight: 600,
  background: C.panel2,
  border: `1px solid ${C.border}`,
  borderRadius: 3,
  padding: "2px 7px",
  textDecoration: "none",
  letterSpacing: "0.04em",
};
