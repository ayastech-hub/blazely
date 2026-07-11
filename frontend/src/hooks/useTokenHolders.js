/**
 * hooks/useTokenHolders.js
 * Shared by HoldersPanel and BubbleMapPanel so both read from the same query instead of each
 * re-implementing their own fetch of `token_holder_balances` slightly differently.
 */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTokenHolders(tokenAddress, limit = 50) {
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenAddress) return;
    const normalized = tokenAddress.toLowerCase();
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("token_holder_balances")
        .select("wallet_address, balance, updated_at")
        .eq("token_address", normalized)
        .order("balance", { ascending: false })
        .limit(limit);

      if (!cancelled) {
        if (error) console.error("[useTokenHolders] fetch failed:", error.message);
        setHolders(data || []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`holders-hook-${normalized}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_holder_balances", filter: `token_address=eq.${normalized}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tokenAddress, limit]);

  return { holders, loading };
}
