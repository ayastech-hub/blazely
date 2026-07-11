/**
 * =================================================================================
 * pages/TokenInfoPage.jsx
 * =================================================================================
 * Structure matches the preview design exactly: sticky token header + chart at the top,
 * then either a desktop split-view (trades sidebar + tabbed right panel + sticky buy/sell)
 * or a mobile single-column tabbed layout with a sticky bottom buy/sell bar.
 *
 * WHAT'S DIFFERENT FROM THE PREVIEW: every number on this page is real. No mock data, no
 * random-walk price simulation, no fabricated PnL. See each panel component's own header
 * comment for the specific data source and any honest caveats (bubble map layout algorithm,
 * PnL not being computed, 24h stats being a live query rather than a pre-aggregated column).
 *
 * ALL FETCHING IS CONSOLIDATED: useTokenPageData is the ONE hook that loads token + metrics
 * on mount and keeps them live via realtime — this is the "loads at once" behavior you asked
 * for. Sub-panels (trades, holders, dev tokens, top traders) have their own small hooks
 * because they're genuinely different queries, but none of them re-fetch token metadata that
 * useTokenPageData already has.
 *
 * BUGS FIXED FROM THE OLD TokenInfoPage.jsx (both copies you sent were identical, so this
 * replaces both):
 *   - Selected `market_cap`/`price`/`volume_24h` from the `tokens` table, which don't exist
 *     there in this schema — they live on `token_metrics_latest`. The realtime subscription
 *     was also listening to the wrong table for price updates. Both fixed via
 *     useTokenPageData.
 *   - `BondingCurveProgressSpark` was imported but never rendered anywhere — dead code, no
 *     progress bar ever showed. Now integrated into the desktop sidebar and mobile view.
 *   - `isDesktop` was computed once via `window.matchMedia(...).matches` with no resize
 *     listener, so it never updated after mount (e.g. rotating a tablet). Fixed: a resize
 *     listener updates it live, matching the preview's own approach.
 * =================================================================================
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useTokenPageData } from "../hooks/useTokenPageData";
import { C } from "../utils/designTokens";

import TokenHeaderBar from "../components/tokenpage/TokenHeaderBar";
import ChartSection from "../components/tokenpage/ChartSection";
import TradesPanel from "../components/tokenpage/TradesPanel";
import HoldersPanel from "../components/tokenpage/HoldersPanel";
import DevTokensPanel from "../components/tokenpage/DevTokensPanel";
import BubbleMap from "../components/tokenpage/BubbleMap";
import InfoPanel from "../components/tokenpage/InfoPanel";
import CommentsPanel from "../components/tokenpage/CommentsPanel";
import BuySellPanel from "../components/tokenpage/BuySellPanel";
import BondingCurveProgress from "../components/BondingCurveProgress";

const RIGHT_TABS = ["Holders", "Dev Tokens", "Bubble Map", "Info", "Comments"];
const MOBILE_TABS = ["Trades", ...RIGHT_TABS];

export default function TokenInfoPage() {
  const { address } = useParams();
  const navigate = useNavigate();
  const { token, metrics, loading, error } = useTokenPageData(address);

  const [tab, setTab] = useState("Trades");
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 960 : true);
  const [showBuySell, setShowBuySell] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [address]);

  // Fixed: the old page computed this once via matchMedia and never updated it. This keeps
  // it live across resizes/rotations, matching the preview's own resize-listener approach.
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 960);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const priceUsd = metrics?.price_usd != null ? Number(metrics.price_usd) / 1e8 : null;

  if (loading && !token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.mid, fontFamily: C.mono, fontSize: 11, letterSpacing: "0.1em" }}>
        SYNCHRONIZING TOKEN DATA...
      </div>
    );
  }

  if (error || !token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, color: C.sub, fontFamily: C.mono, gap: 8 }}>
        <span style={{ fontSize: 12 }}>Token not found.</span>
        <button onClick={() => navigate("/")} style={{ color: C.teal, background: "none", border: "none", cursor: "pointer", fontSize: 11 }}>
          ← Back home
        </button>
      </div>
    );
  }

  const rightPanel = (
    <>
      {tab === "Holders" && <HoldersPanel tokenAddress={token.address} circulatingSupply={metrics?.circulating_supply} liquidityPair={token.liquidity_pair} graduated={token.graduated} />}
      {tab === "Dev Tokens" && <DevTokensPanel creatorWallet={token.creator_wallet} currentTokenAddress={token.address} />}
      {tab === "Bubble Map" && <BubbleMap tokenAddress={token.address} circulatingSupply={metrics?.circulating_supply} />}
      {tab === "Info" && <InfoPanel token={token} metrics={metrics} />}
      {tab === "Comments" && <CommentsPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} />}
    </>
  );

  const styleGlobal = <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>;

  // ── DESKTOP LAYOUT ──
  if (isDesktop) {
    return (
      <div style={{ fontFamily: C.sans, background: C.bg, color: C.text, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {styleGlobal}
        <TokenHeaderBar token={token} metrics={metrics} />
        <ChartSection tokenAddress={token.address} livePrice={priceUsd} />

        {!token.graduated && (
          <div style={{ padding: "8px 14px", background: C.panel, borderBottom: `1px solid ${C.border}` }}>
            <BondingCurveProgress percent={metrics?.pool_progress || 0} graduated={token.graduated} height={5} />
          </div>
        )}

        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}`, background: C.bg, overflow: "hidden" }}>
            <TradesPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden", minWidth: 0 }}>
            <div style={{ display: "flex", overflowX: "auto", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {RIGHT_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: "none",
                    border: "none",
                    whiteSpace: "nowrap",
                    padding: "9px 13px",
                    fontSize: 10,
                    fontWeight: tab === t ? 700 : 500,
                    color: tab === t ? C.bright : C.mid,
                    borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent",
                    cursor: "pointer",
                    fontFamily: C.mono,
                    letterSpacing: "0.04em",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>{rightPanel}</div>

            <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.panel }}>
              <div style={{ display: "flex" }}>
                <button
                  onClick={() => setShowBuySell(true)}
                  style={{ flex: 1, padding: "13px 0", background: C.tealDim, border: "none", color: C.teal, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer", fontFamily: C.mono }}
                >
                  TRADE
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showBuySell && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
              onClick={() => setShowBuySell(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: 10, overflow: "hidden" }}
              >
                <BuySellPanel token={token} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── MOBILE LAYOUT ──
  return (
    <div style={{ fontFamily: C.sans, background: C.bg, color: C.text, height: "100dvh", display: "flex", flexDirection: "column", maxWidth: 560, margin: "0 auto", position: "relative", overflow: "hidden" }}>
      {styleGlobal}
      <TokenHeaderBar token={token} metrics={metrics} />
      <ChartSection tokenAddress={token.address} livePrice={priceUsd} />

      {!token.graduated && (
        <div style={{ padding: "8px 14px", background: C.panel, borderBottom: `1px solid ${C.border}` }}>
          <BondingCurveProgress percent={metrics?.pool_progress || 0} graduated={token.graduated} height={5} />
        </div>
      )}

      <div style={{ display: "flex", overflowX: "auto", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {MOBILE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              whiteSpace: "nowrap",
              padding: "9px 12px",
              fontSize: 10,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? C.bright : C.mid,
              borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent",
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: C.mono,
              letterSpacing: "0.04em",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "Trades" && <TradesPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} />}
        {tab !== "Trades" && rightPanel}
      </div>

      <div style={{ flexShrink: 0, position: "sticky", bottom: 0, borderTop: `1px solid ${C.border}`, background: C.panel }}>
        <button
          onClick={() => setShowBuySell(true)}
          style={{ width: "100%", padding: "13px 0", background: C.tealDim, border: "none", color: C.teal, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer", fontFamily: C.mono }}
        >
          TRADE
        </button>
      </div>

      <AnimatePresence>
        {showBuySell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={() => setShowBuySell(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 560, background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: "10px 10px 0 0", overflow: "hidden" }}
            >
              <BuySellPanel token={token} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
