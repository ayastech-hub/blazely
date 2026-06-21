// src/components/TradeAlertsMarquee.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buyEmitter } from "../utils/buyEmitter";
import { supabase } from "../lib/supabaseClient";

const shortenAddr = (a = "") =>
  typeof a === "string" && a.length > 8
    ? `0x${a.slice(2, 6).toLowerCase()}..${a.slice(-4).toLowerCase()}`
    : a;

export default function TradeAlertsMarquee({
  etherscanBase = "https://basescan.org",
  maxAlerts = 15,
}) {
  const [alerts, setAlerts] = useState([]);
  const [sysStatus, setSysStatus] = useState("SYNCED");

  useEffect(() => {
    let channel;
    
    // Updated cleanly to your precise database table name target
    const TARGET_TABLE = "transactions"; 

    const loadLatestTrades = async () => {
      setSysStatus("FETCHING");
      const { data, error } = await supabase
        .from(TARGET_TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(maxAlerts);

      if (error) {
        console.error("[SYS_ERR]:", error);
        setSysStatus("ERR_DISCONNECT");
        return;
      }

      const formatted = (data || []).map((trade) => ({
        id: trade.id || trade.tx_hash + Math.random(),
        type: trade.type?.toLowerCase() === "buy" ? "BOUGHT" : "SOLD",
        token: trade.token_address,
        user: trade.user_address,
        eth: trade.eth_amount,
        tx_hash: trade.tx_hash,
        ts: new Date(trade.created_at).getTime(),
      }));

      setAlerts(formatted);
      setSysStatus("LIVE_STREAMING");
    };

    const subscribeRealtime = () => {
      channel = supabase
        .channel("trade-alerts-stream")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: TARGET_TABLE, // Realtime pipeline updated here too
          },
          (payload) => {
            const trade = payload.new;
            
            const newAlert = {
              id: trade.id || trade.tx_hash + Date.now(),
              type: trade.type?.toLowerCase() === "buy" ? "BOUGHT" : "SOLD",
              token: trade.token_address,
              user: trade.user_address,
              eth: trade.eth_amount,
              tx_hash: trade.tx_hash,
              ts: Date.now(),
            };

            setAlerts((prev) => {
              // Strict deduplication to keep loop clean
              const filtered = prev.filter((item) => item.tx_hash !== newAlert.tx_hash);
              const next = [newAlert, ...filtered].slice(0, maxAlerts);

              if (newAlert.type === "BOUGHT") {
                buyEmitter.emit("buy", newAlert.token);
              }

              return next;
            });
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setSysStatus("LINK_ONLINE");
        });
    };

    loadLatestTrades();
    subscribeRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [maxAlerts]);

  return (
    <div className="w-full bg-[#030712] border-y border-[#1e293b]/40 h-9 flex items-center font-mono text-[11px] select-none relative overflow-hidden box-border">
      
      {/* Fixed Terminal Status Anchor Tag */}
      <div className="h-full bg-[#070b14] border-r border-[#1e293b]/40 px-3 flex items-center gap-2 text-[#96d6cd] font-bold shrink-0 z-10 shadow-[4px_0_12px_rgba(3,7,18,0.9)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#96d6cd] animate-pulse" />
        <span className="tracking-wider text-[10px] text-slate-400">SYS.TICKER //</span>
        <span className="text-[10px] text-[#96d6cd] opacity-80">{sysStatus}</span>
      </div>

      {/* Infinite Rolling Horizon Container */}
      <div className="flex flex-1 items-center overflow-x-auto no-scrollbar h-full px-4 bg-[#030712]">
        <div className="flex items-center gap-4 whitespace-nowrap">
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const isBuy = alert.type === "BOUGHT";
              return (
                <motion.div
                  key={alert.id}
                  layout="position"
                  initial={{ opacity: 0, x: -50, scale: 0.92, filter: "brightness(2)" }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: "brightness(1)" }}
                  exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 24,
                    mass: 0.8
                  }}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d121f]/30 border border-slate-900/60 font-mono tracking-tight`}
                >
                  {/* Trader Address Identity */}
                  <span className="text-slate-500 font-medium">{shortenAddr(alert.user)}</span>

                  {/* Operational Event Signal */}
                  <span
                    className={`font-black text-[10px] px-1 py-0.2 rounded ${
                      isBuy 
                        ? "text-[#96d6cd] bg-[#96d6cd]/10" 
                        : "text-rose-500 bg-rose-500/10"
                    }`}
                  >
                    {isBuy ? "★ BUY" : "✖ SELL"}
                  </span>

                  {/* Delta Vol Metric */}
                  <span className="text-slate-100 font-bold">{Number(alert.eth || 0).toFixed(4)} ETH</span>

                  <span className="text-slate-700">➔</span>

                  {/* Target Asset Allocation Registry */}
                  <span className="text-slate-400 hover:text-[#96d6cd] transition-colors cursor-pointer">
                    {shortenAddr(alert.token)}
                  </span>

                  {/* Hex Encrypted Transaction Hyperlink */}
                  <a
                    href={`${etherscanBase}/tx/${alert.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-600 hover:text-slate-300 font-bold transition-colors border-l border-slate-800 pl-1.5 ml-0.5 text-[10px]"
                  >
                    [HEX]
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {alerts.length === 0 && (
            <div className="text-slate-600 tracking-widest text-[10px] animate-pulse">
              [CRITICAL] RUNNING ENGINE... PIPELINE_VACANT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
