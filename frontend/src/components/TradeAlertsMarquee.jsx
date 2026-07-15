import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { buyEmitter } from "../utils/buyEmitter";
import { supabase } from "../lib/supabaseClient";

/* Shared with Navbar.jsx / TokenCard.jsx — keep in sync */
const ACCENT = "#96d6cd";
const NESTED_FILL = "bg-black/25 border border-white/[0.08]";

const shortenAddr = (a = "") =>
  typeof a === "string" && a.length > 8
    ? `0x${a.slice(2, 6).toLowerCase()}..${a.slice(-4).toLowerCase()}`
    : a;

export default function TradeAlertsMarquee({
  etherscanBase = "https://basescan.org",
  maxAlerts = 15,
}) {
  const [alerts, setAlerts] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let channel;

    const TARGET_TABLE = "transactions";

    const loadLatestTrades = async () => {
      const { data, error } = await supabase
        .from(TARGET_TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(maxAlerts);

      if (error) {
        console.error("Failed to load recent trades:", error);
        setIsLive(false);
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
    };

    const subscribeRealtime = () => {
      channel = supabase
        .channel("trade-alerts-stream")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: TARGET_TABLE },
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
          setIsLive(status === "SUBSCRIBED");
        });
    };

    loadLatestTrades();
    subscribeRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [maxAlerts]);

  return (
    <div className="w-full h-10 flex items-center text-[11px] select-none relative overflow-hidden box-border border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
      {/* Live indicator — just the dot, no status label */}
      <div className="h-full flex items-center px-3.5 shrink-0 z-10 border-r border-white/[0.08] bg-black/20">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isLive ? "animate-pulse" : ""}`}
          style={{
            backgroundColor: isLive ? ACCENT : "#475569",
            boxShadow: isLive ? `0 0 6px ${ACCENT}99` : "none",
          }}
        />
      </div>

      {/* Rolling ticker */}
      <div className="flex flex-1 items-center overflow-x-auto no-scrollbar h-full px-4">
        <div className="flex items-center gap-2 whitespace-nowrap">
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
                  transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.8 }}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg font-mono ${NESTED_FILL}`}
                >
                  <span className="text-slate-500 font-medium">{shortenAddr(alert.user)}</span>

                  <span
                    className={`font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                      isBuy ? "bg-[#96d6cd]/10" : "bg-rose-500/10 text-rose-400"
                    }`}
                    style={isBuy ? { color: ACCENT } : undefined}
                  >
                    {isBuy ? "Buy" : "Sell"}
                  </span>

                  <span className="text-slate-100 font-semibold">{Number(alert.eth || 0).toFixed(4)} ETH</span>

                  <ArrowRight size={11} className="text-slate-600" />

                  <span className="text-slate-400 hover:text-[#96d6cd] transition-colors cursor-pointer">
                    {shortenAddr(alert.token)}
                  </span>

                  <a
                    href={`${etherscanBase}/tx/${alert.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="View transaction"
                    className="text-slate-600 hover:text-slate-300 transition-colors border-l border-white/[0.08] pl-1.5 ml-0.5"
                  >
                    <ExternalLink size={11} />
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {alerts.length === 0 && (
            <div className="text-slate-600 text-[11px]">Waiting for trades…</div>
          )}
        </div>
      </div>
    </div>
  );
}
