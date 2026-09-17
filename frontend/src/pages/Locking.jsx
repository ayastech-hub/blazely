// src/pages/Locking.jsx
//
// PURPOSE
// Lets a creator lock tokens/LP for a period (a common trust signal — "the
// team's tokens are locked, not dumpable"), and lists/unlocks existing
// locks. Also surfaced in Profile's Dev Tools tab (tabP/DevToolsTab.jsx),
// which shares this page's mock data source so both views stay consistent.
//
// STATUS: UI ONLY. Every contract call goes through
// lib/mockContractFunctions.js — no real lock/unlock happens on-chain yet.
// See that file's header comment for the full note on what's mocked.
//
// The "Live Activity Feed" (`activities` state, top of the component) is
// static, hand-written mock data — it does not actually update and isn't
// wired to any realtime source despite the comment. Genuinely wiring this
// up (Supabase Realtime on a locks table, most likely) is real, separate
// work, not something this page fakes convincingly today.
//
// BUGS FOUND AND FIXED HERE
// `handleCreateLock`'s validation only checked `amount` for truthiness —
// "-5" or "abc" both passed. Now validates it's actually a positive
// number. Separately, choosing "custom" duration with an empty/invalid
// custom-duration field produced `NaN` days, which silently became an
// "Invalid Date" string in the success screen instead of showing a
// validation error — now caught before submission.
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import Loading from "../components/ui/Loading";
import Alert from "../components/ui/Alert";
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

