/**
 * hooks/useDevTokens.js
 * "Dev Tokens" panel data: now uses usePrices() for consistent USD conversion.
 */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { usePrices } from "./usePrices";

export function useDevTokens(creatorWallet, currentTokenAddress) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ethUsd } = usePrices();

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

      const merged = (tokenRows || []).map((t) => {
        const metrics = metricsByAddr.get(t.address);
        
        const marketCapEth = Number(metrics?.market_cap || 0) / 1e18;
        const vaultEth = Number(BigInt(metrics?.vault_balance_wei || "0")) / 1e18;

        return {
          ...t,
          isCurrent: t.address.toLowerCase() === currentTokenAddress?.toLowerCase(),
          marketCapEth,
          marketCapUsd: ethUsd != null ? marketCapEth * ethUsd : null,
          vaultEth,
          vaultUsd: ethUsd != null ? vaultEth * ethUsd : null,
        };
      });

      setTokens(merged);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [creatorWallet, currentTokenAddress, ethUsd]);

  return { tokens, loading };
}
