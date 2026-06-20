// src/pages/TokenInfoPage.jsx
import React, {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  Suspense,
} from "react";
import { useParams } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  BookOpen,
  AreaChart,
  ShoppingCart,
  Twitter,
  ExternalLink,
  Send,
} from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import Chart from "../components/Chart";
import TopHolders from "../components/TopHolders";
import RecentTransactions from "../components/RecentTransactions";
import BuySell from "../components/BuySell";
import Comments from "../components/Comments";
import TokenHeader from "../components/TokenHeader";
import BondingCurveProgressSpark from "../components/BondingCurveProgress";

const LiveTokenView = React.lazy(() =>
  import("../graduated/index").catch(() => ({ default: null }))
);

export default function TokenInfoPage() {
  const { address } = useParams();

  const mountedRef = useRef(true);

  // ✅ REALTIME BUFFER REFS (MUST BE HERE)
  const pendingRef = useRef({ mc: null, price: null, vol: null });
  const flushTimerRef = useRef(null);

  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  // Stats
  const [marketCap, setMarketCap] = useState(0);
  const [priceUsd, setPriceUsd] = useState(0);
  const [volume24h, setVolume24h] = useState(0);

  // Motion
  const mcMotion = useMotionValue(0);
  const mcSpring = useSpring(mcMotion, { stiffness: 200, damping: 30 });
  const [mcDisplay, setMcDisplay] = useState(0);

  const priceMotion = useMotionValue(0);
  const priceSpring = useSpring(priceMotion, { stiffness: 200, damping: 30 });
  const [priceDisplay, setPriceDisplay] = useState(0);
  const [desktopTab, setDesktopTab] = useState("trades");

  const volMotion = useMotionValue(0);
  const volSpring = useSpring(volMotion, { stiffness: 200, damping: 30 });
  const [volDisplay, setVolDisplay] = useState(0);

  // Metadata
  const [creatorWallet, setCreatorWallet] = useState("");
  const [telegram, setTelegram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

  // ✅ scroll ONLY when token address changes
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [address]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ================= FETCH + REALTIME ================= */
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const normalized = address.trim().toLowerCase();

    async function fetchToken() {
      if (!token) setLoading(true);

      try {
        const { data, error } = await supabase
          .from("tokens")
          .select(
            `address, name, symbol, logo_path, creator_wallet,
             telegram, twitter, website, description, graduated,
             market_cap, price, volume_24h`
          )
          .eq("address", normalized)
          .maybeSingle();

        if (error) throw error;
        if (!data || cancelled || !mountedRef.current) return;

        setToken({
          address: data.address,
          name: data.name,
          symbol: data.symbol,
          logo_path: data.logo_path || null,
          graduated: data.graduated || false,
        });

        setCreatorWallet(data.creator_wallet || "");
        setTelegram(data.telegram || "");
        setTwitter(data.twitter || "");
        setWebsite(data.website || "");
        setDescription(data.description || "");

        setMarketCap(data.market_cap || 0);
        setPriceUsd(data.price || 0);
        setVolume24h(data.volume_24h || 0);

        mcMotion.set(data.market_cap || 0);
        priceMotion.set(data.price || 0);
        volMotion.set(data.volume_24h || 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchToken();

    const channel = supabase
      .channel(`token_updates_${normalized}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tokens",
          filter: `address=eq.${normalized}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          const d = payload.new;

          pendingRef.current.mc = d.market_cap;
          pendingRef.current.price = d.price;
          pendingRef.current.vol = d.volume_24h;

          if (flushTimerRef.current) return;

          flushTimerRef.current = setTimeout(() => {
            const p = pendingRef.current;

            if (p.mc != null) {
              setMarketCap(p.mc);
              mcMotion.set(p.mc);
            }
            if (p.price != null) {
              setPriceUsd(p.price);
              priceMotion.set(p.price);
            }
            if (p.vol != null) {
              setVolume24h(p.vol);
              volMotion.set(p.vol);
            }

            pendingRef.current = { mc: null, price: null, vol: null };
            flushTimerRef.current = null;
          }, 2500);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [address]);

  /* ================= MOTION SYNC ================= */
  useEffect(() => {
    const a = mcSpring.on("change", (v) => setMcDisplay(Math.round(v)));
    const b = priceSpring.on("change", (v) => setPriceDisplay(v)); // no toFixed

    const c = volSpring.on("change", (v) => setVolDisplay(Math.round(v)));
    return () => {
      a();
      b();
      c();
    };
  }, [mcSpring, priceSpring, volSpring]);

  /* ================= UI BELOW (UNCHANGED LOGIC - STYLING UPGRADED) ================= */

  if (loading && !token)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
        
        <div className="relative flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-[3px] border-slate-800/80 border-t-cyan-400"
          />
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-slate-400 text-xs font-medium tracking-widest uppercase mt-6"
          >
            Syncing Ledger Streams...
          </motion.p>
        </div>
      </div>
    );

  if (!token)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] text-slate-400 font-medium">
        <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800/60 max-w-sm text-center">
          <p className="text-sm tracking-wide text-slate-300">Requested Asset Sequence Terminated.</p>
          <span className="text-xs text-slate-500 block mt-1">Token registry context could not be verified.</span>
        </div>
      </div>
    );

  const tabVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" } },
  };

  const InfoContent = () => (
    <motion.div
      key="info"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4 pb-24"
    >
      <div className="mt-2">
        <TokenHeader
          token={token}
          marketCap={mcDisplay}
          price={priceDisplay}
          volume24h={volDisplay}
          creatorWallet={creatorWallet}
          telegram={telegram}
          twitter={twitter}
          website={website}
          description={description}
        />
      </div>

      {/* Social links grid */}
      <div className="hidden lg:flex items-center gap-6 py-2 px-1 border-b border-slate-800/40">
        {telegram && (
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <Send size={14} className="text-slate-500" /> <span>Telegram Link</span>
          </a>
        )}
        {twitter && (
          <a
            href={twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <Twitter size={14} className="text-slate-500" /> <span>X Official</span>
          </a>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink size={14} className="text-slate-500" /> <span>Web Core</span>
          </a>
        )}
      </div>

      <div className="bg-[#0b0f19]/60 backdrop-blur-md rounded-xl border border-slate-800/40 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Top Asset Holders
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">Consolidated Profiles</span>
        </div>
        <TopHolders tokenAddress={token.address} />
      </div>
    </motion.div>
  );

  const ChartContent = () => (
    <motion.div
      key="chart"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4 pb-24"
    >
      <div className="bg-[#0b0f19]/60 backdrop-blur-md rounded-xl border border-slate-800/40 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Realtime Analytics Terminal
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <Chart tokenAddress={token.address} />
      </div>
      <div className="bg-[#0b0f19]/60 backdrop-blur-md rounded-xl border border-slate-800/40 p-1">
        <RecentTransactions
          tokenAddress={token.address}
          creatorAddress={creatorWallet}
        />
      </div>
    </motion.div>
  );

  const BuySellContent = () => (
    <motion.div
      key="buySell"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4 pb-28"
    >
      <div className="bg-[#0b0f19]/80 backdrop-blur-md rounded-xl border border-slate-800/50 shadow-xl overflow-hidden">
        <BuySell token={token} />
      </div>
      <div className="bg-[#0b0f19]/60 backdrop-blur-md rounded-xl border border-slate-800/40 p-4">
        <div className="mb-4 pb-2 border-b border-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Public Protocol Discussion</h3>
        </div>
        <Comments tokenAddress={token.address} />
      </div>
    </motion.div>
  );

  // Layout for Graduated tokens
  if (token.graduated) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-200 selection:bg-cyan-500/20 selection:text-cyan-300">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="min-h-[400px] flex items-center justify-center text-xs font-mono text-slate-500 tracking-widest uppercase">
                Initializing Advanced Terminal Interface…
              </div>
            }
          >
            <LiveTokenView
              token={token}
              marketCap={mcDisplay}
              priceUsd={priceDisplay}
              volume24h={volDisplay}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  const DesktopTabs = () => (
    <div className="bg-[#0b0f19]/40 backdrop-blur-md rounded-xl border border-slate-800/40 shadow-sm overflow-hidden">
      {/* Tabs Header */}
      <div className="flex bg-[#070a12]/80 border-b border-slate-800/40 px-2">
        {[
          { id: "trades", label: "Market Executions" },
          { id: "holders", label: "Distribution Ledger" },
          { id: "comments", label: "Network Feed" },
        ].map((tab) => {
          const isSelected = desktopTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setDesktopTab(tab.id)}
              className="px-5 py-3.5 text-xs font-bold tracking-wider uppercase transition-all relative text-slate-400 hover:text-slate-200"
            >
              <span className={isSelected ? "text-cyan-400" : "text-slate-400"}>
                {tab.label}
              </span>
              {isSelected && (
                <motion.div
                  layoutId="desktopTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className={`${desktopTab === "trades" ? "p-0" : "p-5"}`}>
        <AnimatePresence mode="wait">
          {desktopTab === "trades" && (
            <motion.div
              key="trades"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="max-w-full"
            >
              <RecentTransactions
                tokenAddress={token.address}
                creatorAddress={creatorWallet}
                hideHeader={true}
              />
            </motion.div>
          )}

          {desktopTab === "holders" && (
            <motion.div
              key="holders"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <TopHolders tokenAddress={token.address} />
            </motion.div>
          )}

          {desktopTab === "comments" && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <Comments tokenAddress={token.address} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // Standard Layout
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      <div className="max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        
        {/* DESKTOP INTEGRATED DASHBOARD */}
        <main className="hidden lg:block">
          <div className="grid grid-cols-12 gap-6 items-start">
            
            {/* Full-width Header Segment */}
            <div className="col-span-12 mb-2">
              <TokenHeader
                token={token}
                marketCap={mcDisplay}
                price={priceDisplay}
                volume24h={volDisplay}
                creatorWallet={creatorWallet}
                telegram={telegram}
                twitter={twitter}
                website={website}
                description={description}
              />
            </div>

            {/* Left Primary Display (Chart & Data Systems) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="bg-[#0b0f19]/40 backdrop-blur-md rounded-xl border border-slate-800/40 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Interactive Pricing Matrix
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Live Engine</span>
                  </div>
                </div>
                <Chart tokenAddress={token.address} />
              </div>

              <DesktopTabs />
            </div>

            {/* Right Secure Action Deck */}
            <aside className="col-span-12 lg:col-span-4 space-y-6 sticky top-8">
              <div className="bg-[#0b0f19]/80 backdrop-blur-xl rounded-xl border border-slate-800/50 shadow-2xl overflow-hidden">
                <div className="bg-[#0e1424] px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Order Routing Terminal</span>
                  <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800/40">Slippage Auto</span>
                </div>
                <BuySell token={token} />
              </div>
            </aside>

          </div>
        </main>

        {/* MOBILE SUB-DECK VIEW */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            {activeTab === "info" && <InfoContent />}
            {activeTab === "chart" && <ChartContent />}
            {activeTab === "buySell" && <BuySellContent />}
          </AnimatePresence>
        </div>
      </div>

      {/* FIXED PREMIUM BOTTOM NAVIGATION BAR (MOBILE ONLY) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 px-3 pb-3 bg-gradient-to-t from-[#030712] via-[#030712]/90 to-transparent pt-6">
        <div className="bg-[#0b0f19]/90 backdrop-blur-xl border border-slate-800/60 shadow-2xl flex justify-around items-center h-16 w-full max-w-md mx-auto rounded-xl px-2">
          {[
            { id: "info", icon: BookOpen, label: "Analytics", activeColor: "text-cyan-400" },
            { id: "chart", icon: AreaChart, label: "Streams", activeColor: "text-purple-400" },
            { id: "buySell", icon: ShoppingCart, label: "Execute", activeColor: "text-emerald-400" },
          ].map(({ id, icon: Icon, label, activeColor }) => {
            const isCurrent = activeTab === id;
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTab(id)}
                className="flex flex-col items-center justify-center flex-1 h-full relative group"
              >
                {isCurrent && (
                  <motion.div
                    layoutId="mobileTabGlow"
                    className="absolute -top-1 w-8 h-[2px] bg-current opacity-80"
                    style={{ color: isCurrent ? `var(--${id}-color)` : '#fff' }}
                  />
                )}
                <Icon 
                  size={20} 
                  className={`transition-colors duration-200 ${isCurrent ? activeColor : "text-slate-500 group-hover:text-slate-400"}`} 
                />
                <span className={`text-[10px] font-bold tracking-wider uppercase mt-1.5 transition-colors duration-200 ${isCurrent ? "text-slate-200" : "text-slate-500"}`}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
