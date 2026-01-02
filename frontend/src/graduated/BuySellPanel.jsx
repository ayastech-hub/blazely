import React, { useState } from "react";
import { Loader2, CheckCircle, Settings, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Slippage Modal
const SlippageModal = ({ isOpen, onClose, slippage, setSlippage }) => {
  const [customValue, setCustomValue] = useState(slippage.toString());

  const handleChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setCustomValue(value);
      if (value && !isNaN(value)) setSlippage(parseFloat(value));
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
            onClick={() => setSlippage(v)}
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
          onChange={handleChange}
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

// Main BuySell Panel
export default function BuySellPanel({ token }) {
  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [showSlippage, setShowSlippage] = useState(false);
  const [slippage, setSlippage] = useState(0.5); // default slippage

  const presets = [25, 50, 75];

  const handleSwap = () => {
    if (!amount || isNaN(amount)) return alert("Enter valid amount");
    setLoading(true);
    setTimeout(() => {
      setTxHash("0x123abc...fakehash");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      {/* Slippage Modal */}
      <AnimatePresence>
        {showSlippage && (
          <SlippageModal
            isOpen={showSlippage}
            onClose={() => setShowSlippage(false)}
            slippage={slippage}
            setSlippage={setSlippage}
          />
        )}
      </AnimatePresence>

      <div className="relative bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-3xl p-1 shadow-2xl overflow-hidden min-h-[400px] flex flex-col">
        {/* Buy/Sell Toggle + Slippage */}
        <div className="flex p-1.5 gap-1.5 items-center">
          <button
            onClick={() => setIsBuying(true)}
            className={`relative flex-1 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 ${
              isBuying ? "text-lime-500" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {isBuying && (
              <div className="absolute inset-0 bg-slate-800/80 rounded-2xl -z-10 shadow-sm border border-slate-700/50" />
            )}
            Buy
          </button>
          <button
            onClick={() => setIsBuying(false)}
            className={`relative flex-1 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 ${
              !isBuying ? "text-red-500" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {!isBuying && (
              <div className="absolute inset-0 bg-slate-800/80 rounded-2xl -z-10 shadow-sm border border-slate-700/50" />
            )}
            Sell
          </button>

          {/* Slippage Icon */}
          <button
            onClick={() => setShowSlippage(!showSlippage)}
            className={`p-3 rounded-2xl transition-colors ${
              showSlippage
                ? "text-lime-500 bg-slate-800"
                : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          {/* Amount Input */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl py-3 px-4 mb-4 transition-all focus-within:border-slate-700 focus-within:ring-1 ring-slate-700">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Amount
              </span>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <span>Balance: 0.00</span>
                <button
                  onClick={() => setAmount("100")} // Dummy max
                  className="text-lime-500 hover:text-lime-400 font-bold ml-1"
                >
                  MAX
                </button>
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder-slate-800 text-left"
            />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {presets.map((pct) => (
              <button
                key={pct}
                onClick={() => setAmount(pct.toString())}
                className="py-2 text-[11px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Estimate */}
          {amount && (
            <div className="mb-4 flex justify-between items-center px-1 text-[10px] font-medium uppercase tracking-wider">
              <span className="text-slate-500">Est. Received</span>
              <span className="text-lime-500 font-bold">
                0.00 {token.symbol}
              </span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSwap}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-cyan-400 text-slate-900 font-bold text-base uppercase tracking-widest transition-all hover:bg-cyan-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : isBuying ? (
              "Buy"
            ) : (
              "Sell"
            )}
          </button>

          {/* Tx Hash */}
          {txHash && (
            <div className="text-green-400 font-mono text-sm mt-2 break-all flex items-center gap-1">
              Tx Hash: {txHash} <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
