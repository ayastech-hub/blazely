// src/components/TopHolders.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

/* -------------------- Quantitative Telemetry Helpers -------------------- */
const shorten = (addr = "") =>
  addr && addr.length > 11 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

const humanBalance = (balanceBaseUnits, decimals = 18) => {
  if (!balanceBaseUnits) return "0";
  try {
    const n = Number(balanceBaseUnits);
    const human = n / Math.pow(10, decimals);
    if (human >= 1_000_000_000)
      return `${(human / 1_000_000_000).toFixed(2)}B`;
    if (human >= 1_000_000) return `${(human / 1_000_000).toFixed(2)}M`;
    if (human >= 1000) return `${(human / 1000).toFixed(1)}K`;
    return human % 1 === 0
      ? String(human)
      : human.toFixed(4).replace(/\.?0+$/, "");
  } catch {
    return String(balanceBaseUnits);
  }
};

/* -------------------- Core Component Module -------------------- */
export default function TopHolders({
  tokenAddress,
  providerUrl,
  decimals = 18,
  fromBlock = 0,
}) {
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenAddress || !providerUrl) return;

    const provider = new ethers.JsonRpcProvider(providerUrl);
    const abi = [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ];
    const contract = new ethers.Contract(tokenAddress, abi, provider);

    const fetchHolders = async () => {
      setLoading(true);
      try {
        const latestBlock = await provider.getBlockNumber();
        const filter = contract.filters.Transfer();
        const events = await contract.queryFilter(
          filter,
          fromBlock,
          latestBlock
        );

        const balances = {};
        events.forEach((e) => {
          const { from, to, value } = e.args;
          const val = BigInt(value.toString());
          if (from !== ethers.ZeroAddress) {
            balances[from] = (balances[from] || 0n) - val;
          }
          if (to !== ethers.ZeroAddress) {
            balances[to] = (balances[to] || 0n) + val;
          }
        });

        const topHolders = Object.entries(balances)
          .map(([address, balance]) => ({ address, balance }))
          .filter((h) => h.balance > 0n)
          .sort((a, b) => (b.balance > a.balance ? 1 : -1))
          .slice(0, 20);

        setHolders(topHolders);
      } catch (err) {
        console.error("[TopHolders] query interface tracking drop:", err);
        setHolders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHolders();
  }, [tokenAddress, providerUrl, fromBlock]);

  /* -------------------- System Exception Yields -------------------- */
  if (!tokenAddress) {
    return (
      <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest py-4">
        NULL DESCRIPTOR // TARGET_ADDRESS_MISSING
      </div>
    );
  }

  if (loading) {
    return (
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest py-4 animate-pulse">
        SYNCHRONIZING_LEDGER_BALANCES...
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest py-4 border border-dashed border-slate-900/60 bg-[#0b0f19]/10 text-center">
        NULL DESCRIPTOR // NO DISTRIBUTION DATA AVAILABLE
      </div>
    );
  }

  return (
    <div className="font-mono text-xs bg-[#0b0f19]/40 p-3 rounded-sm border border-slate-900 text-slate-300 max-w-md">
      
      {/* Table Section Header */}
      <div className="flex justify-between items-end mb-2.5 border-b border-slate-900 pb-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
        <span>DISTRIBUTION_INDEX</span>
        <span>BALANCE_UNITS</span>
      </div>

      {/* High-Density Distribution Grid Matrix */}
      <div className="divide-y divide-slate-900/40 max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
        {holders.map((h, i) => {
          const rank = String(i + 1).padStart(2, "0");
          return (
            <div 
              key={h.address} 
              className="flex items-center justify-between py-1.5 hover:bg-[#0b0f19]/30 transition-colors"
            >
              {/* Index Identifier + Address Hash */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 font-bold">[{rank}]</span>
                <a
                  href={`https://basescan.org/address/${h.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-slate-100 underline decoration-slate-900 hover:decoration-slate-700 uppercase tracking-wide transition-colors"
                >
                  {shorten(h.address)}
                </a>
              </div>

              {/* Absolute Balance Metrics Column */}
              <div 
                style={{ color: i === 0 ? '#96d6cd' : '' }}
                className="font-bold text-right text-slate-200"
              >
                {humanBalance(h.balance.toString(), decimals)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
