import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Settings,
  Wallet,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuySellLogic } from "../hooks/useBuySellLogic";
import { ConnectKitButton } from "connectkit";

const SlippageModal = ({ isOpen, onClose, slippage, onSlippageChange }) => {
  const [customValue, setCustomValue] = useState(slippage.toString());
  const handleCustomChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setCustomValue(value);
      if (value && !isNaN(value)) onSlippageChange(parseFloat(value));
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
      className="absolute top-12 right-2 left-2 sm:right-3 sm:left-auto sm:w-60 bg-[#030712] border border-slate-900 p-3 rounded z-[60] shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          SLIPPAGE LIMIT <Info className="w-3 h-3 opacity-60" />
        </span>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1.5 mb-2.5">
        {[0.1, 0.5, 1.0].map((v) => (
          <button key={v} onClick={() => { setCustomValue(v.toString()); onSlippageChange(v); }}
            style={{ backgroundColor: slippage === v ? '#96d6cd10' : '', borderColor: slippage === v ? '#96d6cd50' : '', color: slippage === v ? '#96d6cd' : '' }}
            className={`flex-1 py-1.5 border rounded text-[10px] font-mono font-bold uppercase transition-all ${slippage === v ? "" : "bg-[#0b0f19]/40 border-slate-900 text-slate-400 hover:text-slate-200"}`}>
            {v}%
          </button>
        ))}
      </div>
      <div className="relative">
        <input type="text" value={customValue} onChange={handleCustomChange} placeholder="CUSTOM VAL" className="w-full bg-[#0b0f19]/60 border border-slate-900 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono font-bold outline-none uppercase" />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-mono font-bold">%</span>
      </div>
    </motion.div>
  );
};

const OrderModal = ({ isOpen, onClose, initialTab, token }) => {
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const { isConnected } = useAccount();
  const logic = useBuySellLogic(token);
  
  useEffect(() => { logic.setActiveTab(initialTab); }, [initialTab]);

  const renderButtonContent = () => {
    if (["pending", "approving", "confirming"].includes(logic.buttonStatus.type)) return <div className="flex items-center gap-2 font-mono text-xs uppercase"><Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#96d6cd' }} /> Processing...</div>;
    return <span className="font-mono text-xs font-black uppercase">{logic.buttonStatus.text}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-[#030712]/95 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-[#0b0f19] border border-slate-800 sm:rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <span className="font-mono font-bold text-slate-300 uppercase">{logic.activeTab} Order</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 relative">
          <button onClick={() => setShowSlippageModal(!showSlippageModal)} className="absolute top-4 right-4 text-slate-500"><Settings className="w-4 h-4" /></button>
          <AnimatePresence>{showSlippageModal && <SlippageModal isOpen={showSlippageModal} onClose={() => setShowSlippageModal(false)} slippage={logic.slippage} onSlippageChange={logic.setSlippage} />}</AnimatePresence>
          <div className="bg-[#030712] border border-slate-900 rounded p-3 mb-4">
             <input type="text" value={logic.amount} onChange={logic.handleAmountChange} placeholder="0.0000" className="w-full bg-transparent text-xl font-mono font-bold text-slate-100 outline-none" />
          </div>
          <button onClick={logic.handleSwap} className="w-full py-4 bg-[#96d6cd] text-[#030712] font-black uppercase rounded text-sm tracking-widest">{renderButtonContent()}</button>
        </div>
      </div>
    </motion.div>
  );
};

export default function BuySellSimple({ token }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [orderType, setOrderType] = useState("Buy");

  return (
    <div className="w-full grid grid-cols-2 gap-2">
      <button onClick={() => { setOrderType("Buy"); setModalOpen(true); }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded font-mono font-bold uppercase text-xs">Buy</button>
      <button onClick={() => { setOrderType("Sell"); setModalOpen(true); }} className="bg-red-500/10 border border-red-500/20 text-red-400 py-3 rounded font-mono font-bold uppercase text-xs">Sell</button>
      <AnimatePresence>
        {modalOpen && <OrderModal isOpen={modalOpen} onClose={() => setModalOpen(false)} initialTab={orderType} token={token} />}
      </AnimatePresence>
    </div>
  );
}
