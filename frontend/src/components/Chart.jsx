// src/components/Chart.jsx
import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
} from "lightweight-charts";

/* ---------- Example data generators (keep/replace with your real data) ---------- */
const getCandlestickData = (count = 80) => {
  const now = Math.floor(Date.now() / 1000);
  const out = [];
  let price = 1_000_000;
  for (let i = 0; i < count; i++) {
    const open = price + (Math.random() - 0.5) * 120_000;
    const close = open + (Math.random() - 0.5) * 140_000;
    const high = Math.max(open, close) + Math.random() * 80_000;
    const low = Math.min(open, close) - Math.random() * 80_000;
    out.push({
      // charts accept unix seconds OR ISO date strings depending on config
      time: now - (count - i) * 3600, // 1h resolution like your screenshot
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
    });
    price = close;
  }
  return out;
};

const getVolumeData = (candles) =>
  candles.map((c) => ({
    time: c.time,
    value: Math.round(Math.random() * 200000),
  }));

/* ---------- Chart component (v5 API) ---------- */
export default function Chart({ tokenAddress, activeTab }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});

  useEffect(() => {
    // Destroy previous chart instance
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {}
      chartRef.current = null;
      seriesRef.current = {};
    }

    if (activeTab && activeTab !== "chart") return;
    if (!containerRef.current) return;

    // Create chart with dark theme & styling similar to screenshot
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f1114" }, // slightly darker
        textColor: "#9aa4b2",
      },
      grid: {
        vertLines: { color: "rgba(70,80,90,0.25)", style: 2 },
        horzLines: { color: "rgba(70,80,90,0.18)" },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#2f3942",
        scaleMargins: { top: 0.1, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#2f3942",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { visible: true, color: "rgba(255,255,255,0.02)" },
        vertLine: {
          visible: true,
          style: 3,
          color: "rgba(150,160,170,0.25)",
          width: 1,
        },
      },
      localization: {
        // use UTC-like look shown in screenshot; adjust locale if needed
        timeFormatter: (t) =>
          new Date(t * 1000).toISOString().replace("T", " ").slice(0, 16),
      },
      // larger chart size by default; we'll allow ResizeObserver to adapt
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 520,
      // display options for the scale
    });

    chartRef.current = chart;

    // control bar spacing to get 'thicker' candlesticks like screenshot
    chart.applyOptions({
      timeScale: {
        rightOffset: 12,
        barSpacing: 18, // increase to make candles thicker/clearer
        minBarSpacing: 5,
      },
    });

    // Generate data (replace with real feed)
    const candles = getCandlestickData(100);
    const volumes = getVolumeData(candles);

    // Candlestick series (pane 0)
    if (typeof chart.addSeries !== "function") {
      console.error("Incompatible lightweight-charts build: addSeries missing");
      return;
    }
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", // green
      downColor: "#ef4444", // red
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickVisible: true,
      // make bodies slightly rounded-feeling with thin borders by turning border off
    });
    candleSeries.setData(candles);
    seriesRef.current.candle = candleSeries;

    // Create a "current price" horizontal line on the candle series (styled)
    const lastClose = candles[candles.length - 1].close;
    const priceLine = candleSeries.createPriceLine({
      price: lastClose,
      color: "#0ea5a4",
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: "",
    });

    // Volume histogram on separate pane
    const volumeSeries = chart.addSeries(HistogramSeries, {
      pane: 1,
      priceScaleId: "volume",
      scaleMargins: { top: 0.78, bottom: 0 },
      priceFormat: {
        // integer values
        type: "volume",
      },
      // spacing: inherit barSpacing from chart
    });

    // color volume bars according to candle direction
    const coloredVolumes = volumes.map((v) => {
      const c = candles.find((x) => x.time === v.time);
      const color = c && c.close >= c.open ? "#22c55e" : "#ef4444";
      return { time: v.time, value: v.value, color };
    });
    volumeSeries.setData(coloredVolumes);
    seriesRef.current.volume = volumeSeries;

    // Format right scale labels to show compact units (e.g., 2.2M)
    chart.applyOptions({
      rightPriceScale: {
        tickMarkFormatter: (price) => {
          // compact format: 1.2K / 1.2M
          const abs = Math.abs(price);
          if (abs >= 1_000_000) return (price / 1_000_000).toFixed(1) + "M";
          if (abs >= 1_000) return (price / 1_000).toFixed(1) + "K";
          return price.toFixed(0);
        },
      },
    });

    // make time axis labels look like tradingview-ish (daily/hours)
    chart.timeScale().fitContent();

    // Responsive: ResizeObserver to update chart size
    const ro = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const rect = entries[0].contentRect;
      chart.applyOptions({ width: rect.width, height: rect.height });
    });
    ro.observe(containerRef.current);

    // tidy-up on unmount
    return () => {
      try {
        ro.unobserve(containerRef.current);
      } catch (e) {}
      try {
        candleSeries.removePriceLine(priceLine);
      } catch (e) {}
      try {
        chart.remove();
      } catch (e) {}
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [activeTab, tokenAddress]);

  return (
    <div
      ref={containerRef}
      id="lightweight-chart-container"
      className="w-[95%] mx-auto h-96 sm:h-[28rem] bg-[#0f1114] rounded-xl border border-slate-700"
      style={{ minHeight: 420 }}
    />
  );
}
