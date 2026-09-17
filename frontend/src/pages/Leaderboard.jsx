//src/pages/Leaderboard.jsx
//
// PURPOSE
// Ranks all tokens by market cap or 24h volume. Two sort modes, toggled by
// the pills above the list; the page re-queries Supabase on every sort
// change rather than sorting client-side (see the effect below) — fine at
// current token counts, but if this table grows large, switch to a
// server-side `order by` + `limit` in the Supabase query instead of
// fetching everything and sorting in JS.
//
// DATA FLOW
// 1. Fetches every row from `tokens` joined with `token_metrics_latest`.
// 2. `normalizeToken()` (api/supabaseTokens.js) reshapes each row — notably
//    it produces `market_cap_eth` / `volume_eth` (raw wei, correctly
//    labeled) AND a legacy `marketcap_usd` / `volume_24h` pair that is
//    NOT actually converted to USD despite the name (a "temporary
//    compatibility" leftover the file itself flags for removal). This page
//    used to display those mislabeled fields directly — a real bug, now
//    fixed: `LeaderboardRow` computes the real USD figures itself from the
//    correctly-labeled ETH fields + the live price from `usePrices()`.
// 3. Sorting uses the raw ETH wei fields, not a USD conversion — multiplying
//    every value by the same positive exchange rate never changes relative
//    order, so this sorts correctly even before the live price has loaded.
//
// KNOWN GAPS (not fixed here, flagging for whoever picks this up)
// - No pagination — fetches every token on every sort change. Fine today,
//   won't be once the token count is large.
// - `formatNumberCompact` duplicates logic that already exists in
//   `utils/format.js` (`formatCompact`) — worth consolidating.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "../components/ui/Loading";
import { supabase } from "../lib/supabaseClient";
import { Star, ChevronRight, TrendingUp, BarChart3 } from "lucide-react";
import { normalizeToken } from "../api/supabaseTokens"; // Using your API normalization
import { usePrices } from "../hooks/usePrices";
import { ethToUsd } from "../utils/priceConversion";
import { formatWei } from "../utils/format";

