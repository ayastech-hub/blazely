import React from "react";
import { C } from "../../utils/designTokens";
import { Icon } from "./Icons";
import { formatWei, shortenAddress, timeAgo } from "../../utils/format";
import { usePrices } from "../../hooks/usePrices";
import { ethToUsd } from "../../utils/priceConversion";

const TOTAL_SUPPLY = 1_000_000_000; // fixed by the contract (BlazelyLaunchpad.TOTAL_SUPPLY)

export default function InfoPanel({ token, metrics }) {

  const { ethUsd } = usePrices();

  if (!token) return null;

  const ageLabel = token.created_at ? timeAgo(token.created_at) + " ago" : "—";
const vaultEth = Number(
  formatWei(metrics?.vault_balance_wei, 4)
);

const vaultUsd = ethToUsd(
  vaultEth,
  ethUsd
);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ color: C.teal }}>
          <Icon.Info />
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.bright, fontFamily: C.mono, letterSpacing: "0.08em" }}>TOKEN INFO</span>
      </div>

      {token.description && (
        <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, margin: "0 0 18px", fontFamily: C.sans }}>{token.description}</p>
      )}

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        {[
          { l: "Symbol", v: token.symbol },
          { l: "Name", v: token.name },
          { l: "Creator", v: shortenAddress(token.creator_wallet) },
          { l: "Age", v: ageLabel },
          { l: "Total Supply", v: `${(TOTAL_SUPPLY / 1_000_000).toFixed(0)}M` },
          { l: "Circulating (curve)", v: `${(Number(metrics?.circulating_supply || 0) / 1e18 / 1_000_000).toFixed(2)}M` },
          {
  l: "Vault",
  v:
    vaultUsd != null
      ? `$${vaultUsd.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`
      : `${vaultEth} ETH`,
},
          { l: "Status", v: token.graduated ? "Graduated" : `${(metrics?.pool_progress || 0).toFixed(1)}% to graduation` },
        ].map((r) => (
          <div
            key={r.l}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontFamily: C.mono }}
          >
            <span style={{ fontSize: 10, color: C.mid }}>{r.l}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.bright }}>{r.v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 16, flexWrap: "wrap" }}>
        {token.website && (
          <a
            href={token.website}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.teal, fontFamily: C.mono, fontWeight: 600, background: C.tealDim, border: `1px solid ${C.teal}`, borderRadius: 5, padding: "6px 12px", textDecoration: "none" }}
          >
            <Icon.Globe /> Website
          </a>
        )}
        {token.twitter && (
          <a
            href={token.twitter}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.sub, fontFamily: C.mono, fontWeight: 600, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px 12px", textDecoration: "none" }}
          >
            <Icon.X /> Twitter
          </a>
        )}
        {token.telegram && (
          <a
            href={token.telegram}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.sub, fontFamily: C.mono, fontWeight: 600, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px 12px", textDecoration: "none" }}
          >
            <Icon.TG /> Telegram
          </a>
        )}
      </div>
    </div>
  );
}
