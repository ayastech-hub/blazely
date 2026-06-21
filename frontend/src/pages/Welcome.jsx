// src/pages/Welcome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, EyeOff, AlertTriangle, Terminal } from "lucide-react";

export default function Welcome({ onDismiss }) {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check on component load if the user already opted out in a past session
  useEffect(() => {
    const hasOptedOut = localStorage.getItem("hideWelcomeScreen");
    if (hasOptedOut === "true") {
      if (onDismiss) {
        onDismiss();
      } else {
        navigate("/", { replace: true });
      }
    }
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
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-mono p-4 relative selection:bg-[#96d6cd]/20">
      
      {/* Blinking Cursor Terminal Styling Injected Globally */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-cursor::after {
          content: '_';
          animation: blink 1s step-end infinite;
          color: #96d6cd;
        }
      `}} />

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-[500px] w-full bg-black border border-slate-900 rounded p-6 relative"
      >
        {/* Terminal Header Info Panel */}
        <div className="bg-[#0b0f19]/40 border border-slate-900/60 rounded p-3 mb-5 flex items-center justify-between text-xs">
          <div className="text-[#96d6cd] font-bold flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            INITIALIZING_INDEXER_
          </div>
          <div className="text-slate-600 text-[10px]">SYS_REV: v1.0.0</div>
        </div>

        <h1 className="text-base font-bold tracking-wider text-slate-200 uppercase mb-5 terminal-cursor">
          SYSTEM METRIC INDEXER
        </h1>

        {/* --- INDEXER CONFIGURATION HOW IT WORKS --- */}
        <div className="mb-5 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1.5 border-b border-slate-900">
            <span>INDEXER PROFILE</span>
          </div>
          
          <div className="space-y-3 text-[11px]">
            <div className="flex items-start gap-2.5">
              <span className="text-[#96d6cd] font-bold">[01]</span>
              <p className="text-slate-400 leading-normal">
                <strong className="text-slate-200 uppercase font-sans tracking-wide">On-Chain Monitoring:</strong> Tracks newly deployed token contracts, recording historical metadata parameters against real-time block activity.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[#96d6cd] font-bold">[02]</span>
              <p className="text-slate-400 leading-normal">
                <strong className="text-slate-200 uppercase font-sans tracking-wide">Performance Metrics:</strong> Aggregates live volume, market capitalization, and pool metrics directly from database views.
              </p>
            </div>
          </div>
        </div>

        {/* --- SYSTEM RISK REGISTRY --- */}
        <div className="mb-6 p-3.5 bg-amber-500/5 border border-amber-500/10 rounded">
          <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>RISK WARNING</span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase leading-relaxed">
            All database indexes, logs, and aggregated rows are provided for technical transparency purposes only. This system does not deliver financial auditing, token endorsements, or execution parameters. Digital assets involve extreme risk vectors. Maintain operational autonomy.
          </p>
        </div>

        {/* Action Layer Controls */}
        <div className="space-y-4">
          <button
            onClick={handleEnterApp}
            className="w-full flex items-center justify-center gap-2 bg-[#96d6cd] hover:bg-[#85c2b9] text-[#030712] font-bold text-xs uppercase tracking-widest py-3 px-4 rounded transition-colors"
          >
            ACKNOWLEDGE & LAUNCH TERMINAL <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Persistent Visibility Input Toggle Switch */}
          <div 
            onClick={() => setDontShowAgain(!dontShowAgain)}
            className="flex items-center justify-center gap-2 py-1 group cursor-pointer select-none"
          >
            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${
              dontShowAgain 
                ? "bg-[#96d6cd]/20 border-[#96d6cd]" 
                : "border-slate-800 bg-[#030712] group-hover:border-slate-700"
            }`}>
              {dontShowAgain && <div className="w-1.5 h-1.5 bg-[#96d6cd] rounded-sm" />}
            </div>
            
            <span className="text-[10px] text-slate-500 group-hover:text-slate-400 uppercase tracking-wider transition-colors flex items-center gap-1.5">
              <EyeOff className="w-3 h-3" /> Hide terminal banner on next session
            </span>
          </div>
        </div>

        {/* Footnote Core Execution Validation */}
        <div className="mt-5 pt-3 border-t border-slate-900/60 text-center text-[9px] text-slate-700 tracking-widest uppercase">
          SECURE CONNECTION VERIFIED // 2026_BUILD
        </div>

      </motion.div>
    </div>
  );
}
