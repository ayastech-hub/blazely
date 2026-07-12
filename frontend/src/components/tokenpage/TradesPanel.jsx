import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { C } from "../../utils/designTokens";
import { Icon } from "./Icons";
import { useTokenTrades } from "../../hooks/useTokenTrades";
import { useTopTradersForToken } from "../../hooks/useTopTradersForToken";
import { explorerTxUrl, timeAgo } from "../../utils/format";
import TxFilterSheet from "./TxFilterSheet";

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

const colHdr = (cols) => ({
  display: "grid",
  gridTemplateColumns: cols,
  padding: "5px 14px",
  background: C.panel,
  borderBottom: `1px solid ${C.border}`,
  fontSize: 9,
  color: C.mid,
  fontWeight: 700,
  fontFamily: C.mono,
  letterSpacing: "0.07em",
  flexShrink: 0,
});

function TopTradersTable({ tokenAddress }) {
  const { traders, loading } = useTopTradersForToken(tokenAddress);

  if (loading) return <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>Loading...</div>;
  if (traders.length === 0) return <div style={{ padding: 20, textAlign: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>No trades yet.</div>;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={colHdr("26px 1fr 50px 50px 70px 70px 70px")}>
        <span>#</span>
        <span>TRADER</span>
        <span style={{ textAlign: "right" }}>BUYS</span>
        <span style={{ textAlign: "right" }}>SELLS</span>
        <span style={{ textAlign: "right" }}>BUY VAL</span>
        <span style={{ textAlign: "right" }}>SELL VAL</span>
        <span style={{ textAlign: "right" }}>VOLUME</span>
      </div>
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: "80px" }}>
        {traders.map((t) => (
          <div key={t.wallet} style={{ display: "grid", gridTemplateColumns: "26px 1fr 50px 50px 70px 70px 70px", padding: "9px 14px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: C.mono }}>{t.rank}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t.rank === 1 && <Icon.Trophy />}
              <Link to={`/user/${t.wallet}`} style={{ fontSize: 11, color: C.sub, fontFamily: C.mono, textDecoration: "none" }}>{t.wallet.slice(0, 6)}...{t.wallet.slice(-4)}</Link>
            </div>
            <span style={{ textAlign: "right", fontSize: 11, color: C.teal, fontFamily: C.mono, fontWeight: 700 }}>{t.buys}</span>
            <span style={{ textAlign: "right", fontSize: 11, color: C.red, fontFamily: C.mono, fontWeight: 700 }}>{t.sells}</span>
            <span style={{ textAlign: "right", fontSize: 11, color: C.text, fontFamily: C.mono }}>${t.buyVolumeUsd?.toLocaleString()}</span>
            <span style={{ textAlign: "right", fontSize: 11, color: C.text, fontFamily: C.mono }}>${t.sellVolumeUsd?.toLocaleString()}</span>
            <span style={{ textAlign: "right", fontSize: 11, fontWeight: 700, fontFamily: C.mono, color: C.bright }}>${t.totalVolumeUsd?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradesPanel({ tokenAddress, creatorWallet }) {
  const [subtab, setSubtab] = useState("Trades");
  const [showFilter, setShowFilter] = useState(false);
  const [txFilter, setTxFilter] = useState({ txType: "All", maker: "", usdMin: "", usdMax: "" });
  const [now, setNow] = useState(Date.now());
  const { trades, loading } = useTokenTrades(tokenAddress);

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const visibleTrades = trades.filter((t) => {
    if (txFilter.txType !== "All" && t.type !== txFilter.txType.toLowerCase()) return false;
    if (txFilter.maker && !t.user_address?.toLowerCase().includes(txFilter.maker.toLowerCase())) return false;
    if (txFilter.usdMin && Number(t.usd_value || 0) < parseFloat(txFilter.usdMin)) return false;
    if (txFilter.usdMax && Number(t.usd_value || 0) > parseFloat(txFilter.usdMax)) return false;
    return true;
  });

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {["Trades", "Top Traders"].map((t) => (
          <button key={t} onClick={() => setSubtab(t)} style={{ background: "none", border: "none", whiteSpace: "nowrap", padding: "8px 13px", fontSize: 10, fontWeight: subtab === t ? 700 : 500, color: subtab === t ? C.bright : C.mid, borderBottom: subtab === t ? `2px solid ${C.teal}` : "2px solid transparent", cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.04em" }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        {subtab === "Trades" && (
          <button onClick={() => setShowFilter(true)} style={{ background: "none", border: "none", color: C.mid, cursor: "pointer", padding: "0 8px" }}><Icon.Filter /></button>
        )}
      </div>

      {subtab === "Trades" && (
        <>
          <div style={colHdr("56px 70px 1fr 1fr 86px")}>
            <span>AGE</span>
            <span>TYPE</span>
            <span>VALUE</span>
            <span>TRADER</span>
            <span>TX</span>
          </div>
          <div style={{ overflowY: "auto", flex: 1, paddingBottom: "80px" }}>
            <AnimatePresence mode="popLayout">
              {visibleTrades.map((t) => (
                <motion.div key={t.id} layout style={{ display: "grid", gridTemplateColumns: "56px 70px 1fr 1fr 86px", padding: "7px 14px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                  <span style={{ color: C.dim, fontSize: 9, fontFamily: C.mono }}>{timeAgo(t.created_at, now)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: C.mono, color: t.type === "buy" ? C.teal : C.red }}>{t.type === "buy" ? "Buy" : "Sell"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: C.mono, color: C.bright }}>${Number(t.usd_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Link to={`/user/${t.user_address}`} style={{ fontSize: 9, color: C.mid, fontFamily: C.mono, textDecoration: "none" }}>{t.user_address?.slice(0, 6)}...{t.user_address?.slice(-4)}</Link>
                    <CopyBtn text={t.user_address} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: C.mono }}>{t.tx_hash ? `${t.tx_hash.slice(0, 6)}...${t.tx_hash.slice(-4)}` : "—"}</span>
                    {t.tx_hash && <a href={explorerTxUrl(t.tx_hash)} target="_blank" rel="noreferrer" style={{ color: C.mid }}><Icon.Link /></a>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {subtab === "Top Traders" && <TopTradersTable tokenAddress={tokenAddress} />}
      {showFilter && <TxFilterSheet onClose={() => setShowFilter(false)} onApply={setTxFilter} />}
    </div>
  );
}