const formatNumberCompact = (num) => {
  if (num === null || num === undefined) return "$0.00";
  const number = Number(num);
  if (isNaN(number) || number === 0) return "$0.00";

  const abs = Math.abs(number);
  if (abs < 1000)
    return `$${abs.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const suffixes = ["", "K", "M", "B", "T"];
  const i = Math.max(0, Math.min(suffixes.length - 1, Math.floor(Math.log10(abs) / 3)));
  const scaled = abs / Math.pow(1000, i);
  let numericDisplay = Math.round(scaled * 10) / 10;
  return `$${numericDisplay.toFixed(1)}${suffixes[i]}`;
};

const LeaderboardRow = ({ t, idx, ethUsd }) => {
  const marketcapUsd = ethUsd != null ? ethToUsd(Number(formatWei(t.market_cap_eth, 18)), ethUsd) : null;
  const volumeUsd = ethUsd != null ? ethToUsd(Number(formatWei(t.volume_eth, 18)), ethUsd) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative block"
    >
      <Link
        to={`/token/${t.address}`}
        className="relative flex items-center rounded-xl border border-[var(--border-hi)]/60 bg-[var(--panel-alt)]/40 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-[var(--panel-deep)]/60 hover:border-teal/20 group"
      >
        <div className="w-full grid grid-cols-12 gap-4 items-center">
          {/* Rank numeral — editorial serif */}
          <div className="col-span-1 pl-1">
            <span
              className="font-light text-[var(--border-mid)] group-hover:text-teal transition-colors duration-300"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, lineHeight: 1 }}
            >
              {idx + 1}
            </span>
          </div>

          {/* Token identity */}
          <div className="col-span-8 md:col-span-5 flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg)] border border-[var(--border-hi)] flex items-center justify-center overflow-hidden">
              {t.logo ? (
                <img src={t.logo} className="w-full h-full object-cover" alt={t.name} />
              ) : (
                <span
                  className="text-xs font-medium text-[var(--text-faint-2)]"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {t.symbol?.[0] || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div
                className="text-sm font-medium text-[var(--text-bright-2)] truncate group-hover:text-white transition-colors"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {t.name}
              </div>
              <div
                className="text-[11px] text-[var(--border-mid)]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {t.address.slice(0, 6)}...{t.address.slice(-4)}
              </div>
            </div>
          </div>

          {/* Volume */}
          <div
            className="hidden md:flex md:col-span-3 justify-end text-sm text-[var(--text-mid-2)] tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatNumberCompact(volumeUsd)}
          </div>

          {/* Market cap */}
          <div
            className="col-span-3 md:col-span-2 flex justify-end text-sm font-semibold text-[var(--text-bright-2)] tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatNumberCompact(marketcapUsd)}
          </div>

          {/* Chevron */}
          <div className="col-span-1 hidden md:flex justify-end pr-1">
            <ChevronRight
              size={14}
              className="text-[var(--border-hi)] group-hover:text-teal group-hover:translate-x-1 transition-all duration-300"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default function Leaderboard() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("marketcap_usd");
  const { ethUsd } = usePrices();

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      // Fetching from the main 'tokens' table with the metrics join
      const { data, error } = await supabase
        .from("tokens")
        .select(`*, token_metrics_latest(*)`);

      if (!error && data) {
        const normalized = data.map(normalizeToken);
        // Sort by the raw ETH amounts, not a USD conversion — multiplying by
        // a positive exchange rate never changes relative order, so this
        // gives the identical sort as sorting by USD would, without needing
        // the (possibly still-loading) live price for correctness here.
        const sortField = sortBy === "marketcap_usd" ? "market_cap_eth" : "volume_eth";
        const sorted = [...normalized].sort(
          (a, b) => Number(b[sortField] || 0) - Number(a[sortField] || 0)
        );
        setTokens(sorted);
      }
      setLoading(false);
    };
    fetchLeaderboardData();
  }, [sortBy]);

  return (
    <div className="text-[var(--text-bright)] px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(150,214,205,0.04) 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(148,163,184,0.06) 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Header — editorial */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full border border-[var(--border-hi)]/60 bg-[var(--panel-alt)]/50 backdrop-blur-sm"
          >
            <BarChart3 size={11} className="text-teal" />
            <span
              className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-mid-2)] font-medium"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Live Leaderboard
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl text-[var(--text-bright)]"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Top tokens by{" "}
            <span
              className="italic font-light"
              style={{
                background: "linear-gradient(135deg, var(--teal) 0%, var(--teal-mid) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {sortBy === "marketcap_usd" ? "market cap" : "volume"}
            </span>
          </h2>
        </div>

        <div className="bg-[var(--bg-alt)]/20 border border-[var(--border)] rounded-2xl p-4 sm:p-6">
          {/* Sort toggle — premium pills */}
          <div className="flex justify-end gap-2 mb-6">
            <button
              onClick={() => setSortBy("marketcap_usd")}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                sortBy === "marketcap_usd"
                  ? "bg-teal/10 text-teal border border-teal/30"
                  : "bg-[var(--panel-alt)]/50 text-[var(--text-faint-2)] border border-[var(--border-hi)]/50 hover:text-[var(--text-mid)] hover:border-[var(--border-mid)]"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Market Cap
            </button>
            <button
              onClick={() => setSortBy("volume_24h")}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                sortBy === "volume_24h"
                  ? "bg-teal/10 text-teal border border-teal/30"
                  : "bg-[var(--panel-alt)]/50 text-[var(--text-faint-2)] border border-[var(--border-hi)]/50 hover:text-[var(--text-mid)] hover:border-[var(--border-mid)]"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Volume
            </button>
          </div>

          {/* Rows */}
          {loading ? (
            <Loading label="Loading leaderboard..." />
          ) : (
            <div className="space-y-2.5">
              {tokens.map((t, i) => (
                <LeaderboardRow key={t.address} t={t} idx={i} ethUsd={ethUsd} />
              ))}
            </div>
          )}
        </div>

        {/* Footer ticker line */}
        <div
          className="mt-8 pt-4 border-t border-[var(--border)]/50 flex items-center justify-between"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="text-[9px] uppercase tracking-widest text-[var(--border-hi)]">
            SYS.LEADERBOARD // {tokens.length} TOKENS
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[var(--border-hi)]">
            SORT: {sortBy.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
