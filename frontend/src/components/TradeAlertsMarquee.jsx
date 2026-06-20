// src/components/TradeAlertsMarquee.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { buyEmitter } from "../utils/buyEmitter";

const shortenAddr = (a = "") =>
  typeof a === "string" && a.length > 10
    ? `${a.slice(0, 5)}..${a.slice(-4)}`
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
  const [alerts, setAlerts] = useState(initialAlerts);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    function connect() {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.addEventListener("message", (ev) => {
          try {
            const data = JSON.parse(ev.data);
            const t = (data.type || "").toString().toLowerCase();
            const typeReadable =
              t === "buy" || t === "bought" ? "BOUGHT" : "SOLD";

            const newAlert = {
              type: typeReadable,
              token: (data.token && data.token.toString()) || data.token || "UNKNOWN",
              user: data.user || data.buyer || data.seller || "UNKNOWN",
              eth: data.eth || data.eth_amount || data.ethAmount || "0",
              tx_hash: data.tx_hash || data.txHash || null,
              ts: Date.now(),
            };

            if (!mounted.current) return;

            setAlerts((prev) => {
              const deduped = newAlert.tx_hash
                ? prev.filter((p) => p.tx_hash !== newAlert.tx_hash)
                : prev;

              const next = [newAlert, ...deduped].slice(0, maxAlerts);

              if (newAlert.type === "BOUGHT") {
                buyEmitter.emit("buy", newAlert.token);
              }

              return next;
            });
          } catch (e) {
            console.warn("WS parsing error", e);
          }
        });

        wsRef.current.addEventListener("close", () => {
          attemptReconnect();
        });

        wsRef.current.addEventListener("error", () => {
          try {
            wsRef.current.close();
          } catch {}
        });
      } catch (err) {
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

  const marqueeItems = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];

    const map = new Map();
    alerts.forEach((a, idx) => {
      const stableKey =
        a.tx_hash || `${a.token}-${a.user}-${a.eth}-${a.ts}-${idx}`;
      if (!map.has(stableKey)) {
        map.set(stableKey, { ...a, __stableKey: stableKey });
      }
    });
    const deduped = Array.from(map.values()).slice(0, maxAlerts);

    return deduped.flatMap((a, idx) => [
      { ...a, __dup: 0, __origIdx: idx },
      { ...a, __dup: 1, __origIdx: idx },
    ]);
  }, [alerts, maxAlerts]);

  if (!marqueeItems || marqueeItems.length === 0) {
    return (
      <div className="w-full bg-[#030712] border-y border-slate-950 h-8 flex items-center px-3 font-mono text-[9px] text-slate-600 font-bold tracking-widest uppercase">
        AWAITING_TELEMETRY_STREAM...
      </div>
    );
  }

  return (
    <div className="w-full bg-[#030712] border-y border-slate-950 h-8 flex items-center overflow-hidden font-mono text-[10px] select-none group">
      <div className="flex whitespace-nowrap items-center animate-[marquee_30s_linear_infinite] motion-reduce:animate-none group-hover:[animation-play-state:paused] will-change-transform">
        {marqueeItems.map((alert, index) => {
          const base =
            alert.__stableKey ||
            alert.tx_hash ||
            `${alert.token}-${alert.user}-${alert.eth}-${alert.ts}-${alert.__origIdx}`;
          const key = `${base}-${alert.__origIdx}-${alert.__dup}`;
          const isBuy = alert.type === "BOUGHT";

          return (
            <div
              key={key}
              className="inline-flex items-center gap-1.5 mx-3 text-slate-400 shrink-0"
            >
              <span className="text-slate-500 uppercase tracking-wide">
                {shortenAddr(alert.user).toUpperCase()}
              </span>

              <span 
                style={{ color: isBuy ? '#96d6cd' : '#f43f5e' }}
                className="font-black tracking-wider"
              >
                {isBuy ? "[BUY]" : "[SELL]"}
              </span>

              <span className="text-slate-200 font-bold font-mono">{alert.eth} ETH</span>
              
              <span className="text-slate-600">➔</span>

              <span className="text-slate-300 font-bold tracking-wide">
                {typeof alert.token === "string" && alert.token.startsWith("0x")
                  ? shortenAddr(alert.token).toUpperCase()
                  : String(alert.token).toUpperCase()}
              </span>

              {alert.tx_hash && (
                <a
                  href={`${etherscanBase}/tx/${alert.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-600 hover:text-slate-400 text-[9px] font-black tracking-widest ml-1 border border-slate-900 px-1 bg-[#0b0f19]/30"
                  title="View cryptographic verification"
                >
                  [TX]
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradeAlertsMarquee;
