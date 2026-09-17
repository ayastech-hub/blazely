// src/tabP/DevToolsTab.jsx
//
// Profile > Dev Tools: everything a token creator needs in one place —
// claimable creator fees, and every lock they hold across all their tokens,
// with a one-click "Unlock All" instead of having to go unlock each one
// individually on the Locking page.
//
// UI ONLY for now — see lib/mockContractFunctions.js for the full note on
// what's mocked and what a real implementation needs to wire up.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Lock, Unlock, ExternalLink, ChevronRight, ShieldCheck } from "lucide-react";
import { C } from "../utils/designForProfile";
import Loading from "../components/ui/Loading";
import Alert from "../components/ui/Alert";
import { mockContractFunctions } from "../lib/mockContractFunctions";

function SectionCard({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div
      className="p-5 sm:p-6"
      style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, borderRadius: C.radiusCard, boxShadow: C.shadowCard }}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: C.tealDim, color: C.teal }}>
            <Icon size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: C.bright }}>{title}</h3>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: C.sub }}>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ClaimFeesCard({ address }) {
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mockContractFunctions.getClaimableFees(address).then((data) => {
      if (!cancelled) {
        setFees(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [address]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await mockContractFunctions.claimFees(address);
      setClaimed(result);
      setFees((prev) => (prev ? { ...prev, claimableEth: "0.0000", perToken: [] } : prev));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <SectionCard icon={Coins} title="Creator Fees" subtitle="Trading fees earned from tokens you created">
      {loading ? (
        <Loading label="Loading fee balance..." size="sm" />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: C.bright, fontFamily: "monospace" }}>
                {fees.claimableEth} ETH
              </p>
              <p className="text-xs mt-1" style={{ color: C.sub }}>
                ≈ ${fees.claimableUsd} claimable · {fees.lifetimeClaimedEth} ETH claimed lifetime
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming || Number(fees.claimableEth) <= 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{ backgroundColor: C.teal, color: C.bg }}
            >
              {claiming ? "Claiming..." : "Claim Fees"}
            </button>
          </div>

          {fees.perToken?.length > 0 && (
            <div className="space-y-1.5 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
              {fees.perToken.map((t) => (
                <div key={t.tokenAddress} className="flex items-center justify-between text-xs py-1">
                  <span style={{ color: C.sub }}>${t.tokenSymbol}</span>
                  <span className="tabular-nums" style={{ color: C.mid, fontFamily: "monospace" }}>{t.claimableEth} ETH</span>
                </div>
              ))}
            </div>
          )}

          {claimed && (
            <div className="mt-3">
              <Alert variant="success" title="Fees claimed">
                {claimed.claimedEth} ETH sent to your wallet.
              </Alert>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

function LocksCard({ address }) {
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mockContractFunctions.getUserLocks(address).then((data) => {
      if (!cancelled) {
        setLocks(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [address]);

  const unlockableIds = locks.filter((l) => l.canUnlock).map((l) => l.id);

  const handleUnlockAll = async () => {
    setUnlocking(true);
    try {
      const res = await mockContractFunctions.unlockAllTokens(unlockableIds);
      setResult(res);
      setLocks((prev) => prev.map((l) => (l.canUnlock ? { ...l, status: "unlocked", canUnlock: false } : l)));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <SectionCard
      icon={Lock}
      title="Your Locks"
      subtitle={`${locks.length} lock${locks.length === 1 ? "" : "s"} across all your tokens`}
      action={
        <Link
          to="/locking"
          className="text-xs font-semibold flex items-center gap-1 shrink-0 hover:underline"
          style={{ color: C.teal }}
        >
          Create lock <ChevronRight size={12} />
        </Link>
      }
    >
      {loading ? (
        <Loading label="Loading locks..." size="sm" />
      ) : locks.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: C.sub }}>
          No locks yet — create one from the Locking page.
        </p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {locks.map((lock) => (
              <div
                key={lock.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}` }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: C.bright }}>
                    {lock.amount} {lock.tokenSymbol}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.sub }}>
                    {lock.status === "unlocked" ? "Unlocked" : `Unlocks ${lock.unlockDate.toLocaleDateString()}`}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
                  style={{
                    color: lock.canUnlock ? C.teal : C.sub,
                    backgroundColor: lock.canUnlock ? C.tealDim : "transparent",
                    border: `1px solid ${lock.canUnlock ? C.teal + "40" : C.borderSoft}`,
                  }}
                >
                  {lock.status === "unlocked" ? "Unlocked" : lock.canUnlock ? "Ready" : "Locked"}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleUnlockAll}
            disabled={unlocking || unlockableIds.length === 0}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: unlockableIds.length > 0 ? C.teal : C.panel, color: unlockableIds.length > 0 ? C.bg : C.sub }}
          >
            <Unlock size={15} />
            {unlocking ? "Unlocking..." : `Unlock All${unlockableIds.length ? ` (${unlockableIds.length})` : ""}`}
          </button>

          {result && (
            <div className="mt-3">
              <Alert variant="success" title="Unlocked">
                {result.count} lock{result.count === 1 ? "" : "s"} released to your wallet.
              </Alert>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

export default function DevToolsTab({ address }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ClaimFeesCard address={address} />
      <LocksCard address={address} />
      <div className="lg:col-span-2">
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-xs"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.sub }}
        >
          <ShieldCheck size={14} style={{ color: C.teal }} className="shrink-0" />
          Fee claiming and batch unlocking shown here are UI previews — contract wiring lands in a follow-up pass.
        </div>
      </div>
    </div>
  );
}
