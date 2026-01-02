import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export default function RecentActivityPanel({ token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper: prepend new event to state (keep max 50)
  const addEvent = (newEvent) => {
    setEvents((prev) => [newEvent, ...prev].slice(0, 50));
  };

  // -------------------------------
  // Fetch historical transactions via RPC logs
  // -------------------------------
  useEffect(() => {
    if (!token?.address || !token?.rpc) return;
    const fetchHistoricalEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const provider = new ethers.JsonRpcProvider(token.rpc);
        const contract = new ethers.Contract(
          token.address,
          ERC20_ABI,
          provider
        );

        const currentBlock = await provider.getBlockNumber();
        const batchSize = 1000; // smaller chunks
        let fromBlock = Math.max(currentBlock - 10000, 0);
        let allLogs = [];

        for (let start = fromBlock; start <= currentBlock; start += batchSize) {
          const end = Math.min(start + batchSize - 1, currentBlock);
          const logs = await contract.queryFilter(
            contract.filters.Transfer(),
            start,
            end
          );
          allLogs = allLogs.concat(logs);
        }

        const formatted = allLogs
          .slice(-50)
          .reverse()
          .map((log) => ({
            from: log.args.from,
            to: log.args.to,
            value: ethers.formatUnits(log.args.value, token.decimals ?? 18),
            txHash: log.transactionHash,
          }));

        setEvents(formatted);
      } catch (err) {
        console.error("RPC fetch error:", err);
        setError("Failed to fetch recent activity");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalEvents();
  }, [token]);

  // -------------------------------
  // Listen to live Transfer events via ethers.js
  // -------------------------------
  useEffect(() => {
    if (!token?.address || !token?.rpc) return;

    const provider = new ethers.JsonRpcProvider(token.rpc);
    const contract = new ethers.Contract(token.address, ERC20_ABI, provider);

    const handleTransfer = (from, to, value, event) => {
      addEvent({
        from,
        to,
        value: ethers.formatUnits(value, token.decimals ?? 18),
        txHash: event.transactionHash,
      });
    };

    contract.on("Transfer", handleTransfer);

    return () => {
      contract.off("Transfer", handleTransfer);
    };
  }, [token]);

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <h3 className="text-sm font-semibold mb-2">Recent Activity</h3>

      {loading && <div className="text-slate-400">Loading activity…</div>}
      {error && <div className="text-rose-400">{error}</div>}

      {!loading && !error && events.length === 0 && (
        <div className="text-slate-400 text-xs">No recent activity</div>
      )}

      {!loading && !error && events.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto text-xs text-slate-200">
          {events.map((e, idx) => (
            <li key={e.txHash + idx} className="flex justify-between">
              <div>
                <span className="font-mono">
                  {e.from.slice(0, 6)}…{e.from.slice(-4)}
                </span>
                →
                <span className="font-mono">
                  {e.to.slice(0, 6)}…{e.to.slice(-4)}
                </span>
              </div>
              <div className="ml-2">{parseFloat(e.value).toFixed(4)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
