import React, { useEffect, useState } from "react";

export default function TopHoldersPanel({ token }) {
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token?.address) return;

    const fetchHolders = async () => {
      setLoading(true);
      setError(null);

      try {
        // Chainbase: get token holders list
        const response = await fetch(
          `https://api.chainbase.online/v1/token/holders?chain_id=8453&contract_address=${token.address}&page=1&limit=50`,
          {
            headers: {
              "x-api-key": process.env.REACT_APP_CHAINBASE_API_KEY,
              accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();

        // list of holder addresses (raw holders list)
        const holdersData = result.data || [];
        setHolders(holdersData);
      } catch (err) {
        console.error("Failed to fetch holders", err);
        setError("Failed to load holders");
      } finally {
        setLoading(false);
      }
    };

    fetchHolders();
  }, [token]);

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <h3 className="text-sm font-semibold mb-2 text-white">Token Holders</h3>

      {loading && (
        <div className="text-slate-400 text-xs">Loading holders…</div>
      )}
      {error && <div className="text-rose-400 text-xs">{error}</div>}

      {!loading && !error && holders.length === 0 && (
        <div className="text-slate-400 text-xs">No holders found</div>
      )}

      {!loading && !error && holders.length > 0 && (
        <ul className="space-y-1 text-xs text-slate-200">
          {holders.map((address, idx) => (
            <li key={idx} className="flex justify-between">
              <span className="font-mono">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
