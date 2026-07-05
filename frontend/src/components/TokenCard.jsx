// src/components/TokenCard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Twitter, Send } from "lucide-react";
import { computeProgressPercentFixed } from "../utils/progress";

const getCleanLogoPath = (path) => path?.replace(/^logos\//, '');

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
  hidden: { opacity: 0, y: 4 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.02, duration: 0.2, ease: "easeOut" },
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
      className="p-1 border border-slate-900 bg-[#030712] text-slate-500 hover:text-slate-200 hover:border-slate-800 transition-all rounded-none"
    >
      {icon}
    </a>
  );
}

function MetricGroup({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#030712]/60 border border-slate-900/80 px-2 py-1 rounded-none text-[10px]">
      <span className="text-slate-500 uppercase font-bold tracking-wider">{label}:</span>
      <span className="text-slate-200 font-bold font-mono">{compactNumberShort(value)}</span>
    </div>
  );
}

/* -------------------- Core Component Module -------------------- */
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

  const safePercent = Math.max(0, Math.min(100, progress.percent || 0));

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className="w-full h-full font-mono"
    >
      <Link to={`/token/${token.address}`} className="block group h-full">
        <div
          style={{
            borderColor: isNew ? '#96d6cd' : '',
            boxShadow: isNew ? '0 0 12px rgba(150,214,205,0.1)' : ''
          }}
          className={`relative h-full rounded-sm bg-[#0b0f19]/40 border border-slate-900 p-3 flex flex-col justify-between transition-colors hover:bg-[#0b0f19]/80 group-hover:border-slate-800`}
        >
          {/* Main Context Grid Block */}
          <div className="flex gap-3 items-start min-w-0 w-full mb-3">
            
            {/* Rigid Identity Square Image Frame */}
            <div className="w-14 h-14 bg-[#030712] border border-slate-900 rounded-none flex items-center justify-center overflow-hidden shrink-0">
  {token.logo_path ? (
    <img
      src={supabase.storage.from("logos").getPublicUrl(getCleanLogoPath(token.logo_path)).data.publicUrl}
      alt={`${token.name} logo`}
      className="w-full h-full object-cover"
      onError={(e) => { e.target.src = '/fallback-icon.png'; }} // Add a fallback
    />
  ) : (
    <span className="text-lg font-black text-slate-500">
      {token.symbol?.charAt(0).toUpperCase() || "T"}
    </span>
  )}
</div>

            {/* Core Identification Text Segment */}
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider truncate leading-tight">
                {token.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate mt-0.5">
                ${token.symbol ?? "—"}
              </p>

              {/* Functional Social Anchors Network */}
              <div className="flex items-center gap-1 mt-2">
                <SocialLink
                  href={token.website}
                  icon={<Globe size={11} />}
                  label="Website"
                />
                <SocialLink
                  href={token.twitter}
                  icon={<Twitter size={11} />}
                  label="Twitter"
                />
                <SocialLink
                  href={token.telegram}
                  icon={<Send size={11} />}
                  label="Telegram"
                />
              </div>
            </div>
          </div>

          {/* Quant Index Metrics Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <MetricGroup label="MCAP" value={displayMarketcap} />
            <MetricGroup label="VOL_24H" value={displayVolume} />
          </div>

          {/* Infrastructure Curve Telemetry Progress Section */}
          <div className="w-full border-t border-slate-900/60 pt-2 text-[10px]">
            {progress.graduated ? (
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-[#030712]/40 border border-slate-900 px-1.5 py-0.5 inline-block rounded-none">
                [ STATUS: GRADUATED ]
              </div>
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-between font-bold text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                  <span>CURVE_FILL</span>
                  <span className="text-slate-300 font-mono">{Math.round(safePercent)}%</span>
                </div>

                {/* Flat Engineering Gauge Track */}
                <div className="w-full h-1 bg-[#030712] border border-slate-900/40 overflow-hidden rounded-none relative">
                  <motion.div
                    className="h-full opacity-90"
                    initial={{ width: 0 }}
                    animate={{ width: `${safePercent}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ backgroundColor: '#96d6cd' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Top-Right Absolute New Signal Badging */}
          {isNew && (
            <div 
              style={{ backgroundColor: '#96d6cd', color: '#030712' }}
              className="absolute top-0 right-0 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-none"
            >
              NEW_NODE
            </div>
          )}

        </div>
      </Link>
    </motion.div>
  );
}
