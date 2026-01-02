// src/pages/Leaderboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Copy, Check } from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";

/* -------------------------------------------------------------------------- */
/* ----------------------------- Mock / Seed Data ---------------------------- */
/* -------------------------------------------------------------------------- */
const initialLeaderboard = [
  { rank: 1, address: "0x7a2...b3c4", volumeETH: 15.23, invites: 112 },
  { rank: 2, address: "0xf8d...a1e9", volumeETH: 12.81, invites: 98 },
  { rank: 3, address: "0x3e9...c5f0", volumeETH: 11.05, invites: 85 },
  { rank: 4, address: "0x9c1...d6a3", volumeETH: 9.77, invites: 76 },
  { rank: 5, address: "0xb4a...f2e1", volumeETH: 8.91, invites: 71 },
  { rank: 6, address: "0x1d5...e8c7", volumeETH: 8.24, invites: 65 },
  { rank: 7, address: "0x5f0...b9d2", volumeETH: 7.66, invites: 63 },
];

const ETH_PRICE_USD = 2000;
const REWARD_RATE = 0.01;
const LS_KEY_USERS = "blz_leaderboard_users_v1";
const LS_KEY_PENDING_REFERRALS = "blz_pending_referrals_v1";

/* -------------------------------------------------------------------------- */
/* --------------------------- Helper utilities ------------------------------ */
/* -------------------------------------------------------------------------- */
function short(addr = "") {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getPendingReferrals() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_PENDING_REFERRALS) || "{}");
  } catch {
    return {};
  }
}
function setPendingReferrals(obj) {
  localStorage.setItem(LS_KEY_PENDING_REFERRALS, JSON.stringify(obj));
}

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_USERS) || "{}");
  } catch {
    return {};
  }
}
function setStoredUsers(obj) {
  localStorage.setItem(LS_KEY_USERS, JSON.stringify(obj));
}

/* -------------------------------------------------------------------------- */
/* -------------------------- Referral / storage logic ----------------------- */
/* -------------------------------------------------------------------------- */
function recordReferralHitFromURL() {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (!ref) return;
    const pending = getPendingReferrals();
    if (!pending[ref]) pending[ref] = { hits: 0, volumeETH: 0 };
    pending[ref].hits += 1;
    setPendingReferrals(pending);
  } catch (e) {
    // ignore
  }
}

function mergePendingReferralsIntoUser(address) {
  const normalized = (address || "").toLowerCase();
  if (!normalized) return null;
  const pending = getPendingReferrals();
  const stored = getStoredUsers();
  const shortId = normalized.replace(/^0x/, "").slice(0, 6);
  const refsToMerge = [];
  if (pending[normalized]) refsToMerge.push(normalized);
  if (pending[shortId]) refsToMerge.push(shortId);

  if (!stored[normalized]) {
    stored[normalized] = {
      address: normalized,
      invites: 0,
      volumeETH: 0,
      availableRewardUSD: 0,
    };
  }

  refsToMerge.forEach((refKey) => {
    const data = pending[refKey];
    if (!data) return;
    const invitesFromHits = data.hits || 0;
    stored[normalized].invites =
      (stored[normalized].invites || 0) + invitesFromHits;
    const vol = data.volumeETH || 0;
    stored[normalized].volumeETH = (stored[normalized].volumeETH || 0) + vol;
    const addedUSD = vol * ETH_PRICE_USD * REWARD_RATE;
    stored[normalized].availableRewardUSD =
      (stored[normalized].availableRewardUSD || 0) + addedUSD;
    delete pending[refKey];
  });

  setStoredUsers(stored);
  setPendingReferrals(pending);

  return stored[normalized];
}

/* -------------------------------------------------------------------------- */
/* ----------------------------- UI Subcomponents --------------------------- */
/* -------------------------------------------------------------------------- */
const WalletGlass = ({ onConnectClick }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative pointer-events-auto max-w-md w-full mx-4 p-6 rounded-2xl  text-center">
      <h3 className="text-xl font-semibold text-white mb-2">
        Please connect your Web3 wallet
      </h3>
      <p className="text-sm text-slate-300 mb-4">
        To participate in the referral program and claim rewards you must
        connect your wallet.
      </p>
      <div className="flex items-center justify-center">
        <div onClick={onConnectClick} className="w-full">
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg"
              >
                Connect Wallet
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    </div>
  </div>
);

