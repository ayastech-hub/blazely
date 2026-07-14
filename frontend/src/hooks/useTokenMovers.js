import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * useTokenMovers
 * ---------------
 * Owns the entire "live feed" concern that used to live inline inside Home.jsx:
 *   - websocket connection lifecycle (connect / reconnect w/ backoff / heartbeat)
 *   - trade batching (150ms window) to avoid render storms
 *   - patching live price / last_trade data onto the token list
 *   - "mover" behavior: on a fresh buy, the token pulses (shake) — and is only
 *     promoted to the front of the list while sort === "Last Trade" (the
 *     platform default). Any other sort is a deliberate user choice to stop
 *     the list from moving underneath them, so we never reorder in that case.
 *
 * This hook is intentionally the *only* place that talks to the trades
 * websocket. Components stay presentational: they receive a plain tokens
 * array (already carrying an `isNew` flag for shake) and render it.
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
  // new filter, new search term, manual refresh, etc). This is also
  // where we drop any stale shake state from the previous data set.
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

  // Clean up any outstanding shake timers on unmount.
  useEffect(() => {
    return () => {
      shakeTimersRef.current.forEach(clearTimeout);
      shakeTimersRef.current.clear();
    };
  }, []);

  // --- Websocket lifecycle -------------------------------------------------
  useEffect(() => {
    const BATCH_WINDOW_MS = 150;
    const HEARTBEAT_INTERVAL_MS = 20_000;
    const MAX_BACKOFF = 30_000;
    let reconnectBackoff = 1000;

    let WS_URL = import.meta.env.VITE_TRADES_WS || "ws://localhost:8080";
    if (window.location.protocol === "https:" && WS_URL.startsWith("ws://")) {
      WS_URL = WS_URL.replace("ws://", "wss://");
    }

    let ws = null;
    let shouldStop = false;
    let reconnectTimer = null;
    let flushTimer = null;
    let heartbeatTimer = null;
    let lastPong = Date.now();
    const buffer = new Map();

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
          const addr = (patch.token || patch.address || "").toLowerCase();
          if (!addr) continue;

          const idx = newArr.findIndex(
            (t) => String(t.address).toLowerCase() === addr
          );
          if (idx === -1) continue;

          const merged = { ...newArr[idx] };
          if (patch.price != null) merged.price = patch.price;
          if (patch.last_trade_at) merged.last_trade_at = patch.last_trade_at;
          merged._last_trade = {
            tx_hash: patch.tx_hash,
            eth: patch.eth,
            token_amount: patch.token_amount,
          };

          newArr[idx] = merged;

          if (patch.type === "buy" || patch.isBuy) {
            buys.push(addr);
          }
        }

        // Paused: still absorb price/trade patches, but never reorder or shake.
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

    const startHeartbeat = () => {
      lastPong = Date.now();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        try {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          if (Date.now() - lastPong > HEARTBEAT_INTERVAL_MS * 2) {
            ws.close();
            return;
          }
          ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
        } catch {
          // no-op: transient send failure, heartbeat will retry next tick
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    };

    const connect = () => {
      if (shouldStop) return;

      if (window.location.hostname !== "localhost" && WS_URL.includes("localhost")) {
        console.warn(
          "useTokenMovers: skipping loopback socket connection on a public domain."
        );
        return;
      }

      try {
        ws = new WebSocket(WS_URL);
      } catch (err) {
        reconnectTimer = setTimeout(connect, reconnectBackoff);
        return;
      }

      ws.addEventListener("open", () => {
        reconnectBackoff = 1000;
        startHeartbeat();
      });

      ws.addEventListener("message", (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.type === "pong") {
            lastPong = Date.now();
            return;
          }

          const { type, payload: inner } = payload.type
            ? payload
            : { type: "trade", payload };

          if (type !== "trade" || !inner) return;

          const addr = (inner.token || inner.address || "").toLowerCase();
          if (!addr) return;

          const buffered = buffer.get(addr) || { address: addr };
          const merged = { ...buffered, ...inner };
          if (inner.type === "buy" || inner.isBuy) merged.isBuy = true;

          buffer.set(addr, merged);
          scheduleFlush();
        } catch {
          // ignore malformed frames
        }
      });

      ws.addEventListener("close", () => {
        stopHeartbeat();
        if (!shouldStop) {
          reconnectTimer = setTimeout(connect, reconnectBackoff);
          reconnectBackoff = Math.min(reconnectBackoff * 1.5, MAX_BACKOFF);
        }
      });

      ws.addEventListener("error", () => {
        try {
          ws.close();
        } catch {
          // socket may already be closed
        }
      });
    };

    connect();

    return () => {
      shouldStop = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushTimer) clearTimeout(flushTimer);
      stopHeartbeat();
      buffer.clear();
      try {
        ws && ws.close();
      } catch {
        // socket may already be closed
      }
    };
    // Connects once per mount; live sort/pause state is read via refs so the
    // socket never has to be torn down and rebuilt on every filter change.
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
