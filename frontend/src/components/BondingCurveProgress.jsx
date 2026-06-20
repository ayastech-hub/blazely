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
  height = 4,
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
  const trackHeight = `${height}px`;

  return (
    <div className={`w-full ${className}`}>
      {progress.graduated ? (
        <div className="inline-flex items-center px-2 py-0.5 border border-slate-900 bg-[#0b0f19]/60 text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold rounded-sm">
          [ STATUS: GRADUATED / UNISWAP POOL ACTIVE ]
        </div>
      ) : (
        <div className="w-full flex flex-col gap-1.5">
          
          {/* Quantitative Gauge Core Track */}
          <div
            className="relative w-full bg-[#030712] border border-slate-900/60 overflow-hidden rounded-sm"
            style={{ height: trackHeight }}
          >
            {/* Filled Core Segment */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ backgroundColor: '#96d6cd' }}
              className="h-full opacity-90"
            />

            {/* Micro Precision Target Cursor Line */}
            <motion.div
              className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
              style={{ 
                left: `${percent}%`, 
                transform: "translateX(-50%)",
                backgroundColor: '#96d6cd'
              }}
              animate={{ left: `${percent}%` }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 20,
                mass: 0.4,
              }}
            >
              {/* Micro reflection header element */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-white opacity-80" />
            </motion.div>
          </div>

          {/* Telemetry Metric Description Labels */}
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500">
            <span>CURVE FILL INDEX</span>
            <span className="font-bold text-slate-200">
              {percent.toFixed(2)}%
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
