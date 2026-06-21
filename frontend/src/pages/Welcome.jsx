import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ShieldAlert, ArrowRight, EyeOff, ShieldCheck } from "lucide-react";

export default function Welcome({ onDismiss }) {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  // Fast progressive rendering states for terminal vibe
  const [visibleLines, setVisibleLines] = useState(0);
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    const hasOptedOut = localStorage.getItem("hideWelcomeScreen");
    if (hasOptedOut === "true") {
      if (onDismiss) {
        onDismiss();
      } else {
        navigate("/", { replace: true });
      }
      return;
    }

    // High-speed sequence simulating system logs initialization
    const linesToTrigger = [1, 2, 3, 4, 5];
    const timers = [];

    linesToTrigger.forEach((line, index) => {
      const delay = (index + 1) * 220; // Fast pacing (~200ms chunks)
      timers.push(
        setTimeout(() => {
          setVisibleLines(line);
          if (line === 5) setBootComplete(true);
        }, delay)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [navigate, onDismiss]);

  const handleEnterApp = () => {
    if (dontShowAgain) {
      localStorage.setItem("hideWelcomeScreen", "true");
    }
    
    if (onDismiss) {
      onDismiss();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-emerald-400 flex items-center justify-center font-mono p-4 relative overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Subtle CRT Scanner overlay & background glow */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-950/10 blur-[160px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="max-w-[640px] w-full bg-[#090d16] border border-emerald-900/40 rounded-lg shadow-2xl shadow-black/80 overflow-hidden relative"
      >
        {/* Terminal Header / Titlebar */}
        <div className="bg-[#0d1321] border-b border-emerald-900/30 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-600">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
            </div>
            <span className="ml-2 text-[11px] text-emerald-500/60 tracking-tight flex items-center gap-1.5">
              <Terminal size={12} /> guest@emi-node-01:~
            </span>
          </div>
          <span className="text-[10px] text-emerald-700/80 uppercase tracking-widest">SYS_AUTH_REQ</span>
        </div>

        {/* Terminal Body */}
        <div className="p-5 md:p-6 space-y-6 text-xs leading-relaxed text-emerald-300/90">
          
          {/* Line 1: Header Initialization */}
          {visibleLines >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
              <span className="text-emerald-600 shrink-0">$&gt;</span>
              <div>
                <p className="text-emerald-400 font-bold tracking-wide">INITIALIZING ECOSYSTEM METRIC INDEXER...</p>
                <p className="text-emerald-600/80 text-[11px]">Establishing handshake with database view architectures [OK]</p>
              </div>
            </motion.div>
          )}

          {/* Line 2: Platform Blueprint Feature 1 */}
          {visibleLines >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold text-[11px] uppercase tracking-wider">
                <span>[01 / TELEMETRY] ON-CHAIN MONITORING</span>
              </div>
              <p className="text-emerald-500/70 pl-4">
                Maps raw coin deployments programmatically. Syncs historical token profiles directly with real-time liquidity pools and block-by-block tracking metrics.
              </p>
            </motion.div>
          )}

          {/* Line 3: Platform Blueprint Feature 2 */}
          {visibleLines >= 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold text-[11px] uppercase tracking-wider">
                <span>[02 / ARCHITECTURE] PERFORMANCE RANKINGS</span>
              </div>
              <p className="text-emerald-500/70 pl-4">
                Computes high-frequency data structures, sorting live assets dynamically using indexed 24H volume metrics and rolling market capitalization updates.
              </p>
            </motion.div>
          )}

          {/* Line 4: System Risk Notice */}
          {visibleLines >= 4 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="p-4 bg-amber-500/[0.02] border border-amber-500/20 rounded text-amber-400/90 space-y-1"
            >
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                <ShieldAlert size={13} />
                <span>CRITICAL_WARNING_SYSTEM_EXPOSURE</span>
              </div>
              <p className="text-[11px] text-amber-500/70 leading-relaxed">
                All telemetry matrix structures are purely algorithmic logs generated for experimental transparency. This interface contains no commercial recommendations, endorsements, or financial guidance. Asset tracking yields substantial threat of severe capital depreciation. Proceed with isolated accountability.
              </p>
            </motion.div>
          )}

          {/* Line 5: Interactive Terminal Prompt */}
          {visibleLines >= 5 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 border-t border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="animate-pulse font-bold">●</span>
                <span>Awaiting user confirmation node...</span>
              </div>
              
              {/* Actions Section */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Opt-Out Checkbox */}
                <div 
                  onClick={() => setDontShowAgain(!dontShowAgain)}
                  className="flex items-center gap-2 cursor-pointer select-none py-1 group"
                >
                  <div className={`w-3.5 h-3.5 border transition-colors flex items-center justify-center ${
                    dontShowAgain 
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-400" 
                      : "border-emerald-800 bg-black group-hover:border-emerald-600"
                  }`}>
                    {dontShowAgain && <span className="text-[9px] font-bold">X</span>}
                  </div>
                  <span className="text-[10px] text-emerald-600 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <EyeOff size={11} /> bypass_next_boot
                  </span>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleEnterApp}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#02040a] font-bold text-xs py-2 px-4 rounded transition-all active:translate-y-[1px]"
                >
                  EXECUTE_LAUNCH <ArrowRight size={13} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Active Terminal Cursor Marker */}
          {!bootComplete && (
            <div className="inline-block w-2 h-4 bg-emerald-400 animate-[ping_0.8s_infinite] ml-1" />
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-[#040711] px-4 py-2 border-t border-emerald-900/20 flex justify-between text-[9px] text-emerald-700 font-mono tracking-wider">
          <span>SECURE_BUILD_V1.0.0 // RELAY_ACTIVE</span>
          <span>SYS_STATUS: READY</span>
        </div>
      </motion.div>
    </div>
  );
}
