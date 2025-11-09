// src/components/LiveTradeFeed.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * LiveTradeFeed
 * - Inline pill & full panel supported.
 * - Click a trade to navigate to /token/:symbol
 * - Runs nonstop and keeps the latest MAX_EVENTS trades (default 100)
 *
 * Props:
 * inline (bool), compact (bool), showOnlyLaunchpadBuys (bool),
 * minAmountEth (number), maxEvents (number)
 */

const sampleTokens = [
  { name: "Pepe", symbol: "PEPE" },
  { name: "DogWifCoin", symbol: "DWC" },
  { name: "Solana", symbol: "SOL" },
  { name: "Bonk", symbol: "BONK" },
  { name: "CatCoin", symbol: "CAT" },
  { name: "Zeta", symbol: "ZETA" },
];

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const createRandomTrade = (forceType = null, forceSource = null) => {
  const token = sampleTokens[Math.floor(Math.random() * sampleTokens.length)];
  const type = forceType || (Math.random() > 0.5 ? "buy" : "sell");
  const amountEth = Number((0.01 + randomBetween(0, 0.59)).toFixed(4));
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    tokenName: token.name,
    tokenSymbol: token.symbol,
    type,
    amountEth,
    source: forceSource || (Math.random() > 0.85 ? "sniper" : "dex"),
    timestamp: Date.now(),
  };
};

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export default function LiveTradeFeed({
  inline = false,
  compact = false,
  showOnlyLaunchpadBuys = false,
  minAmountEth = 0.01,
  maxEvents = 100,
}) {
  const [trades, setTrades] = React.useState([]);

  // init
  React.useEffect(() => {
    setTrades(Array.from({ length: 6 }, () => createRandomTrade()));
  }, []);

  // general stream (~2.5s)
  React.useEffect(() => {
    const id = setInterval(() => {
      const t = createRandomTrade();
      if (t.amountEth >= minAmountEth) {
        setTrades((cur) => {
          const next = [t, ...cur];
          return next.slice(0, maxEvents);
        });
      }
    }, 2500);
    return () => clearInterval(id);
  }, [minAmountEth, maxEvents]);

  // launchpad stream (~6s)
  React.useEffect(() => {
    const id = setInterval(() => {
      const t = createRandomTrade("buy", "launchpad");
      t.amountEth = Number((0.05 + randomBetween(0.01, 0.9)).toFixed(4));
      if (t.amountEth >= minAmountEth) {
        setTrades((cur) => {
          const next = [t, ...cur];
          return next.slice(0, maxEvents);
        });
      }
    }, 6000);
    return () => clearInterval(id);
  }, [minAmountEth, maxEvents]);

  const latestLaunchpadBuy = trades.find(
    (x) => x.source === "launchpad" && x.type === "buy"
  );

  // Inline pill (clickable)
  if (inline) {
    const displayed = showOnlyLaunchpadBuys
      ? latestLaunchpadBuy
      : latestLaunchpadBuy || trades.find((t) => t.type === "buy");
    if (!displayed) {
      return (
        <div className="inline-block">
          <div className="px-3 py-1 rounded-full bg-slate-800/60 text-slate-300 text-xs font-medium">
            No recent buys
          </div>
        </div>
      );
    }

    return (
      <Link
        to={`/token/${encodeURIComponent(displayed.tokenSymbol)}`}
        className="inline-block"
      >
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="inline-flex items-center gap-3 px-3 py-1 rounded-full shadow-xl cursor-pointer"
          style={{
            background:
              "linear-gradient(90deg, rgba(99,102,241,0.08), rgba(20,184,166,0.06))",
            border: "1px solid rgba(148,163,184,0.04)",
          }}
          title={`View ${displayed.tokenSymbol} token page`}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/6 border border-white/8">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-emerald-400"
            >
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex flex-col leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                {displayed.source === "launchpad" ? "LAUNCHPAD" : "BUY"}
              </span>
              <span
                className="text-sm font-bold truncate"
                style={{ maxWidth: compact ? 120 : 220 }}
              >
                {displayed.tokenSymbol} • {displayed.tokenName}
              </span>
            </div>
            <div className="text-xs text-slate-300 font-mono">
              {displayed.amountEth} ETH • {timeAgo(displayed.timestamp)}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Full panel — clickable rows
  return (
    <div
      className="p-3 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-900/30 shadow-lg"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Live Trades • ≥ {minAmountEth} ETH
          </h3>
          <span className="text-xs text-slate-400 ml-1">real-time</span>
        </div>
        <div className="text-xs text-slate-400">
          showing latest {Math.min(trades.length, maxEvents)}
        </div>
      </div>

      <div className="relative h-44 overflow-y-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {trades
            .filter((t) => t.amountEth >= minAmountEth)
            .filter((t) =>
              showOnlyLaunchpadBuys
                ? t.source === "launchpad" && t.type === "buy"
                : true
            )
            .map((trade) => (
              <Link
                key={trade.id}
                to={`/token/${encodeURIComponent(trade.tokenSymbol)}`}
                className="block"
                title={`Open ${trade.tokenSymbol} token page`}
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  className="flex items-center justify-between p-2 mb-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                        trade.type === "buy"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {trade.type === "buy" ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 truncate">
                          {trade.tokenSymbol}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {trade.tokenName}
                        </span>

                        {trade.source === "launchpad" && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-sm">
                            Launchpad
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-0.5">
                        {trade.type.toUpperCase()} • {timeAgo(trade.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm font-mono text-slate-200">
                    {trade.amountEth} ETH
                  </div>
                </motion.div>
              </Link>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
