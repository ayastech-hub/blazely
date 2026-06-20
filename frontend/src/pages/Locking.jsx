// src/pages/Locking.jsx
import React, { useState, useEffect, useRef } from "react";
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
        unlockDate: new Date("2026-06-01"),
        beneficiary: wallet,
        status: "locked",
        canUnlock: true,
      },
    ];
  },
};

export default function Locking() {
  const { wallet } = useWallet();
  const [activeTab, setActiveTab] = useState("create");
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [validationError, setValidationError] = useState("");

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
    if (!wallet) {
      setValidationError("Wallet context unavailable. Please establish network connection.");
      return;
    }

    const { tokenAddress, amount, duration, beneficiary, customDuration } = lockForm;

    if (!tokenAddress || !amount) {
      setValidationError("Missing required attributes. Target parameters cannot remain empty.");
      return;
    }

    const lockDuration = duration === "custom" ? customDuration : duration;
    const lockBeneficiary = beneficiary || wallet;

    setTransactionStatus("pending");
    setLoading(true);

    try {
      await mockContractFunctions.lockTokens(
        tokenAddress,
        amount,
        parseInt(lockDuration),
        lockBeneficiary
      );

      setTransactionStatus("success");
      setLockForm({
        tokenAddress: "",
        amount: "",
        duration: "30",
        beneficiary: "",
        customDuration: "",
      });

      await loadUserLocks();
      setTimeout(() => setTransactionStatus(null), 5000);
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
    { value: "7", label: "07 DAYS" },
    { value: "30", label: "30 DAYS" },
    { value: "90", label: "90 DAYS" },
    { value: "180", label: "06 MONTHS" },
    { value: "365", label: "01 YEAR" },
    { value: "custom", label: "CUSTOM SEQUENCE" },
  ];

  const filteredLocks = locks.filter((lock) => {
    const matchesSearch =
      lock.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lock.tokenName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || lock.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  function formatTimeRemaining(unlockDate) {
    const now = new Date();
    const diff = unlockDate - now;

    if (diff <= 0) return "MATURED / UNLOCKED";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}D ${hours}H REMAINING`;
    return `${hours}H REMAINING`;
  }

  const tabs = [
    { id: "create", label: "Create Vault Lock", icon: Plus },
    { id: "manage", label: "Active Registries", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans">
      
      {/* Page Context Heading Header */}
      <div className="bg-[#0b0f19]/30 backdrop-blur-sm border-b border-slate-900">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <span className="w-1 h-3 rounded-sm" style={{ backgroundColor: '#96d6cd' }} />
                Protocol Escrow Engine
              </h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-1 tracking-wide">
                Time-locked cryptographic position containment sequence.
              </p>
            </div>

            {/* Tab Navigation Navigation Controls */}
            <div className="flex items-center gap-1.5 bg-[#0b0f19]/60 p-1 border border-slate-900 rounded">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setValidationError("");
                    }}
                    style={{
                      backgroundColor: isSelected ? '#96d6cd' : '',
                    }}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded text-[11px] font-mono font-bold uppercase transition-all border ${
                      isSelected
                        ? "text-[#030712] border-[#96d6cd] shadow-sm"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {/* Transaction Alerts Terminal Container */}
        {transactionStatus && (
          <div
            className={`mb-6 p-3 rounded font-mono text-xs border uppercase tracking-wide ${
              transactionStatus === "pending"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : transactionStatus === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {transactionStatus === "pending" && "» STATUS: TRANSACTION BLOCK CONFLICT PENDING IN MEMPOOL..."}
            {transactionStatus === "success" && "» STATUS: ESCROW POSITION VERIFIED. POSITION ASSIGNED TO LOCK VAULT."}
            {transactionStatus === "error" && "» STATUS: ESCROW INTERFACE ERROR. CRYPTOGRAPHIC SLIPPAGE CRASHED."}
          </div>
        )}

        {validationError && (
          <div className="mb-6 p-3 rounded font-mono text-xs border border-rose-500/20 bg-rose-500/10 text-rose-400 uppercase tracking-wide">
            » EXCEPTION: {validationError}
          </div>
        )}

        {activeTab === "create" && (
          <div className="bg-[#0b0f19]/20 border border-slate-900 rounded p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Locking Parameters Form Input Workspace */}
              <div className="space-y-5 lg:col-span-7">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900 mb-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Vault Parameters</h2>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                    Token Contract Address <span style={{ color: '#96d6cd' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={lockForm.tokenAddress}
                    onChange={(e) => setLockForm({ ...lockForm, tokenAddress: e.target.value })}
                    placeholder="0x..."
                    className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-200 placeholder-slate-700 focus:border-slate-800 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                    Position Core Volume to Lock <span style={{ color: '#96d6cd' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={lockForm.amount}
                    onChange={(e) => setLockForm({ ...lockForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-200 placeholder-slate-700 focus:border-slate-800 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                    Temporal Duration Cycle
                  </label>
                  <select
                    value={lockForm.duration}
                    onChange={(e) => setLockForm({ ...lockForm, duration: e.target.value })}
                    className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-400 focus:border-slate-800 outline-none"
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
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                      Custom Matrix Span (Days)
                    </label>
                    <input
                      type="number"
                      value={lockForm.customDuration}
                      onChange={(e) => setLockForm({ ...lockForm, customDuration: e.target.value })}
                      placeholder="ENTER PARAMETER DAYS"
                      className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-200 placeholder-slate-700 focus:border-slate-800 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                    Beneficiary Target Address <span className="text-slate-700">(OPTIONAL)</span>
                  </label>
                  <input
                    type="text"
                    value={lockForm.beneficiary}
                    onChange={(e) => setLockForm({ ...lockForm, beneficiary: e.target.value })}
                    placeholder="DEFAULT: LEAVE VACANT TO ASSIGN SENDER LOGGED WALLET"
                    className="w-full p-2.5 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-200 placeholder-slate-700 focus:border-slate-800 outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateLock}
                  disabled={loading}
                  style={{
                    backgroundColor: (!loading) ? '#96d6cd' : '',
                    borderColor: (!loading) ? '#96d6cd' : ''
                  }}
                  className="w-full mt-2 font-mono font-black uppercase text-xs tracking-widest text-[#030712] py-3 rounded border transition-all duration-150 disabled:bg-slate-900 disabled:border-slate-900 disabled:text-slate-600 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#030712] border-t-transparent rounded-full animate-spin" />
                      VAULT COMPILING...
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      INITIALIZE ESCROW LOCK
                    </>
                  )}
                </button>
              </div>

              {/* Documentation Help Framework Box */}
              <div className="lg:col-span-5 bg-[#0b0f19]/40 border border-slate-900 rounded p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-900 mb-4">
                    <Info className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Escrow Architecture</h3>
                  </div>
                  
                  <div className="space-y-4 font-mono text-[11px] text-slate-400">
                    <div className="flex gap-3">
                      <span className="text-[#96d6cd] font-bold">01/</span>
                      <p><strong className="text-slate-200 uppercase font-sans">Capital Extraction:</strong> Contract calls extract required token volume and safely pool assets into autonomous contract storage.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[#96d6cd] font-bold">02/</span>
                      <p><strong className="text-slate-200 uppercase font-sans">Epoch Seal:</strong> Smart contract immutable algorithms seal balance vectors under strict chronological conditions.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[#96d6cd] font-bold">03/</span>
                      <p><strong className="text-slate-200 uppercase font-sans">Autonomous Claim:</strong> Vault validation allows release logic execution only upon full epoch block expiration.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-3.5 bg-amber-500/5 border border-amber-500/10 rounded">
                  <div className="flex items-center gap-2 text-amber-500/80 text-[10px] font-mono uppercase tracking-wider mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Hard Rule Risk Isolation</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase leading-normal">
                    Once locked, tokens cannot be parsed, extracted or assigned. Protocol parameters are absolute. Operate with safety autonomy.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "manage" && (
          <div className="space-y-4">
            
            {/* Search Filter Modular Grid Headers */}
            <div className="bg-[#0b0f19]/20 border border-slate-900 rounded p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="FILTER SYMBOL OR PROFILE IDENTIFIER..."
                    className="w-full pl-9 p-2 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-200 placeholder-slate-700 focus:border-slate-800 outline-none uppercase tracking-wide"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-[#030712] rounded border border-slate-900 text-xs font-mono text-slate-400 focus:border-slate-800 outline-none uppercase tracking-wide"
                  >
                    <option value="all" className="bg-[#0b0f19]">ALL LOGGED ENTRIES</option>
                    <option value="locked" className="bg-[#0b0f19]">ACTIVE LOCK MATRIX</option>
                    <option value="unlocked" className="bg-[#0b0f19]">MATURED / UNLOCKED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Token Locks Sequence Feed Block */}
            <div className="bg-[#0b0f19]/20 border border-slate-900 rounded overflow-hidden">
              <div className="p-4 border-b border-slate-900 bg-[#0b0f19]/40 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" style={{ color: '#96d6cd' }} />
                  Escrow Balance Arrays ({filteredLocks.length})
                </h2>
                <div className="text-[10px] font-mono text-slate-500">SYSTEM SECURED</div>
              </div>

              {loading ? (
                <div className="p-12 text-center font-mono text-[11px] text-slate-600 uppercase tracking-widest">
                  <div className="w-4 h-4 border-2 border-[#96d6cd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Syncing active matrix tables...
                </div>
              ) : filteredLocks.length === 0 ? (
                <div className="p-16 text-center font-mono text-[11px] text-slate-600 border border-dashed border-slate-900/40 rounded m-4 uppercase tracking-widest">
                  <Lock className="w-6 h-6 text-slate-800 mx-auto mb-3" />
                  No matching lock registers found.
                </div>
              ) : (
                <div className="divide-y divide-slate-900/60">
                  {filteredLocks.map((lock) => (
                    <div key={lock.id} className="p-5 hover:bg-[#0b0f19]/30 transition-colors">
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#030712] border border-slate-900 flex items-center justify-center font-mono text-xs font-bold text-[#96d6cd]">
                            {lock.tokenSymbol?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                                {lock.tokenName}
                              </h3>
                              <span style={{ color: '#96d6cd' }} className="text-[10px] font-mono bg-[#030712] px-1.5 py-0.5 rounded border border-slate-900">
                                ${lock.tokenSymbol}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate max-w-[240px] sm:max-w-none">
                              CA: {lock.tokenAddress}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono">
                          <p className="text-sm font-black text-slate-200">
                            {lock.amount}
                          </p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-600 mt-0.5">
                            VAULT TOKEN VOLUME
                          </p>
                        </div>
                      </div>

                      {/* Info Parameters Sub-Row Data Matrices */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 font-mono">
                        <div className="bg-[#030712]/60 border border-slate-900 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-slate-600 text-[9px] uppercase tracking-wider mb-0.5">
                            <Clock className="w-3 h-3" />
                            <span>TIMESTAMP LOCK</span>
                          </div>
                          <p className="text-slate-400 text-xs font-bold">
                            {lock.lockDate.toLocaleDateString()}
                          </p>
                        </div>

                        <div className="bg-[#030712]/60 border border-slate-900 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-slate-600 text-[9px] uppercase tracking-wider mb-0.5">
                            <Unlock className="w-3 h-3" />
                            <span>TIMESTAMP RELEASE</span>
                          </div>
                          <p className="text-slate-400 text-xs font-bold">
                            {lock.unlockDate.toLocaleDateString()}
                          </p>
                        </div>

                        <div className="bg-[#030712]/60 border border-slate-900 rounded px-3 py-2">
                          <div className="flex items-center gap-1.5 text-slate-600 text-[9px] uppercase tracking-wider mb-0.5">
                            <Clock className="w-3 h-3" />
                            <span>VAULT CHRONO</span>
                          </div>
                          <p className={`text-xs font-bold uppercase ${lock.canUnlock ? "text-emerald-400" : "text-amber-500"}`}>
                            {formatTimeRemaining(lock.unlockDate)}
                          </p>
                        </div>
                      </div>

                      {lock.canUnlock && (
                        <button
                          onClick={() => handleUnlock(lock.id)}
                          disabled={loading}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 text-[#030712] disabled:text-slate-600 text-xs font-mono font-black uppercase tracking-widest py-2 rounded transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          EXECUTE VAULT RELEASE CLAIMS
                        </button>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Engineering Footnote Isolation Box */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full font-mono">
        <div className="border border-slate-900 bg-[#0b0f19]/30 rounded p-3 text-[9px] uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>VAULT INFRASTRUCTURE INTEGRATION: Local testing matrix layer enabled. Mainnet deployments trigger standard secure hardware hooks.</span>
        </div>
      </div>

    </div>
  );
}
