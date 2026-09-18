import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { C } from "../../utils/designTokens";
import { Check, Copy, Trophy, Filter, Link as LinkIcon } from "lucide-react";
import { useGraduatedTrades } from "../../hooks/useGraduatedTrades";
import { explorerTxUrl, timeAgo, formatWei } from "../../utils/format";
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
      {ok ? <Check size={11} /> : <Copy size={11} />}
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

export default function TradesPanel({ tokenAddress, creatorWallet, graduated = false, pairAddress = null }) {
  const [showFilter, setShowFilter] = useState(false);
  const [txFilter, setTxFilter] = useState({ txType: "All", maker: "", usdMin: "", usdMax: "" });
  const [now, setNow] = useState(Date.now());
  // For a graduated token this returns pre-graduation curve history merged
  // with live post-graduation Uniswap swaps; for a non-graduated token it's
  // equivalent to the plain curve-only trade feed.
  const { trades, loading } = useGraduatedTrades(tokenAddress, pairAddress, { graduated });

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
      {graduated && (
        <div style={{ padding: "4px 14px", fontSize: 8, color: C.mid, fontFamily: C.mono, letterSpacing: "0.06em", background: C.panel, borderBottom: `1px solid ${C.border}` }}>
          CURVE HISTORY + LIVE UNISWAP SWAPS
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0, padding: "6px 8px", gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.bright, fontFamily: C.mono, marginRight: 8 }}>Trades</span>
        <div style={{ flex: 1 }} />
        {["All", "Buy", "Sell"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTxFilter((f) => ({ ...f, txType: v }))}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: "none",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: C.mono,
              cursor: "pointer",
              background: txFilter.txType === v ? "rgba(150,214,205,0.15)" : "transparent",
              color: txFilter.txType === v ? C.teal : C.mid,
            }}
          >
            {v}
          </button>
        ))}
        <button type="button" onClick={() => setShowFilter(true)} style={{ background: "none", border: "none", color: C.mid, cursor: "pointer", padding: "0 4px" }}><Filter size={12} /></button>
      </div>

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
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: C.mono, color: C.bright }}>
                    {t.usd_value != null
                      ? `$${Number(t.usd_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : t.source === "uniswap"
                      ? `${formatWei(t.token_amount, 2)} tok`
                      : "—"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Link to={`/user/${t.user_address}`} style={{ fontSize: 9, color: C.mid, fontFamily: C.mono, textDecoration: "none" }}>{t.user_address?.slice(0, 6)}...{t.user_address?.slice(-4)}</Link>
                    <CopyBtn text={t.user_address} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: C.mono }}>{t.tx_hash ? `${t.tx_hash.slice(0, 6)}...${t.tx_hash.slice(-4)}` : "—"}</span>
                    {t.tx_hash && <a href={explorerTxUrl(t.tx_hash)} target="_blank" rel="noreferrer" style={{ color: C.mid }}><LinkIcon size={11} /></a>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
      </>

      {showFilter && <TxFilterSheet onClose={() => setShowFilter(false)} onApply={setTxFilter} />}
    </div>
  );
}
