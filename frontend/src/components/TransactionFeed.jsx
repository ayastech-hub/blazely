//TRANSACTIONFEES.JSX
import React from "react";
import useTransactions from "../hooks/useTransactions";

/*
 Live feed shows newest tx first (bump filter).
 This component is optimized for many items (bounded list).
*/
export default function TransactionFeed(){
  const txs = useTransactions(200);

  return (
    <div className="card p-4 rounded-xl">
      <h4 className="font-semibold mb-3">Live Buys/Sells</h4>
      <div className="max-h-96 overflow-y-auto">
        {txs.length === 0 && <div className="text-gray-500">No activity yet</div>}
        <ul>
          {txs.map((t,i) => (
            <li key={i} className="py-2 border-b border-white/5 flex justify-between">
              <div className="text-sm">
                <div><strong>{t.type?.toUpperCase()}</strong> {t.token}</div>
                <div className="text-xs text-gray-400">{(t.from||"").slice(0,8)} → {(t.to||"").slice(0,8)} • {new Date(t.timestamp).toLocaleTimeString()}</div>
              </div>
              <div className="text-right font-medium">{t.amount}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
