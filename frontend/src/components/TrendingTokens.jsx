import React, { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/* Shared with Navbar.jsx / TokenCard.jsx — keep in sync */
const ACCENT = "#96d6cd";
const NESTED_FILL = "bg-black/25 border border-white/[0.08]";

const formatNumber = (num) => {
  if (!num) return "$0";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const TrendingTokenCard = ({ token }) => {
  return (
    <Link to={`/token/${token.address}`} className="block shrink-0 group">
      <div className="relative w-56 h-16 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-[1.6] backdrop-brightness-105 flex items-center px-3 gap-2.5 transition-all duration-300 hover:bg-white/[0.09] hover:border-white/[0.14] hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative z-10 w-11 h-11 rounded-xl bg-black/30 border border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0">
          {token.logo ? (
            <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-slate-500 font-medium text-sm" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
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
          <div className="text-[10px] text-slate-500 font-semibold font-mono truncate mt-0.5">
            ${token.symbol}
          </div>
        </div>

        <div className="relative z-10 text-right text-[9px] font-semibold font-mono leading-normal shrink-0">
          <div className="text-slate-300">{formatNumber(token.market_cap)}</div>
          <div style={{ color: ACCENT }}>{formatNumber(token.volume_24h)} vol</div>
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
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't load trending tokens.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingTokens();

    const channel = supabase
      .channel("realtime-trending-tokens")
      .on("postgres_changes", { event: "*", schema: "public", table: "token_metrics_latest" }, fetchTrendingTokens)
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens" }, fetchTrendingTokens)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="mt-6 mb-4">
      {/* ---- Header ----
          Swapped the "METRICS_INDEX // TRENDING_VOL" / "ACTIVE DEPLOYMENTS"
          labels for a plain title + a Create token CTA — that's prime,
          above-the-fold space; a button earns its keep there, static
          status text doesn't. If you'd rather keep it minimal, just
          delete the <Link to="/create"> block below and this row will
          sit flush with only the title. */}
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: ACCENT, boxShadow: `0 0 6px ${ACCENT}99` }}
          />
          <h2 className="text-sm font-semibold text-slate-200">Trending</h2>
        </div>

        <Link
          to="/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[#030712] font-bold text-[11px] hover:brightness-105 active:scale-[0.97] transition-all duration-150"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus size={12} strokeWidth={2.5} />
          Create token
        </Link>
      </div>

      {/* ---- Content ---- */}
      {isLoading ? (
        <div className="flex gap-2.5 py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`w-56 h-16 rounded-2xl animate-pulse ${NESTED_FILL}`} />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between text-[13px] text-slate-500 py-6">
          <span>{error}</span>
          <button onClick={fetchTrendingTokens} className="text-slate-300 hover:text-white font-medium">
            Retry
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-1">
          {tokens.map((token) => (
            <TrendingTokenCard key={token.address} token={token} />
          ))}

          <Link
            to="/tokens"
            className={`w-12 min-w-[48px] h-16 flex items-center justify-center rounded-2xl text-slate-500 hover:text-[#96d6cd] hover:border-white/[0.14] transition-all duration-300 ${NESTED_FILL}`}
            title="View all tokens"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
};

export default TrendingTokens;
