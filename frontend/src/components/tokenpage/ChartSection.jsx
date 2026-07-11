/**
 * =================================================================================
 * components/tokenpage/ChartSection.jsx
 * =================================================================================
 * Same custom inline-SVG candlestick rendering from the preview design (kept exactly —
 * this is the visual you approved), but the data feeding it is real: fetched from
 * `token_price_history` and bucketed into OHLC candles via utils/chartBucketing.js,
 * instead of the preview's hardcoded 19-candle mock array.
 *
 * The preview only had one implicit timeframe. This wires up the same "5m / 1H / 1D" style
 * controls as the earlier standalone Chart.jsx component, and a Price/Mcap metric toggle,
 * both driving real re-bucketing.
 * =================================================================================
 */
import React, { useEffect, useState } from "react";
import { C } from "../../utils/designTokens";
import AnimatedNumber from "./AnimatedNumber";
import { supabase } from "../../lib/supabaseClient";
import { bucketPriceHistory, appendPricePoint } from "../../utils/chartBucketing";
import { formatUsdPrice } from "../../utils/format";

const TIMEFRAME_LOOKBACK_HOURS = { "5m": 6, "1H": 72, "1D": 720 };

function CandleChart({ candles, height = 260, livePrice }) {
  const W = 600;
  const H = height;
  const volH = 42;
  const pad = { t: 8, r: 56, b: 4, l: 8 };

  if (!candles || candles.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: C.mid, fontSize: 10, fontFamily: C.mono }}>
        No trades yet in this window.
      </div>
    );
  }

  const prices = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...prices, livePrice || Infinity) * 0.98;
  const maxP = Math.max(...prices, livePrice || 0) * 1.02;
  const range = maxP - minP || 1;

  const chartH = H - volH - pad.t - pad.b;
  const toY = (p) => pad.t + chartH - ((p - minP) / range) * chartH;
  const cw = (W - pad.l - pad.r) / candles.length;

  const vols = candles.map((c) => Math.abs(c.close - c.open) + 1e-9);
  const maxV = Math.max(...vols);

  const gridSteps = 6;
  const grid = Array.from({ length: gridSteps }, (_, i) => minP + (range * i) / (gridSteps - 1));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {grid.map((p) => (
        <g key={p}>
          <line x1={pad.l} y1={toY(p)} x2={W - pad.r} y2={toY(p)} stroke="#1e293b" strokeWidth="0.5" />
          <text x={W - pad.r + 3} y={toY(p) + 4} fill="#475569" fontSize="8" fontFamily="monospace">
            {formatUsdPrice(p)}
          </text>
        </g>
      ))}

      {candles.map((c, i) => {
        const x = pad.l + i * cw + cw * 0.15;
        const bw = cw * 0.7;
        const mx = x + bw / 2;
        const bull = c.close >= c.open;
        const col = bull ? C.teal : C.red;
        const top = toY(Math.max(c.open, c.close));
        const bot = toY(Math.min(c.open, c.close));
        const ht = Math.max(bot - top, 1.2);
        const vh = (vols[i] / maxV) * (volH - 3);
        const vy = H - vh;
        return (
          <g key={c.time}>
            <line x1={mx} y1={toY(c.high)} x2={mx} y2={toY(c.low)} stroke={col} strokeWidth="1" />
            <rect x={x} y={top} width={bw} height={ht} fill={col} opacity="0.85" rx="0.4" />
            <rect x={x} y={vy} width={bw} height={vh} fill={col} opacity="0.28" />
          </g>
        );
      })}

      {livePrice != null && (
        <>
          <line x1={pad.l} y1={toY(livePrice)} x2={W - pad.r} y2={toY(livePrice)} stroke={C.teal} strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6" />
          <rect x={W - pad.r} y={toY(livePrice) - 8} width={pad.r} height="16" fill={C.teal} rx="2" />
        </>
      )}
    </svg>
  );
}

export default function ChartSection({ tokenAddress, livePrice }) {
  const [timeframe, setTimeframe] = useState("5m");
  const [metric, setMetric] = useState("PRICE");
  const [candles, setCandles] = useState([]);
  const [delta, setDelta] = useState({ abs: 0, pct: 0 });

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function load() {
      const lookbackHours = TIMEFRAME_LOOKBACK_HOURS[timeframe] || 6;
      const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();

      const { data, error } = await supabase
        .from("token_price_history")
        .select("price, market_cap, created_at")
        .eq("token_address", normalized)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (cancelled) return;
      if (error) {
        console.error("[ChartSection] failed to load history:", error.message);
        setCandles([]);
        return;
      }

      const bucketed = bucketPriceHistory(data || [], timeframe, metric);
      setCandles(bucketed);

      if (bucketed.length >= 2) {
        const first = bucketed[0].open;
        const last = bucketed[bucketed.length - 1].close;
        setDelta({ abs: last - first, pct: first ? ((last - first) / first) * 100 : 0 });
      }
    }

    load();

    const channel = supabase
      .channel(`chart-section-${normalized}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "token_price_history", filter: `token_address=eq.${normalized}` },
        (payload) => {
          setCandles((prev) => appendPricePoint(prev, payload.new, timeframe, metric));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tokenAddress, timeframe, metric]);

  return (
    <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderBottom: `1px solid ${C.border}` }}>
        {["5m", "1H", "1D"].map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            style={{
              padding: "3px 8px",
              background: timeframe === tf ? C.tealDim : "transparent",
              border: `1px solid ${timeframe === tf ? C.teal : "transparent"}`,
              borderRadius: 4,
              color: timeframe === tf ? C.teal : C.mid,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: C.mono,
            }}
          >
            {tf}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setMetric("PRICE")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, fontFamily: C.mono, fontWeight: 700, color: metric === "PRICE" ? C.teal : C.mid }}
        >
          Price
        </button>
        <span style={{ color: C.mid, fontSize: 9, fontFamily: C.mono }}> / </span>
        <button
          onClick={() => setMetric("MC")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, fontFamily: C.mono, fontWeight: 700, color: metric === "MC" ? C.teal : C.mid }}
        >
          Mcap
        </button>
      </div>

      <div style={{ padding: "8px 14px 4px", display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: C.mono, fontSize: 18, fontWeight: 700, color: C.bright, letterSpacing: "-0.5px" }}>
          {livePrice != null ? <AnimatedNumber value={livePrice} format={formatUsdPrice} /> : "—"}
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: delta.pct < 0 ? C.red : C.teal }}>
          {delta.pct > 0 ? "+" : ""}
          {delta.pct.toFixed(2)}%
        </span>
      </div>

      <CandleChart candles={candles} height={260} livePrice={metric === "PRICE" ? livePrice : null} />
    </div>
  );
}
