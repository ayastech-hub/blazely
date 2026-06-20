// src/components/BuySellSimple.jsx
import React, { useState, useRef } from "react";
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
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute top-12 right-2 left-2 sm:right-3 sm:left-auto sm:w-60 bg-[#030712] border border-slate-900 p-3 rounded z-50 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          SLIPPAGE LIMIT <Info className="w-3 h-3 opacity-60" />
        </span>
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-1.5 mb-2.5">
        {[0.1, 0.5, 1.0].map((v) => {
          const isSelected = slippage === v;
          return (
            <button
              key={v}
              onClick={() => {
                setCustomValue(v.toString());
                onSlippageChange(v);
              }}
              style={{
                backgroundColor: isSelected ? '#96d6cd10' : '',
                borderColor: isSelected ? '#96d6cd50' : '',
                color: isSelected ? '#96d6cd' : ''
              }}
              className={`flex-1 py-1.5 border rounded text-[10px] font-mono font-bold uppercase transition-all ${
                isSelected
                  ? ""
                  : "bg-[#0b0f19]/40 border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-[#0b0f19]"
              }`}
            >
              {v}%
            </button>
          );
        })}
      </div>

      <div className="relative">
        <input
          type="text"
          value={customValue}
          onChange={handleCustomChange}
          placeholder="CUSTOM VAL"
          className="w-full bg-[#0b0f19]/60 border border-slate-900 rounded px-2.5 py-1.5 text-slate-200 text-xs font-mono font-bold outline-none focus:border-slate-800 uppercase tracking-wide"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-mono font-bold">
          %
        </span>
      </div>
    </motion.div>
  );
};

