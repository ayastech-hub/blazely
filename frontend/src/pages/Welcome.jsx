// src/pages/Welcome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, EyeOff, AlertTriangle, HelpCircle } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check on component load if the user already opted out in a past session
  useEffect(() => {
    const hasOptedOut = localStorage.getItem("hideWelcomeScreen");
    if (hasOptedOut === "true") {
      navigate("/leaderboard", { replace: true });
    }
  }, [navigate]);

  const handleEnterApp = () => {
    if (dontShowAgain) {
      localStorage.setItem("hideWelcomeScreen", "true");
    }
    navigate("/leaderboard");
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-sans p-4 relative overflow-hidden selection:bg-[#96d6cd]/20">
      
      {/* Ambient Lighting Backdrops */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#96d6cd]/5 blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-[480px] w-full bg-[#0d121f]/40 border border-slate-900/90 rounded-2xl p-6 md:p-8 backdrop-blur-md relative"
      >
        {/* Brand Icon Accent */}
        <div className="mx-auto w-12 h-12 rounded-full bg-[#96d6cd]/10 border border-[#96d6cd]/20 flex items-center justify-center text-[#96d6cd] mb-4">
          <ShieldCheck size={22} strokeWidth={1.5} />
        </div>

        <h1 className="text-lg font-bold tracking-tight text-center text-slate-100 mb-6">
          Ecosystem Metric Indexer
        </h1>

        {/* --- HOW IT WORKS SECTION --- */}
        <div className="mb-6 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-900">
            <HelpCircle size={13} className="text-[#96d6cd]" />
            <span>Platform Blueprint</span>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="font-mono text-[#96d6cd] bg-[#96d6cd]/10 px-1.5 py-0.5 rounded text-[10px] font-bold">01</span>
              <p className="text-slate-300 leading-normal">
                <strong className="text-slate-200 font-medium">On-Chain Monitoring:</strong> Automatically maps raw coin deployments, matching historical token profiles with live tracking metrics.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-mono text-[#96d6cd] bg-[#96d6cd]/10 px-1.5 py-0.5 rounded text-[10px] font-bold">02</span>
              <p className="text-slate-300 leading-normal">
                <strong className="text-slate-200 font-medium">Performance Rankings:</strong> Computes data tables directly on database view architectures, sorting assets by live 24H volume loops and market capitalization.
              </p>
            </div>
          </div>
        </div>

        {/* --- DISCLAIMER SECTION --- */}
        <div className="mb-8 p-3.5 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl">
          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-500/90 uppercase tracking-wider mb-1.5">
            <AlertTriangle size={12} />
            <span>Risk Disclaimer</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All indexed material, analytical telemetry, and sorted rows are generated strictly for computational transparency. This protocol does not provide financial guidance, market endorsement, or liquidity guarantees. Digital assets carry severe financial exposure. Do your own research.
          </p>
        </div>

        {/* Action Layer */}
        <div className="space-y-4">
          <button
            onClick={handleEnterApp}
            className="w-full flex items-center justify-center gap-2 bg-[#96d6cd] hover:bg-[#85c2b9] text-[#030712] font-semibold text-xs py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
          >
            Acknowledge & Launch <ArrowRight size={14} strokeWidth={2.5} />
          </button>

          {/* Interactive Opt-Out Toggle Control */}
          <div 
            onClick={() => setDontShowAgain(!dontShowAgain)}
            className="flex items-center justify-center gap-2 py-1 group cursor-pointer select-none"
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
              dontShowAgain 
                ? "bg-[#96d6cd]/20 border-[#96d6cd]" 
                : "border-slate-800 bg-[#030712] group-hover:border-slate-700"
            }`}>
              {dontShowAgain && <div className="w-1.5 h-1.5 rounded-full bg-[#96d6cd]" />}
            </div>
            
            <span className="text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors flex items-center gap-1">
              <EyeOff size={11} /> Don't show this screen again
            </span>
          </div>
        </div>

        {/* Minimalist Footnote */}
        <div className="mt-6 pt-4 border-t border-slate-900/40 text-center text-[9px] text-slate-600 font-mono tracking-wider">
          v1.0.0 // PRODUCTION BUILD SECURE
        </div>

      </motion.div>
    </div>
  );
}
