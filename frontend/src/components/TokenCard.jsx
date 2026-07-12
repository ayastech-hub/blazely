import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Send, AtSign } from "lucide-react";
import { getPublicUrlSafe } from "../api/supabaseTokens";

/** Helper to clean path and prevent double-nesting 'logos/' */
const getCleanLogoPath = (path) => path?.replace(/^logos\//, "");

/* -------------------- Telemetry Formatters -------------------- */
function compactNumberShort(number, currency = "USD") {
  if (number == null) return "N/A";

  const n = Number(number);

  if (Number.isNaN(n)) return "N/A";

  const suffixes = ["", "K", "M", "B", "T"];

  if (Math.abs(n) < 1000) {
    return currency === "USD"
      ? `$${Math.round(n)}`
      : `${n.toFixed(2)} ETH`;
  }

  const i = Math.floor(Math.log10(Math.abs(n)) / 3);

  let value = (n / Math.pow(1000, i)).toFixed(1);

  if (value.endsWith(".0")) {
    value=value.slice(0,-2);
  }


  return currency === "USD"
    ? `$${value}${suffixes[i]}`
    : `${value}${suffixes[i]} ETH`;
}

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

function MetricGroup({ label, value, currency }) {
  return (
    <div
      className="flex items-center gap-1.5 bg-[#030712]/60 border border-slate-800/60 px-2.5 py-1 rounded-lg text-[10px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span className="text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <span>
 {compactNumberShort(value,currency)}
</span>
    </div>
  );
}

/* -------------------- Core Component -------------------- */
export default function TokenCard({ token, index = 0, isNew = false }) {
  const displayMarketcap = token.marketcap_eth || 0;
const displayVolume = token.volume_eth || 0;

const displayPrice = token.price_usd;
  // Resolve logo source dynamically
  const logoSrc = token.logo_path
    ? supabase.storage.from("logos").getPublicUrl(getCleanLogoPath(token.logo_path)).data.publicUrl
    : token.logo;

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
            <div className="w-14 h-14 bg-[#030712] border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {logoSrc ? (
                <img src={logoSrc} alt={token.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <span className="text-xl font-light text-slate-500" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {token.symbol?.charAt(0).toUpperCase() || "T"}
                </span>
{displayPrice != null && (
<p
 className="text-[10px] text-teal font-bold mt-1"
 style={{fontFamily:"'JetBrains Mono', monospace"}}
>
 ${displayPrice.toFixed(8)}
</p>
)}
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {token.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${token.symbol ?? "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <SocialLink href={token.website} icon={<Globe size={11} />} label="Website" />
                <SocialLink href={token.twitter} icon={<AtSign size={11} />} label="Twitter" />
                <SocialLink href={token.telegram} icon={<Send size={11} />} label="Telegram" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-4">
  <MetricGroup
 label="MCAP"
 value={displayMarketcap}
 currency="ETH"
/>

<MetricGroup
 label="VOL"
 value={displayVolume}
 currency="ETH"
/>
          </div>

          {/* Progress Section */}
          <div className="w-full border-t border-slate-800/50 pt-3">
            {token.graduated ? (
              <div className="text-[9px] font-bold uppercase tracking-widest bg-teal/10 border border-teal/30 text-teal px-2.5 py-1 inline-block rounded-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                STATUS: GRADUATED
              </div>
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-between font-bold text-[9px] text-slate-500 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>CURVE_FILL</span>
                </div>
      <div className="w-full h-1.5 bg-[#030712] border border-slate-800/50 overflow-hidden rounded-full relative">
 <div
   className="h-full bg-teal rounded-full"
   style={{
     width:`${Math.min(token.pool_progress || 0,100)}%`
   }}
 />
</div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
