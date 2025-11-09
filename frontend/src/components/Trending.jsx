// src/components/Trending.jsx
// Self-contained Trending component: fetches trending tokens, shows previews,
// and handles its own loading / fallback logic. This isolates the trending UI
// and keeps Home.jsx focused on token explorer layout.

import React, { useEffect, useState } from "react";
import { getTrending } from "../services/api"; // API service (kept here)
import { tokens as sampleTokens } from "../utils/dummyData"; // fallback data
import { useRefresh } from "../context/RefreshContext"; // optional refresh context
import { ArrowRight } from "lucide-react";

// Note: This component is self-contained — it performs its own fetching
// and exposes no external side effects. Replace getTrending with your API
// or mock implementation as required.

export default function Trending({ limit = 4 }) {
  // local state: trending tokens and loading indicator
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  // optional global tick so the trending list can refresh automatically
  const refreshContext = (() => {
    try {
      return useRefresh();
    } catch (e) {
      // If useRefresh isn't available, ignore — component still works standalone
      return null;
    }
  })();

  const tick = refreshContext?.tick;

  // Fetching logic lives here — kept robust with try/catch and fallback.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await getTrending();
        if (!cancelled && Array.isArray(res) && res.length > 0) {
          setTrending(res.slice(0, limit));
          setLoading(false);
          return;
        }
      } catch (err) {
        // console warning for devs — fallback below
        // eslint-disable-next-line no-console
        console.warn("Trending fetch failed:", err);
      }

      if (!cancelled) {
        // fallback to sample tokens
        setTrending((sampleTokens || []).slice(0, limit));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]); // re-run when refresh tick changes (if available)

  // Minimal preview card (kept intentionally compact)
  const Preview = ({ t, index }) => {
    const pct = t.price_change_24h ?? t.price_change ?? 0;
    const isPos = pct >= 0;
    return (
      <div
        className="group relative flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:shadow-md transition-shadow"
        style={{ minHeight: 72 }}
      >
        <div className="w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 font-semibold text-sm text-white">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-sm font-semibold text-white truncate">
                  {t.name || t.symbol}
                </h4>
                <span className="text-xs text-slate-400 uppercase">
                  {t.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {t.description
                  ? t.description.slice(0, 60) +
                    (t.description.length > 60 ? "…" : "")
                  : "No description"}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-white">
                ${Number(t.price_usd ?? t.price ?? 0).toFixed(2)}
              </div>
              <div
                className={`mt-1 text-xs py-0.5 px-2 rounded-full inline-block ${
                  isPos
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {isPos ? "▲" : "▼"} {Math.abs(Number(pct)).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mt-2">
            <svg viewBox="0 0 100 20" className="w-full h-4 opacity-60">
              <polyline
                fill="none"
                stroke={isPos ? "#34D399" : "#FB7185"}
                strokeWidth="1.2"
                points="0,14 20,12 40,9 60,11 80,6 100,8"
              />
            </svg>
          </div>
        </div>

        <button
          aria-label={`View ${t.name || t.symbol}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-3 px-3 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs"
        >
          <ArrowRight size={14} />
        </button>
      </div>
    );
  };

  return (
    <section
      aria-labelledby="trending-heading"
      className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h2 id="trending-heading" className="text-lg font-semibold">
            Trending
          </h2>
        </div>
        <a
          href="#explorer"
          className="text-sm text-slate-300 hover:text-white transition-colors"
        >
          View all
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <div className="col-span-full text-center py-6 text-slate-400">
            Loading trending...
          </div>
        ) : trending.length > 0 ? (
          trending.map((t, i) => (
            <Preview key={t.token_address || i} t={t} index={i} />
          ))
        ) : (
          <div className="col-span-full text-center py-6 text-slate-400">
            No trending tokens
          </div>
        )}
      </div>
    </section>
  );
}
