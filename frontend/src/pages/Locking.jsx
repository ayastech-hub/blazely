// src/pages/Locking.jsx
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import {
  Lock,
  Unlock,
  Clock,
  Shield,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Info,
  Terminal,
  Activity
} from "lucide-react";

// Mock contract functions - replace with actual ethers.js/viem contract calls
const mockContractFunctions = {
  async lockTokens(tokenAddress, amount, duration, beneficiary) {
    console.log("Locking tokens:", { tokenAddress, amount, duration, beneficiary });
    return new Promise((resolve) =>
      setTimeout(() => resolve({ txHash: "0x123..." }), 2000)
    );
  },

  async unlockTokens(lockId) {
    console.log("Unlocking tokens:", lockId);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ txHash: "0x456..." }), 2000)
    );
  },

  async getUserLocks(wallet) {
    return [
      {
        id: 1,
        tokenAddress: "0x1234...5678",
        tokenSymbol: "BLZ",
        tokenName: "Blazely Utility Token",
        amount: "1,450.00",
        lockDate: new Date("2026-01-15"),
        unlockDate: new Date("2026-12-15"),
        totalDurationDays: 334,
        beneficiary: wallet,
        status: "locked",
        canUnlock: false,
      },
      {
        id: 2,
        tokenAddress: "0x9876...5432",
        tokenSymbol: "CORE-LP",
        tokenName: "CORE-WETH Liquidity Pool",
        amount: "12.84",
        lockDate: new Date("2026-05-01"),
        unlockDate: new Date("2026-07-01"),
        totalDurationDays: 61,
        beneficiary: wallet,
        status: "locked",
        canUnlock: true,
      },
    ];
  },
};

