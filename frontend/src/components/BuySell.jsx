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
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute top-16 right-4 left-4 sm:right-6 sm:left-auto sm:w-64 bg-slate-900 border border-slate-700 p-4 rounded-2xl z-50 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          Slippage Settings <Info className="w-3 h-3" />
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[0.1, 0.5, 1.0].map((v) => (
          <button
            key={v}
            onClick={() => {
              setCustomValue(v.toString());
              onSlippageChange(v);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              slippage === v
                ? "bg-lime-500 text-black"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {v}%
          </button>
        ))}
      </div>

      <div className="relative group">
        <input
          type="text"
          value={customValue}
          onChange={handleCustomChange}
          placeholder="Custom"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none focus:border-lime-500/50 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
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
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{buttonStatus.text || "Processing..."}</span>
        </div>
      );
    }
    if (buttonStatus.type === "success")
      return <CheckCircle className="w-5 h-5" />;
    return buttonStatus.text;
  };

  return (
    <div className="w-full max-w-md mx-auto" ref={containerRef}>
      <div className="relative bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-3xl p-1 shadow-2xl overflow-hidden min-h-[480px] flex flex-col">
        {/* Buy/Sell Toggle */}
        <div className="flex p-1.5 gap-1.5">
          {["Buy", "Sell"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setAmount("");
              }}
              disabled={!isConnected || isPending || isConfirmingAny}
              className={`relative flex-1 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 ${
                activeTab === tab
                  ? tab === "Buy"
                    ? "text-lime-500"
                    : "text-red-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-slate-800/80 rounded-2xl -z-10 shadow-sm border border-slate-700/50"
                />
              )}
              {tab}
            </button>
          ))}

          <button
            onClick={() => setShowSlippageModal(!showSlippageModal)}
            className={`p-3 rounded-2xl transition-colors ${showSlippageModal ? "text-lime-500 bg-slate-800" : "text-slate-500 hover:bg-slate-800"}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 pt-4 flex-1 flex flex-col justify-between">
          <div>
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

            {/* SLIM Left-Aligned Input Area */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl py-3 px-4 mb-6 transition-all focus-within:border-slate-700 focus-within:ring-1 ring-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Amount
                </span>
                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <Wallet className="w-2.5 h-2.5" />
                  <span>{getInputBalance().toFixed(4)}</span>
                  <button
                    onClick={() => setAmount(getInputBalance().toString())}
                    className="text-lime-500 hover:text-lime-400 font-bold ml-1"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.0"
                className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder-slate-800 text-left"
              />
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {activeTab === "Sell"
                ? [25, 50, 75].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        const balance = getInputBalance();
                        const value = (balance * pct) / 100;
                        setAmount(value.toString());
                      }}
                      className="py-2 text-[11px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all"
                    >
                      {pct}%
                    </button>
                  ))
                : fixedPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setPresetAmount(preset.value)}
                      className="py-2 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all uppercase"
                    >
                      {preset.label}
                    </button>
                  ))}
            </div>

            {/* Estimate Display */}
            <div className="h-6">
              <AnimatePresence>
                {amount && amount !== "0" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-between items-center px-1 text-[10px] font-medium uppercase tracking-wider">
                      <span className="text-slate-500">Est. Received</span>
                      <span className="text-lime-500 font-bold">
                        0.00 {getReceiveSymbol()}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Actions Area */}
          <div className="mt-auto">
            <div className="min-h-[48px] mb-3">
              <AnimatePresence mode="wait">
                {transactionMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`flex items-center gap-2 text-xs font-semibold p-3 rounded-xl border ${
                      transactionMessage.type === "error"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-lime-500/10 border-lime-500/20 text-lime-400"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {transactionMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ConnectKitButton.Custom>
              {({ isConnected, show }) => (
                <button
                  onClick={() => {
                    if (!isConnected) {
                      show(); // open ConnectKit modal
                      return;
                    }
                    handleSwap(); // connected -> perform swap
                  }}
                  disabled={isButtonDisabled}
                  className={`group relative w-full py-5 rounded-2xl text-base font-black uppercase tracking-widest transition-all overflow-hidden flex items-center justify-center ${buttonClassName} shadow-lg disabled:grayscale disabled:opacity-30`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {renderButtonContent()}
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        </div>
      </div>
    </div>
  );
}
