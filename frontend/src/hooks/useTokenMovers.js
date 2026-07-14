import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useTokenMovers
 * ---------------
 * Owns the entire "live feed" concern for the token list:
 *   - Supabase Realtime subscription on the `transactions` table (INSERT)
 *   - trade batching (150ms window) to avoid render storms
 *   - patching live price / last-trade data onto the token list
 *   - "mover" behavior: on a fresh buy, the token pulses (shake) — and is
 *     only promoted to the front of the list while sort === "Last Trade"
 *     (the platform default). Any other sort is a deliberate user choice
 *     to stop the list moving underneath them, so we never reorder then.
 *
 * Realtime on `transactions` is the same mechanism the Telegram Transaction
 * Bot already relies on, so the frontend and the bots agree on one source
 * of truth instead of running two separate delivery paths for one event.
 *
 * @param {Object} params
 * @param {Array}  params.initialTokens - current page of tokens from the API/query layer
 * @param {string} params.sort - active sort key, e.g. "Last Trade"
 * @param {boolean} params.isPaused - true when the live stream is paused by the user
 * @param {string} [params.moverSortKey="Last Trade"] - the sort value that enables reordering
 */
export function useTokenMovers({
  initialTokens,
  sort,
  isPaused,
  moverSortKey = "Last Trade",
}) {
  const [liveTokens, setLiveTokens] = useState(initialTokens || []);
  const [shakingTokens, setShakingTokens] = useState({});

  const liveTokensRef = useRef(liveTokens);
  const sortRef = useRef(sort);
  const pausedRef = useRef(isPaused);
  const shakeTimersRef = useRef(new Map());

  useEffect(() => {
    liveTokensRef.current = liveTokens;
  }, [liveTokens]);

  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Re-sync whenever the underlying query result changes (new page,
  // new filter, new search term, manual refresh, etc). Also drops any
  // stale shake state left over from the previous data set.
  useEffect(() => {
    setLiveTokens(initialTokens || []);
    setShakingTokens({});
  }, [initialTokens]);

  const triggerShake = useCallback((address) => {
    const normalized = String(address || "").toLowerCase();
    if (!normalized) return;

    setShakingTokens((prev) => ({ ...prev, [normalized]: true }));

    const existingTimer = shakeTimersRef.current.get(normalized);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      setShakingTokens((prev) => {
        if (!prev[normalized]) return prev;
        const next = { ...prev };
        delete next[normalized];
        return next;
      });
      shakeTimersRef.current.delete(normalized);
    }, 10000);

    shakeTimersRef.current.set(normalized, timer);
  }, []);

  useEffect(() => {
    return () => {
      shakeTimersRef.current.forEach(clearTimeout);
      shakeTimersRef.current.clear();
    };
  }, []);

  // --- Realtime lifecycle ---------------------------------------------
  useEffect(() => {
    const BATCH_WINDOW_MS = 150;

    let cancelled = false;
    const buffer = new Map();
    let flushTimer = null;

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushBuffer();
      }, BATCH_WINDOW_MS);
    };

    const flushBuffer = () => {
      if (!buffer.size) return;
      const updates = Array.from(buffer.values());
      buffer.clear();

      requestAnimationFrame(() => {
        const current = liveTokensRef.current || [];
        if (!current.length) return;

        const newArr = [...current];
        const buys = [];

        for (const patch of updates) {
          const addr = String(patch.address || "").toLowerCase();
          if (!addr) continue;

          const idx = newArr.findIndex(
            (t) => String(t.address).toLowerCase() === addr
          );
          if (idx === -1) continue;

          const merged = { ...newArr[idx] };
          if (patch.price_usd != null) merged.price_usd = patch.price_usd;
          if (patch.last_trade_at) merged.last_trade_at = patch.last_trade_at;
          merged._last_trade = {
            tx_hash: patch.tx_hash,
            eth_amount: patch.eth_amount,
            token_amount: patch.token_amount,
          };

          newArr[idx] = merged;
          if (patch.isBuy) buys.push(addr);
        }

        // Paused: absorb price/trade patches, but never reorder or shake.
        if (pausedRef.current) {
          setLiveTokens(newArr);
          return;
        }

        const canReorder = sortRef.current === moverSortKey;

        if (canReorder) {
          // Promote in reverse so the most recent buy ends up first.
          for (let i = buys.length - 1; i >= 0; i--) {
            const addr = buys[i];
            const pos = newArr.findIndex(
              (t) => (t.address || "").toLowerCase() === addr
            );
            if (pos > -1) {
              const [tok] = newArr.splice(pos, 1);
              newArr.unshift(tok);
            }
          }
        }

        setLiveTokens(newArr);
        buys.forEach(triggerShake);
      });
    };

    const processRow = (row) => {
      if (!row) return;
      const addr = String(row.token_address || "").toLowerCase();
      if (!addr) return;

      const existing = buffer.get(addr) || { address: addr };
      buffer.set(addr, {
        ...existing,
        address: addr,
        price_usd: row.usd_value != null ? Number(row.usd_value) : existing.price_usd,
        last_trade_at: row.created_at,
        tx_hash: row.tx_hash,
        eth_amount: row.eth_amount,
        token_amount: row.token_amount,
        isBuy: row.type === "buy",
      });
      scheduleFlush();
    };

    // Best-effort warm-up ping so we know the table is reachable; not
    // used to replay history, just a sanity check on connection setup.
    (async () => {
      try {
        await supabase
          .from("transactions")
          .select("id, created_at")
          .order("id", { ascending: false })
          .limit(1);
      } catch {
        // non-fatal
      }
    })();

    const channel = supabase
      .channel("token-movers-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          if (cancelled) return;
          processRow(payload.new);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (flushTimer) clearTimeout(flushTimer);
      buffer.clear();
      supabase.removeChannel(channel);
    };
    // Subscribes once per mount; live sort/pause state is read via refs
    // so the channel never has to be torn down/rebuilt on filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moverSortKey, triggerShake]);

  const tokens = useMemo(
    () =>
      liveTokens.map((token) => ({
        ...token,
        isNew: !!shakingTokens[String(token.address || "").toLowerCase()],
      })),
    [liveTokens, shakingTokens]
  );

  return { tokens };
}

export default useTokenMovers;
