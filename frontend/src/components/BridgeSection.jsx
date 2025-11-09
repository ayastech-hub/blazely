//BridgeSection.js
import React from "react";

/*
 BridgeSection: UI for cross-chain token transfer.
 Implement bridge logic (contracts or relayer) in backend or with SDK.
*/
export default function BridgeSection(){
  return (
    <div className="card p-4">
      <h5>Bridge</h5>
      <p className="text-sm text-gray-400">Move tokens across chains (implement cross-chain relayer / bridge SDK).</p>
      <button onClick={()=>alert("Bridge action - implement cross-chain SDK or backend relay")} className="mt-2 px-3 py-1 bg-indigo-600 rounded">Start Bridge</button>
    </div>
  );
}
