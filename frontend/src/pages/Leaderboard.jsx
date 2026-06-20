// src/pages/Leaderboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient"; 
import { Star, ChevronRight } from "lucide-react";

// Clean premium formatting helper
const formatNumberCompact = (num) => {
  if (num === null || num === undefined) return "$0.00";
  const number = Number(num);
  if (isNaN(number) || number === 0) return "$0.00";
  
  const abs = Math.abs(number);
  if (abs < 1000) {
    return `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const suffixes = ["", "K", "M", "B", "T"];
  const i = Math.floor(Math.log10(abs) / 3);
  const scaled = abs / Math.pow(1000, i);
  let numericDisplay = Math.round(scaled * 10) / 10;

  const prefix = number < 0 ? "-" : "";
  return `${prefix}$${numericDisplay.toFixed(1)}${suffixes[i]}`;
};

// --- LEADERBOARD ROW COMPONENT ---
const LeaderboardRow = ({ t, idx }) => {
  const [isHovered, setIsHovered] = useState(false);

  const parsedVolume = t.volume_24h ?? t.volume24h ?? 0;
  const parsedMarketCap = t.market_cap ?? t.marketcap ?? 0;
  const tokenLogo = t.logo_url ?? t.logoUrl ?? t.logo_path ?? null;
  const rank = t.rank || idx + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, delay: 0.01 * idx }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative block"
    >
      <Link
        to={`/token/${t.address}`}
        className="relative flex items-center bg-[#0d121f]/30 border border-slate-900 rounded-lg p-4 transition-all duration-200 hover:bg-[#121829]/60 cursor-pointer overflow-hidden group"
      >
        <div className="w-full grid grid-cols-12 gap-4 items-center">
          
          {/* RANK PLACEMENT */}
          <div className="col-span-1 flex items-center pl-1 relative">
            <span className={`text-xs font-semibold ${rank <= 3 ? "text-[#96d6cd]" : "text-slate-500"}`}>
              {rank}
            </span>
            {rank <= 3 && (
              <span className="absolute -top-1 left-4 opacity-50">
                <Star size={8} className="text-[#96d6cd] fill-current" />
              </span>
            )}
          </div>

          {/* TOKEN PROFILE */}
          <div className="col-span-8 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded-full bg-[#030712] border border-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {tokenLogo ? (
                <img
                  src={tokenLogo}
                  alt={t.symbol}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    const fallback = e.target.parentNode.querySelector(".symbol-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div className={`symbol-fallback absolute inset-0 w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-medium tracking-wider ${tokenLogo ? "hidden" : "flex"}`}>
                {t.symbol?.charAt?.(0) ?? "T"}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200 truncate group-hover:text-slate-100 transition-colors">
                  {t.name || "Unnamed Asset"}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {t.symbol || "UNKNOWN"}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 truncate font-mono mt-0.5">
                {t.address ? `${t.address.slice(0, 6)}...${t.address.slice(-4)}` : ""}
              </div>
            </div>
          </div>

          {/* 24H VOLUME */}
          <div className="hidden md:flex md:col-span-3 flex-col items-end justify-center text-right">
            <span className="text-sm font-medium text-slate-300">
              {formatNumberCompact(parsedVolume)}
            </span>
          </div>

          {/* MARKET CAP */}
          <div className="col-span-3 md:col-span-2 flex flex-col items-end justify-center text-right">
            <span className="text-sm font-semibold text-slate-200">
              {formatNumberCompact(parsedMarketCap)}
            </span>
          </div>

          {/* INTERACTION LINK */}
          <div className="col-span-1 hidden md:flex items-center justify-end pr-1">
            <ChevronRight 
              size={14} 
              className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" 
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// --- LEADERBOARD PAGE ---
export default function Leaderboard() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("market_cap"); 

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from("top_tokens_ranked").select("*");
        if (error) throw error;

        const baseData = data || [];
        const sortedData = [...baseData].sort((a, b) => Number(b[sortBy] || 0) - Number(a[sortBy] || 0));
        setTokens(sortedData);
      } catch (err) {
        console.error("Leaderboard component view execution failure:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-xs tracking-wider text-slate-500 animate-pulse font-medium">
          Loading metrics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans pb-16 pt-6 px-4 md:px-6">
      <div className="max-w-[1200px] mx-auto">
        
        {/* FILTERS HEADER BAR */}
        <div className="flex items-center justify-end pb-4 mb-4 border-b border-slate-900/60">
          <div className="flex items-center gap-1 bg-[#0b0f19]/80 border border-slate-900 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSortBy("market_cap")}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                sortBy === "market_cap" 
                  ? "bg-[#96d6cd]/10 text-[#96d6cd]" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Market Cap
            </button>
            <button
              onClick={() => setSortBy("volume_24h")}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                sortBy === "volume_24h" 
                  ? "bg-[#96d6cd]/10 text-[#96d6cd]" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Volume 24H
            </button>
          </div>
        </div>

        {/* TABLE HEADERS */}
        <div className="flex items-center justify-between px-4 py-2 text-[11px] font-medium text-slate-500 tracking-wider uppercase mb-2">
          <div className="flex gap-10">
            <span>Rank</span>
            <span className="pl-2">Token</span>
          </div>
          <div className="flex gap-24 md:gap-36 pr-12">
            <span className="hidden md:inline">Volume 24H</span>
            <span>Market Cap</span>
          </div>
        </div>

        {/* LIST WRAPPER */}
        <div className="space-y-1.5">
          <AnimatePresence mode="wait">
            {tokens.length > 0 ? (
              tokens.map((token, i) => (
                <LeaderboardRow 
                  key={`${token.address || 'item'}-${i}`} 
                  t={token} 
                  idx={i} 
                />
              ))
            ) : (
              <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-slate-900 rounded-lg">
                No token tracking records found.
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
