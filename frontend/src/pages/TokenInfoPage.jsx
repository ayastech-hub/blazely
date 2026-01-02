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

  /* ================= UI BELOW (UNCHANGED) ================= */

  if (loading && !token)
    // Show loader only if we have NO data at all
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-cyan-400"
        />
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-slate-400 mt-4"
        >
          Loading token data...
        </motion.p>
      </div>
    );

  if (!token)
    return (
      <div className="min-h-screen flex items-center justify-center text-pink-400 bg-slate-950">
        Token not found.
      </div>
    );

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  const InfoContent = () => (
    <motion.div
      key="info"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4 sm:space-y-6 pb-20 lg:pb-0"
    >
      <div className="mt-4 sm:mt-6 lg:mt-8">
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
      <div className="hidden lg:flex items-center gap-4 mt-3 mb-4">
        {telegram && (
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300"
          >
            <Send size={16} /> <span>Telegram</span>
          </a>
        )}
        {twitter && (
          <a
            href={twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300"
          >
            <Twitter size={16} /> <span>Twitter</span>
          </a>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300"
          >
            <ExternalLink size={16} /> <span>Website</span>
          </a>
        )}
      </div>

      <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-800/70 p-4 md:p-6">
        <h3 className="text-base font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Top Holders
        </h3>
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
      className="space-y-4 sm:space-y-6 pb-20 lg:pb-0"
    >
      <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-800/70 p-4 md:p-6">
        <h2 className="text-base font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Price Chart
        </h2>
        <Chart tokenAddress={token.address} />
      </div>
      <RecentTransactions
        tokenAddress={token.address}
        creatorAddress={creatorWallet}
      />
    </motion.div>
  );

  const BuySellContent = () => (
    <motion.div
      key="buySell"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="pb-24" // 👈 space for navbar
    >
      <BuySell token={token} />
      <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-800/70 p-4 md:p-6">
        <Comments tokenAddress={token.address} />
      </div>
    </motion.div>
  );

  // Layout for Graduated tokens
  if (token.graduated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="relative max-w-7xl mx-auto p-4 md:p-6">
          <Suspense
            fallback={
              <div className="min-h-[300px] flex items-center justify-center text-slate-400">
                Loading live token UI…
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
    <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl border border-slate-800/70">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-800">
        {[
          { id: "trades", label: "Trades" },
          { id: "holders", label: "Holders" },
          { id: "comments", label: "Comments" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDesktopTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition
            ${
              desktopTab === tab.id
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabs Content - Removed p-4 md:p-6 to allow table to be flush */}
      <div className={`${desktopTab === "trades" ? "p-0" : "p-4 md:p-6"}`}>
        <AnimatePresence mode="wait">
          {desktopTab === "trades" && (
            <motion.div
              key="trades"
              initial={{ opacity: 0, x: -10 }} // Animates from the left
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="max-w-[90%] mr-auto" // Pulls to left, gives space on the right
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TopHolders tokenAddress={token.address} />
            </motion.div>
          )}

          {desktopTab === "comments" && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative max-w-7xl mx-auto p-4 md:p-6">
        <main className="hidden lg:block">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
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

            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Chart */}
              <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl border border-slate-800/70 p-4 md:p-6">
                <h2 className="text-base font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  Price Chart
                </h2>
                <Chart tokenAddress={token.address} />
              </div>

              {/* Activity Tabs */}
              <DesktopTabs />
            </div>

            <aside className="col-span-12 lg:col-span-4 space-y-6 sticky top-6">
              <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl border border-slate-800/70 p-0">
                <BuySell token={token} />
              </div>
            </aside>
          </div>
        </main>

        <div className="lg:hidden pb-24">
          <AnimatePresence mode="wait">
            {activeTab === "info" && <InfoContent />}
            {activeTab === "chart" && <ChartContent />}
            {activeTab === "buySell" && <BuySellContent />}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30">
        <div className="bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/70 shadow-2xl flex justify-around items-center h-16 w-full max-w-7xl mx-auto">
          {[
            { id: "info", icon: BookOpen, label: "Info", color: "cyan" },
            { id: "chart", icon: AreaChart, label: "Chart", color: "purple" },
            {
              id: "buySell",
              icon: ShoppingCart,
              label: "Trade",
              color: "pink",
            },
          ].map(({ id, icon: Icon, label, color }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center p-2 transition-colors ${activeTab === id ? `text-${color}-400` : `text-slate-400`}`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
