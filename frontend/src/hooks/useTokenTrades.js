/**
 * hooks/useTokenTrades.js
 * Real trades from `transactions`, newest first, with a realtime subscription appending new
 * ones as they land — this is what feeds the Trades panel's live-updating table.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 30;

export function useTokenTrades(tokenAddress) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, tx_hash, type, token_amount, eth_amount, usd_value, created_at, user_address")
        .eq("token_address", normalized)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!cancelled && mountedRef.current) {
        if (error) console.error("[useTokenTrades] fetch failed:", error.message);
        setTrades(data || []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`trades-${normalized}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `token_address=eq.${normalized}` },
        (payload) => {
          if (!mountedRef.current) return;
          setTrades((prev) => {
            if (prev.some((t) => t.id === payload.new.id)) return prev;
            return [payload.new, ...prev].slice(0, PAGE_SIZE);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tokenAddress]);

  return { trades, loading };
}
