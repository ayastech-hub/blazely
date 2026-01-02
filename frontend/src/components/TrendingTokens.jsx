import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// ---------- Helpers ----------
const formatNumber = (num) => {
  if (!num) return "$0";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

// ---------- Card ----------
const TrendingTokenCard = ({ token }) => {
  return (
    <Link to={`/token/${token.address}`} className="block">
      <div
        className="
          w-56 min-w-[224px] h-20 rounded-xl cursor-pointer
          bg-slate-900/60 backdrop-blur
          border border-slate-800/60
          shadow-sm
          flex items-center px-3 gap-3
          hover:scale-[1.02]
          hover:shadow-lg
          hover:border-cyan-500/40
          transition-all
        "
      >
        {/* Logo */}
        <div className="w-12 h-12 rounded-lg bg-slate-800/50 overflow-hidden flex items-center justify-center ring-1 ring-slate-700/50">
          {token.logo ? (
            <img
              src={token.logo}
              alt={token.symbol}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-white font-semibold">
              {token.symbol?.[0]}
            </span>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {token.name}
          </div>
          <div className="text-xs text-slate-400 uppercase truncate">
            {token.symbol}
          </div>
        </div>

        {/* Stats */}
        <div className="text-right text-[11px] leading-tight">
          <div className="text-slate-200 font-semibold">
            MC {formatNumber(token.market_cap)}
          </div>
          <div className="text-slate-400">
            VOL {formatNumber(token.volume_24h)}
          </div>
        </div>
      </div>
    </Link>
  );
};

// ---------- Main ----------
const TrendingTokens = () => {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrendingTokens = async () => {
    try {
      const { data, error } = await supabase
        .from("token_metrics_latest")
        .select(
          `
          volume_24h,
          market_cap,
          address,
          tokens (name, symbol, logo_url)
        `
        )
        .order("volume_24h", { ascending: false })
        .limit(10);

      if (error) throw error;

      setTokens(
        data.map((item) => ({
          address: item.address,
          name: item.tokens.name,
          symbol: item.tokens.symbol,
          logo: item.tokens.logo_url,
          market_cap: item.market_cap || 0,
          volume_24h: item.volume_24h || 0,
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load trending tokens.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingTokens();

    // ---- Realtime subscription ----
    const channel = supabase
      .channel("realtime-trending-tokens")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_metrics_latest" },
        fetchTrendingTokens
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tokens" },
        fetchTrendingTokens
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return <div className="text-white py-6">Loading trending tokens…</div>;
  }

  if (error) {
    return <div className="text-red-400 py-6">{error}</div>;
  }

  return (
    <section className="mt-8 mb-6">
      {/* Header */}
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold text-white">Trending Now</h2>
        <div className="flex-1 h-px bg-slate-800/40 ml-3" />
      </div>

      {/* Horizontal list */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
        {tokens.map((token) => (
          <TrendingTokenCard key={token.address} token={token} />
        ))}

        {/* View all */}
        <Link
          to="/tokens"
          className="w-16 min-w-[64px] h-20 flex items-center justify-center
            bg-slate-900/60 border border-slate-800/60 rounded-xl
            hover:border-cyan-500/40 transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-slate-400" />
        </Link>
      </div>
    </section>
  );
};

export default TrendingTokens;
