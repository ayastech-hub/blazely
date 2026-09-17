/**
 * =================================================================================
 * components/SocialLinks.jsx
 * =================================================================================
 * The old version ran its OWN `supabase.from("tokens").select("creator_wallet, telegram,
 * twitter, website")` query — the exact same columns useTokenPageData.js already fetches
 * once for the whole page. Removed entirely; this is now a pure presentational component
 * fed by props, same data, zero extra round trips.
 * =================================================================================
 */

import React, { useState } from "react";
import { Copy, ExternalLink, Globe, Send, Twitter } from "lucide-react";
import { shortenAddress, explorerAddressUrl } from "../utils/format";

export default function SocialLinks({ creatorWallet, telegram, twitter, website }) {
  const [copied, setCopied] = useState(false);

  if (!creatorWallet) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(creatorWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Clipboard write failed:", err);
    }
  };

  return (
    <div className="font-mono text-xs bg-[var(--bg-alt)]/40 p-3 rounded-sm border border-[var(--border)] text-[var(--text-mid)] flex flex-col gap-2.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)]/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-faint-2)] font-bold uppercase tracking-wider">CREATOR:</span>
          <span className="text-[var(--text-bright-2)] font-bold uppercase tracking-wide">{shortenAddress(creatorWallet)}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest mt-0.5 sm:mt-0">
          <button
            onClick={copyToClipboard}
            style={{ color: copied ? "var(--teal)" : "" }}
            className="flex items-center gap-1 text-[var(--text-faint-2)] hover:text-[var(--text-mid)] transition-colors uppercase"
          >
            <Copy size={11} />
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>
          <a
            href={explorerAddressUrl(creatorWallet)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[var(--text-faint-2)] hover:text-[var(--text-mid)] transition-colors uppercase"
          >
            <ExternalLink size={11} />
            <span>EXPLORER</span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider flex-wrap">
        <span className="text-[var(--text-faint-2)] uppercase text-[9px] mr-1">CHANNELS:</span>
        {telegram && <ChannelLink href={telegram} icon={<Send size={10} />} label="TG" />}
        {twitter && <ChannelLink href={twitter} icon={<Twitter size={10} />} label="X" />}
        {website && <ChannelLink href={website} icon={<Globe size={10} />} label="WEB" />}
        {!telegram && !twitter && !website && (
          <span className="text-[var(--border-mid)] italic font-normal text-[9px] uppercase tracking-normal">
            [ no social links provided ]
          </span>
        )}
      </div>
    </div>
  );
}

const ChannelLink = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: "var(--teal)", borderColor: "var(--teal)20" }}
    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--teal)]/5 border rounded-none transition-opacity hover:opacity-80"
  >
    {icon}
    <span>[{label}]</span>
  </a>
);
