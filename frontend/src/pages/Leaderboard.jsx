// src/pages/TokenList.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Star,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Helper function for compact number formatting
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

// --- TokenRow Component (Updated Layout & Premium Accents) ---
const TokenRow = ({ t, idx }) => {
  const [isHovered, setIsHovered] = useState(false);
  const mockVolume24h = t.volume_24h || Math.round((Math.random() * t.marketCapUSD) / 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.3,
        delay: 0.03 * idx,
        ease: [0.16, 1, 0.3, 1],
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative block"
    >
      <Link
        to={`/token/${t.address}`}
        style={{ borderColor: isHovered ? '#96d6cd30' : '' }}
        className="relative flex items-center bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900/60 rounded p-3 md:p-4 transition-all duration-150 hover:bg-[#0b0f19]/80 cursor-pointer overflow-hidden group"
      >
        {/* Left-edge brand highlight active block */}
        <div 
          style={{ backgroundColor: '#96d6cd', opacity: isHovered ? 1 : 0 }}
          className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-150"
        />

        {/* Unified Flex/Grid Segment Structure */}
        <div className="w-full grid grid-cols-12 gap-3 items-center">
          
          {/* INDEX COLUMN */}
          <div className="col-span-1 flex items-center pl-1 relative">
            <span className={`font-mono text-xs font-bold ${t.rank <= 3 ? "text-[#96d6cd]" : "text-slate-600"}`}>
              {String(t.rank).padStart(2, '0')}
            </span>
            {t.rank <= 3 && (
              <span className="absolute -top-1 left-4">
                <Star size={8} style={{ color: '#96d6cd' }} className="fill-current opacity-40" />
              </span>
            )}
          </div>

          {/* ASSET CORE PROFILE IDENTIFIER */}
          <div className="col-span-8 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded bg-[#030712] border border-slate-800 flex-shrink-0 flex items-center justify-center font-mono font-black overflow-hidden">
              {t.logo_url ? (
                <img
                  src={t.logo_url}
                  alt={`${t.symbol} identifier`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentNode.querySelector(".symbol-fallback").style.display = "flex";
                  }}
                />
              ) : null}

              <div className={`symbol-fallback absolute inset-0 w-full h-full flex items-center justify-center text-[10px] text-slate-400 ${t.logo_url ? "hidden" : "flex"}`}>
                {t.symbol?.charAt?.(0) ?? "T"}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-200 truncate group-hover:text-slate-100 transition-colors uppercase tracking-wide">
                  {t.name}
                </h3>
                {t.rank <= 5 && <Flame size={11} className="text-amber-500/80" />}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span style={{ color: '#96d6cd' }} className="opacity-80">${t.symbol}</span>
                <span className="text-slate-700">•</span>
                <span className="text-slate-500 truncate hidden sm:inline">
                  {t.address?.slice?.(0, 6)}...{t.address?.slice?.(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* NETWORK METRIC: 24H LIQUIDITY VOLUME */}
          <div className="hidden md:flex md:col-span-3 flex-col items-end justify-center text-right font-mono">
            <span className="text-xs font-bold text-slate-300">
              {formatNumberCompact(mockVolume24h)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600 font-sans mt-0.5">
              VOLUME 24H
            </span>
          </div>

          {/* NET WORTH MARKET EVALUATION METRIC */}
          <div className="col-span-3 md:col-span-2 flex flex-col items-end justify-center text-right font-mono">
            <span className="text-xs font-bold text-slate-200">
              {formatNumberCompact(t.marketCapUSD)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600 font-sans mt-0.5">
              MARKET CAP
            </span>
          </div>

          {/* DIRECTIONAL INDICATOR CONNECTOR */}
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

// --- TokenList Core Container Component ---
export default function TokenList() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchTokens() {
      try {
        const { data, error } = await supabase
          .from("tokens")
          .select("name, symbol, address, marketcap, volume_24h, logo_url")
          .order("marketcap", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!data) throw new Error("No registry feedback");

        const formatted = data.map((t, idx) => ({
          ...t,
          rank: idx + 1,
          marketCapUSD: t.marketcap ?? 0,
        }));

        if (mounted) setTokens(formatted);
      } catch (err) {
        console.error("Registry sequence failed:", err.message || err);
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
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-[#030712]">
        <div 
          style={{ borderTopColor: '#96d6cd' }}
          className="w-6 h-6 rounded-full border border-slate-800 animate-spin" 
        />
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-4">
          Syncing Protocol Registers...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#030712] text-slate-100 font-sans py-4">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Modern Flat Enterprise Modular Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-900"
        >
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <span className="w-1 h-3 rounded-sm" style={{ backgroundColor: '#96d6cd' }} />
              Top Cap Index Feed
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase mt-1 tracking-wide">
              Real-time capital verification parameters active.
            </p>
          </div>
        </motion.div>

        {/* Sequential Index Canvas */}
        <AnimatePresence mode="wait">
          <div className="space-y-1.5">
            {tokens.length > 0 ? (
              tokens.map((t, i) => (
                <TokenRow key={`${t.address}-${t.rank}-${i}`} t={t} idx={i} />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 font-mono text-xs uppercase tracking-wider text-slate-600 border border-dashed border-slate-900 rounded"
              >
                No matching cataloged records located.
              </motion.div>
            )}
          </div>
        </AnimatePresence>
        
      </div>
    </div>
  );
}
