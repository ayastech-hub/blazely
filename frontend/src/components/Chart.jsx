import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";

export default function Chart({ tokenAddress, activeTab }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  
  // State for controls
  const [timeframe, setTimeframe] = useState("1H"); // '5m', '1H', '1D'
  const [metric, setMetric] = useState("PRICE"); // 'PRICE' or 'MC'

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0f1114" }, textColor: "#9aa4b2" },
      grid: { vertLines: { color: "rgba(70,80,90,0.25)" }, horzLines: { color: "rgba(70,80,90,0.18)" } },
      width: containerRef.current.clientWidth,
      height: 450,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444"
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Load Mock Data
    const mockData = generateMockData(timeframe, metric);
    candleSeries.setData(mockData);

    return () => chart.remove();
  }, [timeframe, metric]); // Re-run when settings change

  return (
    <div className="flex flex-col w-full bg-[#0f1114] p-4 rounded-xl">
      {/* Control Bar */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex gap-2">
          {["5m", "1H", "1D"].map((tf) => (
            <button key={tf} onClick={() => setTimeframe(tf)} 
              className={`px-2 py-1 rounded ${timeframe === tf ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMetric("PRICE")} className={metric === "PRICE" ? 'text-teal-400' : 'text-slate-400'}>Price</button>
          <button onClick={() => setMetric("MC")} className={metric === "MC" ? 'text-teal-400' : 'text-slate-400'}>Mcap</button>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[400px]" />
    </div>
  );
}

// Helper to simulate data
function generateMockData(tf, metric) {
  const base = metric === "MC" ? 50000 : 1.5;
  const multiplier = metric === "MC" ? 1000 : 0.05;
  return Array.from({ length: 50 }, (_, i) => ({
    time: Math.floor(Date.now() / 1000) - (50 - i) * 3600,
    open: base + Math.random() * multiplier,
    high: base + 2 * multiplier,
    low: base - 1 * multiplier,
    close: base + (Math.random() - 0.5) * multiplier,
  }));
}
