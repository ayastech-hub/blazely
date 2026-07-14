import React from "react";
import TokenCard from "./TokenCard";

export default function TokenList({ data = [], view = "grid" }) {
  if (!data.length) {
    return (
      <div className="text-center py-12 border border-dashed border-white/[0.08] bg-white/[0.02] backdrop-blur-md text-slate-600 font-bold tracking-widest text-[10px] uppercase rounded-2xl">
        NULL DESCRIPTOR // NO COMPLIANT TOKENS DETECTED
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex flex-col gap-2">
        {data.map((token, index) => (
          <TokenCard
            key={token.address || token.id || index}
            token={token}
            index={index}
            isNew={token.isNew}
            view="list"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="font-mono grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {data.map((token, index) => (
        <div key={token.address || token.id || index} className="w-full h-full">
          <TokenCard token={token} index={index} isNew={token.isNew} view="grid" />
        </div>
      ))}
    </div>
  );
}
