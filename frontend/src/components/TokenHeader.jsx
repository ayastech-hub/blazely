import React, { useState } from "react";
import { Globe, Twitter, Send, Copy } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ------------------- Helpers -------------------
const formatPrice = (price) => {
  if (!price) return "—";
  const num = Number(price);
  if (isNaN(num)) return "—";
  if (num === 0) return "$0.00";

  if (num >= 0.1)
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;

  const str = num.toFixed(20);
  const match = str.match(/^0\.(0+)/);
  if (match) {
    const zeroCount = match[1].length;
    const sigDigits = str.substring(zeroCount + 2, zeroCount + 4);
    return (
      <span className="flex items-baseline font-sans">
        <span>$0.0</span>
        <sub className="text-[11px] font-bold leading-none text-white">
          {zeroCount}
        </sub>
        <span>{sigDigits}</span>
      </span>
    );
  }

  return `$${num.toFixed(6)}`;
};

const formatCompact = (num, isCurrency = false) => {
  if (!num) return "$0";
  const n = Number(num);
  if (isNaN(n)) return "—";
  const sign = isCurrency ? "$" : "";
  if (Math.abs(n) < 1000) return `${sign}${n.toFixed(2)}`;
  const units = ["", "k", "m", "b"];
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

// ------------------- Description -------------------
const Description = ({ text }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  return (
    <p
      className={`text-sm text-slate-300 leading-relaxed mt-2 cursor-pointer transition-all break-words whitespace-pre-wrap ${
        open ? "line-clamp-none" : "line-clamp-2"
      }`}
      onClick={() => setOpen(!open)}
    >
      {text}
    </p>
  );
};

// ------------------- Main Component -------------------
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
    <div className="bg-slate-950/70 backdrop-blur-xl rounded-2xl p-4 border border-slate-800/50 shadow-md">
      <div className="grid grid-cols-[4rem_1fr] gap-4 min-w-0">
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900/40 border border-slate-800/50 shadow-inner flex-shrink-0">
          <img
            src={logoUrl}
            alt="token logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info Section */}
        <div className="flex flex-col gap-2 min-w-0">
          {/* Name + Socials */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold truncate min-w-0">
              {token?.name || "—"}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-800 flex-shrink-0">
              <p className="uppercase font-mono truncate">
                ${token?.symbol || "—"}
              </p>
            </span>
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              {twitter && (
                <Social href={twitter} icon={<Twitter size={12} />} />
              )}
              {telegram && <Social href={telegram} icon={<Send size={12} />} />}
              {website && <Social href={website} icon={<Globe size={12} />} />}
            </div>
          </div>

          {/* Contract Address */}
          <div className="flex items-center flex-wrap gap-2 mt-1 min-w-0">
            <span className="text-xs text-slate-400">CA</span>
            <span className="font-mono text-xs text-cyan-400 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800 truncate min-w-0">
              {shortenAddress(contractAddress)}
            </span>
            <button
              onClick={copyContract}
              className="relative p-1.5 rounded-md bg-slate-900/50 border border-slate-800 hover:border-cyan-400/40 transition"
            >
              <Copy size={14} />
              {copied === "contract" && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-cyan-500 text-black px-2 py-0.5 rounded">
                  Copied
                </span>
              )}
            </button>
            <a
              href={`https://dexscreener.com/base/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md bg-slate-900/50 border border-slate-800 hover:border-purple-400/40 transition"
            >
              <img src="/dexscreener.png" alt="dex" className="w-4 h-4" />
            </a>
          </div>

          {/* Creator */}
          <div className="text-xs sm:text-sm text-slate-400 mt-1">
            Created by{" "}
            <a
              href={`https://basescan.org/address/${creatorWallet}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-white hover:underline break-words"
            >
              {shortenAddress(creatorWallet)}
            </a>
          </div>

          {/* Description */}
          <Description text={description} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-3 min-w-0">
            <Stat label="MC" value={formatCompact(marketCap, true)} />
            <Stat label="Vol" value={formatCompact(volume24h, true)} />
            <Stat label="Price" value={formatPrice(price)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------- Social Component -------------------
const Social = ({ href, icon }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:text-cyan-400 transition flex-shrink-0"
  >
    {icon}
  </a>
);

// ------------------- Stat Component -------------------
const Stat = ({ label, value }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 shadow-sm min-w-0">
    <div className="text-[10px] text-slate-400 uppercase tracking-wider">
      {label}
    </div>
    <div className="text-sm font-semibold text-white truncate">{value}</div>
  </div>
);
