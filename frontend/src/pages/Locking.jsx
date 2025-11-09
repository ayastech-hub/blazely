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
} from "lucide-react";

// Mock contract functions - replace with actual ethers.js contract calls
const mockContractFunctions = {
  async lockTokens(tokenAddress, amount, duration, beneficiary) {
    // Simulate contract call
    console.log("Locking tokens:", {
      tokenAddress,
      amount,
      duration,
      beneficiary,
    });
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
    // Mock locked positions
    return [
      {
        id: 1,
        tokenAddress: "0x1234...5678",
        tokenSymbol: "MYTOKEN",
        tokenName: "My Token",
        amount: "1000.00",
        lockDate: new Date("2024-01-15"),
        unlockDate: new Date("2024-12-15"),
        beneficiary: wallet,
        status: "locked",
        canUnlock: false,
      },
      {
        id: 2,
        tokenAddress: "0x9876...5432",
        tokenSymbol: "LP-ETH",
        tokenName: "ETH-USDC LP",
        amount: "50.25",
        lockDate: new Date("2024-02-01"),
        unlockDate: new Date("2024-11-01"),
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
    if (!wallet) {
      alert("Please connect your wallet");
      return;
    }

    const { tokenAddress, amount, duration, beneficiary, customDuration } =
      lockForm;

    if (!tokenAddress || !amount) {
      alert("Please fill in all required fields");
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

      setTransactionStatus("success");
      setLockForm({
        tokenAddress: "",
        amount: "",
        duration: "30",
        beneficiary: "",
        customDuration: "",
      });

      // Reload locks
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
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "90", label: "90 Days" },
    { value: "180", label: "6 Months" },
    { value: "365", label: "1 Year" },
    { value: "custom", label: "Custom" },
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

    if (diff <= 0) return "Unlocked";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }

  const tabs = [
    { id: "create", label: "Create Lock", icon: Plus },
    { id: "manage", label: "My Locks", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Token Locking
            </h1>
            <p className="text-gray-300">
              Secure your tokens with time-based locks
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-purple-500 text-white shadow-lg"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Transaction Status */}
        {transactionStatus && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              transactionStatus === "pending"
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : transactionStatus === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {transactionStatus === "pending" && "Transaction pending..."}
            {transactionStatus === "success" && "Lock created successfully!"}
            {transactionStatus === "error" &&
              "Transaction failed. Please try again."}
          </div>
        )}

        {activeTab === "create" && (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">
                Create Token Lock
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Contract Address *
                  </label>
                  <input
                    type="text"
                    value={lockForm.tokenAddress}
                    onChange={(e) =>
                      setLockForm({ ...lockForm, tokenAddress: e.target.value })
                    }
                    placeholder="0x..."
                    className="w-full p-3 bg-black/40 rounded-lg border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount to Lock *
                  </label>
                  <input
                    type="number"
                    value={lockForm.amount}
                    onChange={(e) =>
                      setLockForm({ ...lockForm, amount: e.target.value })
                    }
                    placeholder="0.0"
                    className="w-full p-3 bg-black/40 rounded-lg border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lock Duration
                  </label>
                  <select
                    value={lockForm.duration}
                    onChange={(e) =>
                      setLockForm({ ...lockForm, duration: e.target.value })
                    }
                    className="w-full p-3 bg-black/40 rounded-lg border border-purple-500/30 text-white focus:border-purple-400 outline-none"
                  >
                    {durationOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className="bg-gray-800"
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {lockForm.duration === "custom" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Custom Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={lockForm.customDuration}
                      onChange={(e) =>
                        setLockForm({
                          ...lockForm,
                          customDuration: e.target.value,
                        })
                      }
                      placeholder="Enter days"
                      className="w-full p-3 bg-black/40 rounded-lg border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Beneficiary Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={lockForm.beneficiary}
                    onChange={(e) =>
                      setLockForm({ ...lockForm, beneficiary: e.target.value })
                    }
                    placeholder="Leave empty to use your address"
                    className="w-full p-3 bg-black/40 rounded-lg border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateLock}
                  disabled={loading || !wallet}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Creating Lock...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Create Lock
                    </>
                  )}
                </button>
              </div>

              {/* Info Panel */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-blue-400 font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  How Token Locking Works
                </h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-white">Deposit Tokens</p>
                      <p>Transfer your tokens to the locking contract</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-white">Time Lock</p>
                      <p>Tokens are locked for the specified duration</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        Unlock & Withdraw
                      </p>
                      <p>Claim your tokens after the lock period expires</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">Important</span>
                  </div>
                  <p className="text-sm text-yellow-300">
                    Once locked, tokens cannot be withdrawn until the unlock
                    date. Make sure you understand the lock duration before
                    proceeding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manage" && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by token name or symbol..."
                    className="w-full pl-10 p-3 bg-black/40 rounded-lg border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 outline-none"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-3 bg-black/40 rounded-lg border border-purple-500/30 text-white focus:border-purple-400 outline-none"
                  >
                    <option value="all" className="bg-gray-800">
                      All Locks
                    </option>
                    <option value="locked" className="bg-gray-800">
                      Active Locks
                    </option>
                    <option value="unlocked" className="bg-gray-800">
                      Unlocked
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Locks List */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
              <div className="p-6 border-b border-purple-500/20">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Lock className="w-6 h-6 text-purple-400" />
                  My Token Locks ({filteredLocks.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading your locks...</p>
                </div>
              ) : filteredLocks.length === 0 ? (
                <div className="p-8 text-center">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No locks found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your search or filters"
                      : "Create your first token lock"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-purple-500/10">
                  {filteredLocks.map((lock) => (
                    <div key={lock.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {lock.tokenSymbol}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {lock.tokenName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            {lock.amount}
                          </p>
                          <p className="text-gray-400 text-sm">Tokens Locked</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Lock Date</span>
                          </div>
                          <p className="text-white font-medium">
                            {lock.lockDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Unlock className="w-4 h-4" />
                            <span className="text-xs">Unlock Date</span>
                          </div>
                          <p className="text-white font-medium">
                            {lock.unlockDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Time Remaining</span>
                          </div>
                          <p
                            className={`font-medium ${
                              lock.canUnlock
                                ? "text-green-400"
                                : "text-yellow-400"
                            }`}
                          >
                            {formatTimeRemaining(lock.unlockDate)}
                          </p>
                        </div>
                      </div>

                      {lock.canUnlock && (
                        <button
                          onClick={() => handleUnlock(lock.id)}
                          disabled={loading}
                          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Unlock className="w-5 h-5" />
                          Unlock Tokens
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

      {/* Contract Integration Note */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Contract Integration Required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
