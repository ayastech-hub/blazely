// src/components/TradeAlertsMarquee.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { buyEmitter } from "../utils/buyEmitter";

/**
 * TradeAlertsMarquee
 *
 * Props:
 *  - wsUrl (string)           : websocket URL to connect to (default: ws://localhost:8080)
 *  - etherscanBase (string)   : base URL for transaction links (default: https://etherscan.io)
 *  - maxAlerts (number)       : number of recent alerts to keep (default: 20)
 *  - initialAlerts (array)    : optional initial alerts to seed the list
 *
 * Expected incoming WS message (same as your server.broadcast):
 *  JSON string: { type: 'buy'|'sell', token: '<0x..>', user: '<0x..>', eth: '<1.234>', tx_hash: '<0x..>' }
 *
 * The component duplicates the alerts list visually to create a seamless marquee loop.
 */

const shortenAddr = (a = "") =>
  typeof a === "string" && a.length > 10
    ? `${a.slice(0, 6)}…${a.slice(-4)}`
    : a;

const TradeAlertsMarquee = ({
  wsUrl = typeof window !== "undefined" &&
  window.location.origin?.startsWith("http")
    ? `ws://${window.location.hostname}:8080`
    : "ws://localhost:8080",
  etherscanBase = "https://etherscan.io",
  maxAlerts = 20,
  initialAlerts = [],
}) => {
  const [alerts, setAlerts] = useState(
    initialAlerts.length
      ? initialAlerts
      : [
          // small fallback seed so UI isn't empty while waiting for real events
        ]
  );
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    function connect() {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.addEventListener("open", () => {
          console.log("TradeAlertsMarquee WS connected to", wsUrl);
        });

        wsRef.current.addEventListener("message", (ev) => {
          try {
            const data = JSON.parse(ev.data);
            const t = (data.type || "").toString().toLowerCase();
            const typeReadable =
              t === "buy" || t === "bought" ? "BOUGHT" : "SOLD";

            const newAlert = {
              type: typeReadable,
              token:
                (data.token && data.token.toString()) ||
                data.token ||
                "UNKNOWN",
              user: data.user || data.buyer || data.seller || "unknown",
              eth: data.eth || data.eth_amount || data.ethAmount || "0",
              tx_hash: data.tx_hash || data.txHash || null,
              ts: Date.now(),
            };

            if (!mounted.current) return;

            setAlerts((prev) => {
              // dedupe by tx_hash when available, otherwise keep previous as-is
              const deduped = newAlert.tx_hash
                ? prev.filter((p) => p.tx_hash !== newAlert.tx_hash)
                : prev;

              const next = [newAlert, ...deduped].slice(0, maxAlerts);

              // Emit buy event for shaking cards (only when we actually add a BOUGHT alert)
              if (newAlert.type === "BOUGHT") {
                buyEmitter.emit("buy", newAlert.token);
              }

              return next;
            });
          } catch (e) {
            console.warn("TradeAlertsMarquee: failed to parse message:", e);
          }
        });

        wsRef.current.addEventListener("close", (ev) => {
          console.warn(
            "TradeAlertsMarquee WS closed, reconnecting...",
            ev?.code
          );
          attemptReconnect();
        });

        wsRef.current.addEventListener("error", (err) => {
          console.error("TradeAlertsMarquee WS error:", err);
          try {
            wsRef.current.close();
          } catch {}
        });
      } catch (err) {
        console.error("TradeAlertsMarquee WS connect error:", err);
        attemptReconnect();
      }
    }

    function attemptReconnect() {
      if (reconnectTimer.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        if (mounted.current) connect();
      }, 2500);
    }

    connect();

    return () => {
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [wsUrl, maxAlerts]);

  const getAlertStyle = (type) =>
    type === "BOUGHT"
      ? "text-green-300 border-green-600/40 bg-green-600/10"
      : "text-red-300 border-red-600/40 bg-red-600/10";

  // Deduplicate alerts and produce the marquee items with a `dup` flag so duplicated halves have unique keys
  const marqueeItems = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];

    // Build deduped list by tx_hash (preferred), fallback to composite key
    const map = new Map();
    alerts.forEach((a, idx) => {
      const stableKey =
        a.tx_hash || `${a.token}-${a.user}-${a.eth}-${a.ts}-${idx}`;
      if (!map.has(stableKey)) {
        map.set(stableKey, { ...a, __stableKey: stableKey });
      }
    });
    const deduped = Array.from(map.values()).slice(0, maxAlerts);

    // produce duplicated array for marquee smoothness; add dup flag and original index
    const items = deduped.flatMap((a, idx) => [
      { ...a, __dup: 0, __origIdx: idx },
      { ...a, __dup: 1, __origIdx: idx },
    ]);
    return items;
  }, [alerts, maxAlerts]);

  const renderList = () => {
    if (!marqueeItems || marqueeItems.length === 0) return null;

    return marqueeItems.map((alert, index) => {
      const base =
        alert.__stableKey ||
        alert.tx_hash ||
        `${alert.token}-${alert.user}-${alert.eth}-${alert.ts}-${alert.__origIdx}`;
      const key = `${base}-${alert.__origIdx}-${alert.__dup}`;

      return (
        <div
          key={key}
          className="card inline-flex items-center gap-2 mx-1 px-3 py-1 rounded-xl border-b border-slate-800/70 shadow-sm min-w-max bg-slate-950/70 backdrop-blur-xl"
        >
          <span
            className="text-purple-300 font-mono text-xs truncate"
            style={{ maxWidth: 64 }}
          >
            {shortenAddr(alert.user)}
          </span>

          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getAlertStyle(
              alert.type
            )}`}
          >
            {alert.type}
          </span>

          <span className="text-white font-semibold text-sm">{alert.eth}</span>
          <span className="text-slate-300 text-xs">of</span>

          <span className="flex items-center gap-1 text-cyan-300 font-bold text-sm">
            <span role="img" aria-label="token-icon">
              {typeof alert.token === "string" &&
              alert.token.toUpperCase().includes("PEPE")
                ? "🐸"
                : "🪙"}
            </span>
            <span className="truncate" style={{ maxWidth: 96 }}>
              {typeof alert.token === "string" && alert.token.startsWith("0x")
                ? shortenAddr(alert.token)
                : alert.token}
            </span>
          </span>

          {alert.tx_hash && (
            <a
              href={`${etherscanBase}/tx/${alert.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-xs text-slate-400 hover:underline"
              title="View transaction"
            >
              Tx
            </a>
          )}
        </div>
      );
    });
  };

  return (
    <div className="marquee overflow-hidden bg-black h-10 flex items-center rounded-md px-2">
      <style jsx="true">{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .marquee-container {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 0.5rem;
          animation: marquee 24s linear infinite;
          will-change: transform;
        }
        .marquee:hover .marquee-container {
          animation-play-state: paused;
        }
        .marquee .card {
          flex: 0 0 auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-container {
            animation: none;
          }
        }
      `}</style>

      <div className="marquee-container whitespace-nowrap py-1">
        {renderList()}
      </div>
    </div>
  );
};

export default TradeAlertsMarquee;