export default function BuySellSimple({ token }) {
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const containerRef = useRef(null);
  const { isConnected } = useAccount();
  const {
    activeTab,
    setActiveTab,
    amount,
    setAmount,
    slippage,
    setSlippage,
    getInputBalance,
    getReceiveSymbol,
    fixedPresets,
    setPresetAmount,
    handleAmountChange,
    handleSwap,
    isPending,
    isConfirmingAny,
    buttonStatus,
    buttonClassName,
    isButtonDisabled,
    transactionMessage,
  } = useBuySellLogic(token);

  const renderButtonContent = () => {
    if (["pending", "approving", "confirming"].includes(buttonStatus.type)) {
      return (
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#96d6cd' }} />
          <span>{buttonStatus.text || "PROCESSING ROUTE..."}</span>
        </div>
      );
    }
    if (buttonStatus.type === "success") {
      return <CheckCircle className="w-4 h-4 text-[#96d6cd]" />;
    }
    return <span className="font-mono text-xs font-black uppercase tracking-widest">{buttonStatus.text}</span>;
  };

  return (
    <div className="w-full max-w-md mx-auto" ref={containerRef}>
      <div className="relative bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900 rounded p-1.5 shadow-xl min-h-[460px] flex flex-col justify-between">
        
        {/* Core Operation Action Module Header */}
        <div>
          <div className="flex p-1 gap-1 items-center bg-[#030712] border border-slate-900/60 rounded mb-4">
            {["Buy", "Sell"].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setAmount("");
                  }}
                  disabled={!isConnected || isPending || isConfirmingAny}
                  className={`relative flex-1 py-2 rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? "text-slate-100"
                      : "text-slate-500 hover:text-slate-300 disabled:opacity-30"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabState"
                      style={{ borderColor: '#96d6cd20' }}
                      className="absolute inset-0 bg-[#0b0f19] rounded border border-slate-800/40"
                    />
                  )}
                  <span className="relative z-10">{tab} Order</span>
                </button>
              );
            })}

            <button
              onClick={() => setShowSlippageModal(!showSlippageModal)}
              style={{ color: showSlippageModal ? '#96d6cd' : '' }}
              className={`p-2 rounded border border-transparent transition-all ${
                showSlippageModal 
                  ? "bg-[#0b0f19] border-slate-800/40" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#0b0f19]/30"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Configuration Canvas Body */}
          <div className="px-1.5 relative">
            <AnimatePresence>
              {showSlippageModal && (
                <SlippageModal
                  isOpen={showSlippageModal}
                  onClose={() => setShowSlippageModal(false)}
                  slippage={slippage}
                  onSlippageChange={setSlippage}
                />
              )}
            </AnimatePresence>

            {/* Industrial Quantitative Input Node */}
            <div className="bg-[#030712] border border-slate-900 rounded p-3 mb-3 transition-colors focus-within:border-slate-800">
              <div className="flex justify-between items-center mb-2 font-mono text-[9px] uppercase tracking-wider">
                <span className="text-slate-500 font-bold">INPUT QUANTITY</span>
                <div className="flex items-center gap-1 text-slate-400">
                  <Wallet className="w-2.5 h-2.5 text-slate-600" />
                  <span className="text-slate-400 font-bold">{getInputBalance().toFixed(4)}</span>
                  <span className="text-slate-700">•</span>
                  <button
                    onClick={() => setAmount(getInputBalance().toString())}
                    style={{ color: '#96d6cd' }}
                    className="font-black hover:opacity-80 transition-opacity pl-0.5"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.0000"
                  className="w-full bg-transparent text-lg font-mono font-bold text-slate-100 outline-none placeholder-slate-800 text-left"
                />
              </div>
            </div>

            {/* Matrix Precision Parameter Sliders / Presets */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {activeTab === "Sell"
                ? [25, 50, 75].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        const balance = getInputBalance();
                        const value = (balance * pct) / 100;
                        setAmount(value.toString());
                      }}
                      className="py-1.5 text-[10px] font-mono font-bold text-slate-400 bg-[#030712] border border-slate-900 rounded hover:bg-[#0b0f19] hover:text-slate-200 transition-colors"
                    >
                      {pct}%
                    </button>
                  ))
                : fixedPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setPresetAmount(preset.value)}
                      className="py-1.5 text-[9px] font-mono font-bold text-slate-400 bg-[#030712] border border-slate-900 rounded hover:bg-[#0b0f19] hover:text-slate-200 transition-colors uppercase tracking-wide"
                    >
                      {preset.label}
                    </button>
                  ))}
            </div>

            {/* Downstream Yield Target Calculations */}
            <div className="h-5 px-1">
              <AnimatePresence>
                {amount && amount !== "0" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider"
                  >
                    <span className="text-slate-500">ESTIMATED ESTIMATE OUT</span>
                    <span style={{ color: '#96d6cd' }} className="font-bold">
                      0.00 {getReceiveSymbol()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Modular Execution Terminal Layer */}
        <div className="px-1.5 pb-1">
          <div className="min-h-[40px] mb-2 flex items-center">
            <AnimatePresence mode="wait">
              {transactionMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  className={`w-full flex items-center gap-2 text-[10px] font-mono uppercase p-2 rounded border ${
                    transactionMessage.type === "error"
                      ? "bg-red-950/10 border-red-900/30 text-red-400"
                      : "bg-[#0b0f19] border-slate-900 text-slate-300"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  <span className="truncate tracking-wide">{transactionMessage.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ConnectKitButton.Custom>
            {({ isConnected, show }) => (
              <button
                onClick={() => {
                  if (!isConnected) {
                    show();
                    return;
                  }
                  handleSwap();
                }}
                disabled={isButtonDisabled}
                style={{
                  backgroundColor: !isButtonDisabled && isConnected ? '#96d6cd' : '',
                  color: !isButtonDisabled && isConnected ? '#030712' : ''
                }}
                className={`w-full py-3.5 rounded text-xs font-mono font-black uppercase tracking-widest transition-all flex items-center justify-center border border-transparent select-none ${
                  !isConnected 
                    ? "bg-[#030712] border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-[#0b0f19]" 
                    : isButtonDisabled 
                      ? "bg-slate-900/40 border-slate-900/60 text-slate-600 cursor-not-allowed" 
                      : "hover:opacity-90 active:scale-[0.99]"
                }`}
              >
                {renderButtonContent()}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>

      </div>
    </div>
  );
}
