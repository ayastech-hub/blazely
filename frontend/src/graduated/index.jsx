import React, { useState, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, AreaChart, ShoppingCart } from "lucide-react";

import TokenHeaderPanel from "./TokenHeaderPanel";
import BuySellPanel from "./BuySellPanel";
import TopHoldersPanel from "./TopHoldersPanel";
const ChartPanel = React.lazy(() => import("./ChartPanel"));
const RecentActivityPanel = React.lazy(() => import("./RecentActivityPanel"));

export default function LiveTokenView({
  token,
  marketCap,
  priceUsd,
  volume24h,
  liquidityUsd,
  totalSupplyOnchain,
}) {
  const [activeTab, setActiveTab] = useState("info");

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
      <TokenHeaderPanel
        token={token}
        marketCap={marketCap}
        priceUsd={priceUsd}
        volume24h={volume24h}
        liquidityUsd={liquidityUsd}
        totalSupplyOnchain={totalSupplyOnchain}
      />
      <TopHoldersPanel token={token} />
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
      <Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-slate-400">
            Loading chart…
          </div>
        }
      >
        <ChartPanel token={token} />
      </Suspense>
      <Suspense
        fallback={
          <div className="h-32 flex items-center justify-center text-slate-400">
            Loading recent activity…
          </div>
        }
      >
        <RecentActivityPanel token={token} />
      </Suspense>
    </motion.div>
  );

  const BuySellContent = () => (
    <motion.div
      key="buySell"
      variants={tabVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4 sm:space-y-6 pb-20 lg:pb-0"
    >
      <BuySellPanel token={token} />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative max-w-7xl mx-auto p-4 md:p-6">
        {/* Desktop layout */}
        <main className="hidden lg:block">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <TokenHeaderPanel
                token={token}
                marketCap={marketCap}
                priceUsd={priceUsd}
                volume24h={volume24h}
                liquidityUsd={liquidityUsd}
                totalSupplyOnchain={totalSupplyOnchain}
              />
            </div>
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <ChartContent />
            </div>
            <aside className="col-span-12 lg:col-span-4 space-y-6">
              <BuySellPanel token={token} />
              <TopHoldersPanel token={token} />
            </aside>
          </div>
        </main>

        {/* Mobile layout */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            {activeTab === "info" && <InfoContent />}
            {activeTab === "chart" && <ChartContent />}
            {activeTab === "buySell" && <BuySellContent />}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile bottom tab */}
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
