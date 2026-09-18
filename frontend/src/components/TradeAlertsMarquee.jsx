import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buyEmitter } from "../utils/buyEmitter";
import { supabase } from "../lib/supabaseClient";

const ACCENT = "var(--teal)";

const short = (a = "", n = 3) =>
  typeof a === "string" && a.length > 8
    ? `${a.slice(0, 2 + n)}…${a.slice(-n)}`
    : a || "—";

/** Compact ETH from wei or already-decimal string */
function fmtEth(raw) {
  if (raw == null || raw === "") return "0";
  let n = Number(raw);
  if (!Number.isFinite(n)) return "0";
  // Heuristic: values >> 1e9 are wei
  if (Math.abs(n) >= 1e9) n = n / 1e18;
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(1);
  if (n < 1) return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  if (n < 100) return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (n < 1000) return n.toFixed(2);
  return `${(n / 1000).toFixed(1)}k`;
}

export default function TradeAlertsMarquee({
  etherscanBase = "https://basescan.org",
  maxAlerts = 20,
}) {
  const [alerts, setAlerts] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let channel;
    const TARGET_TABLE = "transactions";

    const mapTrade = (trade) => ({
      id: trade.id || `${trade.tx_hash}-${trade.created_at}`,
      type: trade.type?.toLowerCase() === "buy" ? "buy" : "sell",
      token: trade.token_address,
      symbol: trade.token_symbol || null,
      user: trade.user_address,
      eth: trade.eth_amount,
      tx_hash: trade.tx_hash,
    });

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
      setAlerts((data || []).map(mapTrade));
    };

    channel = supabase
      .channel("trade-alerts-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TARGET_TABLE },
        (payload) => {
          const newAlert = mapTrade(payload.new);
          setAlerts((prev) => {
            const filtered = prev.filter((item) => item.tx_hash !== newAlert.tx_hash);
            const next = [newAlert, ...filtered].slice(0, maxAlerts);
            if (newAlert.type === "buy") {
              try {
                buyEmitter.emit?.(newAlert);
              } catch (_) {}
            }
            return next;
          });
        }
      )
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    loadLatestTrades();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [maxAlerts]);

  return (
    <div
      className="w-full h-9 flex items-center select-none relative overflow-hidden"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--panel)",
      }}
    >
      {/* Live pill */}
      <div
        className="h-full flex items-center gap-1.5 px-3 shrink-0 z-10"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isLive ? "animate-pulse" : ""}`}
          style={{
            backgroundColor: isLive ? ACCENT : "var(--text-faint-2)",
            boxShadow: isLive ? `0 0 8px ${ACCENT}` : "none",
          }}
        />
        <span
          className="text-[9px] font-bold tracking-wider uppercase hidden sm:inline"
          style={{ color: isLive ? ACCENT : "var(--text-faint-2)", fontFamily: "var(--font-mono, monospace)" }}
        >
          Live
        </span>
      </div>

      <div className="flex flex-1 items-center overflow-x-auto no-scrollbar h-full px-2 gap-1.5">
        <AnimatePresence initial={false}>
          {alerts.map((alert) => {
            const isBuy = alert.type === "buy";
            return (
              <motion.a
                key={alert.id}
                href={alert.tx_hash ? `${etherscanBase}/tx/${alert.tx_hash}` : undefined}
                target="_blank"
                rel="noreferrer"
                layout="position"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md shrink-0 no-underline"
                style={{
                  background: isBuy ? "rgba(150,214,205,0.08)" : "rgba(244,63,94,0.08)",
                  border: `1px solid ${isBuy ? "rgba(150,214,205,0.18)" : "rgba(244,63,94,0.18)"}`,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                <span
                  className="text-[9px] font-bold uppercase"
                  style={{ color: isBuy ? ACCENT : "var(--rose)" }}
                >
                  {isBuy ? "B" : "S"}
                </span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--text-bright)" }}>
                  {fmtEth(alert.eth)}
                  <span style={{ color: "var(--text-faint-2)", fontWeight: 500 }}> Ξ</span>
                </span>
                <span className="text-[9px]" style={{ color: "var(--text-faint-2)" }}>
                  {short(alert.user, 2)}
                </span>
                <span className="text-[9px] font-medium" style={{ color: "var(--text-mid)" }}>
                  {alert.symbol ? `$${alert.symbol}` : short(alert.token, 2)}
                </span>
              </motion.a>
            );
          })}
        </AnimatePresence>

        {alerts.length === 0 && (
          <span className="text-[10px]" style={{ color: "var(--text-faint-2)", fontFamily: "monospace" }}>
            Waiting for trades…
          </span>
        )}
      </div>
    </div>
  );
}
