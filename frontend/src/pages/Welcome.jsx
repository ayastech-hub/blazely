import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, EyeOff, AlertTriangle, Terminal, Rocket, Lock, Layers, RefreshCcw } from "lucide-react";

export default function Welcome({ onDismiss }) {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasOptedOut = localStorage.getItem("hideWelcomeScreen");
    if (hasOptedOut === "true") {
      onDismiss ? onDismiss() : navigate("/", { replace: true });
    }
  }, [navigate, onDismiss]);

  const handleEnterApp = () => {
    if (dontShowAgain) localStorage.setItem("hideWelcomeScreen", "true");
    onDismiss ? onDismiss() : navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-mono p-4 relative selection:bg-[#96d6cd]/20">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .terminal-cursor::after { content: '_'; animation: blink 1s step-end infinite; color: #96d6cd; }
      `}} />

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-[550px] w-full bg-black border border-slate-900 rounded p-6 relative"
      >
        <div className="bg-[#0b0f19]/40 border border-slate-900/60 rounded p-3 mb-5 flex items-center justify-between text-xs">
          <div className="text-[#96d6cd] font-bold flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            LAUNCHPAD_PROTOCOL_INIT
          </div>
          <div className="text-slate-600 text-[10px]">VER: 2026.06.27</div>
        </div>

        <h1 className="text-base font-bold tracking-wider text-slate-200 uppercase mb-5 terminal-cursor">
          TOKEN FACTORY & LIQUIDITY ENGINE
        </h1>

        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex items-center gap-2 text-slate-400">
              <Rocket className="w-3.5 h-3.5 text-[#96d6cd]" /> Bonding Curve Launch
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCcw className="w-3.5 h-3.5 text-[#96d6cd]" /> Auto-DEX Migration
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-[#96d6cd]" /> Liquidity Locking
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Layers className="w-3.5 h-3.5 text-[#96d6cd]" /> Staking & Bridging
            </div>
          </div>
        </div>

        <div className="mb-6 p-3.5 bg-amber-500/5 border border-amber-500/10 rounded">
          <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>OPERATIONAL DISCLAIMER</span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase leading-relaxed">
            By proceeding, you acknowledge that tokens created via bonding curves are high-risk. Ensure all migration parameters and locking schedules are verified before deployment. Use at your own risk.
          </p>
        </div>

        <button
          onClick={handleEnterApp}
          className="w-full flex items-center justify-center gap-2 bg-[#96d6cd] hover:bg-[#85c2b9] text-[#030712] font-bold text-xs uppercase tracking-widest py-3 px-4 rounded transition-colors"
        >
          INITIALIZE TERMINAL <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div 
          onClick={() => setDontShowAgain(!dontShowAgain)}
          className="flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          <div className={`w-3 h-3 rounded border flex items-center justify-center ${dontShowAgain ? "bg-[#96d6cd]/20 border-[#96d6cd]" : "border-slate-800"}`}>
            {dontShowAgain && <div className="w-1.5 h-1.5 bg-[#96d6cd] rounded-sm" />}
          </div>
          <span className="text-[10px] text-slate-500 uppercase">Hide this notification</span>
        </div>
      </motion.div>
    </div>
  );
}
