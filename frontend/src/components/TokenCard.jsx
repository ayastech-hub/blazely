import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Send, AtSign } from "lucide-react";
import { getPublicUrlSafe } from "../api/supabaseTokens";

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
      className={`relative overflow-hidden border transition-all duration-500 ${
        isNew
          ? "border-teal/40 shadow-[0_0_0_1px_rgba(150,214,205,0.15),0_8px_32px_rgba(150,214,205,0.18)]"
          : "border-white/[0.08] shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
      } bg-white/[0.035] backdrop-blur-2xl backdrop-saturate-150 hover:bg-white/[0.06] hover:border-white/[0.14] ${className}`}
      style={{
        backgroundImage: glowTint
          ? `radial-gradient(120% 100% at 12% 0%, ${glowTint}, transparent 55%)`
          : undefined,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="pointer-events-none absolute -top-10 left-4 right-4 h-20 rounded-full bg-white/[0.05] blur-2xl" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export function TokenLogo({ token, logoSrc, size = "w-14 h-14", textSize = "text-xl" }) {
  return (
    <div
      className={`${size} bg-black/40 border border-white/[0.08] rounded-xl flex items-center justify-center overflow-hidden shrink-0 backdrop-blur-md`}
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
          className={`${textSize} font-light text-slate-500`}
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {token.symbol?.charAt(0).toUpperCase() || "T"}
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
      className="p-1.5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-md text-slate-500 hover:text-teal hover:border-teal/30 hover:bg-white/[0.06] transition-all duration-300 rounded-lg"
    >
      {icon}
    </a>
  );
}

export function SocialLinks({ token }) {
  return (
    <div className="flex items-center gap-1.5">
      <SocialLink href={token.website} icon={<Globe size={11} />} label="Website" />
      <SocialLink href={token.twitter} icon={<AtSign size={11} />} label="Twitter" />
      <SocialLink href={token.telegram} icon={<Send size={11} />} label="Telegram" />
    </div>
  );
}

export function MetricGroup({ label, value, currency }) {
  return (
    <div
      className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.07] backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span className="text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <span className="text-slate-200 font-bold tabular-nums">
        {compactNumberShort(value, currency)}
      </span>
    </div>
  );
}

// UI-only placeholder for a timeframe change value. No data wiring yet —
// intentionally rendered as a neutral dash until the metric is available.
export function ChangeValue({ className = "" }) {
  return (
    <span
      className={`text-[11px] text-slate-500 font-bold tabular-nums ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      —
    </span>
  );
}

export function CurveOrStatus({ token }) {
  if (token.graduated) {
    return (
      <div
        className="text-[9px] font-bold uppercase tracking-widest bg-teal/10 border border-teal/30 text-teal px-2.5 py-1 inline-block rounded-lg backdrop-blur-md"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        STATUS: GRADUATED
      </div>
    );
  }

  const progress = Math.min(Number(token.pool_progress || 0), 100);

  return (
    <div className="w-full">
      <div
        className="flex items-center justify-between font-bold text-[9px] text-slate-500 uppercase tracking-wider mb-1.5"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span>CURVE_FILL</span>
        <span>{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full h-1.5 bg-black/40 border border-white/[0.06] overflow-hidden rounded-full">
        <div
          className="h-full bg-teal rounded-full shadow-[0_0_8px_rgba(150,214,205,0.5)]"
          style={{ width: `${progress}%` }}
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
          glowTint={isNew ? "rgba(150,214,205,0.1)" : undefined}
          className="h-full rounded-[28px] p-4 flex flex-col justify-between group-hover:-translate-y-0.5"
        >
          <div className="flex gap-3 items-start min-w-0 w-full mb-4">
            <TokenLogo token={token} logoSrc={logoSrc} />

            <div className="min-w-0 flex-1">
              <h3
                className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors leading-tight"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {token.name}
              </h3>

              <p
                className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ${token.symbol ?? "—"}
              </p>

              {displayPrice !== null && (
                <p
                  className="text-[10px] text-teal font-bold mt-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ${Number(displayPrice).toFixed(8)}
                </p>
              )}

              <div className="mt-2.5">
                <SocialLinks token={token} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <MetricGroup label="MCAP" value={displayMarketcap} currency="ETH" />
            <MetricGroup label="VOL" value={displayVolume} currency="ETH" />
          </div>

          <div className="w-full border-t border-white/[0.06] pt-3">
            <CurveOrStatus token={token} />
          </div>
        </GlassSurface>
      </Link>
    </motion.div>
  );
}
