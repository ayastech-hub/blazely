import React, { useState } from "react";
import { Globe, Twitter, Send, Copy } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// --- Keep your original formatters and helper functions ---
const formatPrice = (price) => { /* ... (Your existing logic) ... */ };
const formatCompact = (num, isCurrency = false) => { /* ... (Your existing logic) ... */ };
const shortenAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";
const getLogoUrl = (token) => { /* ... (Your existing logic) ... */ };

// --- Sub-Components ---
const Stat = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[8px] text-[#718096] uppercase tracking-widest font-mono mb-1">{label}</span>
    <span className="text-[11px] font-bold text-[#C8D0E0] font-mono">{value}</span>
  </div>
);

export default function TokenHeader({
  token, marketCap, price, volume24h, creatorWallet,
  telegram, twitter, website, description, copied, handleCopy,
}) {
  const logoUrl = getLogoUrl(token);
  const contractAddress = token?.address || "";

  return (
    <div className="bg-[#0C0E15] border-b border-[#1A1F2E] relative font-sans">
      {/* Accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#96d6cd] to-transparent opacity-60" />

      <div className="p-4 flex items-start gap-4">
        {/* Token Logo */}
        <div className="w-12 h-12 rounded-lg bg-[#030712] border border-[#1A1F2E] flex-shrink-0 overflow-hidden">
          <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
        </div>

        {/* Header Content */}
        <div className="flex-1 min-w-0">
          {/* Name & Symbol Row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-lg font-bold text-[#E8EDF5] font-mono tracking-tight">
              {token?.name || "—"}
            </h1>
            <span className="text-xs text-[#718096] font-mono">/ {token?.symbol || "—"}</span>
          </div>

          {/* Contract Address Row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-[#050608] border border-[#1A1F2E] rounded px-2 py-1">
              <span className="text-[10px] text-[#718096] font-mono">{shortenAddress(contractAddress)}</span>
              <button onClick={() => handleCopy?.(contractAddress, "contract")} className="text-[#718096] hover:text-[#96d6cd]">
                <Copy size={10} />
              </button>
            </div>
          </div>

          {/* Socials Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {twitter && <SocialLink href={twitter} label="X" />}
            {telegram && <SocialLink href={telegram} label="TG" />}
            {website && <SocialLink href={website} label="WEB" />}
          </div>
        </div>

        {/* Right side: Stats */}
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="text-sm font-bold text-[#E8EDF5] font-mono">
            {formatCompact(marketCap, true)}
          </div>
          <span className="text-[9px] text-[#718096] uppercase tracking-widest font-mono">M.CAP</span>
        </div>
      </div>

      {/* Footer Metrics Matrix */}
      <div className="grid grid-cols-3 gap-4 px-4 py-3 border-t border-[#1A1F2E] bg-[#050608]/40">
        <Stat label="24H VOL" value={formatCompact(volume24h, true)} />
        <Stat label="PRICE" value={formatPrice(price)} />
        <Stat label="CREATOR" value={shortenAddress(creatorWallet)} />
      </div>
    </div>
  );
}

const SocialLink = ({ href, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-1.5 px-2 py-1 bg-[#101420] border border-[#1A1F2E] rounded text-[10px] text-[#718096] font-mono font-bold hover:border-[#96d6cd] hover:text-[#96d6cd] transition-colors"
  >
    {label}
  </a>
);
