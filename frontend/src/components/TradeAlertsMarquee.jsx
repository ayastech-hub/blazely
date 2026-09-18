import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buyEmitter } from "../utils/buyEmitter";
import { supabase } from "../lib/supabaseClient";

const short = (a = "", n = 3) =>
  typeof a === "string" && a.length > 8
    ? `${a.slice(0, 2 + n)}…${a.slice(-n)}`
    : a || "—";

function fmtEth(raw) {
  if (raw == null || raw === "") return "0";
  let n = Number(raw);
  if (!Number.isFinite(n)) return "0";
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
  maxAlerts = 24,
}) {
  const [alerts, setAlerts] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let channel;
    const mapTrade = (trade) => ({
      id: trade.id || `${trade.tx_hash}-${trade.created_at}`,
      type: trade.type?.toLowerCase() === "buy" ? "buy" : "sell",
      token: trade.token_address,
      symbol: trade.token_symbol || null,
      user: trade.user_address,
      eth: trade.eth_amount,
      tx_hash: trade.tx_hash,
    });

    const load = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(maxAlerts);
      if (error) {
        setIsLive(false);
        return;
      }
      setAlerts((data || []).map(mapTrade));
    };

    channel = supabase
      .channel("trade-alerts-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const newAlert = mapTrade(payload.new);
          setAlerts((prev) => {
            const next = [newAlert, ...prev.filter((i) => i.tx_hash !== newAlert.tx_hash)].slice(0, maxAlerts);
            if (newAlert.type === "buy") {
              try {
                buyEmitter.emit?.(newAlert);
              } catch (_) {}
            }
            return next;
          });
        }
      )
      .subscribe((s) => setIsLive(s === "SUBSCRIBED"));

    load();
    return () => channel && supabase.removeChannel(channel);
  }, [maxAlerts]);

  return (
    <div
      className="w-full h-8 flex items-center select-none overflow-hidden"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--panel)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      {/* Status */}
      <div
        className="h-full flex items-center gap-1.5 px-2.5 shrink-0"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isLive ? "animate-pulse" : ""}`}
          style={{
            background: isLive ? "var(--teal)" : "var(--text-faint-2)",
            boxShadow: isLive ? "0 0 6px var(--teal)" : "none",
          }}
        />
        <span
          className="text-[9px] font-semibold tracking-[0.12em] uppercase"
          style={{ color: isLive ? "var(--teal)" : "var(--text-faint-2)" }}
        >
          Tape
        </span>
      </div>

      <div className="flex flex-1 items-center overflow-x-auto no-scrollbar h-full">
        <AnimatePresence initial={false}>
          {alerts.map((a, i) => {
            const isBuy = a.type === "buy";
            const name = a.symbol ? a.symbol.toUpperCase() : short(a.token, 2);
            return (
              <React.Fragment key={a.id}>
                {i > 0 && (
                  <span
                    className="shrink-0 w-px h-3 mx-1"
                    style={{ background: "var(--border)" }}
                  />
                )}
                <motion.a
                  href={a.tx_hash ? `${etherscanBase}/tx/${a.tx_hash}` : undefined}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2 h-full px-2.5 shrink-0 no-underline hover:bg-white/[0.03] transition-colors"
                >
                  {/* Token name */}
                  <span
                    className="text-[11px] font-semibold tracking-tight"
                    style={{ color: "var(--text-bright)" }}
                  >
                    {name}
                  </span>
                  {/* Side */}
                  <span
                    className="text-[9px] font-bold tracking-wide"
                    style={{ color: isBuy ? "var(--teal)" : "var(--rose)" }}
                  >
                    {isBuy ? "BUY" : "SELL"}
                  </span>
                  {/* Amount */}
                  <span
                    className="text-[11px] font-medium tabular-nums"
                    style={{ color: "var(--text-mid)" }}
                  >
                    {fmtEth(a.eth)}
                    <span style={{ color: "var(--text-faint-2)", marginLeft: 2 }}>ETH</span>
                  </span>
                  {/* Trader */}
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--text-faint-2)" }}
                  >
                    {short(a.user, 2)}
                  </span>
                </motion.a>
              </React.Fragment>
            );
          })}
        </AnimatePresence>

        {alerts.length === 0 && (
          <span className="px-3 text-[10px]" style={{ color: "var(--text-faint-2)" }}>
            Waiting for flow…
          </span>
        )}
      </div>
    </div>
  );
}