export default function Locking() {
  const { wallet } = useWallet();
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [validationError, setValidationError] = useState("");
  const [successTxData, setSuccessTxData] = useState(null);

  // Live Activity Feed State (Simulating Realtime Database Hooks)
  const [activities] = useState([
    { id: 1, type: "LOCK", amount: "1450 BLZ", time: "3 min ago" },
    { id: 2, type: "UNLOCK", amount: "12 LP", time: "11 min ago" },
    { id: 3, type: "LOCK", amount: "5000 CORE", time: "25 min ago" },
  ]);

  // Create lock form state
  const [lockForm, setLockForm] = useState({
    tokenAddress: "",
    amount: "",
    duration: "30", // days
    beneficiary: "",
    customDuration: "",
  });

  const [transactionStatus, setTransactionStatus] = useState(null);

  useEffect(() => {
    if (wallet) {
      loadUserLocks();
    }
  }, [wallet]);

  async function loadUserLocks() {
    setLoading(true);
    try {
      const userLocks = await mockContractFunctions.getUserLocks(wallet);
      setLocks(userLocks);
    } catch (error) {
      console.error("Error loading locks:", error);
    }
    setLoading(false);
  }

  async function handleCreateLock() {
    setValidationError("");
    setSuccessTxData(null);
    
    if (!wallet) {
      setValidationError("Wallet not connected.");
      return;
    }

    const { tokenAddress, amount, duration, beneficiary, customDuration } = lockForm;

    if (!tokenAddress || !amount) {
      setValidationError("Missing token address or amount parameters.");
      return;
    }

    const lockDuration = duration === "custom" ? customDuration : duration;
    const lockBeneficiary = beneficiary || wallet;

    setTransactionStatus("pending");
    setLoading(true);

    try {
      const result = await mockContractFunctions.lockTokens(
        tokenAddress,
        amount,
        parseInt(lockDuration),
        lockBeneficiary
      );

      // Compute friendly date target metrics
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + parseInt(lockDuration));
      
      setSuccessTxData({
        amount: amount,
        symbol: "Tokens",
        unlockDate: targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        txHash: result.txHash
      });

      setTransactionStatus("success");
      setLockForm({
        tokenAddress: "",
        amount: "",
        duration: "30",
        beneficiary: "",
        customDuration: "",
      });

      await loadUserLocks();
    } catch (error) {
      console.error("Error creating lock:", error);
      setTransactionStatus("error");
      setTimeout(() => setTransactionStatus(null), 5000);
    }
    setLoading(false);
  }

  async function handleUnlock(lockId) {
    if (!wallet) return;
    setLoading(true);
    try {
      await mockContractFunctions.unlockTokens(lockId);
      await loadUserLocks();
    } catch (error) {
      console.error("Error unlocking:", error);
    }
    setLoading(false);
  }

  const durationOptions = [
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "90", label: "90 Days" },
    { value: "180", label: "180 Days" },
    { value: "365", label: "365 Days" },
    { value: "custom", label: "Custom Duration" },
  ];

  const filteredLocks = locks.filter((lock) => {
    const matchesSearch =
      lock.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lock.tokenName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || lock.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculates time metrics and progress updates
  function getLockProgressMetrics(lockDate, unlockDate, totalDurationDays = 30) {
    const now = new Date();
    const total = unlockDate.getTime() - lockDate.getTime();
    const elapsed = now.getTime() - lockDate.getTime();
    
    if (now >= unlockDate) {
      return { percentage: 100, daysLeft: 0, textString: "MATURED / UNLOCKED", blocks: "████████████████" };
    }

    const percentage = Math.min(Math.max(Math.floor((elapsed / total) * 100), 0), 100);
    const diffMs = unlockDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Create Retro Ascii Grid Bars
    const totalBlocks = 16;
    const filledBlocksCount = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocksCount = totalBlocks - filledBlocksCount;
    const blocks = "█".repeat(filledBlocksCount) + "░".repeat(emptyBlocksCount);

    return {
      percentage,
      daysLeft,
      textString: `${daysLeft} DAYS LEFT`,
      blocks
    };
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-mono selection:bg-[#96d6cd]/20">
      
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

      {/* Top Banner Structure */}
      <div className="border-b border-slate-900 bg-black/40">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <h1 className="text-xl font-bold uppercase tracking-wider text-slate-200 terminal-cursor">
            TOKEN_LOCKER
          </h1>
          <p className="text-[11px] text-slate-500 uppercase mt-0.5 tracking-wide">
            Production-grade timelock manager asset ecosystem.
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6 w-full flex-1 space-y-6">
        
        {/* Boot Terminal Diagnostic Header */}
        <div className="bg-black border border-slate-900 rounded p-4 font-mono">
          <div className="text-[#96d6cd] text-xs font-bold flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            BLAZELY_LOCKER v1.0.0
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 text-[11px]">
            <div className="text-slate-500"><span className="text-emerald-500">[OK]</span> Wallet Connected</div>
            <div className="text-slate-500"><span className="text-emerald-500">[OK]</span> Locker Contract Online</div>
            <div className="text-slate-500"><span className="text-emerald-500">[OK]</span> Database Synced</div>
            <div className="text-[#96d6cd] font-bold"><span className="text-[#96d6cd]">[READY]</span> Lock Manager Ready</div>
          </div>
        </div>

        {/* Live Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "TOTAL LOCKS", value: "152" },
            { label: "TVL LOCKED", value: "$4.2M" },
            { label: "ACTIVE USERS", value: "847" },
            { label: "AVG DURATION", value: "91 DAYS" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#0b0f19]/30 border border-slate-900 rounded p-4 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
              <span className="text-lg font-bold text-slate-200 tracking-tight mt-1">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Action Alerts Block Area */}
        {transactionStatus && (
          <div className={`p-4 rounded border text-xs uppercase tracking-wide ${
            transactionStatus === "pending"
              ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
              : transactionStatus === "success"
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/5 border-rose-500/20 text-rose-400"
          }`}>
            {transactionStatus === "pending" && "» STATUS: WAITING FOR BLOCK CONFIRMATION..."}
            {transactionStatus === "success" && successTxData && (
              <div className="space-y-1">
                <div className="font-bold text-emerald-400">✓ Lock Created Successfully</div>
                <div className="text-slate-400 mt-2">Amount: <span className="text-slate-200">{successTxData.amount}</span></div>
                <div className="text-slate-400">Unlock Date: <span className="text-slate-200">{successTxData.unlockDate}</span></div>
                <div className="text-slate-400">Tx: <span className="text-blue-400 break-all">{successTxData.txHash}</span></div>
                <button 
                  onClick={() => setTransactionStatus(null)} 
                  className="text-[10px] underline text-slate-500 hover:text-slate-300 uppercase block pt-1"
                >
                  Dismiss Terminal Message
                </button>
              </div>
            )}
            {transactionStatus === "error" && "» EXCEPTION: TRANSACTION REJECTED OR SLIPPAGE EXCEEDED."}
          </div>
        )}

        {validationError && (
          <div className="p-4 rounded border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs uppercase tracking-wide">
            » ERROR: {validationError}
          </div>
        )}

        {/* Middle Form + Activity Log Layout Feed Workspace Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Create Lock Dashboard Container Column */}
          <div className="bg-[#0b0f19]/20 border border-slate-900 rounded p-6 lg:col-span-8 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
              <Shield className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">LOCK CONFIGURATION</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Token Contract Address <span style={{ color: '#96d6cd' }}>*</span>
                </label>
                <input
                  type="text"
                  value={lockForm.tokenAddress}
                  onChange={(e) => setLockForm({ ...lockForm, tokenAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs text-slate-200 placeholder-slate-800 focus:border-slate-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount to Lock <span style={{ color: '#96d6cd' }}>*</span>
                </label>
                <input
                  type="number"
                  value={lockForm.amount}
                  onChange={(e) => setLockForm({ ...lockForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs text-slate-200 placeholder-slate-800 focus:border-slate-800 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Lock Duration
                </label>
                <select
                  value={lockForm.duration}
                  onChange={(e) => setLockForm({ ...lockForm, duration: e.target.value })}
                  className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs text-slate-400 focus:border-slate-800 outline-none"
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0b0f19] text-slate-300">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {lockForm.duration === "custom" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                    Custom Duration Days
                  </label>
                  <input
                    type="number"
                    value={lockForm.customDuration}
                    onChange={(e) => setLockForm({ ...lockForm, customDuration: e.target.value })}
                    placeholder="Enter days"
                    className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs text-slate-200 placeholder-slate-800 focus:border-slate-800 outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                Beneficiary Target Address <span className="text-slate-700">(Optional)</span>
              </label>
              <input
                type="text"
                value={lockForm.beneficiary}
                onChange={(e) => setLockForm({ ...lockForm, beneficiary: e.target.value })}
                placeholder="Defaults to connected wallet address if left blank"
                className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs text-slate-200 placeholder-slate-800 focus:border-slate-800 outline-none"
              />
            </div>

            <button
              onClick={handleCreateLock}
              disabled={loading}
              style={{
                backgroundColor: (!loading) ? '#96d6cd' : '',
                borderColor: (!loading) ? '#96d6cd' : ''
              }}
              className="w-full font-bold uppercase text-xs tracking-widest text-[#030712] py-3 rounded border transition-all duration-150 disabled:bg-slate-900 disabled:border-slate-900 disabled:text-slate-600 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#030712] border-t-transparent rounded-full animate-spin" />
                  PROCESSING TRANSACTION...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  CREATE ESCROW LOCK
                </>
              )}
            </button>
          </div>

          {/* Activity Logs Stream Feeds Right Column */}
          <div className="bg-[#0b0f19]/20 border border-slate-900 rounded p-5 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-900 mb-4">
                <Activity className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">RECENT ACTIVITY</h3>
              </div>
              
              <div className="space-y-3 text-[11px]">
                {activities.map((act) => (
                  <div key={act.id} className="bg-black/40 border border-slate-900 p-2.5 rounded flex items-center justify-between">
                    <div>
                      <span className={`font-bold mr-2 ${act.type === 'LOCK' ? 'text-[#96d6cd]' : 'text-amber-500'}`}>
                        [{act.type}]
                      </span>
                      <span className="text-slate-300 font-sans">{act.amount}</span>
                    </div>
                    <span className="text-slate-600 text-[10px]">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/10 rounded">
              <div className="flex items-center gap-2 text-amber-500/80 text-[10px] font-bold uppercase tracking-wider mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Risk Protocol Notice</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase leading-normal">
                Locked tokens cannot be retrieved or assigned under any conditions before the lock duration expiration date.
              </p>
            </div>
          </div>

        </div>

        {/* Lower Active Table Component Feed Container Block */}
        <div className="space-y-4">
          
          {/* Filtering Tools Layout Row */}
          <div className="bg-[#0b0f19]/20 border border-slate-900 rounded p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="FILTER BY TOKEN SYMBOL OR NAME..."
                  className="w-full pl-9 p-2 bg-[#030712] rounded border border-slate-900 text-xs text-slate-200 placeholder-slate-700 focus:border-slate-800 outline-none uppercase tracking-wide"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-[#030712] rounded border border-slate-900 text-xs text-slate-400 focus:border-slate-800 outline-none uppercase tracking-wide"
                >
                  <option value="all" className="bg-[#0b0f19]">ALL ACTIVE LOCKS</option>
                  <option value="locked" className="bg-[#0b0f19]">LOCKED MATRIX</option>
                  <option value="unlocked" className="bg-[#0b0f19]">MATURED LOCKS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Core Table List Workspace Container */}
          <div className="bg-[#0b0f19]/20 border border-slate-900 rounded overflow-hidden">
            <div className="p-4 border-b border-slate-900 bg-[#0b0f19]/40 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" style={{ color: '#96d6cd' }} />
                ACTIVE LOCKS ({filteredLocks.length})
              </h2>
              <div className="text-[10px] text-slate-500 font-bold">MUTABILITY SECURED</div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-[11px] text-slate-600 uppercase tracking-widest">
                <div className="w-4 h-4 border-2 border-[#96d6cd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Syncing ledger registers...
              </div>
            ) : filteredLocks.length === 0 ? (
              <div className="p-16 text-center text-[11px] text-slate-600 border border-dashed border-slate-900/40 rounded m-4 uppercase tracking-widest">
                <Lock className="w-6 h-6 text-slate-800 mx-auto mb-3" />
                No matching locks verified in registry indexes.
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60">
                {filteredLocks.map((lock) => {
                  const metrics = getLockProgressMetrics(lock.lockDate, lock.unlockDate, lock.totalDurationDays);

                  return (
                    <div key={lock.id} className="p-5 hover:bg-[#0b0f19]/10 transition-colors">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#030712] border border-slate-900 flex items-center justify-center text-xs font-bold text-[#96d6cd]">
                            {lock.tokenSymbol?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                                {lock.tokenName}
                              </h3>
                              <span style={{ color: '#96d6cd' }} className="text-[10px] bg-[#030712] px-1.5 py-0.5 rounded border border-slate-900 font-bold">
                                ${lock.tokenSymbol}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[240px] sm:max-w-none">
                              CA: {lock.tokenAddress}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-slate-200 font-mono tracking-tight">
                            {lock.amount}
                          </p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-600 mt-0.5 font-mono">
                            VOLUME LOCKED
                          </p>
                        </div>
                      </div>

                      {/* Timeline Info Row Matrices + Ascii Progress Bars */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
                        <div className="bg-[#030712]/60 border border-slate-900 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-slate-600 text-[9px] uppercase tracking-wider mb-0.5">
                            <Clock className="w-3 h-3" />
                            <span>LOCK DATE</span>
                          </div>
                          <p className="text-slate-400 text-xs font-bold">
                            {lock.lockDate.toLocaleDateString('en-GB')}
                          </p>
                        </div>

                        <div className="bg-[#030712]/60 border border-slate-900 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-slate-600 text-[9px] uppercase tracking-wider mb-0.5">
                            <Unlock className="w-3 h-3" />
                            <span>RELEASE DATE</span>
                          </div>
                          <p className="text-slate-400 text-xs font-bold">
                            {lock.unlockDate.toLocaleDateString('en-GB')}
                          </p>
                        </div>

                        {/* Progress Tracker Block Element */}
                        <div className="bg-[#030712]/60 border border-slate-900 rounded px-3 py-2">
                          <div className="flex items-center justify-between text-slate-600 text-[9px] uppercase tracking-wider mb-1">
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> LOCK PERIOD</span>
                            <span className="text-[#96d6cd] font-bold">{metrics.percentage}%</span>
                          </div>
                          
                          {/* Shaded Terminal String Text Layer */}
                          <div className="text-[10px] text-slate-400 leading-none tracking-widest select-none hidden sm:block">
                            {metrics.blocks}
                          </div>

                          {/* Functional CSS Progress Line */}
                          <div className="w-full h-1 bg-slate-950 rounded overflow-hidden mt-1.5">
                            <div 
                              className="h-full bg-[#96d6cd] transition-all duration-300"
                              style={{ width: `${metrics.percentage}%` }}
                            />
                          </div>

                          <p className="text-[10px] font-bold uppercase text-slate-400 mt-2">
                            {metrics.textString}
                          </p>
                        </div>
                      </div>

                      {lock.canUnlock && (
                        <button
                          onClick={() => handleUnlock(lock.id)}
                          disabled={loading}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 text-[#030712] disabled:text-slate-600 text-xs font-bold uppercase tracking-widest py-2 rounded transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          RELEASE LOCKED ASSETS
                        </button>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer Notes Integration Isolation Area */}
      <div className="max-w-[1600px] mx-auto px-4 pb-8 w-full">
        <div className="border border-slate-900 bg-[#0b0f19]/30 rounded p-3 text-[9px] uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>VAULT ARCHITECTURE INTEGRATION: Production mainnet instances interact directly with standard smart contract RPC methods.</span>
        </div>
      </div>

    </div>
  );
}
