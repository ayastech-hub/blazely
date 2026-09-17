// src/pages/Locking.jsx — v2
// Clean token lock manager. Minimal copy, professional form + lock list.
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import Loading from "../components/ui/Loading";
import Alert from "../components/ui/Alert";
import { Lock, Unlock, Clock } from "lucide-react";
import { mockContractFunctions } from "../lib/mockContractFunctions";

const DURATIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "custom", label: "Custom" },
];

function progress(lockDate, unlockDate) {
  const now = Date.now();
  const start = lockDate.getTime();
  const end = unlockDate.getTime();
  if (now >= end) return { pct: 100, daysLeft: 0, label: "Ready" };
  const pct = Math.min(100, Math.max(0, Math.floor(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { pct, daysLeft, label: `${daysLeft}d left` };
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/50 border border-white/[0.06] text-sm text-[var(--text-bright-2)] placeholder:text-[var(--text-faint-2)] focus:border-teal/30 focus:outline-none transition-colors";

const labelClass = "block text-xs text-[var(--text-mid-2)] mb-1.5";

export default function Locking() {
  const { wallet } = useWallet();
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null); // pending | success | error
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    tokenAddress: "",
    amount: "",
    duration: "30",
    beneficiary: "",
    customDuration: "",
  });

  useEffect(() => {
    if (wallet) loadLocks();
  }, [wallet]);

  async function loadLocks() {
    setLoading(true);
    try {
      const data = await mockContractFunctions.getUserLocks(wallet);
      setLocks(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function createLock() {
    setError("");
    setSuccess(null);
    if (!wallet) return setError("Connect your wallet first.");

    const { tokenAddress, amount, duration, beneficiary, customDuration } = form;
    if (!tokenAddress || !amount) return setError("Token address and amount are required.");

    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return setError("Enter a valid positive amount.");

    let days = duration;
    if (duration === "custom") {
      const c = Number(customDuration);
      if (!Number.isFinite(c) || c <= 0) return setError("Enter a valid custom duration.");
      days = customDuration;
    }

    setStatus("pending");
    setLoading(true);
    try {
      const result = await mockContractFunctions.lockTokens(
        tokenAddress,
        amount,
        parseInt(days, 10),
        beneficiary || wallet
      );
      const unlock = new Date();
      unlock.setDate(unlock.getDate() + parseInt(days, 10));
      setSuccess({
        amount,
        unlockDate: unlock.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        txHash: result.txHash,
      });
      setStatus("success");
      setForm({ tokenAddress: "", amount: "", duration: "30", beneficiary: "", customDuration: "" });
      await loadLocks();
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus(null), 4000);
    }
    setLoading(false);
  }

  async function unlock(id) {
    if (!wallet) return;
    setLoading(true);
    try {
      await mockContractFunctions.unlockTokens(id);
      await loadLocks();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const filtered = locks.filter((l) => {
    const q = search.toLowerCase();
    const match =
      !q ||
      l.tokenSymbol?.toLowerCase().includes(q) ||
      l.tokenName?.toLowerCase().includes(q);
    const statusOk = filter === "all" || l.status === filter;
    return match && statusOk;
  });

  return (
    <div className="max-w-[1000px] mx-auto py-10 sm:py-14">
      {/* Header */}
      <div className="mb-10">
        <h1
          className="text-3xl sm:text-4xl text-[var(--text-bright)] tracking-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
        >
          Lock
        </h1>
        <p className="mt-2 text-sm text-[var(--text-mid-2)] max-w-md">
          Lock tokens or LP for a set period. Builds trust — team tokens stay locked until maturity.
        </p>
      </div>

      {/* Status messages */}
      {status === "pending" && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-amber/20 bg-amber/5 text-sm text-amber">
          Confirming transaction…
        </div>
      )}
      {status === "success" && success && (
        <div className="mb-6 px-4 py-3.5 rounded-xl border border-green/20 bg-green/5 text-sm">
          <div className="font-medium text-[var(--green-2)]">Lock created</div>
          <div className="mt-1 text-[var(--text-mid-2)]">
            {success.amount} · unlocks {success.unlockDate}
          </div>
          <button
            onClick={() => setStatus(null)}
            className="mt-2 text-xs text-[var(--text-faint-2)] hover:text-[var(--text-mid)]"
          >
            Dismiss
          </button>
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-rose/20 bg-rose/5 text-sm text-rose">
          Transaction failed
        </div>
      )}
      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Create form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-medium text-[var(--text-bright-2)]">New lock</h2>

            <div>
              <label className={labelClass}>Token address</label>
              <input
                type="text"
                value={form.tokenAddress}
                onChange={(e) => setForm({ ...form, tokenAddress: e.target.value })}
                placeholder="0x…"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Duration</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className={inputClass}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {form.duration === "custom" && (
              <div>
                <label className={labelClass}>Days</label>
                <input
                  type="number"
                  value={form.customDuration}
                  onChange={(e) => setForm({ ...form, customDuration: e.target.value })}
                  placeholder="e.g. 60"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>
                Beneficiary <span className="text-[var(--text-faint-2)]">(optional)</span>
              </label>
              <input
                type="text"
                value={form.beneficiary}
                onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}
                placeholder="Defaults to your wallet"
                className={inputClass}
              />
            </div>

            <button
              onClick={createLock}
              disabled={loading || !wallet}
              className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading || !wallet ? "var(--panel)" : "var(--teal)",
                color: loading || !wallet ? "var(--text-faint-2)" : "var(--bg)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock size={15} />
              )}
              {loading ? "Locking…" : "Create lock"}
            </button>

            {!wallet && (
              <p className="text-xs text-center text-[var(--text-faint-2)]">
                Connect wallet to create a lock
              </p>
            )}
          </div>
        </div>

        {/* Locks list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search locks…"
              className={`${inputClass} flex-1`}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`${inputClass} sm:w-36`}
            >
              <option value="all">All</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {loading && locks.length === 0 ? (
              <div className="py-16">
                <Loading label="Loading…" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Lock size={22} className="mx-auto mb-3 text-[var(--border-hi)]" />
                <p className="text-sm text-[var(--text-faint-2)]">
                  {wallet ? "No locks found" : "Connect wallet to view locks"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filtered.map((lock) => {
                  const m = progress(lock.lockDate, lock.unlockDate);
                  return (
                    <div key={lock.id} className="p-4 sm:p-5 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg)]/60 border border-white/[0.06] flex items-center justify-center text-xs font-medium text-teal shrink-0">
                            {lock.tokenSymbol?.[0] || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-bright-2)] truncate">
                              {lock.tokenName}
                            </div>
                            <div
                              className="text-[11px] text-[var(--text-faint-2)]"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {lock.tokenSymbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-sm font-medium text-[var(--text-bright-2)] tabular-nums"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {lock.amount}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-[var(--text-faint-2)] mb-2.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {lock.lockDate.toLocaleDateString("en-GB")} →{" "}
                          {lock.unlockDate.toLocaleDateString("en-GB")}
                        </span>
                        <span className={m.pct === 100 ? "text-teal" : ""}>{m.label}</span>
                      </div>

                      <div className="h-1 rounded-full bg-[var(--bg)] overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-teal transition-all duration-500"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>

                      {lock.canUnlock && (
                        <button
                          onClick={() => unlock(lock.id)}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-green/10 text-[var(--green-2)] border border-green/15 hover:bg-green/15 transition-colors disabled:opacity-40"
                        >
                          <Unlock size={13} />
                          Unlock
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
    </div>
  );
}
