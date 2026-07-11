/**
 * =================================================================================
 * components/BondingCurveProgress.jsx
 * =================================================================================
 * The old version fetched its own data via `computeProgressPercentFixed(token)` from a
 * `utils/progress` module that (a) wasn't provided, so its correctness/cost couldn't be
 * reviewed, and (b) duplicated data your indexer already computes and stores directly on
 * `token_metrics_latest.pool_progress` — no separate on-chain read is needed at all.
 *
 * Also: this component was IMPORTED in the old TokenInfoPage.jsx but never actually
 * rendered anywhere in the JSX — dead import, the progress bar never appeared on the page.
 * Fixed by making this purely presentational (driven by the same central `metrics` object
 * everything else on the page already uses) and wiring it into the page for real.
 * =================================================================================
 */

import React from "react";
import { motion } from "framer-motion";

export default function BondingCurveProgress({ percent = 0, graduated = false, height = 6, className = "" }) {
  const clamped = Math.min(Math.max(Number(percent) || 0, 0), 100);
  const trackHeight = `${height}px`;

  if (graduated) {
    return (
      <div
        className={`inline-flex items-center px-2 py-0.5 border border-slate-900 bg-[#0b0f19]/60 text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold rounded-sm ${className}`}
      >
        [ STATUS: GRADUATED / UNISWAP POOL ACTIVE ]
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <div
        className="relative w-full bg-[#030712] border border-slate-900/60 overflow-hidden rounded-sm"
        style={{ height: trackHeight }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ backgroundColor: "#96d6cd" }}
          className="h-full opacity-90"
        />
        <motion.div
          className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
          style={{ backgroundColor: "#96d6cd" }}
          animate={{ left: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.4 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white opacity-80" />
        </motion.div>
      </div>

      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500">
        <span>Curve Fill</span>
        <span className="font-bold text-slate-200">{clamped.toFixed(2)}%</span>
      </div>
    </div>
  );
}
