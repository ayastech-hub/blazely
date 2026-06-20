// src/components/TokenList.jsx
import React, { useEffect, useState } from "react";
import TokenCard from "./TokenCard";
import { buyEmitter } from "../utils/buyEmitter";

export default function TokenList({ data = [], isPaused }) {
  const [shakingTokens, setShakingTokens] = useState({});

  useEffect(() => {
    // Purge outdated live signal overrides on internal array updates
    setShakingTokens({});
  }, [data]);

  useEffect(() => {
    const handleBuy = (boughtTokenAddress) => {
      const normalizedAddress = boughtTokenAddress.toLowerCase();
      
      setShakingTokens((prevShaking) => ({
        ...prevShaking,
        [normalizedAddress]: true,
      }));

      const shakeTimer = setTimeout(() => {
        setShakingTokens((prev) => {
          const next = { ...prev };
          delete next[normalizedAddress];
          return next;
        });
      }, 10000);

      return () => clearTimeout(shakeTimer);
    };

    buyEmitter.on("buy", handleBuy);
    return () => buyEmitter.off("buy", handleBuy);
  }, []);

  const displayTokens = data.map((token) => ({
    ...token,
    shake: !!shakingTokens[token.address?.toLowerCase()],
  }));

  return (
    <div className="font-mono grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {displayTokens.length === 0 ? (
        <div className="text-center col-span-full py-12 border border-dashed border-slate-900/60 bg-[#0b0f19]/10 text-slate-600 font-bold tracking-widest text-[10px] uppercase">
          NULL DESCRIPTOR // NO COMPLIANT TOKENS DETECTED
        </div>
      ) : (
        displayTokens.map((token, index) => (
          <div
            key={token.address || token.id || index}
            className="w-full h-full rounded-none"
          >
            <TokenCard
              token={token}
              index={index}
              isNew={token.shake}
              isPaused={isPaused}
            />
          </div>
        ))
      )}
    </div>
  );
}
