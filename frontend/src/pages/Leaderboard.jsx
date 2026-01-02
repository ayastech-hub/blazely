// src/pages/TokenList.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Star,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Helper function for compact number formatting (assuming this exists or is needed)
const formatNumberCompact = (num) => {
  if (num === null || num === undefined) return "—";
  const number = Number(num);
  const abs = Math.abs(number);
  if (abs < 1000) return `$${Math.round(abs).toLocaleString()}`;

  const suffixes = ["", "K", "M", "B", "T"];
  const i = Math.floor(Math.log10(abs) / 3);
  const scaled = abs / Math.pow(1000, i);
  let numericDisplay = Math.round(scaled * 10) / 10;

  const prefix = number < 0 ? "-" : "";
  return `${prefix}$${numericDisplay.toFixed(1)}${suffixes[i]}`;
};

// --- TokenRow Component (Updated) ---
const TokenRow = ({ t, idx }) => {
  const [isHovered, setIsHovered] = useState(false);
  // Mock data for 24h Change and Volume (as real-time data integration is complex)
  const changePercent = ((Math.random() - 0.5) * 20).toFixed(2);
  const isPositive = parseFloat(changePercent) > 0;
  const mockVolume24h =
    t.volume_24h || Math.round((Math.random() * t.marketCapUSD) / 10); // Mock volume based on MC

  // Use an anchor tag for navigation, pointing to the token info page
  // Replace <a> with <Link to={`/token/${t.address}`}> if using react-router-dom Link
  return (
    <motion.a
      href={`/token/${t.address}`} // <--- NAVIGATION LINK ADDED HERE
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        duration: 0.4,
        delay: 0.05 * idx,
        ease: [0.22, 1, 0.36, 1],
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative block" // Use 'block' to make the whole area clickable
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-sm"
      />

      <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800/70 rounded-2xl p-4 md:p-5 transition-all duration-300 hover:bg-slate-900/70 hover:border-cyan-500/30 cursor-pointer overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: isHovered ? "100%" : "-100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
        />

        {/* UPDATED GRID FOR NEW VOLUME COLUMN */}
        {/* Old Grid: RANK | TOKEN INFO (5) | PRICE CHANGE (2) | MARKET CAP (3) | CHEVRON (1) = 12 total */}
        {/* New Grid: RANK | TOKEN INFO (5) | 24H VOLUME (3) | MARKET CAP (3) | CHEVRON (1) = 12 total */}
        <div className="relative grid grid-cols-12 gap-3 md:gap-4 items-center">
          {/* RANKING SECTION */}
          <div className="col-span-2 md:col-span-1">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`font-bold text-lg md:text-xl ${
                t.rank <= 3
                  ? "bg-gradient-to-br from-yellow-400 to-orange-500 bg-clip-text text-transparent"
                  : "text-slate-400"
              }`}
            >
              {t.rank}
            </motion.div>

            {t.rank <= 3 && (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-1 -left-1"
              >
                {t.rank === 1 && <Star size={16} className="text-yellow-400" />}
                {t.rank === 2 && <Star size={14} className="text-slate-300" />}
                {t.rank === 3 && <Star size={12} className="text-orange-400" />}
              </motion.div>
            )}
          </div>

          {/* TOKEN INFO SECTION */}
          <div className="col-span-7 md:col-span-5 flex items-center gap-3">
            {/* --- LOGO FETCHING IMPLEMENTATION --- */}
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-bold text-white bg-slate-700 flex-shrink-0 shadow-lg overflow-hidden" // Changed placeholder background
            >
              {t.logo_url ? (
                // Use the fetched logo URL
                <img
                  src={t.logo_url}
                  alt={`${t.symbol} logo`}
                  className="w-full h-full object-cover" // Ensures image fills the container
                  onError={(e) => {
                    // Fallback to symbol if image fails to load
                    e.target.style.display = "none"; // Hide broken image
                    e.target.parentNode.querySelector(
                      ".symbol-fallback"
                    ).style.display = "flex";
                  }}
                />
              ) : null}

              {/* Fallback to symbol initials (Default if no logo_url) */}
              <div
                className={`symbol-fallback absolute inset-0 w-full h-full rounded-xl flex items-center justify-center ${
                  t.logo_url ? "hidden" : "flex"
                }`}
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom right, var(--tw-gradient-stops))",
                  "--tw-gradient-from": "#06B6D4",
                  "--tw-gradient-to": "#8B5CF6",
                }} // Cyan to Purple gradient
              >
                <span className="text-lg md:text-xl">
                  {t.symbol?.charAt?.(0) ?? "T"}
                </span>
              </div>

              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl"
              />
            </motion.div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                  {t.name}
                </h3>
                {t.rank <= 5 && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame size={14} className="text-orange-500" />
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm text-slate-400 font-mono">
                  ${t.symbol}
                </span>
                <span className="hidden md:inline text-xs text-slate-600">
                  •
                </span>
                <span className="hidden md:inline text-xs text-slate-500 font-mono truncate">
                  {t.address?.slice?.(0, 6)}...{t.address?.slice?.(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* --- NEW: 24h Volume Section (3/12 columns on desktop) --- */}
          <div className="hidden md:flex md:col-span-3 items-center justify-end">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="text-right"
            >
              <p className="font-bold text-white text-sm md:text-lg">
                {formatNumberCompact(mockVolume24h)}
              </p>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">
                24h Volume
              </p>
            </motion.div>
          </div>

          {/* --- REMOVED: Price Change Section (Was lines 191-217 in original code) --- */}
          {/* <div className="hidden md:flex md:col-span-2 items-center justify-end">...</div> */}

          {/* MARKET CAP SECTION (Adjusted to col-span-3 on desktop) */}
          <div className="col-span-3 md:col-span-3 text-right">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * idx }}
            >
              <p className="font-bold text-white text-sm md:text-lg">
                {formatNumberCompact(t.marketCapUSD)}
              </p>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">
                Market Cap
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
            className="hidden md:block md:col-span-1"
          >
            <ChevronRight className="text-cyan-400" size={20} />
          </motion.div>
        </div>
      </div>
    </motion.a>
  );
};

// --- TokenList Component (Updated) ---
export default function TokenList() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchTokens() {
      try {
        // --- MODIFICATION 1: Add volume_24h to the select query ---
        const { data, error } = await supabase
          .from("tokens")
          .select("name, symbol, address, marketcap, volume_24h, logo_url") // <--- volume_24h added here
          .order("marketcap", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!data) throw new Error("No data returned");

        const formatted = data.map((t, idx) => ({
          ...t,
          rank: idx + 1,
          marketCapUSD: t.marketcap ?? 0,
          // volume_24h is now included from the database
        }));

        if (mounted) setTokens(formatted);
      } catch (err) {
        console.error("Error fetching tokens:", err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTokens();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
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
          Loading tokens...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-12">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12"
        >
          <motion.h1 className="text-4xl md:text-6xl font-extrabold mb-3">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Top Launchpad Tokens
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto"
          >
            Explore the highest market cap projects on the platform. Real-time
            rankings.
          </motion.p>
        </motion.div>

        <AnimatePresence mode="wait">
          <div className="space-y-2 md:space-y-3">
            {tokens.length > 0 ? (
              tokens.map((t, i) => (
                <TokenRow key={`${t.address}-${t.rank}-${i}`} t={t} idx={i} />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-slate-400"
              >
                No tokens available.
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
