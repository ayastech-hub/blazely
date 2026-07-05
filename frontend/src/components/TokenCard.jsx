

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Send, AtSign, ChevronRight } from "lucide-react";
import { computeProgressPercentFixed } from "../utils/progress";
import { supabase } from "../lib/supabaseClient";

/** Helper to clean path and prevent double-nesting 'logos/' */
const getCleanLogoPath = (path) => path?.replace(/^logos\//, "");

/* -------------------- Telemetry Formatters -------------------- */
const compactNumberShort = (number) => {
  if (number === null || number === undefined) return "N/A";
  if (Number.isNaN(Number(number))) return "N/A";
  const n = Number(number);
  if (Math.abs(n) < 1000) return `$${Math.round(n)}`;
  const suffixes = ["", "K", "M", "B", "T"];
  const i = Math.floor(Math.log10(Math.abs(n)) / 3);
  let value = (n / Math.pow(1000, i)).toFixed(1);
  if (value.endsWith(".0")) value = value.slice(0, -2);
  return `$${value}${suffixes[i]}`;
};

const cardVariants = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* -------------------- Sub-Elements -------------------- */
function SocialLink({ href, icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="p-1.5 border border-slate-800/60 bg-[#030712]/60 text-slate-500 hover:text-teal hover:border-teal/30 transition-all duration-300 rounded-lg"
    >
      {icon}
    </a>
  );
}

function MetricGroup({ label, value }) {
  return (
    <div
      className="flex items-center gap-1.5 bg-[#030712]/60 border border-slate-800/60 px-2.5 py-1 rounded-lg text-[10px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span className="text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <span className="text-slate-200 font-bold tabular-nums">{compactNumberShort(value)}</span>
    </div>
  );
}

/* -------------------- Core Component -------------------- */
export default function TokenCard({ token, index = 0, isNew = false }) {
  const [progress, setProgress] = useState({ graduated: false, percent: 0 });
  const displayMarketcap = token.marketcap || token.marketcap_usd || 0;
  const displayVolume = token.volume_24h || 0;

  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      const result = await computeProgressPercentFixed(token);
      if (!cancelled) setProgress(result || { graduated: false, percent: 0 });
    }
    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Resolve logo source dynamically
  const logoSrc = token.logo_path
    ? supabase.storage.from("logos").getPublicUrl(getCleanLogoPath(token.logo_path)).data.publicUrl
    : token.logo;

  const safePercent = Math.max(0, Math.min(100, progress.percent || 0));

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className="w-full h-full"
    >
      <Link to={`/token/${token.address}`} className="block group h-full">
        <div
          style={{
            borderColor: isNew ? "rgba(150,214,205,0.4)" : "rgba(30,41,59,0.6)",
            boxShadow: isNew ? "0 0 24px rgba(150,214,205,0.12)" : "none",
          }}
          className="relative h-full rounded-2xl bg-[#0a0f1c]/50 backdrop-blur-sm border p-4 flex flex-col justify-between transition-all duration-300 hover:bg-[#0e1424]/60 group-hover:border-teal/20"
        >
          {/* Main identity block */}
          <div className="flex gap-3 items-start min-w-0 w-full mb-4">
            {/* Logo frame */}
            <div className="w-14 h-14 bg-[#030712] border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={`${token.name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <span
                  className="text-xl font-light text-slate-500"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {token.symbol?.charAt(0).toUpperCase() || "T"}
                </span>
              )}
            </div>

            {/* Token name + symbol + socials */}
            <div className="min-w-0 flex-1">
              <h3
                className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors leading-tight"
                style={{ fontFamily: "'Fraunces', Georgia, serif", letterSpacing: "-0.01em" }}
              >
                {token.name}
              </h3>
              <p
                className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ${token.symbol ?? "—"}
              </p>
              {/* Social anchors */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <SocialLink href={token.website} icon={<Globe size={11} />} label="Website" />
                <SocialLink href={token.twitter} icon={<AtSign size={11} />} label="Twitter" />
                <SocialLink href={token.telegram} icon={<Send size={11} />} label="Telegram" />
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <MetricGroup label="MCAP" value={displayMarketcap} />
            <MetricGroup label="VOL" value={displayVolume} />
          </div>

          {/* Curve progress section */}
          <div className="w-full border-t border-slate-800/50 pt-3">
            {progress.graduated ? (
              <div
                className="text-[9px] font-bold uppercase tracking-widest bg-teal/10 border border-teal/30 text-teal px-2.5 py-1 inline-block rounded-lg"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                STATUS: GRADUATED
              </div>
            ) : (
              <div className="w-full">
                <div
                  className="flex items-center justify-between font-bold text-[9px] text-slate-500 uppercase tracking-wider mb-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span>CURVE_FILL</span>
                  <span className="text-slate-300 tabular-nums">{Math.round(safePercent)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#030712] border border-slate-800/50 overflow-hidden rounded-full relative">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${safePercent}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background: "linear-gradient(90deg, rgba(150,214,205,0.6) 0%, #5eead4 100%)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* NEW badge */}
          {isNew && (
            <div
              className="absolute top-0 right-0 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-tr-2xl rounded-bl-lg"
              style={{
                backgroundColor: "#96d6cd",
                color: "#030712",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              NEW
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}


