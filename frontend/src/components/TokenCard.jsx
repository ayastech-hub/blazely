// File: components/TokenCard.jsx
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe, Twitter, Send } from "lucide-react";
import { usd } from "../utils/format";

// --- Helper function to format large numbers for volume ---
const formatCompactNumber = (number) => {
  if (number === null || number === undefined) return "N/A";
  if (number < 1000) return `$${number}`;
  const suffixes = ["", "K", "M", "B", "T"];
  const i = Math.floor(Math.log10(number) / 3);
  const value = (number / Math.pow(1000, i)).toFixed(1);
  return `$${value}${suffixes[i]}`;
};

// --- Framer Motion Variants ---
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const glowVariants = {
  initial: { opacity: 0, scale: 1 },
  animate: {
    opacity: [0.3, 0.5, 0.3],
    scale: [1, 1.2, 1],
    transition: { duration: 10, repeat: Infinity, ease: "easeInOut" },
  },
};

// --- Category Configuration ---
const validCategories = [
  "AI",
  "Meme",
  "DeFi",
  "GameFi",
  "Infra",
  "Social",
  "DePin",
];
const categoryGradients = {
  AI: "from-purple-500 to-indigo-500",
  Meme: "from-pink-500 to-red-500",
  DeFi: "from-emerald-500 to-cyan-500",
  GameFi: "from-orange-500 to-yellow-500",
  Infra: "from-slate-500 to-gray-500",
  Social: "from-blue-500 to-sky-500",
  DePin: "from-rose-500 to-fuchsia-500",
};

export default function TokenCard({ token, index = 0 }) {
  const cardRef = useRef(null);

  const category = token.category;
  const isCategoryValid = validCategories.includes(category);
  const categoryGradient = categoryGradients[category] || "";

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
      whileHover="hover"
      custom={index}
      className="w-full h-full"
    >
      <Link to={`/token/${token.token_address}`} className="block group h-full">
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="card-shine-effect h-full relative p-4 lg:p-5 rounded-xl bg-slate-900/80
                     backdrop-blur-2xl border border-slate-800 hover:border-cyan-400/50
                     shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 overflow-hidden"
        >
          {/* Background liquid glow effect */}
          <motion.div
            variants={glowVariants}
            initial="initial"
            animate="animate"
            className="absolute -inset-12 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none blur-3xl"
          />

          {/* Main content - Horizontal and responsive */}
          <div className="relative z-10 flex h-full w-full items-center justify-between gap-4">
            {/* Left Section: Logo + Info */}
            <div className="flex flex-1 items-center gap-4 min-w-0">
              {/* Logo */}
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-slate-800/70 flex items-center justify-center overflow-hidden flex-shrink-0">
                {token.logo ? (
                  <img
                    src={token.logo}
                    alt={`${token.name} logo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl md:text-2xl font-bold bg-gradient-to-br from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    {token.symbol?.charAt(0) || "T"}
                  </span>
                )}
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {token.name}
                </h3>

                {/* Sub-info row with wrapping for mobile */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                  <p className="text-sm text-slate-400 font-medium">
                    ${token.symbol}
                  </p>

                  {isCategoryValid && (
                    <div
                      className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${categoryGradient} text-white text-[10px] font-bold shadow-md`}
                    >
                      {category}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {token.website && (
                      <SocialIcon href={token.website} icon={Globe} />
                    )}
                    {token.twitter && (
                      <SocialIcon href={token.twitter} icon={Twitter} />
                    )}
                    {token.telegram && (
                      <SocialIcon href={token.telegram} icon={Send} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section: Stats */}
            <div className="flex-shrink-0 text-right">
              <p className="text-sm sm:text-base font-semibold text-slate-200">
                {usd(token.marketcap_usd)} mc
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {formatCompactNumber(token.volume_24h)} vol
              </p>
            </div>
          </div>

          {/* Hover Arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            variants={{ hover: { opacity: 1, scale: 1 } }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 flex items-center justify-center"
          >
            <ArrowUpRight className="w-4 h-4 text-slate-300" />
          </motion.div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// Reusable Social Icon Component
const SocialIcon = ({ href, icon: Icon }) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ scale: 1.1, y: -1, color: "#22d3ee" }} // cyan-400
    whileTap={{ scale: 0.95 }}
    className="w-6 h-6 rounded-md text-slate-400 hover:bg-slate-800/60 flex items-center justify-center transition-colors duration-200"
    onClick={(e) => e.stopPropagation()}
  >
    <Icon className="w-4 h-4" />
  </motion.a>
);
