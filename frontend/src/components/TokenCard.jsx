import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Send, AtSign, CheckCircle2, Sparkles } from "lucide-react";
import { getPublicUrlSafe } from "../api/supabaseTokens";

/* ============================================================
   Shared design tokens — kept identical to Navbar.jsx so every
   surface in the app reads as one system, not a patchwork.
   ============================================================ */
const ACCENT = "#96d6cd";

const GLASS =
  "border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-[1.6] backdrop-brightness-105 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.6)]";

// Nested elements inside a glass surface use a SOLID fill, never another
// blur layer — stacking backdrop-blur inside backdrop-blur muddies the
// effect and costs paint performance for no visual gain.
const NESTED_FILL = "bg-black/25 border border-white/[0.08]";

/* -------------------- Telemetry Formatters -------------------- */

export function compactNumberShort(number, currency = "USD") {
  if (number == null) return "N/A";
  const n = Number(number);
  if (Number.isNaN(n)) return "N/A";
  const suffixes = ["", "K", "M", "B", "T"];
  if (Math.abs(n) < 1000) {
    return currency === "USD" ? `$${Math.round(n)}` : `${n.toFixed(2)} ETH`;
  }
  const i = Math.floor(Math.log10(Math.abs(n)) / 3);
  let value = (n / Math.pow(1000, i)).toFixed(1);
  if (value.endsWith(".0")) value = value.slice(0, -2);
  return currency === "USD" ? `$${value}${suffixes[i]}` : `${value}${suffixes[i]} ETH`;
}

export const cardVariants = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.03, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

// Shake is expressed as a short, damped horizontal wobble — driven by
// framer-motion's `animate` prop so it composes cleanly with the
// entrance/hover transforms instead of fighting a CSS keyframe class.
export const shakeKeyframes = {
  x: [0, -3, 3, -3, 3, -1.5, 1.5, 0],
  transition: { duration: 0.45, ease: "easeInOut" },
};

/* -------------------- Shared logo resolution -------------------- */

export function useResolvedLogo(token) {
  const [logoSrc, setLogoSrc] = useState(token.logo || null);

  useEffect(() => {
    let mounted = true;

    async function loadLogo() {
      if (!token.logo_path) return;
      const url = await getPublicUrlSafe(token.logo_path);
      if (mounted && url) setLogoSrc(url);
    }

    loadLogo();
    return () => {
      mounted = false;
    };
  }, [token.logo_path]);

  return logoSrc;
}

/* -------------------- Glass primitives -------------------- */

export function GlassSurface({ children, className = "", isNew, glowTint }) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-500 ${GLASS} ${
        isNew
          ? "border-[#96d6cd]/40 shadow-[0_0_0_1px_rgba(150,214,205,0.15),0_10px_40px_-8px_rgba(150,214,205,0.22)]"
          : ""
      } hover:bg-white/[0.09] hover:border-white/[0.14] ${className}`}
      style={{
        backgroundImage: glowTint
          ? `radial-gradient(120% 100% at 12% 0%, ${glowTint}, transparent 55%)`
          : undefined,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export function TokenLogo({ token, logoSrc, size = "w-16 h-16", textSize = "text-2xl", accent = false }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`${size} bg-black/30 border rounded-2xl flex items-center justify-center overflow-hidden ${
          accent ? "border-[#96d6cd]/40" : "border-white/[0.1]"
        }`}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={token.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span
            className={`${textSize} font-medium text-slate-500`}
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {token.symbol?.charAt(0).toUpperCase() || "T"}
          </span>
        )}
      </div>
      {accent && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0b0f19] flex items-center justify-center"
          style={{ backgroundColor: ACCENT }}
          aria-hidden="true"
        >
          <Sparkles size={8} className="text-[#030712]" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

export function SocialLink({ href, icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className={`p-1.5 rounded-lg text-slate-500 hover:text-[#96d6cd] hover:border-[#96d6cd]/30 transition-colors duration-200 ${NESTED_FILL}`}
    >
      {icon}
    </a>
  );
}

