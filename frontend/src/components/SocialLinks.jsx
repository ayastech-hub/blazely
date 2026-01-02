import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe, Send, Twitter } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function SocialLinks({ tokenAddress }) {
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(false);

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
          console.error("Failed to fetch creator:", error);
        } else if (data && !cancelled) {
          setCreator({
            wallet: data.creator_wallet,
            telegram: data.telegram,
            twitter: data.twitter,
            website: data.website,
          });
        }
      } catch (err) {
        console.error("Unexpected error fetching creator:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCreator();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (!creator) return null;

  const shorten = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(creator.wallet);
  };

  return (
    <div className="bg-slate-800/60 p-3 rounded-2xl text-slate-200 flex flex-col gap-2 backdrop-blur-md border border-slate-700">
      {/* Wallet Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Creator:</span>
          <span className="font-mono text-sm text-white">
            {shorten(creator.wallet)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            title="Copy address"
            className="hover:text-blue-400 transition"
          >
            <Copy size={16} />
          </button>
          <a
            href={`https://basescan.org/address/${creator.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-400 transition"
            title="View on BaseScan"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Social Links */}
      <div className="flex items-center gap-3 pt-1">
        {creator.telegram && (
          <a
            href={creator.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition"
            title="Telegram"
          >
            <Send size={18} />
          </a>
        )}
        {creator.twitter && (
          <a
            href={creator.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition"
            title="Twitter"
          >
            <Twitter size={18} />
          </a>
        )}
        {creator.website && (
          <a
            href={creator.website}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
            title="Website"
          >
            <Globe size={18} />
          </a>
        )}
      </div>
    </div>
  );
}
