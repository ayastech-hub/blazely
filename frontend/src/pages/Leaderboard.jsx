// src/pages/Leaderboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient"; 
import { Trophy, BarChart3, Coins, Flame, Star, ChevronRight } from "lucide-react";

// Robust formatting helper for numbers, stringified metrics, and small launch values
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

// --- INLINE TOKEN ROW COMPONENT ---
const LeaderboardRow = ({ t, idx }) => {
  const [isHovered, setIsHovered] = useState(false);

  const parsedVolume = t.volume_24h ?? t.volume24h ?? 0;
  const parsedMarketCap = t.market_cap ?? t.marketcap ?? 0;
  const tokenLogo = t.logo_url ?? t.logoUrl ?? t.logo_path ?? null;
  const rank = t.rank || idx + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, delay: 0.01 * idx, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative block"
    >
      <Link
        to={`/token/${t.address}`}
        style={{ borderColor: isHovered ? '#96d6cd30' : '' }}
        className="relative flex items-center bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900/60 rounded p-3 md:p-4 transition-all duration-150 hover:bg-[#0b0f19]/80 cursor-pointer overflow-hidden group"
      >
        <div 
          style={{ backgroundColor: '#96d6cd', opacity: isHovered ? 1 : 0 }}
          className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-150"
        />

        <div className="w-full grid grid-cols-12 gap-3 items-center">
          {/* RANK INDEX */}
          <div className="col-span-1 flex items-center pl-1 relative">
            <span className={`font-mono text-xs font-bold ${rank <= 3 ? "text-[#96d6cd]" : "text-slate-600"}`}>
              {String(rank).padStart(2, '0')}
            </span>
            {rank <= 3 && (
              <span className="absolute -top-1 left-4">
                <Star size={8} style={{ color: '#96d6cd' }} className="fill-current opacity-40" />
              </span>
            )}
          </div>

          {/* ASSET METADATA */}
          <div className="col-span-8 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded bg-[#030712] border border-slate-800 flex-shrink-0 flex items-center justify-center font-mono font-black overflow-hidden">
              {tokenLogo ? (
                <img
                  src={tokenLogo}
                  alt={`${t.symbol || "Asset"} brand`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    const fallback = e.target.parentNode.querySelector(".symbol-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div className={`symbol-fallback absolute inset-0 w-full h-full flex items-center justify-center text-[10px] text-slate-400 ${tokenLogo ? "hidden" : "flex"}`}>
                {t.symbol?.charAt?.(0) ?? "T"}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-200 truncate group-hover:text-slate-100 transition-colors uppercase tracking-wide">
                  {t.name || "UNNAMED ASSET"}
                </h3>
                {rank <= 5 && <Flame size={11} className="text-amber-500/80" />}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span style={{ color: '#96d6cd' }} className="opacity-80">${t.symbol || "UNKNOWN"}</span>
                <span className="text-slate-700">•</span>
                <span className="text-slate-500 truncate hidden sm:inline">
                  {t.address ? `${t.address.slice(0, 6)}...${t.address.slice(-4)}` : "0x0000...0000"}
                </span>
              </div>
            </div>
          </div>

          {/* 24H TRADING VOLUME */}
          <div className="hidden md:flex md:col-span-3 flex-col items-end justify-center text-right font-mono">
            <span className="text-xs font-bold text-slate-300">
              {formatNumberCompact(parsedVolume)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600 font-sans mt-0.5">
              VOLUME 24H
            </span>
          </div>

          {/* MARKET CAPITALIZATION */}
          <div className="col-span-3 md:col-span-2 flex flex-col items-end justify-center text-right font-mono">
            <span className="text-xs font-bold text-slate-200">
              {formatNumberCompact(parsedMarketCap)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600 font-sans mt-0.5">
              MARKET CAP
            </span>
          </div>

          {/* CHEVRON HINT */}
          <div className="col-span-1 hidden md:flex items-center justify-end pr-1">
            <ChevronRight 
              size={14} 
              style={{ color: '#96d6cd' }} 
              className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" 
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// --- MAIN LEADERBOARD PAGE COMPONENT ---
export default function Leaderboard() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("market_cap"); 
  const [globalStats, setGlobalStats] = useState({ totalCap: 0, totalVolume: 0, count: 0 });

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch rows directly from the top_tokens_ranked database view layout
        const { data, error } = await supabase
          .from("top_tokens_ranked")
          .select("*");

        if (error) throw error;

        const baseData = data || [];

        // Aggregate network overview stats info across the data array
        const totalCap = baseData.reduce((sum, item) => sum + Number(item.market_cap || 0), 0);
        const totalVolume = baseData.reduce((sum, item) => sum + Number(item.volume_24h || 0), 0);
        
        setGlobalStats({ totalCap, totalVolume, count: baseData.length });
        
        // Process sort sequencing orders dynamically on-the-fly
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
        <div className="text-center font-mono text-xs uppercase tracking-widest text-[#96d6cd] animate-pulse">
          Syncing Leaderboard Matrix Indexes...
        </div>
      </div>
    );
  }

  const topThree = tokens.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans pb-16 pt-8 px-4 md:px-6">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER BLOCK */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-900/80">
          <div>
            <div className="flex items-center gap-2 text-[#96d6cd] font-mono text-xs uppercase tracking-widest mb-1.5">
              <Trophy size={14} className="text-amber-400" /> System Rank Index
            </div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-slate-100">
              Token <span className="text-[#96d6cd]">Leaderboard</span>
            </h1>
          </div>

          {/* TOGGLE OPTIONS CONTROL FILTER */}
          <div className="flex items-center gap-2 bg-[#0b0f19]/60 border border-slate-900 rounded p-1 font-mono text-xs self-start md:self-auto">
            <button
              onClick={() => setSortBy("market_cap")}
              className={`px-3 py-1.5 rounded uppercase tracking-wide transition-all ${
                sortBy === "market_cap" 
                  ? "bg-[#96d6cd]/10 text-[#96d6cd] border border-[#96d6cd]/20 font-bold" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Market Cap
            </button>
            <button
              onClick={() => setSortBy("volume_24h")}
              className={`px-3 py-1.5 rounded uppercase tracking-wide transition-all ${
                sortBy === "volume_24h" 
                  ? "bg-[#96d6cd]/10 text-[#96d6cd] border border-[#96d6cd]/20 font-bold" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Volume 24H
            </button>
          </div>
        </div>

        {/* OVERVIEW METRICS STATS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="bg-[#0b0f19]/20 border border-slate-900/60 rounded p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-[#96d6cd]/5 border border-[#96d6cd]/10 flex items-center justify-center text-[#96d6cd]"><Coins size={18} /></div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Total Capitalization</div>
              <div className="text-base font-mono font-bold text-slate-200 mt-0.5">{formatNumberCompact(globalStats.totalCap)}</div>
            </div>
          </div>
          <div className="bg-[#0b0f19]/20 border border-slate-900/60 rounded p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400"><BarChart3 size={18} /></div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Combined 24H Volume</div>
              <div className="text-base font-mono font-bold text-slate-200 mt-0.5">{formatNumberCompact(globalStats.totalVolume)}</div>
            </div>
          </div>
          <div className="bg-[#0b0f19]/20 border border-slate-900/60 rounded p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-400"><Trophy size={18} /></div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Tracked Deployments</div>
              <div className="text-base font-mono font-bold text-slate-200 mt-0.5">{globalStats.count} <span className="text-[10px] text-slate-600 font-sans">Projects</span></div>
            </div>
          </div>
        </div>

        {/* TOP 3 PODIUM RECOGNITION CARDS */}
        {sortBy === "market_cap" && topThree.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {topThree[1] && (
              <div className="bg-gradient-to-b from-[#0b0f19]/30 to-transparent border border-slate-900 rounded p-4 relative overflow-hidden group flex flex-col justify-between min-h-[110px]">
                <div className="absolute right-4 top-2 font-mono text-5xl font-black text-slate-800/15 group-hover:text-[#96d6cd]/10 transition-colors select-none">02</div>
                <div>
                  <div className="text-[9px] uppercase tracking-widest font-mono text-slate-500">Runner Up</div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase mt-0.5 truncate">{topThree[1].name}</h4>
                  <p className="font-mono text-[11px] text-[#96d6cd]">${topThree[1].symbol}</p>
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-3 bg-[#030712]/60 px-2 py-0.5 rounded border border-slate-900/50 w-max">
                  MCAP: {formatNumberCompact(Number(topThree[1].market_cap))}
                </div>
              </div>
            )}
            {topThree[0] && (
              <div className="bg-gradient-to-b from-amber-500/10 via-[#0b0f19]/40 to-transparent border border-amber-500/20 rounded p-4 relative overflow-hidden group flex flex-col justify-between min-h-[125px] shadow-lg shadow-amber-500/[0.01]">
                <div className="absolute right-4 top-1 font-mono text-6xl font-black text-amber-500/10 group-hover:text-amber-400/20 transition-colors select-none">01</div>
                <div>
                  <div className="text-[9px] uppercase tracking-widest font-mono text-amber-400 flex items-center gap-1 font-bold"><Trophy size={9} className="fill-current" /> Market Leader</div>
                  <h4 className="text-sm font-black text-slate-100 uppercase mt-0.5 truncate tracking-wide">{topThree[0].name}</h4>
                  <p className="font-mono text-[11px] text-amber-400">${topThree[0].symbol}</p>
                </div>
                <div className="font-mono text-[10px] font-bold text-amber-400/90 mt-3 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-max">
                  MCAP: {formatNumberCompact(Number(topThree[0].market_cap))}
                </div>
              </div>
            )}
            {topThree[2] && (
              <div className="bg-gradient-to-b from-[#0b0f19]/30 to-transparent border border-slate-900 rounded p-4 relative overflow-hidden group flex flex-col justify-between min-h-[110px]">
                <div className="absolute right-4 top-2 font-mono text-5xl font-black text-slate-800/15 group-hover:text-amber-700/20 transition-colors select-none">03</div>
                <div>
                  <div className="text-[9px] uppercase tracking-widest font-mono text-slate-500">Third Position</div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase mt-0.5 truncate">{topThree[2].name}</h4>
                  <p className="font-mono text-[11px] text-[#96d6cd]">${topThree[2].symbol}</p>
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-3 bg-[#030712]/60 px-2 py-0.5 rounded border border-slate-900/50 w-max">
                  MCAP: {formatNumberCompact(Number(topThree[2].market_cap))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIST TABLE HEADER LABELS BAR */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0b0f19]/40 border border-slate-950 rounded-t font-mono text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">
          <div className="flex gap-10">
            <span>Rank #</span>
            <span>Asset Profile Info</span>
          </div>
          <div className="flex gap-16 md:gap-28 pr-12">
            <span className="hidden md:inline">Volume 24H</span>
            <span>Market Cap</span>
          </div>
        </div>

        {/* SYSTEM ROW REPEATERS WRAPPER */}
        <div className="bg-[#030712] text-slate-100">
          <AnimatePresence mode="wait">
            <div className="space-y-1.5">
              {tokens.length > 0 ? (
                tokens.map((token, i) => (
                  <LeaderboardRow 
                    key={`${token.address || 'item'}-${i}`} 
                    t={token} 
                    idx={i} 
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 font-mono text-xs uppercase tracking-wider text-slate-600 border border-dashed border-slate-900 rounded"
                >
                  No active rankings found matching structural constraints.
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
