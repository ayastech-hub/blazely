import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const formatNumber = (num) => {
  if (!num) return "$0";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const TrendingTokenCard = ({ token }) => {
  return (
    <Link to={`/token/${token.address}`} className="block shrink-0 group">
      <div className="relative w-56 h-16 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl backdrop-saturate-150 flex items-center px-3 gap-2.5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
        {/* specular highlight, same as the token card glass */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="pointer-events-none absolute -top-8 left-3 right-3 h-14 rounded-full bg-white/[0.05] blur-2xl" />

        <div className="relative z-10 w-10 h-10 rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0 backdrop-blur-md">
          {token.logo ? (
            <img
              src={token.logo}
              alt={token.symbol}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span
              className="text-slate-500 font-light text-sm"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {token.symbol?.[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="relative z-10 flex-1 min-w-0">
          <div
            className="text-xs font-medium text-slate-200 truncate leading-tight group-hover:text-white transition-colors"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {token.name}
          </div>
          <div
            className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate mt-0.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            ${token.symbol}
          </div>
        </div>

        <div
          className="relative z-10 text-right text-[9px] font-bold leading-normal"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <div className="text-slate-300">MC:{formatNumber(token.market_cap)}</div>
          <div className="text-teal/80">VOL:{formatNumber(token.volume_24h)}</div>
        </div>
      </div>
    </Link>
  );
};

const TrendingTokens = () => {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrendingTokens = async () => {
    try {
      const { data, error } = await supabase
        .from("token_metrics_latest")
        .select(`
          volume_24h,
          market_cap,
          address,
          tokens (name, symbol, logo_url)
        `)
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
      setError("METADATA_STREAM_EXCEPTION");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingTokens();

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
    return (
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest py-6 animate-pulse">
        POLLING_TRENDING_NODES...
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-mono text-[10px] font-bold text-rose-500 uppercase tracking-widest py-6">
        CRITICAL_INDEX_ERROR // {error}
      </div>
    );
  }

  return (
    <section className="font-mono mt-6 mb-4">
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.08] pb-2">
        <h2 className="text-xs font-black uppercase text-slate-200 tracking-wider">
          METRICS_INDEX // TRENDING_VOL
        </h2>
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#96d6cd] animate-pulse shadow-[0_0_6px_rgba(150,214,205,0.6)]" />
          ACTIVE DEPLOYMENTS
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-1">
        {tokens.map((token) => (
          <TrendingTokenCard key={token.address} token={token} />
        ))}

        <Link
          to="/tokens"
          className="w-12 min-w-[48px] h-16 flex items-center justify-center rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-slate-500 hover:text-teal hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300"
          title="Inspect All Network Assets"
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
};

export default TrendingTokens;