function YourReferralCard({ user, onClaim }) {
  const [copied, setCopied] = useState(false);
  const referralLink = useMemo(() => {
    if (!user?.address) return `${window.location.origin}/?ref=guest`;
    return `${window.location.origin}/?ref=${user.address.toLowerCase()}`;
  }, [user]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = referralLink;
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const volumeUSD = (user?.volumeETH || 0) * ETH_PRICE_USD;
  const availableReward = user?.availableRewardUSD ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-5 rounded-2xl border border-slate-800/40 bg-gradient-to-br from-slate-900/60 to-slate-900/30"
    >
      <h2 className="text-lg font-bold text-white mb-3">Your Referral Zone</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-center">
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-400">Your Rank</p>
          <p className="text-2xl font-bold text-cyan-400">
            {user?.rank ?? "-"}
          </p>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-400">Referral Volume (USD)</p>
          <p className="text-2xl font-bold text-white">
            ${volumeUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-400">Total Invites</p>
          <p className="text-2xl font-bold text-white">{user?.invites ?? 0}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 overflow-x-auto">
          {referralLink}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
          >
            {copied ? (
              <>
                <Check size={16} /> Copied
              </>
            ) : (
              <>
                <Copy size={16} /> Copy
              </>
            )}
          </button>
          <button
            onClick={() => onClaim && onClaim(user)}
            disabled={availableReward <= 0}
            className={`px-4 py-2 rounded-lg font-semibold ${
              availableReward > 0
                ? "bg-emerald-500 hover:brightness-95 text-black"
                : "bg-slate-700 text-slate-300 cursor-not-allowed"
            }`}
          >
            Claim $
            {availableReward.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* ----------------------------- Podium + Table UI --------------------------- */
/* -------------------------------------------------------------------------- */
const PodiumItem = ({ item, rank }) => {
  const styleMap = {
    1: {
      label: "text-yellow-400",
      shadow: "shadow-[0_0_20px_rgba(250,204,21,0.25)]",
    },
    2: {
      label: "text-slate-300",
      shadow: "shadow-[0_0_20px_rgba(156,163,175,0.18)]",
    },
    3: {
      label: "text-orange-400",
      shadow: "shadow-[0_0_20px_rgba(251,146,60,0.18)]",
    },
  };
  const style = styleMap[rank] || styleMap[3];
  return (
    <div
      className={`relative p-4 rounded-xl border bg-slate-900/70 ${style.shadow}`}
    >
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-900 p-2 rounded-full">
        <Trophy size={28} className={style.label} />
      </div>
      <div className="mt-4 text-center">
        <div className={`text-3xl font-bold ${style.label}`}>#{rank}</div>
        <div className="mt-2 font-mono text-sm text-white truncate">
          {item.address}
        </div>
        <div className="mt-2 font-mono text-cyan-400 text-lg">
          $
          {(item.volumeETH * ETH_PRICE_USD).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
};

const LeaderboardRow = ({ u, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.25, delay: 0.03 * idx }}
    className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg ${
      u.isCurrent
        ? "bg-purple-500/10 border border-purple-500/40"
        : "hover:bg-slate-800/50"
    }`}
  >
    <div className="col-span-1 text-lg font-bold text-white">#{u.rank}</div>
    <div className="col-span-6 font-mono text-sm text-slate-200 truncate">
      {u.address}
    </div>
    <div className="col-span-3 text-right font-semibold text-white">
      $
      {(u.volumeETH * ETH_PRICE_USD).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}
    </div>
    <div className="col-span-2 text-right text-slate-400">{u.invites}</div>
  </motion.div>
);

/* -------------------------------------------------------------------------- */
/* --------------------------------- Page ----------------------------------- */
/* -------------------------------------------------------------------------- */
export default function Leaderboard() {
  const { address, isConnected } = useAccount();
  const [usersMap, setUsersMap] = useState(() => getStoredUsers());
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [showGlass, setShowGlass] = useState(false);

  useEffect(() => {
    recordReferralHitFromURL();
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setShowGlass(true);
      return;
    }
    setShowGlass(false);
    const lower = address.toLowerCase();
    const merged = mergePendingReferralsIntoUser(lower);
    const stored = getStoredUsers();
    if (!stored[lower]) {
      stored[lower] = {
        address: lower,
        invites: 0,
        volumeETH: 0,
        availableRewardUSD: 0,
        rank: "-",
      };
    }
    setStoredUsers(stored);
    setUsersMap(stored);

    if (merged) {
      setLeaderboard((prev) => {
        const idx = prev.findIndex(
          (p) =>
            (p.address || "").toLowerCase() === merged.address.toLowerCase()
        );
        const entry = {
          rank: merged.rank || (idx >= 0 ? prev[idx].rank : prev.length + 1),
          address: merged.address,
          volumeETH: merged.volumeETH || 0,
          invites: merged.invites || 0,
          isCurrent: merged.address === lower,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [entry, ...prev];
      });
    }
  }, [isConnected, address]);

  useEffect(() => {
    const stored = getStoredUsers();
    setUsersMap(stored);
  }, []);

  const rows = leaderboard.map((l) => {
    const low = (address || "").toLowerCase();
    return { ...l, isCurrent: low && l.address.toLowerCase() === low };
  });

  const currentUser = useMemo(() => {
    const low = (address || "").toLowerCase();
    if (low && usersMap[low]) {
      return { address: low, ...usersMap[low] };
    }
    const found = leaderboard.find((x) => x.address.toLowerCase() === low);
    if (found) {
      return {
        address: found.address,
        invites: found.invites || 0,
        volumeETH: found.volumeETH || 0,
        availableRewardUSD: 0,
        rank: found.rank,
      };
    }
    return {
      address: low || null,
      invites: 0,
      volumeETH: 0,
      availableRewardUSD: 0,
      rank: "-",
    };
  }, [address, usersMap, leaderboard]);

  const handleClaim = (user) => {
    if (!user || !user.address) return;
    const low = user.address.toLowerCase();
    const stored = getStoredUsers();
    const me = stored[low] || {
      address: low,
      invites: 0,
      volumeETH: 0,
      availableRewardUSD: 0,
    };
    if (!me || (me.availableRewardUSD || 0) <= 0) {
      alert("No rewards available to claim.");
      return;
    }
    me.availableRewardUSD = 0;
    stored[low] = me;
    setStoredUsers(stored);
    setUsersMap(stored);
    alert(
      "Claim successful — (simulated). In production this will trigger a server-side payout."
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
            Referral Leaderboard
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Invite others to climb the ranks and earn rewards. Connect your
            wallet to get your referral link and claim rewards.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <YourReferralCard user={currentUser} onClaim={handleClaim} />
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-900/50">
              <h3 className="text-sm text-slate-300 mb-2">Available Reward</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    $
                    {(currentUser.availableRewardUSD || 0).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 2 }
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Estimated (simulated)
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleClaim(currentUser)}
                    className={`px-3 py-2 rounded-lg font-semibold ${
                      (currentUser.availableRewardUSD || 0) > 0
                        ? "bg-emerald-500 text-black"
                        : "bg-slate-700 text-slate-300 cursor-not-allowed"
                    }`}
                    disabled={(currentUser.availableRewardUSD || 0) <= 0}
                  >
                    Claim
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-900/50">
              <h3 className="text-sm text-slate-300 mb-2">Top 3</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {leaderboard.slice(0, 3).map((it, i) => (
                  <PodiumItem
                    key={it.address}
                    item={it}
                    rank={it.rank || i + 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 rounded-2xl border border-slate-800/40 bg-gradient-to-br from-slate-900/60 to-slate-900/30">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6">User</div>
            <div className="col-span-3 text-right">Volume (USD)</div>
            <div className="col-span-2 text-right">Invites</div>
          </div>
          <div className="space-y-3 mt-3">
            {rows.map((r, i) => (
              <LeaderboardRow
                key={`${r.address}-${r.rank}-${i}`}
                u={r}
                idx={i}
              />
            ))}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <WalletGlass
              onConnectClick={() => {
                /* ConnectKit button handles modal via its Custom component */
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
