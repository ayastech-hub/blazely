import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, ShieldCheck, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Welcome({ onDismiss }) {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleEnterApp = () => {
    if (dontShowAgain) localStorage.setItem("hideWelcomeScreen", "true");
    onDismiss ? onDismiss() : navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[480px] w-full bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-[#96d6cd]/10 rounded-full flex items-center justify-center mb-4">
            <Rocket className="w-6 h-6 text-[#96d6cd]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to LaunchPad</h1>
          <p className="text-slate-400 text-sm">Create, launch, and manage tokens with ease.</p>
        </div>

        {/* The Workflow Process (Inspired by 1000094151.jpg) */}
        <div className="space-y-4 mb-8">
          {[
            { icon: Rocket, title: "Create Token", desc: "Launch via bonding curve." },
            { icon: ShieldCheck, title: "Automated Migration", desc: "DEX liquidity triggered." },
            { icon: Lock, title: "Secure & Stake", desc: "Locked liquidity & staking." }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 hover:border-[#96d6cd]/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                <item.icon className="w-4 h-4 text-[#96d6cd]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-[11px] text-slate-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button (Inspired by 1000094151.jpg) */}
        <button
          onClick={handleEnterApp}
          className="w-full bg-[#96d6cd] hover:bg-[#7dbcb3] text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          CONTINUE <ArrowRight className="w-4 h-4" />
        </button>

        {/* Footer Toggle */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => setDontShowAgain(!dontShowAgain)}
            className="text-[11px] text-slate-600 hover:text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 w-full"
          >
            {dontShowAgain ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 border border-slate-700 rounded-sm" />}
            Don't show this again
          </button>
        </div>
      </motion.div>
    </div>
  );
}
