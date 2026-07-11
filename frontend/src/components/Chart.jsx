/**
 * =================================================================================
 * components/Chart.jsx
 * =================================================================================
 * Keeps the exact visual design from the preview file you sent (dark container, timeframe
 * buttons, Price/Mcap toggle, single candlestick series) — that's the UI you said you want.
 * The only change is the data source: `generateMockData()` is replaced with real rows from
 * `token_price_history`, bucketed into OHLC candles client-side (see
 * utils/chartBucketing.js for why bucketing happens in the browser for now rather than in
 * SQL, and the scaling note about when to change that).
 * =================================================================================
 */

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { supabase } from "../lib/supabaseClient";
import { bucketPriceHistory, appendPricePoint } from "../utils/chartBucketing";

const TIMEFRAME_LOOKBACK_HOURS = { "5m": 6, "1H": 72, "1D": 720 };

export default function Chart({ tokenAddress }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const candlesRef = useRef([]); // mutable ref so the realtime handler can append without a re-render round trip

  const [timeframe, setTimeframe] = useState("1H");
  const [metric, setMetric] = useState("PRICE");
  const [loading, setLoading] = useState(true);

  // --- Chart instance: created once, resized responsively ---
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0f1114" }, textColor: "#9aa4b2" },
      grid: { vertLines: { color: "rgba(70,80,90,0.25)" }, horzLines: { color: "rgba(70,80,90,0.18)" } },
      width: containerRef.current.clientWidth,
      height: 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []); // created exactly once — timeframe/metric changes below just update the data, not the chart instance

  // --- Data fetch + bucketing whenever token/timeframe/metric changes ---
  useEffect(() => {
    if (!tokenAddress || !candleSeriesRef.current) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      const lookbackHours = TIMEFRAME_LOOKBACK_HOURS[timeframe] || 72;
      const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();

      const { data, error } = await supabase
        .from("token_price_history")
        .select("price, market_cap, created_at")
        .eq("token_address", normalized)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000); // bounded — see utils/chartBucketing.js's scaling note

      if (cancelled) return;

      if (error) {
        console.error("[Chart] failed to load price history:", error.message);
        candlesRef.current = [];
      } else {
        candlesRef.current = bucketPriceHistory(data || [], timeframe, metric);
      }

      candleSeriesRef.current.setData(candlesRef.current);
      setLoading(false);
    }

    loadHistory();

    // --- Realtime: append new trades to the chart without a full re-fetch ---
    const channel = supabase
      .channel(`chart-${normalized}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "token_price_history", filter: `token_address=eq.${normalized}` },
        (payload) => {
          if (!candleSeriesRef.current) return;
          candlesRef.current = appendPricePoint(candlesRef.current, payload.new, timeframe, metric);
          // lightweight-charts' `update()` both appends a new bar and mutates the last one,
          // depending on whether `time` matches the existing last bar — exactly the
          // semantics `appendPricePoint` produces.
          const last = candlesRef.current[candlesRef.current.length - 1];
          if (last) candleSeriesRef.current.update(last);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tokenAddress, timeframe, metric]);

  return (
    <div className="flex flex-col w-full bg-[#0f1114] p-4 rounded-xl">
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex gap-2">
          {["5m", "1H", "1D"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 rounded ${timeframe === tf ? "bg-slate-700 text-white" : "text-slate-400"}`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMetric("PRICE")} className={metric === "PRICE" ? "text-teal-400" : "text-slate-400"}>
            Price
          </button>
          <button onClick={() => setMetric("MC")} className={metric === "MC" ? "text-teal-400" : "text-slate-400"}>
            Mcap
          </button>
        </div>
        {loading && <span className="text-slate-600 text-[10px] self-center animate-pulse">loading...</span>}
      </div>

      <div ref={containerRef} className="w-full h-[400px]" />

      {!loading && candlesRef.current.length === 0 && (
        <div className="text-center text-slate-600 text-[10px] uppercase tracking-widest py-8">
          No trades yet in this window.
        </div>
      )}
    </div>
  );
}
