// src/components/TopHolders.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

const shorten = (addr = "") =>
  addr && addr.length > 11 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

const humanBalance = (balanceBaseUnits, decimals = 18) => {
  if (!balanceBaseUnits) return "0";
  try {
    const n = Number(balanceBaseUnits);
    const human = n / Math.pow(10, decimals);
    if (human >= 1_000_000_000)
      return `${Math.round(human / 1_000_000) / 1000}B`;
    if (human >= 1_000_000) return `${Math.round(human / 10000) / 100}M`;
    if (human >= 1000) return `${Math.round(human / 10) / 100}k`;
    return human % 1 === 0
      ? String(human)
      : human.toFixed(4).replace(/\.?0+$/, "");
  } catch {
    return String(balanceBaseUnits);
  }
};

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
        console.error("[TopHolders] fetch error:", err);
        setHolders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHolders();
  }, [tokenAddress, providerUrl, fromBlock]);

  if (!tokenAddress)
    return <div className="text-xs text-slate-400">No token address.</div>;
  if (loading)
    return <div className="text-xs text-slate-400">Loading holders…</div>;
  if (holders.length === 0)
    return <div className="text-xs text-slate-400">No holders found.</div>;

  return (
    <div className="mt-3 space-y-3">
      {holders.map((h, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="text-sm font-mono text-slate-100">
            {shorten(h.address)}
          </div>
          <div className="text-sm text-right text-slate-200 w-28">
            {humanBalance(h.balance.toString(), decimals)}
          </div>
        </div>
      ))}
    </div>
  );
}
