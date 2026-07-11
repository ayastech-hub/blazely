/**
 * =================================================================================
 * hooks/useTokenPageData.js
 * =================================================================================
 * THIS is the "one file, loads at once" fetch you asked for. Every piece of data the
 * token page needs — token metadata, live metrics, and the realtime subscriptions that
 * keep them fresh — is fetched from exactly ONE place now.
 *
 * WHY THIS REPLACES SEVERAL SEPARATE FETCHES IN THE OLD COMPONENTS:
 * Previously, TokenInfoPage, SocialLinks, and Comments each independently queried the
 * `tokens` table for overlapping columns (creator_wallet, telegram, twitter, website) —
 * three round trips for data that's identical across all three. This hook fetches it once;
 * every component below now receives that data as props instead of fetching it again.
 *
 * THE CENTRAL BUG THIS FIXES: the old TokenInfoPage selected `market_cap`, `price`, and
 * `volume_24h` directly from the `tokens` table, and subscribed to `UPDATE` events on
 * `tokens` to keep them live. Neither of those columns lives on `tokens` in your actual
 * schema — they live on `token_metrics_latest`, which is the table your indexer project
 * actually writes to on every trade. The old code was silently always showing stale/zero
 * values and the realtime subscription was listening to a table that never changes for
 * price data at all. Fixed: this hook fetches BOTH `tokens` and `token_metrics_latest`,
 * and subscribes to `token_metrics_latest` UPDATE events (see
 * indexer/FRONTEND_GUIDE.md for the same pattern documented there).
 * =================================================================================
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTokenPageData(address) {
  const [token, setToken] = useState(null); // tokens row
  const [metrics, setMetrics] = useState(null); // token_metrics_latest row
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!address) return;
    const normalized = address.trim().toLowerCase();
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      // One round trip for each table, run in parallel — not sequential awaits, which
      // would double the time-to-first-paint for no reason.
      const [tokenResult, metricsResult] = await Promise.all([
        supabase
          .from("tokens")
          .select(
            "address, name, symbol, description, website, twitter, telegram, creator_wallet, logo_url, logo_path, decimals, graduated, graduated_at, liquidity_pair, chain_id, created_at"
          )
          .eq("address", normalized)
          .maybeSingle(),
        supabase
          .from("token_metrics_latest")
          .select(
            "address, price, price_usd, market_cap, volume_total, pool_progress, vault_balance_wei, circulating_supply, migration_status, holder_count, updated_at"
          )
          .eq("address", normalized)
          .maybeSingle(),
      ]);

      if (cancelled || !mountedRef.current) return;

      if (tokenResult.error) {
        setError(tokenResult.error.message);
        setLoading(false);
        return;
      }
      if (!tokenResult.data) {
        setError("Token not found.");
        setLoading(false);
        return;
      }

      setToken(tokenResult.data);
      // A brand-new token (created but not yet traded) may not have a token_metrics_latest
      // row yet — that's expected, not an error. Fall back to sensible zeros.
      setMetrics(
        metricsResult.data || {
          address: normalized,
          price: 0,
          price_usd: 0,
          market_cap: 0,
          volume_total: 0,
          pool_progress: 0,
          vault_balance_wei: 0,
          circulating_supply: 0,
          migration_status: false,
          holder_count: 0,
        }
      );
      setLoading(false);
    }

    fetchAll();

    // --- Realtime: token_metrics_latest is what actually changes on every trade ---
    const metricsChannel = supabase
      .channel(`token-metrics-${normalized}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_metrics_latest", filter: `address=eq.${normalized}` },
        (payload) => {
          if (!mountedRef.current) return;
          setMetrics(payload.new);
        }
      )
      .subscribe();

    // --- Realtime: tokens changes rarely (graduation, metadata edits) but still matters ---
    const tokenChannel = supabase
      .channel(`token-row-${normalized}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tokens", filter: `address=eq.${normalized}` },
        (payload) => {
          if (!mountedRef.current) return;
          setToken((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(tokenChannel);
    };
  }, [address]);

  return { token, metrics, loading, error };
}
