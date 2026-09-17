/**
 * =================================================================================
 * components/TokenHeader.jsx
 * =================================================================================
 * Mostly unchanged from your version (it was already correctly prop-driven, not fetching
 * its own data — good). Fixes: uses the shared utils/format.js helpers instead of
 * duplicated inline formatters, and resolveLogoUrl now points at the `token-logos` bucket
 * (matching what the token-creation backend actually uploads to) instead of the old,
 * mismatched `"logos"` bucket name.
 * =================================================================================
 */

import React, { useState } from "react";
import { Globe, Twitter, Send, Copy } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { formatUsdPrice, formatCompact, shortenAddress, resolveLogoUrl, explorerAddressUrl } from "../utils/format";

const Description = ({ text }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <p
      className={`text-xs text-[var(--text-mid-2)] leading-relaxed mt-1 border border-[var(--border)]/60 bg-[var(--bg)]/20 p-2 rounded-none cursor-pointer transition-all break-words whitespace-pre-wrap ${
        open ? "line-clamp-none" : "line-clamp-2"
      }`}
      onClick={() => setOpen(!open)}
    >
      {text}
    </p>
  );
};

export default function TokenHeader({
  token,
  marketCap,
  price,
  volumeTotal,
  creatorWallet,
  telegram,
  twitter,
  website,
  description,
  copied,
  handleCopy,
}) {
  const logoUrl = resolveLogoUrl(token, supabase);
  const contractAddress = token?.address || "";

  const copyContract = async () => {
    if (!contractAddress) return;
    handleCopy?.(contractAddress, "contract");
    await navigator.clipboard.writeText(contractAddress);
  };

  return (
    <div className="font-mono bg-[var(--bg-alt)]/40 p-4 border border-[var(--border)] rounded-sm text-[var(--text-mid)]">
      <div className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr] gap-4 min-w-0">
        <div className="w-16 h-16 rounded-none overflow-hidden bg-[var(--bg)] border border-[var(--border)] flex-shrink-0 mx-auto sm:mx-0">
          <img src={logoUrl} alt="token logo" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0 justify-center sm:justify-start">
            <h1 className="text-sm font-black uppercase tracking-wider text-[var(--text-bright)] truncate min-w-0">
              {token?.name || "—"}
            </h1>
            <div className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-mid-2)]">
              ${token?.symbol || "—"}
            </div>
            <div className="flex items-center gap-1">
              {twitter && <Social href={twitter} icon={<Twitter size={10} />} label="X" />}
              {telegram && <Social href={telegram} icon={<Send size={10} />} label="TG" />}
              {website && <Social href={website} icon={<Globe size={10} />} label="WEB" />}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 justify-center sm:justify-start min-w-0 text-[11px]">
            <span className="text-[10px] font-bold text-[var(--text-faint-2)] uppercase tracking-wider">CA:</span>
            <span className="bg-[var(--bg)] px-2 py-0.5 border border-[var(--border)] text-[var(--text-mid)] tracking-wide truncate min-w-0">
              {shortenAddress(contractAddress).toUpperCase()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={copyContract}
                className="relative p-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] transition-colors rounded-none"
                title="Copy contract address"
              >
                <Copy size={11} />
                {copied === "contract" && (
                  <span
                    style={{ backgroundColor: "var(--teal)", color: "var(--bg)" }}
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
                className="p-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] transition-colors rounded-none"
                title="DexScreener"
              >
                <span className="text-[9px] font-black uppercase px-0.5">DEX</span>
              </a>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-faint-2)] uppercase tracking-wide text-center sm:text-left">
            CREATOR:{" "}
            <a
              href={explorerAddressUrl(creatorWallet)}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--text-mid)] hover:text-[var(--text-bright)] underline decoration-slate-800 transition-colors"
            >
              {shortenAddress(creatorWallet).toUpperCase()}
            </a>
          </div>

          <Description text={description} />

          <div className="grid grid-cols-3 gap-2 mt-2 min-w-0 border-t border-[var(--border)]/60 pt-2.5">
            <Stat label="MARKET CAP" value={`${formatCompact(marketCap)} ETH`} />
            <Stat label="VOLUME" value={`${formatCompact(volumeTotal)} ETH`} />
            <Stat label="PRICE (USD)" value={formatUsdPrice(price)} />
          </div>
        </div>
      </div>
    </div>
  );
}

const Social = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    style={{ color: "var(--teal)", borderColor: "var(--teal)20" }}
    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--teal)]/5 border rounded-none text-[9px] font-black tracking-wider hover:opacity-80 transition-opacity"
  >
    {icon}
    <span>[{label}]</span>
  </a>
);

const Stat = ({ label, value }) => (
  <div className="bg-[var(--bg)]/40 border border-[var(--border)] p-2 min-w-0 rounded-none">
    <div className="text-[9px] text-[var(--text-faint-2)] font-bold uppercase tracking-widest mb-0.5">{label}</div>
    <div className="text-xs font-black text-[var(--text-bright-2)] truncate font-mono tracking-wide">{value}</div>
  </div>
);
