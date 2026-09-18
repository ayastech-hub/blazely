/**
 * src/pages/TokenInfoPage.jsx
 *
 * PURPOSE
 * The per-token dashboard: header stats, price chart, buy/sell, and a
 * tabbed right panel (Holders, Dev Tokens, Bubble Map, Info, Comments) plus
 * a Trades panel. This is a fixed-viewport ("app" style) layout —
 * `height: 100dvh` with internal scroll regions — not a normal scrolling
 * page, which is why it doesn't get the same page-background container
 * treatment (Home/Leaderboard/etc.'s bg-alt bordered box) the rest of the
 * app's pages use; there's no natural place for it here.
 *
 * DATA SOURCE — GRADUATED VS NOT
 * `useTokenPageData` is the single consolidated fetch for everything
 * pre-graduation (our own indexer). Once `token.graduated` is true:
 *  - `useDexscreenerStats` supplies live market cap/volume (our indexer
 *    goes stale post-graduation — it only watches the bonding curve).
 *  - `TradesPanel` switches to `useGraduatedTrades`, which merges the
 *    indexed curve history with live Uniswap swaps read directly from the
 *    pair contract over RPC (not indexed/persisted — see that hook's own
 *    header comment for why, and what a real implementation still needs).
 *  - The chart is NOT switched to a Dexscreener embed — it keeps showing
 *    the indexer's (now-frozen) history, with a "View live chart" link out
 *    to Dexscreener instead. Rebuilding this page's own chart to consume
 *    live Uniswap data is real, separate work.
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useTokenPageData } from "../hooks/useTokenPageData";
import { useDexscreenerStats } from "../hooks/useDexscreenerStats";
import Loading from "../components/ui/Loading";
import { C } from "../utils/designTokens";
import LiquidTabs from "../components/ui/LiquidTabs";

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
import { tokenPriceUsdFromMetrics } from "../utils/priceConversion";


const RIGHT_TABS = ["Holders", "Dev Tokens", "Bubble Map", "Info", "Comments"];
const MOBILE_TABS = ["Trades", ...RIGHT_TABS];

export default function TokenInfoPage() {
  const { address } = useParams();
  const { token, metrics, loading, error } = useTokenPageData(address);
  
  const [tab, setTab] = useState("Trades");
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 960 : true);
  const [showBuySell, setShowBuySell] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsScrolling(false), 1000);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [address]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 960);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const priceUsd =
 tokenPriceUsdFromMetrics(metrics?.price_usd);

  // Once a token graduates, trading moves to Uniswap and our own indexer's
  // price history/market-cap figures go stale (it only watches the bonding
  // curve contract). Dexscreener already indexes the Uniswap pair, so that's
  // the live source once graduated=true; useDexscreenerStats is a no-op
  // until an address is passed in, so this is safe to call unconditionally.
  const liveStats = useDexscreenerStats(token?.graduated ? "base" : null, token?.address);

  if (loading && !token) return <Loading label="SYNCHRONIZING..." fullSection />;
  if (error || !token) return <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, color: C.sub, fontFamily: C.mono, gap: 8 }}>Token not found.</div>;

  const renderRightPanel = () => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, height: "100%", background: C.panel }}>
      {tab === "Holders" && <HoldersPanel tokenAddress={token.address}
creatorWallet={token.creator_wallet}  circulatingSupply={metrics?.circulating_supply} liquidityPair={token.liquidity_pair} graduated={token.graduated} />}
      {tab === "Dev Tokens" && <DevTokensPanel creatorWallet={token.creator_wallet} currentTokenAddress={token.address} />}
      {tab === "Bubble Map" && <BubbleMap tokenAddress={token.address} circulatingSupply={metrics?.circulating_supply} />}
      {tab === "Info" && <InfoPanel token={token} metrics={metrics} />}
      {tab === "Comments" && <CommentsPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} />}
    </div>
  );

  return (
    <div style={{ fontFamily: C.sans, color: C.text, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      
      <motion.button
        onClick={() => setShowBuySell(true)}
        initial={false}
        animate={{ width: isScrolling ? 56 : 132 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed", 
          right: 20, 
          bottom: "calc(env(safe-area-inset-bottom) + 60px)", 
          zIndex: 1000, 
          height: 40, 
          borderRadius: 999,
          border: `1px solid ${C.borderHi}`, 
          background: C.teal, 
          color: "var(--pure-black)", 
          fontFamily: C.mono,
          fontWeight: 800, 
          fontSize: 11, 
          letterSpacing: "0.08em", 
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,.35)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: 8,
          overflow: "hidden"
        }}
      >
        <span>↗</span>
        {!isScrolling && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>TRADE</motion.span>}
      </motion.button>

      <TokenHeaderBar token={token} metrics={metrics} liveStats={token.graduated ? liveStats : null} />
      <ChartSection tokenAddress={token.address} livePrice={priceUsd} height={isDesktop ? 260 : 150} />

      {token.graduated && (
        <div style={{ padding: "6px 14px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, color: C.mid, fontFamily: C.mono, letterSpacing: "0.05em" }}>
            Chart above stops updating post-graduation — Uniswap trading isn't indexed yet
          </span>
          <a
            href={`https://dexscreener.com/base/${token.address.toLowerCase()}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: C.mono, textDecoration: "none", whiteSpace: "nowrap", marginLeft: 10 }}
          >
            View live chart ↗
          </a>
        </div>
      )}

      {!token.graduated && (
        <div style={{ padding: "8px 14px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <BondingCurveProgress percent={metrics?.pool_progress || 0} graduated={token.graduated} height={5} />
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, flexDirection: isDesktop ? "row" : "column" }}>
        {isDesktop ? (
          <>
            <div style={{ width: 420, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", background: C.panel }}>
              <TradesPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} graduated={token.graduated} pairAddress={token.liquidity_pair} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.panel }}>
              <div style={{ padding: "8px 10px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <LiquidTabs
                  size="sm"
                  value={tab}
                  onChange={setTab}
                  items={RIGHT_TABS.map((t) => ({ id: t, label: t }))}
                />
              </div>
              {renderRightPanel()}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, height: "100%" }}>
            <div style={{ padding: "8px 10px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: "auto" }}>
              <LiquidTabs
                size="sm"
                value={tab}
                onChange={setTab}
                items={MOBILE_TABS.map((t) => ({ id: t, label: t }))}
              />
            </div>
            <div style={{ flex: 1.7, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "52vh", background: C.panel }}>
              {tab === "Trades" ? <TradesPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} graduated={token.graduated} pairAddress={token.liquidity_pair} /> : renderRightPanel()}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBuySell && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center" }} onClick={() => setShowBuySell(false)}>
            <motion.div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: isDesktop ? 400 : 560, background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: isDesktop ? 10 : "10px 10px 0 0", overflow: "hidden" }}>
              <BuySellPanel token={token} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
