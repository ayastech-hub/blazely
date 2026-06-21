
// src/components/TradeAlertsMarquee.jsx

import React, { useEffect, useState, useMemo } from "react";
import { buyEmitter } from "../utils/buyEmitter";
import { supabase } from "../lib/supabase";

const shortenAddr = (a = "") =>
  typeof a === "string" && a.length > 10
    ? `${a.slice(0, 5)}..${a.slice(-4)}`
    : a;

const TradeAlertsMarquee = ({
  etherscanBase = "https://basescan.org",
  maxAlerts = 10,
}) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let channel;

    const loadLatestTrades = async () => {
      const { data, error } = await supabase
        .from("transactions") // <-- replace with your table name
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error(error);
        return;
      }

      const formatted = data.map((trade) => ({
        type: trade.type === "buy" ? "BOUGHT" : "SOLD",
        token: trade.token_address,
        user: trade.user_address,
        eth: trade.eth_amount,
        tx_hash: trade.tx_hash,
        ts: new Date(trade.created_at).getTime(),
      }));

      setAlerts(formatted);
    };

    const subscribeRealtime = () => {
      channel = supabase
        .channel("trade-alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "trade_history", // <-- replace with your table
          },
          (payload) => {
            const trade = payload.new;

            const newAlert = {
              type: trade.type === "buy" ? "BOUGHT" : "SOLD",
              token: trade.token_address,
              user: trade.user_address,
              eth: trade.eth_amount,
              tx_hash: trade.tx_hash,
              ts: Date.now(),
            };

            setAlerts((prev) => {
              const deduped = prev.filter(
                (item) => item.tx_hash !== newAlert.tx_hash
              );

              const next = [newAlert, ...deduped].slice(0, maxAlerts);

              if (newAlert.type === "BOUGHT") {
                buyEmitter.emit("buy", newAlert.token);
              }

              return next;
            });
          }
        )
        .subscribe();
    };

    loadLatestTrades();
    subscribeRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [maxAlerts]);

  const marqueeItems = useMemo(() => {
    if (!alerts.length) return [];

    return alerts.flatMap((a, idx) => [
      { ...a, __dup: 0, __origIdx: idx },
      { ...a, __dup: 1, __origIdx: idx },
    ]);
  }, [alerts]);

  if (!marqueeItems.length) {
    return (
      <div className="w-full bg-[#030712] border-y border-slate-950 h-8 flex items-center px-3 font-mono text-[9px] text-slate-600">
        AWAITING_TRADES...
      </div>
    );
  }

  return (
    <div className="w-full bg-[#030712] border-y border-slate-950 h-8 flex items-center overflow-hidden font-mono text-[10px]">
      <div className="flex whitespace-nowrap items-center animate-[marquee_30s_linear_infinite]">
        {marqueeItems.map((alert, index) => {
          const key = `${alert.tx_hash}-${index}`;

          return (
            <div
              key={key}
              className="inline-flex items-center gap-1.5 mx-3 text-slate-400 shrink-0"
            >
              <span className="text-slate-500">
                {shortenAddr(alert.user)}
              </span>

              <span
                style={{
                  color:
                    alert.type === "BOUGHT"
                      ? "#96d6cd"
                      : "#f43f5e",
                }}
                className="font-black"
              >
                {alert.type === "BOUGHT"
                  ? "[BUY]"
                  : "[SELL]"}
              </span>

              <span className="text-slate-200 font-bold">
                {alert.eth} ETH
              </span>

              <span className="text-slate-600">➔</span>

              <span className="text-slate-300 font-bold">
                {shortenAddr(alert.token)}
              </span>

              <a
                href={`${etherscanBase}/tx/${alert.tx_hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 hover:text-slate-400"
              >
                [TX]
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradeAlertsMarquee;