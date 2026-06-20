// src/components/TokenList.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, ChevronRight } from "lucide-react";

// Robust formatting helper equipped to handle numbers, string numbers, and small precision values safely
const formatNumberCompact = (num) => {
  if (num === null || num === undefined) return "$0.00";
  const number = Number(num);
  if (isNaN(number) || number === 0) return "$0.00";
  
  const abs = Math.abs(number);
  
  // High-precision formatting for micro-caps / values under $1,000
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

// --- TokenRow Component ---
const TokenRow = ({ t, idx }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Directly mapping to your optimized top_tokens_ranked view parameters
  const parsedVolume = t.volume_24h ?? t.volume24h ?? 0;
  const parsedMarketCap = t.market_cap ?? t.marketcap ?? 0;
  const tokenLogo = t.logo_url ?? t.logoUrl ?? t.logo_path ?? null;
  
  // Use the database calculated window-function rank value
  const rank = t.rank || idx + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.3,
        delay: 0.02 * idx,
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
        {/* Hover Highlight Border Edge Anchor */}
        <div 
          style={{ backgroundColor: '#96d6cd', opacity: isHovered ? 1 : 0 }}
          className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-150"
        />

        <div className="w-full grid grid-cols-12 gap-3 items-center">
          
          {/* INDEX COLUMN */}
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

          {/* ASSET PROFILE IDENTIFIER */}
          <div className="col-span-8 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded bg-[#030712] border border-slate-800 flex-shrink-0 flex items-center justify-center font-mono font-black overflow-hidden">
              {tokenLogo ? (
                <img
                  src={tokenLogo}
                  alt={`${t.symbol || "Asset"} identifier`}
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

          {/* VOLUME COLUMN */}
          <div className="hidden md:flex md:col-span-3 flex-col items-end justify-center text-right font-mono">
            <span className="text-xs font-bold text-slate-300">
              {formatNumberCompact(parsedVolume)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600 font-sans mt-0.5">
              VOLUME 24H
            </span>
          </div>

          {/* MARKET CAP COLUMN */}
          <div className="col-span-3 md:col-span-2 flex flex-col items-end justify-center text-right font-mono">
            <span className="text-xs font-bold text-slate-200">
              {formatNumberCompact(parsedMarketCap)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-600 font-sans mt-0.5">
              MARKET CAP
            </span>
          </div>

          {/* ACTION NAVIGATION HINT */}
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

// --- TokenList Container Component ---
export default function TokenList({ data = [] }) {
  // Defensive normalization step to handle if data arrives wrapped inside another response property
  const normalizedData = Array.isArray(data) ? data : [];

  return (
    <div className="bg-[#030712] text-slate-100 font-sans py-2">
      <div className="max-w-[1600px] mx-auto">
        
        <AnimatePresence mode="wait">
          <div className="space-y-1.5">
            {normalizedData.length > 0 ? (
              normalizedData.map((token, i) => {
                // Double safety: bail out gracefully if token row data is corrupt or missing an address
                if (!token) return null;
                return (
                  <TokenRow 
                    key={`${token.address || 'token'}-${i}`} 
                    t={token} 
                    idx={i} 
                  />
                );
              })
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
