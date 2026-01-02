import React from "react";
import { useTokenStats } from "./hooks/useTokenStats"; // import the hook

export default function TokenHeaderPanel({ token }) {
  const chain = "base"; // Hardcoded for Base tokens
  const { priceUsd, marketCap, volume24h, liquidityUsd, loading, error } =
    useTokenStats(chain, token?.address);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col md:flex-row justify-between items-start gap-4">
      <div>
        <h1 className="text-2xl font-bold">{token.symbol || token.address}</h1>
        <div className="text-sm text-slate-400">{token.name}</div>
      </div>

      {/* Loading / error states */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading stats…</div>
      ) : error ? (
        <div className="text-red-400 text-sm">Error fetching stats</div>
      ) : (
        <div className="text-right space-y-1">
          <div className="text-xs text-slate-400">Price</div>
          <div className="text-lg font-semibold">
            ${Number(priceUsd).toFixed(4)}
          </div>

          <div className="text-xs text-slate-400">
            Market Cap: ${Number(marketCap).toLocaleString()}
          </div>

          <div className="text-xs text-slate-400">
            24h Volume: ${Number(volume24h).toLocaleString()}
          </div>

          <div className="text-xs text-slate-400">
            Liquidity: ${Number(liquidityUsd).toLocaleString()}
          </div>

          <div className="text-xs text-slate-400">
            Total Supply: {token.totalSupplyOnchain ?? "N/A"}
          </div>
        </div>
      )}
    </div>
  );
}