import { mockContractFunctions } from "../lib/mockContractFunctions";

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

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setValidationError("Amount must be a positive number.");
      return;
    }

    if (duration === "custom") {
      const numericCustomDuration = Number(customDuration);
      if (!Number.isFinite(numericCustomDuration) || numericCustomDuration <= 0) {
        setValidationError("Enter a valid custom duration in days.");
        return;
      }
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
    <div className="text-[var(--text-bright)] flex flex-col font-mono selection:bg-[var(--teal)]/20">
      
      {/* Blinking Cursor Terminal Styling Injected Globally */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-cursor::after {
          content: '_';
          animation: blink 1s step-end infinite;
          color: var(--teal);
        }
      `}} />

      {/* Top Banner Structure */}
      <div className="border-b border-[var(--border)] bg-[var(--bg)]/40">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <h1 className="text-xl font-bold uppercase tracking-wider text-[var(--text-bright-2)] terminal-cursor">
            TOKEN_LOCKER
          </h1>
          <p className="text-[11px] text-[var(--text-faint-2)] uppercase mt-0.5 tracking-wide">
            Production-grade timelock manager asset ecosystem.
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6 w-full flex-1 space-y-6">
        
        {/* Boot Terminal Diagnostic Header */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded p-4 font-mono">
          <div className="text-[var(--teal)] text-xs font-bold flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            BLAZELY_LOCKER v1.0.0
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 text-[11px]">
            <div className="text-[var(--text-faint-2)]"><span className="text-[var(--green)]">[OK]</span> Wallet Connected</div>
            <div className="text-[var(--text-faint-2)]"><span className="text-[var(--green)]">[OK]</span> Locker Contract Online</div>
            <div className="text-[var(--text-faint-2)]"><span className="text-[var(--green)]">[OK]</span> Database Synced</div>
            <div className="text-[var(--teal)] font-bold"><span className="text-[var(--teal)]">[READY]</span> Lock Manager Ready</div>
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
            <div key={i} className="bg-[var(--bg-alt)]/30 border border-[var(--border)] rounded p-4 flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-faint-2)] font-bold uppercase tracking-wider">{stat.label}</span>
              <span className="text-lg font-bold text-[var(--text-bright-2)] tracking-tight mt-1">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Action Alerts Block Area */}
        {transactionStatus && (
          <div className={`p-4 rounded border text-xs uppercase tracking-wide ${
            transactionStatus === "pending"
              ? "bg-[var(--amber)]/5 border-[var(--amber)]/20 text-[var(--amber)]"
              : transactionStatus === "success"
              ? "bg-[var(--green)]/5 border-[var(--green)]/20 text-[var(--green-2)]"
              : "bg-[var(--rose)]/5 border-[var(--rose)]/20 text-[var(--rose)]"
          }`}>
            {transactionStatus === "pending" && "» STATUS: WAITING FOR BLOCK CONFIRMATION..."}
            {transactionStatus === "success" && successTxData && (
              <div className="space-y-1">
                <div className="font-bold text-[var(--green-2)]">✓ Lock Created Successfully</div>
                <div className="text-[var(--text-mid-2)] mt-2">Amount: <span className="text-[var(--text-bright-2)]">{successTxData.amount}</span></div>
                <div className="text-[var(--text-mid-2)]">Unlock Date: <span className="text-[var(--text-bright-2)]">{successTxData.unlockDate}</span></div>
                <div className="text-[var(--text-mid-2)]">Tx: <span className="text-blue-400 break-all">{successTxData.txHash}</span></div>
                <button 
                  onClick={() => setTransactionStatus(null)} 
                  className="text-[10px] underline text-[var(--text-faint-2)] hover:text-[var(--text-mid)] uppercase block pt-1"
                >
                  Dismiss Terminal Message
                </button>
              </div>
            )}
            {transactionStatus === "error" && "» EXCEPTION: TRANSACTION REJECTED OR SLIPPAGE EXCEEDED."}
          </div>
        )}

        {validationError && (
          <Alert variant="error">» ERROR: {validationError}</Alert>
        )}

        {/* Middle Form + Activity Log Layout Feed Workspace Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Create Lock Dashboard Container Column */}
          <div className="bg-[var(--bg-alt)]/20 border border-[var(--border)] rounded p-6 lg:col-span-8 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <Shield className="w-4 h-4 text-[var(--text-mid-2)]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-mid-2)]">LOCK CONFIGURATION</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-faint-2)] mb-1.5">
                  Token Contract Address <span style={{ color: 'var(--teal)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={lockForm.tokenAddress}
                  onChange={(e) => setLockForm({ ...lockForm, tokenAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full p-2.5 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-faint-2)] mb-1.5">
                  Amount to Lock <span style={{ color: 'var(--teal)' }}>*</span>
                </label>
                <input
                  type="number"
                  value={lockForm.amount}
                  onChange={(e) => setLockForm({ ...lockForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-faint-2)] mb-1.5">
                  Lock Duration
                </label>
                <select
                  value={lockForm.duration}
                  onChange={(e) => setLockForm({ ...lockForm, duration: e.target.value })}
                  className="w-full p-2.5 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] focus:border-[var(--input-border-focus)] outline-none"
                >
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[var(--input-bg)] text-[var(--input-text)]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {lockForm.duration === "custom" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-faint-2)] mb-1.5">
                    Custom Duration Days
                  </label>
                  <input
                    type="number"
                    value={lockForm.customDuration}
                    onChange={(e) => setLockForm({ ...lockForm, customDuration: e.target.value })}
                    placeholder="Enter days"
                    className="w-full p-2.5 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-faint-2)] mb-1.5">
                Beneficiary Target Address <span className="text-[var(--border-hi)]">(Optional)</span>
              </label>
              <input
                type="text"
                value={lockForm.beneficiary}
                onChange={(e) => setLockForm({ ...lockForm, beneficiary: e.target.value })}
                placeholder="Defaults to connected wallet address if left blank"
                className="w-full p-2.5 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] outline-none"
              />
            </div>

            <button
              onClick={handleCreateLock}
              disabled={loading}
              style={{
                backgroundColor: (!loading) ? 'var(--teal)' : '',
                borderColor: (!loading) ? 'var(--teal)' : ''
              }}
              className="w-full font-bold uppercase text-xs tracking-widest text-[var(--bg)] py-3 rounded border transition-all duration-150 disabled:bg-[var(--panel-alt)] disabled:border-[var(--border)] disabled:text-[var(--border-mid)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[var(--bg)] border-t-transparent rounded-full animate-spin" />
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
          <div className="bg-[var(--bg-alt)]/20 border border-[var(--border)] rounded p-5 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)] mb-4">
                <Activity className="w-4 h-4 text-[var(--text-faint-2)]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-mid-2)]">RECENT ACTIVITY</h3>
              </div>
              
              <div className="space-y-3 text-[11px]">
                {activities.map((act) => (
                  <div key={act.id} className="bg-[var(--bg)]/40 border border-[var(--border)] p-2.5 rounded flex items-center justify-between">
                    <div>
                      <span className={`font-bold mr-2 ${act.type === 'LOCK' ? 'text-[var(--teal)]' : 'text-[var(--amber-2)]'}`}>
                        [{act.type}]
                      </span>
                      <span className="text-[var(--text-mid)] font-sans">{act.amount}</span>
                    </div>
                    <span className="text-[var(--border-mid)] text-[10px]">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <Alert variant="warning" title="Risk Protocol Notice" className="mt-6">
              Locked tokens cannot be retrieved or assigned under any conditions before the lock duration expiration date.
            </Alert>
          </div>

        </div>

        {/* Lower Active Table Component Feed Container Block */}
        <div className="space-y-4">
          
          {/* Filtering Tools Layout Row */}
          <div className="bg-[var(--bg-alt)]/20 border border-[var(--border)] rounded p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--border-mid)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="FILTER BY TOKEN SYMBOL OR NAME..."
                  className="w-full pl-9 p-2 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] outline-none uppercase tracking-wide"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--border-mid)]" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-[var(--input-bg)] rounded border border-[var(--input-border)] text-xs text-[var(--input-text)] focus:border-[var(--input-border-focus)] outline-none uppercase tracking-wide"
                >
                  <option value="all" className="bg-[var(--bg-alt)]">ALL ACTIVE LOCKS</option>
                  <option value="locked" className="bg-[var(--bg-alt)]">LOCKED MATRIX</option>
                  <option value="unlocked" className="bg-[var(--bg-alt)]">MATURED LOCKS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Core Table List Workspace Container */}
          <div className="bg-[var(--bg-alt)]/20 border border-[var(--border)] rounded overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-alt)]/40 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-mid-2)] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
                ACTIVE LOCKS ({filteredLocks.length})
              </h2>
              <div className="text-[10px] text-[var(--text-faint-2)] font-bold">MUTABILITY SECURED</div>
            </div>

            {loading ? (
              <Loading label="Syncing ledger registers..." />
            ) : filteredLocks.length === 0 ? (
              <div className="p-16 text-center text-[11px] text-[var(--border-mid)] border border-dashed border-[var(--border)]/40 rounded m-4 uppercase tracking-widest">
                <Lock className="w-6 h-6 text-[var(--border)] mx-auto mb-3" />
                No matching locks verified in registry indexes.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]/60">
                {filteredLocks.map((lock) => {
                  const metrics = getLockProgressMetrics(lock.lockDate, lock.unlockDate, lock.totalDurationDays);

                  return (
                    <div key={lock.id} className="p-5 hover:bg-[var(--bg-alt)]/10 transition-colors">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--teal)]">
                            {lock.tokenSymbol?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-bright-2)]">
                                {lock.tokenName}
                              </h3>
                              <span style={{ color: 'var(--teal)' }} className="text-[10px] bg-[var(--bg)] px-1.5 py-0.5 rounded border border-[var(--border)] font-bold">
                                ${lock.tokenSymbol}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--border-mid)] mt-0.5 truncate max-w-[240px] sm:max-w-none">
                              CA: {lock.tokenAddress}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-[var(--text-bright-2)] font-mono tracking-tight">
                            {lock.amount}
                          </p>
                          <p className="text-[9px] uppercase tracking-wider text-[var(--border-mid)] mt-0.5 font-mono">
                            VOLUME LOCKED
                          </p>
                        </div>
                      </div>

                      {/* Timeline Info Row Matrices + Ascii Progress Bars */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
                        <div className="bg-[var(--bg)]/60 border border-[var(--border)] rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-[var(--border-mid)] text-[9px] uppercase tracking-wider mb-0.5">
                            <Clock className="w-3 h-3" />
                            <span>LOCK DATE</span>
                          </div>
                          <p className="text-[var(--text-mid-2)] text-xs font-bold">
                            {lock.lockDate.toLocaleDateString('en-GB')}
                          </p>
                        </div>

                        <div className="bg-[var(--bg)]/60 border border-[var(--border)] rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-[var(--border-mid)] text-[9px] uppercase tracking-wider mb-0.5">
                            <Unlock className="w-3 h-3" />
                            <span>RELEASE DATE</span>
                          </div>
                          <p className="text-[var(--text-mid-2)] text-xs font-bold">
                            {lock.unlockDate.toLocaleDateString('en-GB')}
                          </p>
                        </div>

                        {/* Progress Tracker Block Element */}
                        <div className="bg-[var(--bg)]/60 border border-[var(--border)] rounded px-3 py-2">
                          <div className="flex items-center justify-between text-[var(--border-mid)] text-[9px] uppercase tracking-wider mb-1">
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> LOCK PERIOD</span>
                            <span className="text-[var(--teal)] font-bold">{metrics.percentage}%</span>
                          </div>
                          
                          {/* Shaded Terminal String Text Layer */}
                          <div className="text-[10px] text-[var(--text-mid-2)] leading-none tracking-widest select-none hidden sm:block">
                            {metrics.blocks}
                          </div>

                          {/* Functional CSS Progress Line */}
                          <div className="w-full h-1 bg-[var(--bg)] rounded overflow-hidden mt-1.5">
                            <div 
                              className="h-full bg-[var(--teal)] transition-all duration-300"
                              style={{ width: `${metrics.percentage}%` }}
                            />
                          </div>

                          <p className="text-[10px] font-bold uppercase text-[var(--text-mid-2)] mt-2">
                            {metrics.textString}
                          </p>
                        </div>
                      </div>

                      {lock.canUnlock && (
                        <button
                          onClick={() => handleUnlock(lock.id)}
                          disabled={loading}
                          className="w-full bg-[var(--green)] hover:bg-[var(--green)] disabled:bg-[var(--panel-alt)] text-[var(--bg)] disabled:text-[var(--border-mid)] text-xs font-bold uppercase tracking-widest py-2 rounded transition-colors flex items-center justify-center gap-1.5"
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
        <div className="border border-[var(--border)] bg-[var(--bg-alt)]/30 rounded p-3 text-[9px] uppercase tracking-wider text-[var(--border-mid)] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--border-mid)] shrink-0" />
          <span>VAULT ARCHITECTURE INTEGRATION: Production mainnet instances interact directly with standard smart contract RPC methods.</span>
        </div>
      </div>

    </div>
  );
}
