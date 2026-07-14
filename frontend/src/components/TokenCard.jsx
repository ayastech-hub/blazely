import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Send, AtSign } from "lucide-react";
import { getPublicUrlSafe } from "../api/supabaseTokens";

/* -------------------- Telemetry Formatters -------------------- */

function compactNumberShort(number, currency = "USD") {
  if (number == null) return "N/A";

  const n = Number(number);
  if (Number.isNaN(n)) return "N/A";

  const suffixes = ["", "K", "M", "B", "T"];

  if (Math.abs(n) < 1000) {
    return currency === "USD" ? `$${Math.round(n)}` : `${n.toFixed(2)} ETH`;
  }

  const i = Math.floor(Math.log10(Math.abs(n)) / 3);
  let value = (n / Math.pow(1000, i)).toFixed(1);

  if (value.endsWith(".0")) {
    value = value.slice(0, -2);
  }

  return currency === "USD" ? `$${value}${suffixes[i]}` : `${value}${suffixes[i]} ETH`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.03,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// Shake is expressed as a short, damped horizontal wobble — driven by
// framer-motion's `animate` prop so it composes cleanly with the
// entrance/hover transforms instead of fighting a CSS keyframe class.
const shakeKeyframes = {
  x: [0, -3, 3, -3, 3, -1.5, 1.5, 0],
  transition: { duration: 0.45, ease: "easeInOut" },
};

/* -------------------- Glass primitives -------------------- */

// Shared "liquid glass" shell: translucent frosted surface, a soft
// specular highlight riding the top edge, and a faint ambient bloom.
// Kept as a single source so grid/list variants never drift apart visually.
function GlassSurface({ children, className = "", isNew, glowTint }) {
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
      {/* top specular highlight — the "glass" glint */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="pointer-events-none absolute -top-10 left-4 right-4 h-20 rounded-full bg-white/[0.05] blur-2xl" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

function SocialLink({ href, icon, label }) {
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

function MetricGroup({ label, value, currency }) {
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

// UI-only placeholder chip for timeframe change. No data wiring yet —
// intentionally rendered as a neutral dash until the metric is available.
function ChangeChip({ label }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5 min-w-[46px] px-1.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span className="text-[8px] text-slate-600 uppercase tracking-wider font-bold">
        {label}
      </span>
      <span className="text-[10px] text-slate-500 font-bold tabular-nums">—</span>
    </div>
  );
}

function CurveOrStatus({ token }) {
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

/* -------------------- Core Component -------------------- */

export default function TokenCard({ token, index = 0, isNew = false, view = "grid" }) {
  const [logoSrc, setLogoSrc] = useState(token.logo || null);

  const displayMarketcap = token.market_cap_eth ?? token.marketcap_eth ?? 0;
  const displayVolume = token.volume_eth ?? 0;
  const displayPrice = token.price_usd ?? null;

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

  const Logo = ({ size = "w-14 h-14", textSize = "text-xl" }) => (
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

  const Socials = () => (
    <div className="flex items-center gap-1.5">
      <SocialLink href={token.website} icon={<Globe size={11} />} label="Website" />
      <SocialLink href={token.twitter} icon={<AtSign size={11} />} label="Twitter" />
      <SocialLink href={token.telegram} icon={<Send size={11} />} label="Telegram" />
    </div>
  );

  /* -------------------- List variant -------------------- */
  if (view === "list") {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate={isNew ? { ...shakeKeyframes, opacity: 1, y: 0, filter: "blur(0px)" } : "visible"}
        custom={index}
        className="w-full"
      >
        <Link to={`/token/${token.address}`} className="block group">
          <GlassSurface
            isNew={isNew}
            glowTint={isNew ? "rgba(150,214,205,0.08)" : undefined}
            className="rounded-2xl px-4 py-3 flex items-center gap-4"
          >
            <Logo size="w-10 h-10" textSize="text-sm" />

            <div className="min-w-0 w-[180px] shrink-0">
              <h3
                className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {token.name}
              </h3>
              <p
                className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ${token.symbol ?? "—"}
              </p>
            </div>

            <div
              className="w-24 shrink-0 text-[11px] text-teal font-bold tabular-nums hidden sm:block"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {displayPrice !== null ? `$${Number(displayPrice).toFixed(8)}` : "—"}
            </div>

            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <ChangeChip label="5M" />
              <ChangeChip label="1H" />
              <ChangeChip label="6H" />
              <ChangeChip label="24H" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <MetricGroup label="MCAP" value={displayMarketcap} currency="ETH" />
              <MetricGroup label="VOL" value={displayVolume} currency="ETH" />
            </div>

            <div className="w-32 shrink-0 hidden lg:block">
              <CurveOrStatus token={token} />
            </div>

            <div className="hidden xl:block shrink-0">
              <Socials />
            </div>
          </GlassSurface>
        </Link>
      </motion.div>
    );
  }

  /* -------------------- Grid variant (default) -------------------- */
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
          {/* Identity */}
          <div className="flex gap-3 items-start min-w-0 w-full mb-4">
            <Logo />

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
                <Socials />
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <MetricGroup label="MCAP" value={displayMarketcap} currency="ETH" />
            <MetricGroup label="VOL" value={displayVolume} currency="ETH" />
          </div>

          {/* Curve Progress / Status */}
          <div className="w-full border-t border-white/[0.06] pt-3">
            <CurveOrStatus token={token} />
          </div>
        </GlassSurface>
      </Link>
    </motion.div>
  );
}
