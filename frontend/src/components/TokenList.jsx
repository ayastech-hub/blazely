// File: src/components/TokenList.js
import React from "react";
import TokenCard from "./TokenCard";

const TokenList = ({ tokens }) => {
  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {tokens.map((token, index) => (
        <TokenCard key={index} token={token} />
      ))}
    </div>
  );
};

export default TokenList;
