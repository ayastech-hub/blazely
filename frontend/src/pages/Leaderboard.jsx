// src/pages/Leaderboard.jsx — v2
// Clean ranking by market cap or volume. Minimal, high-end layout.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Loading from "../components/ui/Loading";
import { supabase } from "../lib/supabaseClient";
import { normalizeToken } from "../api/supabaseTokens";
import { usePrices } from "../hooks/usePrices";
import { ethToUsd } from "../utils/priceConversion";
import { formatWei } from "../utils/format";

function formatUsd(num) {
  if (num == null || isNaN(num) || num === 0) return "—";
  const abs = Math.abs(num);
  if (abs < 1000) return `$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const units = ["", "K", "M", "B", "T"];
  const i = Math.min(units.length - 1, Math.floor(Math.log10(abs) / 3));
  return `$${(abs / 1000 ** i).toFixed(1)}${units[i]}`;
}

function RankBadge({ rank }) {
  const isTop = rank <= 3;
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium tabular-nums ${
        isTop
          ? "bg-teal/10 text-teal border border-teal/25"
          : "text-[var(--text-faint-2)]"
      }`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {rank}
    </span>
  );
}

function LeaderboardRow({ t, idx, ethUsd }) {
  const marketcapUsd =
    ethUsd != null ? ethToUsd(Number(formatWei(t.market_cap_eth, 18)), ethUsd) : null;
  const volumeUsd =
    ethUsd != null ? ethToUsd(Number(formatWei(t.volume_eth, 18)), ethUsd) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.4), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/token/${t.address}`}
        className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-transparent hover:border-[var(--border-hi)]/50 hover:bg-[var(--panel-alt)]/40 transition-all duration-200"
      >
        <RankBadge rank={idx + 1} />

        <div className="w-9 h-9 rounded-lg bg-[var(--bg)] border border-[var(--border-hi)]/60 flex items-center justify-center overflow-hidden shrink-0">
          {t.logo ? (
            <img src={t.logo} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-xs font-medium text-[var(--text-faint-2)]">
              {t.symbol?.[0] || "?"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[var(--text-bright-2)] truncate group-hover:text-white transition-colors">
            {t.name}
          </div>
          <div
            className="text-[11px] text-[var(--text-faint-2)] mt-0.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {t.symbol}
          </div>
        </div>

        <div
          className="hidden sm:block text-right text-sm tabular-nums text-[var(--text-mid-2)] w-24"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatUsd(volumeUsd)}
        </div>

        <div
          className="text-right text-sm font-medium tabular-nums text-[var(--text-bright-2)] w-24"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatUsd(marketcapUsd)}
        </div>
      </Link>
    </motion.div>
  );
}

export default function Leaderboard() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("marketcap");
  const { ethUsd } = usePrices();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tokens")
        .select(`*, token_metrics_latest(*)`);

      if (!error && data) {
        const normalized = data.map(normalizeToken);
        const field = sortBy === "marketcap" ? "market_cap_eth" : "volume_eth";
        setTokens(
          [...normalized].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))
        );
      }
      setLoading(false);
    };
    fetchData();
  }, [sortBy]);

  return (
    <div className="relative max-w-[900px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Soft ambient */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[280px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(150,214,205,0.05) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-3xl sm:text-4xl text-[var(--text-bright)] tracking-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
          >
            Leaderboard
          </h1>
          <p className="mt-2 text-sm text-[var(--text-mid-2)]">
            Ranked by {sortBy === "marketcap" ? "market cap" : "24h volume"}
          </p>
        </div>

        {/* Sort */}
        <div className="flex gap-1.5 mb-6">
          {[
            { key: "marketcap", label: "Market Cap" },
            { key: "volume", label: "Volume" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                sortBy === key
                  ? "bg-teal/10 text-teal border border-teal/30"
                  : "text-[var(--text-faint-2)] border border-transparent hover:text-[var(--text-mid)] hover:border-[var(--border-hi)]/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Column labels */}
        <div
          className="hidden sm:flex items-center gap-4 px-4 pb-2 mb-1 text-[10px] uppercase tracking-wider text-[var(--text-faint-2)]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="w-7 text-center">#</span>
          <span className="w-9" />
          <span className="flex-1">Token</span>
          <span className="w-24 text-right">Volume</span>
          <span className="w-24 text-right">MCap</span>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--panel-alt)]/20 overflow-hidden">
          {loading ? (
            <div className="py-20">
              <Loading label="Loading…" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="py-20 text-center text-sm text-[var(--text-faint-2)]">
              No tokens yet
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/40">
              {tokens.map((t, i) => (
                <LeaderboardRow key={t.address} t={t} idx={i} ethUsd={ethUsd} />
              ))}
            </div>
          )}
        </div>

        {!loading && tokens.length > 0 && (
          <p
            className="mt-5 text-[10px] text-[var(--text-faint-2)] text-right"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {tokens.length} tokens
          </p>
        )}
      </div>
    </div>
  );
}
