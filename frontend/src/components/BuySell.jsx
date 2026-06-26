import React, { useState } from "react";
import { useAccount } from "wagmi";
import {
  Settings,
  Wallet,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuySellLogic } from "../hooks/useBuySellLogic";
import { ConnectKitButton } from "connectkit";

// ... (Keep SlippageModal component exactly as you had it) ...

const OrderModal = ({ isOpen, onClose, initialTab, token }) => {
  const {
    activeTab, setActiveTab, amount, setAmount, slippage, setSlippage,
    getInputBalance, getReceiveSymbol, fixedPresets, setPresetAmount,
    handleAmountChange, handleSwap, isPending, isConfirmingAny,
    buttonStatus, isButtonDisabled, transactionMessage
  } = useBuySellLogic(token);

  // Sync initial tab when modal opens
  React.useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-[#030712]/95 backdrop-blur-sm"
    >
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-[#0b0f19] border border-slate-800 sm:rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <span className="font-mono font-bold text-slate-300 uppercase">{activeTab} Order</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        
        {/* Modal Body: Paste your previous logic here inside the scrollable container */}
        <div className="p-4 overflow-y-auto">
            {/* ... (Insert your previous "Configuration Canvas Body" logic here) ... */}
        </div>
      </div>
    </motion.div>
  );
};

export default function BuySellSimple({ token }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [orderType, setOrderType] = useState("Buy");

  const openOrder = (type) => {
    setOrderType(type);
    setModalOpen(true);
  };

  return (
    <div className="w-full">
      {/* 1. Trigger View: The "Buy" and "Sell" buttons shown in the layout */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => openOrder("Buy")}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded font-mono font-bold uppercase text-xs hover:bg-emerald-500/20 transition-all"
        >
          Buy
        </button>
        <button 
          onClick={() => openOrder("Sell")}
          className="bg-red-500/10 border border-red-500/20 text-red-400 py-3 rounded font-mono font-bold uppercase text-xs hover:bg-red-500/20 transition-all"
        >
          Sell
        </button>
      </div>

      {/* 2. Pop-up Overlay */}
      <AnimatePresence>
        {modalOpen && (
          <OrderModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)} 
            initialTab={orderType}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
