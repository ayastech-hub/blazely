// src/components/TokenCard.jsx — v2
// High-end token card. Helpers kept for TokenList / CreateToken consumers.
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Send, AtSign, CheckCircle2, Sparkles } from "lucide-react";
import { getPublicUrlSafe } from "../api/supabaseTokens";
import AnimatedNumber from "./tokenpage/AnimatedNumber";
import { ACCENT, GLASS, NESTED_FILL, GlassCard, GlassSurface } from "./ui/GlassCard";

/* -------------------- Formatters -------------------- */

export function compactNumberShort(number, currency = "USD") {
  if (number == null) return "—";
  const n = Number(number);
  if (Number.isNaN(n)) return "—";
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
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

export const shakeKeyframes = {
  x: [0, -3, 3, -3, 3, -1.5, 1.5, 0],
  transition: { duration: 0.45, ease: "easeInOut" },
};

/* -------------------- Logo -------------------- */

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

export { GlassSurface, GlassCard };

export function TokenLogo({ token, logoSrc, size = "w-14 h-14", textSize = "text-xl", accent = false }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`${size} rounded-xl bg-[var(--bg)]/50 border flex items-center justify-center overflow-hidden transition-colors ${
          accent ? "border-teal/40" : "border-white/[0.08] group-hover:border-white/[0.14]"
        }`}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className={`${textSize} font-medium text-[var(--text-faint-2)]`}>
            {token.symbol?.charAt(0).toUpperCase() || "T"}
          </span>
        )}
      </div>
      {accent && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg)] flex items-center justify-center bg-teal"
          aria-hidden
        >
          <Sparkles size={8} className="text-[var(--bg)]" strokeWidth={2.5} />
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
      className="p-1.5 rounded-lg text-[var(--text-faint-2)] hover:text-teal hover:bg-white/[0.04] transition-colors"
    >
      {icon}
    </a>
  );
}

export function SocialLinks({ token }) {
  if (!token.website && !token.twitter && !token.telegram) return null;
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <SocialLink href={token.website} icon={<Globe size={12} />} label="Website" />
      <SocialLink href={token.twitter} icon={<AtSign size={12} />} label="Twitter" />
      <SocialLink href={token.telegram} icon={<Send size={12} />} label="Telegram" />
    </div>
  );
}

export function MetricGroup({ label, value, currency }) {
  const numeric = Number(value) || 0;
  return (
    <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[var(--bg)]/40 border border-white/[0.05]">
      <div className="text-[10px] text-[var(--text-faint-2)] mb-0.5">{label}</div>
      <div
        className="text-[13px] font-medium tabular-nums text-[var(--text-bright)] truncate"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <AnimatedNumber value={numeric} format={(v) => compactNumberShort(v, currency)} />
      </div>
    </div>
  );
}

export function usePriceFlash(value) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (value != null && prev != null && Number(value) !== Number(prev)) {
      setFlash(Number(value) > Number(prev) ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 700);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
    prevRef.current = value;
  }, [value]);

  return flash;
}

export function ChangeValue({ className = "" }) {
  return (
    <span
      className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-md text-[var(--text-faint-2)] bg-[var(--bg)]/40 ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      —
    </span>
  );
}

export function CurveOrStatus({ token }) {
  if (token.graduated) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-teal/10 border border-teal/25 text-teal w-fit">
        <CheckCircle2 size={12} strokeWidth={2.5} />
        Graduated
      </div>
    );
  }

  const progress = Math.min(Number(token.pool_progress || 0), 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] text-[var(--text-faint-2)] mb-1.5">
        <span>Bonding</span>
        <span
          className="tabular-nums text-[var(--text-mid)]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {progress.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-1 bg-[var(--bg)]/40 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-teal transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function TokenCardSkeleton() {
  return (
    <div className={`h-full rounded-2xl p-5 flex flex-col justify-between ${GLASS}`}>
      <div className="flex gap-3 items-start w-full mb-4">
        <div className="w-14 h-14 rounded-xl shrink-0 brand-shimmer" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-md brand-shimmer" />
          <div className="h-3 w-1/3 rounded-md brand-shimmer" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-12 flex-1 rounded-xl brand-shimmer" />
        <div className="h-12 flex-1 rounded-xl brand-shimmer" />
      </div>
      <div className="border-t border-white/[0.05] pt-3">
        <div className="h-1 w-full rounded-full brand-shimmer" />
      </div>
    </div>
  );
}

/* -------------------- Card -------------------- */

export default function TokenCard({ token, index = 0, isNew = false }) {
  const logoSrc = useResolvedLogo(token);
  const displayMarketcap = token.market_cap_eth ?? token.marketcap_eth ?? 0;
  const displayVolume = token.volume_eth ?? 0;
  const displayPrice = token.price_usd ?? null;
  const priceFlash = usePriceFlash(displayPrice);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate={isNew ? { ...shakeKeyframes, opacity: 1, y: 0 } : "visible"}
      custom={index}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="w-full h-full"
    >
      <Link to={`/token/${token.address}`} className="block group h-full">
        <GlassSurface
          isNew={isNew}
          glowTint={isNew ? "rgba(150,214,205,0.10)" : undefined}
          className="h-full rounded-2xl p-5 flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex gap-3.5 items-start min-w-0 w-full mb-4">
            <TokenLogo token={token} logoSrc={logoSrc} accent={isNew} />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-[15px] font-medium text-[var(--text-bright)] truncate group-hover:text-white transition-colors leading-tight">
                      {token.name}
                    </h3>
                    {isNew && (
                      <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal/15 text-teal">
                        New
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] text-[var(--text-faint-2)] truncate mt-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {token.symbol ?? "—"}
                  </p>
                </div>
                <SocialLinks token={token} />
              </div>

              {displayPrice !== null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <motion.p
                    animate={
                      priceFlash === "up"
                        ? { color: ["var(--green-2)", "var(--teal)"] }
                        : priceFlash === "down"
                        ? { color: ["var(--rose)", "var(--teal)"] }
                        : {}
                    }
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="text-[13px] font-medium tabular-nums text-teal"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ${Number(displayPrice).toFixed(8)}
                  </motion.p>
                  <ChangeValue />
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-stretch gap-2 mb-4">
            <MetricGroup label="Market Cap" value={displayMarketcap} currency="ETH" />
            <MetricGroup label="Volume" value={displayVolume} currency="ETH" />
          </div>

          {/* Progress */}
          <div className="w-full border-t border-white/[0.05] pt-3.5">
            <CurveOrStatus token={token} />
          </div>
        </GlassSurface>
      </Link>
    </motion.div>
  );
}
