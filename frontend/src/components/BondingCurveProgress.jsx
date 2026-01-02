// src/components/BondingCurveProgressSpark.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { computeProgressPercentFixed } from "../utils/progress";

/**
 * BondingCurveProgressSpark
 * - token: token record (same shape as used elsewhere)
 * - height / className: optional styling overrides
 */
export default function BondingCurveProgressSpark({
  token,
  height = 12,
  className = "",
}) {
  const [progress, setProgress] = useState({ graduated: false, percent: 0 });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function load() {
      try {
        if (!token) return;
        const res = await computeProgressPercentFixed(token);
        if (!cancelled && mountedRef.current)
          setProgress(res || { percent: 0 });
      } catch (err) {
        console.error("Error computing progress:", err);
        if (!cancelled && mountedRef.current) setProgress({ percent: 0 });
      }
    }
    load();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [token]);

  const percent = Math.min(Math.max(Number(progress.percent || 0), 0), 100);

  // size helpers
  const h = `${height}px`;
  const sparkSize = Math.max(8, Math.round(height * 0.9));

  return (
    <div className={`relative ${className}`}>
      {progress.graduated ? (
        <div className="px-2 py-1 rounded-md bg-slate-800/50 text-xs text-green-400 font-semibold">
          Listed on Uniswap
        </div>
      ) : (
        <div className="w-full">
          <div
            className="relative w-full rounded-full overflow-hidden ring-1 ring-slate-800/40"
            style={{
              height: h,
              background:
                "linear-gradient(90deg, rgba(15,23,42,0.6), rgba(15,23,42,0.4))",
            }}
          >
            {/* filled portion */}
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${percent}%`,
                // use gradient similar to TokenCard
                background:
                  "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(16,185,129,0.95))",
              }}
            />

            {/* spark / moving glow */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${sparkSize}px`,
                height: `${sparkSize}px`,
                left: `${percent}%`,
                // visually center the spark
                transform: `translate(-50%, -50%)`,
                pointerEvents: "none",
              }}
              animate={{ left: `${percent}%` }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 18,
                mass: 0.6,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.95)",
                  filter: "blur(6px)",
                  boxShadow: "0 6px 18px rgba(16,185,129,0.25)",
                }}
              />
            </motion.div>

            {/* small crisp dot on top of blur for sharper highlight */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${Math.max(4, Math.round(sparkSize * 0.45))}px`,
                height: `${Math.max(4, Math.round(sparkSize * 0.45))}px`,
                left: `${percent}%`,
                transform: `translate(-50%, -50%)`,
                pointerEvents: "none",
              }}
              animate={{ left: `${percent}%` }}
              transition={{
                type: "spring",
                stiffness: 160,
                damping: 22,
                mass: 0.35,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(180deg,#ffffff,#e6fdf6)",
                  boxShadow: "0 4px 10px rgba(56,189,248,0.2)",
                }}
              />
            </motion.div>
          </div>

          {/* percent label under bar */}
          <div className="mt-2 text-xs text-slate-400">
            Progress:
            <span className="font-semibold text-white">
              {Math.round(percent)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
