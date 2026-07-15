import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchTokenByAddress } from "../api/supabaseTokens";

/**
 * useTokenMovers
 * ---------------
 * Owns the entire "live feed" concern for the token list:
 *   - Supabase Realtime subscription on the `transactions` table (INSERT)
 *   - trade batching (150ms window) to avoid render storms
 *   - patching live price / last-trade data onto tokens already on screen
 *   - "mover" behavior: on a fresh buy, the token pulses (shake) and is
 *     promoted to the front of the list — but only while sort === "Last
 *     Trade" (the platform default). Any other sort is a deliberate user
 *     choice to stop the list moving underneath them.
 *   - "surface new" behavior: if a buy comes in for a token that ISN'T on
 *     the current page (e.g. it's on page 3), and you're viewing page 1
 *     sorted by Last Trade, the token is fetched and inserted at the top
 *     anyway — trimming the last row off the bottom to keep the page size
 *     stable. This is what makes fresh activity visible immediately
 *     instead of requiring you to page/refresh to find it.
 *
 * @param {Object} params
 * @param {Array}  params.initialTokens - current page of tokens from the API/query layer
 * @param {string} params.sort - active sort key, e.g. "Last Trade"
 * @param {boolean} params.isPaused - true when the live stream is paused by the user
 * @param {number} [params.currentPage=1] - which page is currently being viewed
 * @param {string} [params.moverSortKey="Last Trade"] - the sort value that enables reordering/surfacing
 */
export function useTokenMovers({
  initialTokens,
  sort,
  isPaused,
  currentPage = 1,
  moverSortKey = "Last Trade",
}) {
  const [liveTokens, setLiveTokens] = useState(initialTokens || []);
  const [shakingTokens, setShakingTokens] = useState({});

  const liveTokensRef = useRef(liveTokens);
  const sortRef = useRef(sort);
  const pausedRef = useRef(isPaused);
  const currentPageRef = useRef(currentPage);
  const pageSizeRef = useRef((initialTokens || []).length);
  const shakeTimersRef = useRef(new Map());
  const pendingFetchesRef = useRef(new Set());

  useEffect(() => {
    liveTokensRef.current = liveTokens;
  }, [liveTokens]);

  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Re-sync whenever the underlying query result changes (new page, new
  // filter, new search term, manual refresh, etc). Also drops any stale
  // shake state left over from the previous data set.
  useEffect(() => {
    setLiveTokens(initialTokens || []);
    setShakingTokens({});
    if ((initialTokens || []).length) {
      pageSizeRef.current = initialTokens.length;
    }
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

  // Fetches a token that isn't on the current page and inserts it at the
  // front, trimming the last row so the visible page size stays constant.
  const surfaceNewToken = useCallback(
    async (patch) => {
      const addr = String(patch.address || "").toLowerCase();
      if (!addr || pendingFetchesRef.current.has(addr)) return;

      pendingFetchesRef.current.add(addr);
      try {
        const { data, error } = await fetchTokenByAddress(addr);
        if (error || !data) return;

        setLiveTokens((prev) => {
          // If it arrived on-page in the meantime (e.g. a page reload
          // beat the fetch), don't duplicate it.
          const alreadyPresent = prev.some(
            (t) => String(t.address).toLowerCase() === addr
          );
          if (alreadyPresent) return prev;

          const merged = {
            ...data,
            price_usd: patch.price_usd ?? data.price_usd,
            last_trade_at: patch.last_trade_at ?? data.last_trade_at,
            _last_trade: {
              tx_hash: patch.tx_hash,
              eth_amount: patch.eth_amount,
              token_amount: patch.token_amount,
            },
          };

          const next = [merged, ...prev];
          const cap = pageSizeRef.current || next.length;
          return next.length > cap ? next.slice(0, cap) : next;
        });

        triggerShake(addr);
      } finally {
        pendingFetchesRef.current.delete(addr);
      }
    },
    [triggerShake]
  );

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
        const newArr = [...current];
        const buys = [];
        const missingBuys = [];

        for (const patch of updates) {
          const addr = String(patch.address || "").toLowerCase();
          if (!addr) continue;

          const idx = newArr.findIndex(
            (t) => String(t.address).toLowerCase() === addr
          );

          if (idx === -1) {
            if (patch.isBuy) missingBuys.push(patch);
            continue;
          }

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

        const canReorder = sortRef.current === moverSortKey;
        const isFirstPage = currentPageRef.current === 1;
        const canSurfaceNew = canReorder && isFirstPage && !pausedRef.current;

        if (pausedRef.current) {
          // Absorb known patches, but never reorder, shake, or surface new arrivals.
          setLiveTokens(newArr);
          return;
        }

        if (canReorder) {
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

        if (canSurfaceNew) {
          missingBuys.forEach(surfaceNewToken);
        }
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

    (async () => {
      try {
        await supabase
          .from("transactions")
          .select("id, created_at")
          .order("id", { ascending: false })
          .limit(1);
      } catch {
        // non-fatal warm-up
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moverSortKey, triggerShake, surfaceNewToken]);

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