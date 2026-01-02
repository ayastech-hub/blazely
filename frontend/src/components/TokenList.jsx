// src/components/TokenList.jsx
import React, { useEffect, useState } from "react";
import TokenCard from "./TokenCard";
import { buyEmitter } from "../utils/buyEmitter";
//

export default function TokenList({ data = [], isPaused }) {
  const [shakingTokens, setShakingTokens] = useState({});

  // When the token list changes (e.g., sort/filter update), clear any shaking flags
  useEffect(() => {
    // This is optional but prevents old shake flags from lingering on new data sets.
    setShakingTokens({});
  }, [data]);

  useEffect(() => {
    const handleBuy = (boughtTokenAddress) => {
      // 1. Mark the token to shake in the local shaking state
      setShakingTokens((prevShaking) => ({
        ...prevShaking,
        [boughtTokenAddress.toLowerCase()]: true,
      }));

      // 2. Automatically remove shake after 10s
      const shakeTimer = setTimeout(() => {
        setShakingTokens((prev) => {
          const next = { ...prev };
          delete next[boughtTokenAddress.toLowerCase()];
          return next;
        });
      }, 10_000);

      return () => clearTimeout(shakeTimer);
    };

    buyEmitter.on("buy", handleBuy);
    return () => buyEmitter.off("buy", handleBuy);
  }, []); // Empty dependency array: Only set up listener once

  // --- Logic to combine the incoming data with the local shake status ---
  const displayTokens = data.map((token) => ({
    ...token,
    // Add the shake property based on the local shakingTokens state
    shake: !!shakingTokens[token.address.toLowerCase()],
  }));

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {/* Moved the grid definition here for easier integration into Home.jsx */}
      {displayTokens.length === 0 ? (
        <p className="text-slate-400 text-center col-span-full py-10">
          No tokens found matching the current criteria.
        </p>
      ) : (
        displayTokens.map((token, index) => (
          <div
            // Use a combination of address and index for key safety
            key={token.address || token.id || index}
            className="transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
          >
            <TokenCard
              token={token}
              index={index}
              isNew={token.shake} // Pass the combined shake status as 'isNew'
              isPaused={isPaused}
            />
          </div>
        ))
      )}
    </div>
  );
}