export function SocialLinks({ token }) {
  const hasAny = token.website || token.twitter || token.telegram;
  if (!hasAny) return null;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <SocialLink href={token.website} icon={<Globe size={11} />} label="Website" />
      <SocialLink href={token.twitter} icon={<AtSign size={11} />} label="Twitter" />
      <SocialLink href={token.telegram} icon={<Send size={11} />} label="Telegram" />
    </div>
  );
}

export function MetricGroup({ label, value, currency }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] ${NESTED_FILL}`}
    >
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-100 font-semibold tabular-nums font-mono">
        {compactNumberShort(value, currency)}
      </span>
    </div>
  );
}

// UI-only placeholder for a timeframe change value. No data wiring yet —
// intentionally rendered as a neutral dash until the metric is available.
export function ChangeValue({ className = "" }) {
  return (
    <span className={`text-[11px] text-slate-500 font-semibold tabular-nums font-mono ${className}`}>—</span>
  );
}

export function CurveOrStatus({ token }) {
  if (token.graduated) {
    return (
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg w-fit"
        style={{ backgroundColor: `${ACCENT}1A`, border: `1px solid ${ACCENT}40`, color: ACCENT }}
      >
        <CheckCircle2 size={12} strokeWidth={2.5} />
        Graduated
      </div>
    );
  }

  const progress = Math.min(Number(token.pool_progress || 0), 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
        <span>Bonding curve</span>
        <span className="font-mono font-semibold text-slate-300 tabular-nums">{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full h-1.5 bg-black/30 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: ACCENT,
            boxShadow: `0 0 8px ${ACCENT}80`,
          }}
        />
      </div>
    </div>
  );
}

/* -------------------- Core Component (grid card) -------------------- */

export default function TokenCard({ token, index = 0, isNew = false }) {
  const logoSrc = useResolvedLogo(token);

  const displayMarketcap = token.market_cap_eth ?? token.marketcap_eth ?? 0;
  const displayVolume = token.volume_eth ?? 0;
  const displayPrice = token.price_usd ?? null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate={isNew ? { ...shakeKeyframes, opacity: 1, y: 0, filter: "blur(0px)" } : "visible"}
      custom={index}
      className="w-full h-full"
    >
      <Link to={`/token/${token.address}`} className="block group h-full">
        <GlassSurface
          isNew={isNew}
          glowTint={isNew ? "rgba(150,214,205,0.12)" : undefined}
          className="h-full rounded-[24px] p-5 flex flex-col justify-between group-hover:-translate-y-0.5"
        >
          {/* Header — logo now anchors the card instead of competing with text */}
          <div className="flex gap-3.5 items-center min-w-0 w-full mb-4">
            <TokenLogo token={token} logoSrc={logoSrc} accent={isNew} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3
                  className="text-[15px] font-medium text-slate-100 truncate group-hover:text-white transition-colors leading-tight"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {token.name}
                </h3>
                {isNew && (
                  <span
                    className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}
                  >
                    New
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 font-semibold font-mono truncate mt-0.5">
                ${token.symbol ?? "—"}
              </p>

              {displayPrice !== null && (
                <p className="text-[13px] font-bold font-mono mt-1" style={{ color: ACCENT }}>
                  ${Number(displayPrice).toFixed(8)}
                </p>
              )}
            </div>
          </div>

          {/* Metrics — solid nested chips, single glass layer */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <MetricGroup label="MCAP" value={displayMarketcap} currency="ETH" />
            <MetricGroup label="VOL" value={displayVolume} currency="ETH" />
          </div>

          {/* Footer — status/progress + socials on one line */}
          <div className="flex items-center gap-3 w-full border-t border-white/[0.06] pt-3.5">
            <div className="flex-1 min-w-0">
              <CurveOrStatus token={token} />
            </div>
            <SocialLinks token={token} />
          </div>
        </GlassSurface>
      </Link>
    </motion.div>
  );
}
