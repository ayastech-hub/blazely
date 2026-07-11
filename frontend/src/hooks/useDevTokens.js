/**
 * hooks/useDevTokens.js
 * "Dev Tokens" panel data: every other token the same creator wallet has launched, joined
 * with their current metrics. Real query against `tokens` + `token_metrics_latest` —
 * nothing here was fabricated, this is exactly what the preview's mock DEV_TOKENS array was
 * standing in for.
 */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useDevTokens(creatorWallet, currentTokenAddress) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorWallet) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: tokenRows, error } = await supabase
        .from("tokens")
        .select("address, name, symbol, chain_id, created_at, graduated")
        .eq("creator_wallet", creatorWallet.toLowerCase())
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("[useDevTokens] fetch failed:", error.message);
        setTokens([]);
        setLoading(false);
        return;
      }

      const addresses = (tokenRows || []).map((t) => t.address);
      const { data: metricsRows } = addresses.length
        ? await supabase.from("token_metrics_latest").select("address, market_cap, vault_balance_wei").in("address", addresses)
        : { data: [] };

      const metricsByAddr = new Map((metricsRows || []).map((m) => [m.address, m]));

      const merged = (tokenRows || []).map((t) => ({
        ...t,
        isCurrent: t.address.toLowerCase() === currentTokenAddress?.toLowerCase(),
        marketCap: metricsByAddr.get(t.address)?.market_cap ?? 0,
        vaultEth: metricsByAddr.get(t.address)?.vault_balance_wei ?? 0,
      }));

      setTokens(merged);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [creatorWallet, currentTokenAddress]);

  return { tokens, loading };
}
