// src/components/TokenCard.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowUpRight, Globe, Twitter, Send } from "lucide-react";
import { computeProgressPercentFixed } from "../utils/progress";

const compactNumberShort = (number) => {
  if (number === null || number === undefined) return "N/A";
  if (Number.isNaN(Number(number))) return "N/A";
  const n = Number(number);
  if (Math.abs(n) < 1000) return `$${Math.round(n)}`;
  const suffixes = ["", "k", "m", "b", "t"];
  const i = Math.floor(Math.log10(Math.abs(n)) / 3);
  let value = (n / Math.pow(1000, i)).toFixed(1);
  if (value.endsWith(".0")) value = value.slice(0, -2);
  return `$${value}${suffixes[i]}`;
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 0.9, 0.28, 1] },
  }),
};

function SocialLink({ href, icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="p-1 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors duration-200"
    >
      {icon}
    </a>
  );
}

export default function TokenCard({ token, index = 0, isNew = false }) {
  const cardRef = useRef(null);
  const [progress, setProgress] = useState({ graduated: false, percent: 0 });

  const [displayMarketcap, setDisplayMarketcap] = useState(
    token.marketcap || token.marketcap_usd
  );
  const [displayVolume, setDisplayVolume] = useState(token.volume_24h);

  // Animate MC
  const mcMotion = useMotionValue(displayMarketcap);
  const mcSpring = useSpring(mcMotion, { stiffness: 200, damping: 30 });
  const [mcDisplay, setMcDisplay] = useState(displayMarketcap);

  useEffect(() => {
    mcMotion.set(displayMarketcap);
  }, [displayMarketcap]);

  useEffect(() => {
    const unsub = mcSpring.on("change", (v) => setMcDisplay(Math.round(v)));
    return () => unsub();
  }, [mcSpring]);

  // Animate Volume
  const volMotion = useMotionValue(displayVolume);
  const volSpring = useSpring(volMotion, { stiffness: 200, damping: 30 });
  const [volDisplay, setVolDisplay] = useState(displayVolume);

  useEffect(() => {
    volMotion.set(displayVolume);
  }, [displayVolume]);

  useEffect(() => {
    const unsub = volSpring.on("change", (v) => setVolDisplay(Math.round(v)));
    return () => unsub();
  }, [volSpring]);

  // Fetch progress
  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      const result = await computeProgressPercentFixed(token);
      if (!cancelled) setProgress(result);
    }
    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - left}px`);
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - top}px`);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className="w-full h-full"
    >
      <Link to={`/token/${token.address}`} className="block group h-full">
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 20px 40px rgba(8,145,255,0.15)",
          }}
          whileTap={{ scale: 0.995 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.3,
          }}
          id={`token-${token.address}`}
          className={`token-card relative h-full rounded-2xl bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/60 shadow-lg px-4 py-3 overflow-hidden transition-all duration-300 ${
            isNew
              ? "animate-shake border-2 border-cyan-400"
              : "border border-slate-800/60"
          }`}
        >
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-start gap-4 min-w-0 w-full">
              <div className="flex-shrink-0 w-24 h-24">
                <div className="w-full h-full rounded-2xl bg-slate-800/50 flex items-center justify-center overflow-hidden ring-1 ring-slate-700/50">
                  {token.logo_path ? (
                    <img
                      src={token.logo_path}
                      alt={`${token.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl lg:text-6xl font-semibold bg-clip-text text-transparent bg-gradient-to-br from-cyan-300 to-violet-300">
                      {token.symbol?.charAt(0) || "T"}
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base lg:text-lg font-semibold text-white truncate">
                  {token.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {token.symbol ?? "—"}
                </p>

                <div className="flex items-center gap-1 mt-2">
                  <SocialLink
                    href={token.website}
                    icon={<Globe className="w-4 h-4" />}
                    label="Website"
                  />
                  <SocialLink
                    href={token.twitter}
                    icon={<Twitter className="w-4 h-4" />}
                    label="Twitter"
                  />
                  <SocialLink
                    href={token.telegram}
                    icon={<Send className="w-4 h-4" />}
                    label="Telegram"
                  />
                </div>

                <div className="flex items-center gap-1 mt-1">
                  <MetricBadge label="MC" value={mcDisplay} />
                  <MetricBadge label="VOL" value={volDisplay} />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-1 pt-1">
            {progress.graduated ? (
              <p className="text-xs font-semibold text-green-400">
                Listed on Uniswap
              </p>
            ) : (
              <ProgressBar percent={progress.percent} />
            )}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function MetricBadge({ label, value }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/50 rounded-md px-3 py-1 text-xs">
      <span className="text-slate-200 uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className="text-white font-semibold">
        {compactNumberShort(value)}
      </span>
    </div>
  );
}

function ProgressBar({ percent }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const displayPercent = Math.round(safePercent);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-400">Progress</span>
        <span className="text-[11px] font-semibold text-cyan-300">
          {displayPercent}%
        </span>
      </div>

      <div className="relative w-full h-3 rounded-full bg-slate-800/60 ring-1 ring-slate-700/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${safePercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "linear-gradient(90deg, #22d3ee, #38f8c2)" }}
        />
        <motion.div
          className="absolute top-0 left-0 h-full w-12 opacity-40"
          animate={{ x: ["-20%", "120%"] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
          }}
        />
      </div>
    </div>
  );
}
