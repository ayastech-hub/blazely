import React from "react";

export default function ChartPanel({ token }) {
  if (!token?.address) {
    return (
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-slate-400">
        No token selected
      </div>
    );
  }

  const address = token.address.toLowerCase();

  const chartUrl = `
    https://dexscreener.com/base/${address}
    ?embed=1
    &loadChartSettings=0
    &trades=0
    &tabs=0
    &info=0
    &chartLeftToolbar=0
    &chartDefaultOnMobile=1
    &chartTheme=dark
    &theme=dark
    &chartStyle=0
    &chartType=usd
    &interval=15
  `.replace(/\s+/g, "");

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <h3 className="text-sm font-semibold mb-2 text-white">Price Chart</h3>

      {/* Responsive container */}
      <div className="relative w-full pb-[56.25%]">
        <iframe
          src={chartUrl}
          className="absolute top-0 left-0 w-full h-full border-none rounded"
          title="Dexscreener Price Chart"
          allowTransparency="true"
        />
      </div>

      <p className="text-xs text-slate-500 mt-1">Powered by Dexscreener</p>
    </div>
  );
}
