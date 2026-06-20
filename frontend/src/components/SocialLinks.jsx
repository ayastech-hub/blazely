// src/components/SocialLinks.jsx
import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe, Send, Twitter } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function SocialLinks({ tokenAddress }) {
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tokenAddress) {
      setCreator(null);
      return;
    }
    const normalized = String(tokenAddress).trim().toLowerCase();
    let cancelled = false;

    async function fetchCreator() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tokens")
          .select("creator_wallet, telegram, twitter, website")
          .eq("address", normalized)
          .maybeSingle();

        if (error) {
          console.error("Failed to query metadata channel:", error);
        } else if (data && !cancelled) {
          setCreator({
            wallet: data.creator_wallet,
            telegram: data.telegram,
            twitter: data.twitter,
            website: data.website,
          });
        }
      } catch (err) {
        console.error("Unexpected pipeline exception during load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCreator();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  if (loading) {
    return (
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">
        SYNCHRONIZING_METADATA...
      </div>
    );
  }
  
  if (!creator) return null;

  const shorten = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "NULL";

  const copyToClipboard = async () => {
    if (!creator.wallet) return;
    try {
      await navigator.clipboard.writeText(creator.wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Clipboard routing failed:", err);
    }
  };

  return (
    <div className="font-mono text-xs bg-[#0b0f19]/40 p-3 rounded-sm border border-slate-900 text-slate-300 flex flex-col gap-2.5 max-w-sm">
      
      {/* Wallet Infrastructure Row */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CREATOR:</span>
          <span className="text-slate-200 font-bold uppercase tracking-wide">
            {shorten(creator.wallet)}
          </span>
        </div>
        
        {/* Action Controls Interface */}
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest mt-0.5 sm:mt-0">
          <button
            onClick={copyToClipboard}
            style={{ color: copied ? '#96d6cd' : '' }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors uppercase"
            title="Copy system identifier"
          >
            <Copy size={11} />
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>
          
          <a
            href={`https://basescan.org/address/${creator.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors uppercase"
            title="Inspect on BaseScan Ledger"
          >
            <ExternalLink size={11} />
            <span>EXPLORER</span>
          </a>
        </div>
      </div>

      {/* Network Verification Pipeline Links */}
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider">
        <span className="text-slate-500 uppercase text-[9px] mr-1">CHANNELS:</span>
        
        {creator.telegram && (
          <a
            href={creator.telegram}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#96d6cd', borderColor: '#96d6cd20' }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#96d6cd]/5 border rounded-none transition-opacity hover:opacity-80"
            title="Telegram Endpoint"
          >
            <Send size={10} />
            <span>[TG]</span>
          </a>
        )}
        
        {creator.twitter && (
          <a
            href={creator.twitter}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#96d6cd', borderColor: '#96d6cd20' }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#96d6cd]/5 border rounded-none transition-opacity hover:opacity-80"
            title="Twitter Stream"
          >
            <Twitter size={10} />
            <span>[X]</span>
          </a>
        )}
        
        {creator.website && (
          <a
            href={creator.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#96d6cd', borderColor: '#96d6cd20' }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#96d6cd]/5 border rounded-none transition-opacity hover:opacity-80"
            title="External Core Site"
          >
            <Globe size={10} />
            <span>[WEB]</span>
          </a>
        )}

        {!creator.telegram && !creator.twitter && !creator.website && (
          <span className="text-slate-600 italic font-normal text-[9px] uppercase tracking-normal">
            [ no social metadata broadcasted ]
          </span>
        )}
      </div>
    </div>
  );
}
