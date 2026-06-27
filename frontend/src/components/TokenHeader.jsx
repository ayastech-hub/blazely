// src/components/TokenHeader.jsx
import React, { useState } from "react";
import { Globe, Twitter, Send, Copy } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ------------------- Quantitative Formatters -------------------
const formatPrice = (price) => {
  if (!price) return "—";
  const num = Number(price);
  if (isNaN(num)) return "—";
  if (num === 0) return "$0.00";

  if (num >= 0.1) {
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }

  const str = num.toFixed(20);
  const match = str.match(/^0\.(0+)/);
  if (match) {
    const zeroCount = match[1].length;
    const sigDigits = str.substring(zeroCount + 2, zeroCount + 6).replace(/0+$/, "");
    return `$0.0(${zeroCount})${sigDigits}`;
  }

  return `$${num.toFixed(6)}`;
};

const formatCompact = (num, isCurrency = false) => {
  if (!num) return "$0";
  const n = Number(num);
  if (isNaN(n)) return "—";
  const sign = isCurrency ? "$" : "";
  if (Math.abs(n) < 1000) return `${sign}${n.toFixed(2)}`;
  const units = ["", "K", "M", "B"];
  const i = Math.floor(Math.log10(Math.abs(n)) / 3);
  return `${sign}${(n / 10 ** (i * 3)).toFixed(1)}${units[i]}`;
};

const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

const getLogoUrl = (token) => {
  if (!token) return "/fallback-logo.png";
  if (token.logo_url) return token.logo_url;
  if (token.logo_path || token.logo) {
    try {
      const { data } = supabase.storage
        .from("logos")
        .getPublicUrl(token.logo_path || token.logo);
      return data?.publicUrl || "/fallback-logo.png";
    } catch {
      return "/fallback-logo.png";
    }
  }
  return "/fallback-logo.png";
};

// ------------------- Description Sub-Module -------------------
const Description = ({ text }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  return (
    <p
      className={`text-xs text-slate-400 leading-relaxed mt-1 border border-slate-900/60 bg-[#030712]/20 p-2 rounded-none cursor-pointer transition-all break-words whitespace-pre-wrap ${
        open ? "line-clamp-none" : "line-clamp-2"
      }`}
      onClick={() => setOpen(!open)}
    >
      {text}
    </p>
  );
};

// ------------------- Main Component Module -------------------
export default function TokenHeader({
  token,
  marketCap,
  price,
  volume24h,
  creatorWallet,
  telegram,
  twitter,
  website,
  description,
  copied,
  handleCopy,
}) {
  const logoUrl = getLogoUrl(token);
  const contractAddress = token?.address || "";

  const copyContract = async () => {
    if (!contractAddress) return;
    handleCopy?.(contractAddress, "contract");
    await navigator.clipboard.writeText(contractAddress);
  };

  return (
    <div className="font-mono bg-[#0b0f19]/40 p-4 border border-slate-900 rounded-sm text-slate-300">
      <div className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr] gap-4 min-w-0">
        
        {/* Rigid Identity Frame */}
        <div className="w-16 h-16 rounded-none overflow-hidden bg-[#030712] border border-slate-900 flex-shrink-0 mx-auto sm:mx-0">
          <img
            src={logoUrl}
            alt="token logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Primary Data Assembly Segment */}
        <div className="flex flex-col gap-2 min-w-0">
          
          {/* Identity Title Block + Social Anchor Pins */}
          <div className="flex items-center gap-2 flex-wrap min-w-0 justify-center sm:justify-start">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-100 truncate min-w-0">
              {token?.name || "—"}
            </h1>
            
            <div className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#030712] border border-slate-900 text-slate-400">
              ${token?.symbol || "—"}
            </div>

            <div className="flex items-center gap-1">
              {twitter && <Social href={twitter} icon={<Twitter size={10} />} label="X" />}
              {telegram && <Social href={telegram} icon={<Send size={10} />} label="TG" />}
              {website && <Social href={website} icon={<Globe size={10} />} label="WEB" />}
            </div>
          </div>

          {/* Network Cryptographic Registry Verification Row */}
          <div className="flex items-center flex-wrap gap-2 justify-center sm:justify-start min-w-0 text-[11px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CA:</span>
            <span className="bg-[#030712] px-2 py-0.5 border border-slate-900 text-slate-300 tracking-wide truncate min-w-0">
              {shortenAddress(contractAddress).toUpperCase()}
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={copyContract}
                className="relative p-1 bg-[#030712] border border-slate-900 text-slate-400 hover:text-slate-200 transition-colors rounded-none"
                title="Copy interface hash"
              >
                <Copy size={11} />
                {copied === "contract" && (
                  <span 
                    style={{ backgroundColor: '#96d6cd', color: '#030712' }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-none"
                  >
                    COPIED
                  </span>
                )}
              </button>

              <a
                href={`https://dexscreener.com/base/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 bg-[#030712] border border-slate-900 text-slate-400 hover:text-slate-200 transition-colors rounded-none"
                title="DexScreener Telemetry"
              >
                <span className="text-[9px] font-black uppercase px-0.5">DEX</span>
              </a>
            </div>
          </div>

          {/* Creator Origin Footprint */}
          <div className="text-[10px] text-slate-500 uppercase tracking-wide text-center sm:text-left">
            ORIGIN_NODE:{" "}
            <a
              href={`https://basescan.org/address/${creatorWallet}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 hover:text-slate-100 underline decoration-slate-800 transition-colors"
            >
              {shortenAddress(creatorWallet).toUpperCase()}
            </a>
          </div>

          {/* Description Block */}
          <Description text={description} />

          {/* Core Analytics Metric Matrix */}
          <div className="grid grid-cols-3 gap-2 mt-2 min-w-0 border-t border-slate-900/60 pt-2.5">
            <Stat label="INDEX_MCAP" value={formatCompact(marketCap, true)} />
            <Stat label="VOLUME_24H" value={formatCompact(volume24h, true)} />
            <Stat label="SPOT_PRICE" value={formatPrice(price)} />
          </div>

        </div>
      </div>
    </div>
  );
}

// ------------------- Social Sub-Component -------------------
const Social = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    style={{ color: '#96d6cd', borderColor: '#96d6cd20' }}
    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#96d6cd]/5 border rounded-none text-[9px] font-black tracking-wider hover:opacity-80 transition-opacity"
  >
    {icon}
    <span>[{label}]</span>
  </a>
);

// ------------------- Stat Panel Sub-Component -------------------
const Stat = ({ label, value }) => (
  <div className="bg-[#030712]/40 border border-slate-900 p-2 min-w-0 rounded-none">
    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">
      {label}
    </div>
    <div className="text-xs font-black text-slate-200 truncate font-mono tracking-wide">
      {value}
    </div>
  </div>
);
