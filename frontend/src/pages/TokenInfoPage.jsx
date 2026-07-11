/**
 * TokenInfoPage
 *
 * Implements a fixed-viewport dashboard architecture:
 * - Page-level scrolling disabled.
 * - Content area uses fixed-height viewports.
 * - Premium scroll-aware floating action button (FAB).
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
  const [isScrolling, setIsScrolling] = useState(false);

  // Corrected Scroll listener with proper cleanup and capturing phase
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

  const priceUsd = metrics?.price_usd != null ? Number(metrics.price_usd) / 1e8 : null;

  if (loading && !token) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.mid, fontFamily: C.mono, fontSize: 11 }}>SYNCHRONIZING...</div>;
  if (error || !token) return <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, color: C.sub, fontFamily: C.mono, gap: 8 }}>Token not found.</div>;

  const renderRightPanel = () => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {tab === "Holders" && <HoldersPanel tokenAddress={token.address} circulatingSupply={metrics?.circulating_supply} liquidityPair={token.liquidity_pair} graduated={token.graduated} />}
      {tab === "Dev Tokens" && <DevTokensPanel creatorWallet={token.creator_wallet} currentTokenAddress={token.address} />}
      {tab === "Bubble Map" && <BubbleMap tokenAddress={token.address} circulatingSupply={metrics?.circulating_supply} />}
      {tab === "Info" && <InfoPanel token={token} metrics={metrics} />}
      {tab === "Comments" && <CommentsPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} />}
    </div>
  );

  return (
    <div style={{ fontFamily: C.sans, background: C.bg, color: C.text, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {/* Floating Trade FAB - Premium Animated */}
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
          color: "#000", 
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
        {!isScrolling && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            TRADE
          </motion.span>
        )}
      </motion.button>

      <TokenHeaderBar token={token} metrics={metrics} />
      <ChartSection tokenAddress={token.address} livePrice={priceUsd} />

      {!token.graduated && (
        <div style={{ padding: "8px 14px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <BondingCurveProgress percent={metrics?.pool_progress || 0} graduated={token.graduated} height={5} />
        </div>
      )}

      {/* Main Content Area - Fixed Viewport */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, flexDirection: isDesktop ? "row" : "column" }}>
        {isDesktop ? (
          <>
            <div style={{ width: 420, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <TradesPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {RIGHT_TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", padding: "9px 13px", fontSize: 10, fontWeight: tab === t ? 700 : 500, color: tab === t ? C.bright : C.mid, borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent", cursor: "pointer", fontFamily: C.mono }}>{t}</button>
                ))}
              </div>
              {renderRightPanel()}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", overflowX: "auto", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {MOBILE_TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", padding: "9px 12px", fontSize: 10, fontWeight: tab === t ? 700 : 500, color: tab === t ? C.bright : C.mid, borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent", cursor: "pointer", flexShrink: 0, fontFamily: C.mono }}>{t}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {tab === "Trades" ? <TradesPanel tokenAddress={token.address} creatorWallet={token.creator_wallet} /> : renderRightPanel()}
            </div>
          </>
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
