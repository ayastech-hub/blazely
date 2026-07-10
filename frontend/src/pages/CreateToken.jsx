/**
 * =================================================================================
 * CreateToken.jsx
 * =================================================================================
 *
 * FLOW (matches backend/token-creation-listener.js):
 *
 *   1. User fills the form (on-chain fields: name/symbol/initial buy — off-chain fields:
 *      logo/description/socials).
 *   2. On submit, we FIRST call POST /api/token/prepare with the off-chain metadata + logo.
 *      This stages the metadata in `pending_tokens`, keyed by (wallet, name, symbol).
 *      If this fails, we STOP here and show an error — we deliberately do not let the user
 *      pay gas for a token that would have no logo/description/socials attached.
 *   3. Only after prepare succeeds do we open the wallet and call the contract's create().
 *   4. We decode the token address from the TokenCreated event in the receipt LOCALLY —
 *      no backend round trip needed for this, we already have everything in the receipt.
 *   5. Success screen shows immediately. The actual `tokens` row (metadata + on-chain data
 *      merged) is written by the backend listener within a few seconds, independently of
 *      this component — we don't block the success screen on that, we just optionally
 *      show a "finalizing" indicator via a lightweight Supabase Realtime subscription.
 *
 * BUGS FIXED vs. the previous version of this file (kept here as a maintenance changelog —
 * delete this comment block once the team has read it):
 *
 *   - Wallet-connect button was unusable: `disabled={isDeployDisabled}` was applied
 *     unconditionally, so before the form was valid, the button couldn't even be clicked to
 *     OPEN the wallet-connect modal. Fixed: the disabled check now only applies to the
 *     "Deploy" action; "Connect Wallet" is always clickable.
 *   - `contract.create(name, symbol, { gasLimit, value })` was missing the required
 *     `minTokensOut` argument — the overrides object was being interpreted as that 3rd
 *     positional argument instead, which would fail to encode as a uint256. Fixed: passes
 *     `minTokensOut` explicitly (see comment at the call site for why 0 is safe here).
 *   - Listened for event name `"Launched"`, but the deployed contract emits `TokenCreated`.
 *     Fixed.
 *   - Hardcoded fallback contract address (and it wasn't even a valid 40-hex-char address).
 *     Fixed: the launchpad address is required from env, with a clear startup error if
 *     missing — no silent fallback to a wrong address.
 *   - `name` allowed up to 40 characters, `symbol` up to 15 — the deployed contract's actual
 *     limits are 32 and 16 bytes respectively (see contracts/BlazelyLaunchpad.sol
 *     MAX_NAME_LENGTH / MAX_SYMBOL_LENGTH). A too-long name would revert on-chain after the
 *     user already paid gas. Fixed to match exactly.
 *   - Two independent, slightly different implementations of the same ETH/initial-buy
 *     validation existed (one in this component, one duplicated inside
 *     `InitialBuySection`) — they could disagree about whether an amount was valid. Fixed:
 *     single source of truth (`ethValidation`), passed down as props.
 *   - Frontend wrote directly to the `tokens` table using the anon Supabase key. This table's
 *     RLS policy only grants SELECT to anon (see indexer/sql/003_views_and_rls.sql) — this
 *     write would simply fail silently against a real deployment. Fixed: metadata now flows
 *     through the backend's /api/token/prepare + listener merge instead of a direct client
 *     write.
 *   - `useBalance({ watch: true })` — `watch` was a wagmi v1 option, removed in v2. Fixed to
 *     use `query: { refetchInterval }`.
 *   - No network/chain check — a user connected to the wrong chain would get a confusing
 *     contract-not-found style failure. Fixed: checks `chainId` against the expected chain and
 *     prompts a switch before allowing deployment.
 *   - Contract custom errors (SlippageExceeded, InitialBuyTooLarge, NameTooLong, etc.) were
 *     never decoded into readable messages. Fixed: attempts to decode via the contract
 *     interface before falling back to a generic message.
 * =================================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { BrowserProvider } from "ethers";
import { ethers } from "ethers";
import {
  UploadCloud,
  Copy,
  ExternalLink,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------------
// Environment / configuration
// ---------------------------------------------------------------------------------
// Vite convention (import.meta.env.VITE_*) is used here. If this project uses Create React
// App instead, swap every `import.meta.env.VITE_X` below for `process.env.REACT_APP_X`.
// ---------------------------------------------------------------------------------
const LAUNCHPAD_ADDRESS = import.meta.env.VITE_LAUNCHPAD_ADDRESS;
const EXPECTED_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "11155111", 10);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // e.g. https://api.yourbackend.com
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!LAUNCHPAD_ADDRESS) {
  // Fail loudly at module load rather than silently falling back to a wrong/placeholder
  // address — the bug this replaces cost real gas for users hitting a bad contract address.
  // eslint-disable-next-line no-console
  console.error(
    "VITE_LAUNCHPAD_ADDRESS is not set — token creation will not work until this is configured."
  );
}

// Only need read access (anon key) here — writes to `tokens` never happen from the frontend,
// see the flow comment at the top of this file.
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Minimal ABI: only what THIS component calls directly. The full ABI lives in your contracts
// project (contracts/abi/BlazelyLaunchpad.abi.json) — swap this for an import of that file if
// you'd rather have one source of truth; inlined here to keep this component copy-pasteable.
const LAUNCHPAD_ABI = [
  "function create(string name_, string symbol_, uint256 minTokensOut) payable returns (address token)",
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 initialBuyTokens, uint256 initialBuyCostWei)",
  "error NameTooLong()",
  "error SymbolTooLong()",
  "error InitialBuyTooLarge()",
  "error SlippageExceeded()",
  "error ZeroAmount()",
  "error TokenTradingPaused()",
];

// Matches the deployed contract exactly (see contracts/BlazelyLaunchpad.sol) — keep these in
// sync if the contract's constants ever change.
const TOTAL_SUPPLY = 1_000_000_000;
const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 16;
// Spot price at zero tokens sold (P0). This is EXACT (not approximate) for a brand-new
// token's initial buy specifically, because every token starts at zero supply sold — there
// is no earlier trading history to make this estimate wrong. It does not account for the 1%
// protocol fee taken before the curve computes tokens out, so actual tokens received will be
// marginally less than this estimate suggests; that's fine for a rough "you'll get about
// this many tokens" preview, just don't treat it as exact down to the last wei.
const P0_ETH_PER_TOKEN = 0.000000001;
const TOKENS_PER_ETH = 1 / P0_ETH_PER_TOKEN;

// ---------------------------------------------------------------------------------
// Error message helper
// ---------------------------------------------------------------------------------
function decodeContractError(err, contractInterface) {
  // 1. User-facing wallet-level rejections first — these never have contract error data.
  if (
    err?.code === 4001 ||
    err?.code === "ACTION_REJECTED" ||
    err?.message?.toLowerCase().includes("user rejected")
  ) {
    return "Transaction rejected in wallet.";
  }
  if (err?.message?.toLowerCase().includes("insufficient funds")) {
    return "Insufficient ETH balance to cover the transaction + gas.";
  }

  // 2. Try to decode a custom Solidity error from the revert data, if present. ethers
  // surfaces this in a few different shapes depending on provider/version, so we check the
  // common ones.
  const errorData = err?.data ?? err?.error?.data ?? err?.info?.error?.data;
  if (errorData && contractInterface) {
    try {
      const decoded = contractInterface.parseError(errorData);
      switch (decoded?.name) {
        case "NameTooLong":
          return `Name is too long (max ${MAX_NAME_LENGTH} characters).`;
        case "SymbolTooLong":
          return `Symbol is too long (max ${MAX_SYMBOL_LENGTH} characters).`;
        case "InitialBuyTooLarge":
          return "Initial buy would exceed 50% of total supply — reduce the ETH amount.";
        case "SlippageExceeded":
          return "Price moved before your transaction confirmed — try again.";
        case "TokenTradingPaused":
          return "The launchpad is currently paused.";
        default:
          return decoded?.name ? `Transaction reverted: ${decoded.name}` : null;
      }
    } catch {
      // Not a custom error we recognize — fall through to generic handling below.
    }
  }

  if (err?.reason) return `Transaction failed: ${err.reason}`;
  return "An unexpected error occurred. Please try again.";
}

// ---------------------------------------------------------------------------------
// Reusable form field
// ---------------------------------------------------------------------------------
const Field = ({ label, isError, maxLength, value = "", isTextarea, ...rest }) => {
  const Comp = isTextarea ? "textarea" : "input";
  return (
    <div className="flex flex-col text-[11px] w-full">
      <div className="flex justify-between items-center text-slate-500 font-bold uppercase tracking-wider mb-1">
        <span>{label}</span>
        {maxLength && (
          <span>
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>
      <Comp
        {...rest}
        value={value}
        maxLength={maxLength}
        className={`w-full p-2 bg-[#030712] text-slate-200 border rounded-none font-mono text-xs focus:outline-none focus:border-slate-700 ${
          isError ? "border-rose-500" : "border-slate-900"
        }`}
      />
      {isError && <span className="text-rose-500 text-[10px] mt-0.5">{isError}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------------
// Initial buy section — now a PURE display component. All validation lives in the parent
// (`ethValidation`), passed down as `errorMessage`, so there is exactly one place that decides
// whether an ETH amount is valid — fixing the "two validations can disagree" bug.
// ---------------------------------------------------------------------------------
const InitialBuySection = ({ ethAmount, setEthAmount, walletBalance, errorMessage }) => {
  const balance = Number(walletBalance || 0);

  const setPercent = (pct) => {
    if (!balance || balance <= 0) return setEthAmount("");
    // Leave a small buffer for gas so "MAX" doesn't leave the user unable to pay for gas.
    const val = Math.max(0, balance - 0.001) * pct;
    setEthAmount(val.toFixed(6).replace(/\.?0+$/, ""));
  };

  const stats = useMemo(() => {
    const eth = parseFloat(ethAmount);
    if (!eth) return { tokens: "0", pct: "0.00" };
    return {
      tokens: (eth * TOKENS_PER_ETH).toLocaleString(undefined, { maximumFractionDigits: 0 }),
      pct: (((eth * TOKENS_PER_ETH) / TOTAL_SUPPLY) * 100).toFixed(4),
    };
  }, [ethAmount]);

  return (
    <div className="p-3 bg-[#0b0f19]/40 border border-slate-900 font-mono text-[11px]">
      <div className="flex flex-wrap justify-between items-center gap-1 mb-2">
        <span className="text-slate-400 font-bold uppercase tracking-wider">
          💰 Initial Buy (optional)
        </span>
        <span className="text-slate-500">BAL: {balance.toFixed(6)} ETH</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.1"
          step="0.000001"
          min="0"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
          className={`w-full p-2 bg-[#030712] text-slate-200 border rounded-none text-xs focus:outline-none ${
            errorMessage ? "border-rose-500" : "border-slate-900"
          }`}
        />
        <div className="flex gap-1 shrink-0">
          {[0.25, 0.5, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPercent(p)}
              className="flex-1 sm:flex-initial p-2 bg-[#030712] border border-slate-900 text-slate-400 hover:text-slate-200 text-[10px]"
            >
              {p === 1 ? "MAX" : `${p * 100}%`}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && <p className="text-rose-500 mb-2 text-[10px]">{errorMessage}</p>}

      <div className="bg-[#030712]/60 border border-slate-900/60 p-2 text-[10px] text-slate-400 space-y-1">
        <div className="flex justify-between">
          <span>EST_TOKENS:</span>
          <span className="text-slate-200 font-bold">{stats.tokens}</span>
        </div>
        <div className="flex justify-between">
          <span>SUPPLY_FILL:</span>
          <span className="text-slate-200 font-bold">{stats.pct}%</span>
        </div>
        <div className="text-slate-600 text-[9px] pt-1">
          Estimate only — excludes the 1% protocol fee, actual tokens received will be
          slightly lower.
        </div>
      </div>
    </div>
  );
};

// =================================================================================
// Main component
// =================================================================================
const CreateToken = () => {
  const navigate = useNavigate();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address: connectedAddress, isConnected } = useAccount();

  // wagmi v2: `watch: true` no longer exists (it was a v1 option). Polling is done via
  // TanStack Query's `query.refetchInterval` instead.
  const { data: balanceData } = useBalance({
    address: connectedAddress,
    query: { refetchInterval: 15_000, enabled: !!connectedAddress },
  });

  const [step, setStep] = useState(1); // 1 = form, 2 = submitting, 3 = success
  const [loadingLabel, setLoadingLabel] = useState(""); // what step 2 is currently doing
  const [tokenAddress, setTokenAddress] = useState(null);
  const [creationTxHash, setCreationTxHash] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [ethAmount, setEthAmount] = useState("");
  const [error, setError] = useState(null);
  const [indexingStatus, setIndexingStatus] = useState("pending"); // 'pending' | 'ready' — purely cosmetic, see effect below

  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    website: "",
    telegram: "",
    twitter: "",
    description: "",
  });
  const [socialErrors, setSocialErrors] = useState({ website: "", telegram: "", twitter: "" });
  const [nameSymbolErrors, setNameSymbolErrors] = useState({ name: "", symbol: "" });

  const walletBalanceEth = useMemo(() => {
    if (!balanceData?.value) return 0;
    try {
      return parseFloat(ethers.formatEther(balanceData.value));
    } catch {
      return 0;
    }
  }, [balanceData]);

  // --- Single source of truth for initial-buy ETH validation (fixes the duplicated-logic bug) ---
  const ethValidation = useMemo(() => {
    if (!ethAmount || !String(ethAmount).trim()) return { ok: true, message: null };
    const v = parseFloat(String(ethAmount).trim());
    if (isNaN(v) || v <= 0) return { ok: false, message: "Enter a valid ETH amount." };
    if (walletBalanceEth && v > walletBalanceEth) {
      return { ok: false, message: "Insufficient balance." };
    }
    if (((v * TOKENS_PER_ETH) / TOTAL_SUPPLY) * 100 > 50) {
      return { ok: false, message: "Initial buy cannot exceed 50% of total supply." };
    }
    return { ok: true, message: null };
  }, [ethAmount, walletBalanceEth]);

  const wrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  // --- Field handlers ---
  const handleTextChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === "name") {
      // Strip emoji/control characters, enforce the CONTRACT's actual limit (32), not an
      // arbitrary UI-only limit that would let the transaction revert later.
      const stripped = value
        .replace(/[\u2700-\u27BF\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g, "")
        .slice(0, MAX_NAME_LENGTH);
      const filtered = stripped
        .split("")
        .filter((c) => /^[A-Za-z0-9 ]$/.test(c))
        .join("");
      setNameSymbolErrors((p) => ({
        ...p,
        name: filtered !== stripped ? "Only letters, numbers, and spaces allowed." : "",
      }));
      setTokenData((p) => ({ ...p, name: filtered }));
      return;
    }

    if (name === "symbol") {
      const stripped = value
        .replace(/[\u2700-\u27BF\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g, "")
        .slice(0, MAX_SYMBOL_LENGTH);
      const filtered = stripped
        .split("")
        .filter((c) => /^[A-Za-z0-9]$/.test(c))
        .join("");
      setNameSymbolErrors((p) => ({
        ...p,
        symbol: filtered !== stripped ? "Only letters and numbers, no spaces." : "",
      }));
      setTokenData((p) => ({ ...p, symbol: filtered }));
      return;
    }

    if (["website", "telegram", "twitter"].includes(name)) {
      let err = "";
      if (value) {
        if (name === "website" && !/^https?:\/\//i.test(value)) {
          err = "Must start with http:// or https://";
        } else if (name === "telegram" && !/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/i.test(value)) {
          err = "Format: https://t.me/username";
        } else if (name === "twitter" && !/^https?:\/\/(twitter|x)\.com\/[a-zA-Z0-9_]+$/i.test(value)) {
          err = "Format: https://x.com/username";
        }
      }
      setSocialErrors((p) => ({ ...p, [name]: err }));
      setTokenData((p) => ({ ...p, [name]: value }));
      return;
    }

    setTokenData((p) => ({ ...p, [name]: value }));
  }, []);

  const handleLogoFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Logo must be an image file.");
    if (file.size / (1024 * 1024) > 5) return setError("Logo must be under 5MB.");
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  const isFormValid =
    tokenData.name.trim().length > 0 &&
    tokenData.symbol.trim().length > 0 &&
    !nameSymbolErrors.name &&
    !nameSymbolErrors.symbol &&
    !Object.values(socialErrors).some(Boolean) &&
    ethValidation.ok;

  // ---------------------------------------------------------------------------------
  // STEP A: call the backend's /api/token/prepare BEFORE touching the wallet.
  // If this fails, we stop here — see the flow comment at the top of this file for why.
  // ---------------------------------------------------------------------------------
  async function prepareMetadata(creatorWallet) {
    if (!API_BASE_URL) {
      throw new Error(
        "VITE_API_BASE_URL is not configured — cannot save token metadata. Contact support."
      );
    }

    const form = new FormData();
    form.append("wallet", creatorWallet);
    form.append("name", tokenData.name.trim());
    form.append("symbol", tokenData.symbol.trim());
    if (tokenData.website) form.append("website", tokenData.website);
    if (tokenData.twitter) form.append("twitter", tokenData.twitter);
    if (tokenData.telegram) form.append("telegram", tokenData.telegram);
    if (tokenData.description) form.append("description", tokenData.description);
    if (logoFile) form.append("logo", logoFile);

    const res = await fetch(`${API_BASE_URL}/api/token/prepare`, {
      method: "POST",
      body: form,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error || "Failed to save token metadata.");
    }
    return body.pending_id;
  }

  // ---------------------------------------------------------------------------------
  // STEP B: the actual on-chain deployment.
  // ---------------------------------------------------------------------------------
  const handleDeploy = async () => {
    setError(null);

    if (wrongNetwork) {
      try {
        await switchChain?.({ chainId: EXPECTED_CHAIN_ID });
      } catch {
        setError("Please switch your wallet to the correct network to continue.");
      }
      return;
    }

    if (!LAUNCHPAD_ADDRESS) {
      setError("Launchpad contract address is not configured. Contact support.");
      return;
    }

    setStep(2);

    try {
      // --- Phase 1: stage metadata ---
      setLoadingLabel("Saving token details...");
      if (!connectedAddress) throw new Error("Wallet not connected.");
      await prepareMetadata(connectedAddress);

      // --- Phase 2: on-chain transaction ---
      setLoadingLabel("Confirm the transaction in your wallet...");

      // window.ethereum is injected by the connected wallet (MetaMask, etc.) — ConnectKit /
      // wagmi wire this up for us; we just need an ethers signer to actually call the
      // contract, since this component uses ethers directly rather than wagmi's
      // useWriteContract for the create() call.
      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, signer);

      const name = tokenData.name.trim();
      const symbol = tokenData.symbol.trim();
      const value = ethAmount && parseFloat(ethAmount) > 0 ? ethers.parseEther(String(ethAmount)) : 0n;

      // minTokensOut = 0 is intentionally safe here (and only here): this is the very first
      // trade this token will ever have, submitted in the SAME transaction that deploys it —
      // there is no way for anyone to have front-run a price move on a token that didn't
      // exist a moment earlier. This reasoning does NOT apply to the regular buy()/sell()
      // functions elsewhere in the app, which DO need real slippage protection.
      const minTokensOut = 0n;

      const tx = await contract.create(name, symbol, minTokensOut, { value });
      setLoadingLabel("Waiting for confirmation...");
      const receipt = await tx.wait();

      // --- Decode the token address from the TokenCreated event ---
      let createdAddress = null;
      for (const rawLog of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(rawLog);
          if (parsed?.name === "TokenCreated") {
            createdAddress = parsed.args.token;
            break;
          }
        } catch {
          // Not every log in the receipt belongs to this contract (e.g. ERC20 Transfer logs
          // from the initial buy) — parseLog throws for those, which is expected, not an error.
        }
      }

      if (!createdAddress) {
        // Should not happen if the ABI/event name are correct, but handle it explicitly
        // rather than routing to a broken "/token/Unknown" page.
        setCreationTxHash(receipt.hash);
        setTokenAddress(null);
        setStep(3);
        return;
      }

      setTokenAddress(createdAddress.toLowerCase());
      setCreationTxHash(receipt.hash);
      setStep(3);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Token creation failed:", err);
      setError(decodeContractError(err, new ethers.Interface(LAUNCHPAD_ABI)));
      setStep(1);
    } finally {
      setLoadingLabel("");
    }
  };

  // ---------------------------------------------------------------------------------
  // Purely cosmetic: watch for the backend listener to finish merging metadata into `tokens`,
  // so the success screen can flip from "indexing..." to "ready" without a manual refresh.
  // Not required for correctness — the token page itself always reads live from `tokens`
  // regardless of whether this subscription fires.
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    if (!tokenAddress || !supabase) return;
    setIndexingStatus("pending");

    let cancelled = false;

    supabase
      .from("tokens")
      .select("address")
      .eq("address", tokenAddress)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setIndexingStatus("ready");
      });

    const channel = supabase
      .channel(`token-created-${tokenAddress}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tokens", filter: `address=eq.${tokenAddress}` },
        () => {
          if (!cancelled) setIndexingStatus("ready");
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tokenAddress]);

  const resetForm = () => {
    setStep(1);
    setTokenAddress(null);
    setCreationTxHash(null);
    setLogoFile(null);
    setLogoPreview(null);
    setEthAmount("");
    setTokenData({ name: "", symbol: "", website: "", telegram: "", twitter: "", description: "" });
    setIndexingStatus("pending");
  };

  return (
    <div className="font-mono min-h-screen bg-[#030712] text-slate-300 p-3 sm:p-8 relative">
      {/* --- Error toast --- */}
      {error && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 p-3 bg-rose-950/90 border border-rose-800 text-slate-100 flex items-start gap-3 text-xs sm:max-w-sm">
          <AlertTriangle size={14} className="shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block mb-0.5">Error</span>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* --- Wrong network banner --- */}
      {wrongNetwork && (
        <div className="mb-4 max-w-3xl mx-auto p-3 bg-amber-950/40 border border-amber-800 text-amber-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>You're connected to the wrong network.</span>
          <button
            onClick={() => switchChain?.({ chainId: EXPECTED_CHAIN_ID })}
            className="px-3 py-1 border border-amber-700 uppercase text-[10px] font-bold hover:bg-amber-900/40"
          >
            Switch Network
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* --- Progress tracker --- */}
        <div className="flex flex-col sm:flex-row gap-1 mb-8 border border-slate-900 bg-[#0b0f19]/20 p-2 text-[10px] font-bold text-slate-500 tracking-widest">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`flex-1 flex items-center gap-2 px-2 py-1 ${
                step === n
                  ? "bg-[#96d6cd]/10 border border-[#96d6cd]/40 text-[#96d6cd]"
                  : "bg-[#030712]/40 border border-slate-900"
              }`}
            >
              <span>[{String(n).padStart(2, "0")}]</span>
              <span className="uppercase">
                {n === 1 ? "Details" : n === 2 ? "Submitting" : "Complete"}
              </span>
            </div>
          ))}
        </div>

        {/* --- Step 1: form --- */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#0b0f19]/40 border border-slate-900 p-4 space-y-4">
              <div className="text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 uppercase tracking-wider">
                Core Parameters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Token Name *"
                  name="name"
                  value={tokenData.name}
                  onChange={handleTextChange}
                  maxLength={MAX_NAME_LENGTH}
                  isError={nameSymbolErrors.name}
                />
                <Field
                  label="Symbol *"
                  name="symbol"
                  value={tokenData.symbol}
                  onChange={handleTextChange}
                  maxLength={MAX_SYMBOL_LENGTH}
                  isError={nameSymbolErrors.symbol}
                />
              </div>
              <Field
                label="Description"
                name="description"
                value={tokenData.description}
                onChange={handleTextChange}
                maxLength={300}
                isTextarea
                rows={3}
              />

              <div className="text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 pt-2 uppercase tracking-wider">
                Social Links
              </div>
              <div className="space-y-3">
                <Field
                  label="Website"
                  name="website"
                  placeholder="https://yourwebsite.com"
                  value={tokenData.website}
                  onChange={handleTextChange}
                  isError={socialErrors.website}
                />
                <Field
                  label="Telegram"
                  name="telegram"
                  placeholder="https://t.me/username"
                  value={tokenData.telegram}
                  onChange={handleTextChange}
                  isError={socialErrors.telegram}
                />
                <Field
                  label="Twitter / X"
                  name="twitter"
                  placeholder="https://x.com/username"
                  value={tokenData.twitter}
                  onChange={handleTextChange}
                  isError={socialErrors.twitter}
                />
              </div>
            </div>

            <div className="space-y-4 lg:col-span-1">
              <div className="bg-[#0b0f19]/40 border border-slate-900 p-4 flex flex-col items-center">
                <div className="text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 w-full uppercase tracking-wider text-left mb-3">
                  Logo (optional)
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleLogoFile(e.dataTransfer.files?.[0]);
                  }}
                  className="w-full bg-[#030712] border border-dashed border-slate-900 p-4 flex flex-col items-center justify-center min-h-[140px]"
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      className="w-20 h-20 border border-slate-900 object-cover rounded-none"
                      alt="Logo preview"
                    />
                  ) : (
                    <UploadCloud size={24} className="text-slate-600 mb-2" />
                  )}
                  <label className="mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[#0b0f19] border border-slate-800 text-slate-300 hover:text-slate-100 cursor-pointer">
                    Choose file
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleLogoFile(e.target.files?.[0])}
                    />
                  </label>
                  <span className="text-[9px] text-slate-600 mt-2">Max size: 5MB</span>
                </div>
              </div>

              <InitialBuySection
                ethAmount={ethAmount}
                setEthAmount={setEthAmount}
                walletBalance={walletBalanceEth}
                errorMessage={ethValidation.ok ? null : ethValidation.message}
              />

              {/*
                The core bug fix lives here: `disabled` is now ONLY applied when the wallet is
                already connected. When disconnected, the button must always be clickable so
                the user can actually open the wallet-connect modal — that's the whole point
                of showing it.
              */}
              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button
                    onClick={isConnected ? handleDeploy : show}
                    disabled={isConnected && !isFormValid}
                    style={
                      isConnected && !isFormValid
                        ? {}
                        : { backgroundColor: "#96d6cd", color: "#030712" }
                    }
                    className={`w-full p-3 font-bold text-xs uppercase tracking-widest text-center transition-all rounded-none ${
                      isConnected && !isFormValid
                        ? "bg-slate-900 text-slate-600 border border-slate-900 cursor-not-allowed"
                        : "hover:opacity-90"
                    }`}
                  >
                    {isConnected ? "Deploy Token" : "Connect Wallet"}
                  </button>
                )}
              </ConnectKitButton.Custom>
              {!isConnected && (
                <div className="text-[9px] text-center text-slate-600 uppercase">
                  Connect a wallet to continue
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Step 2 & 3: submitting / success --- */}
        {step >= 2 && (
          <div className="bg-[#0b0f19]/40 border border-slate-900 p-6 flex flex-col items-center justify-center text-center">
            {step === 2 && (
              <div className="py-8 space-y-4">
                <Loader2 size={32} className="animate-spin text-slate-500 mx-auto" />
                <p className="text-xs uppercase tracking-wider font-bold max-w-sm text-slate-300">
                  {loadingLabel || "Processing..."}
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="w-full max-w-xl space-y-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <CheckCircle size={32} style={{ color: "#96d6cd" }} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                    Token Deployed
                  </span>
                </div>

                {tokenAddress ? (
                  <>
                    <div className="bg-[#030712] border border-slate-900 p-3 text-left">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Contract Address
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono text-slate-300 truncate break-all">
                          {tokenAddress}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => navigator.clipboard.writeText(tokenAddress)}
                            className="p-1 border border-slate-800 text-slate-400 hover:text-slate-200"
                            title="Copy address"
                          >
                            <Copy size={12} />
                          </button>
                          <Link
                            to={`/token/${tokenAddress}`}
                            target="_blank"
                            className="p-1 border border-slate-800 text-slate-400 hover:text-slate-200"
                            title="Open token page"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Purely cosmetic indexing indicator — see the effect above */}
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {indexingStatus === "ready"
                        ? "✅ Metadata indexed — token page is fully ready."
                        : "⏳ Finalizing metadata (logo, socials)... your token is already live on-chain."}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <button
                        onClick={() => navigate(`/token/${tokenAddress}`)}
                        style={{ backgroundColor: "#96d6cd", color: "#030712" }}
                        className="px-4 py-1.5 text-xs font-black uppercase tracking-wider hover:opacity-90"
                      >
                        View Token
                      </button>
                      <button
                        onClick={resetForm}
                        className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#030712] border border-slate-800 text-slate-400 hover:text-slate-200"
                      >
                        Create Another
                      </button>
                    </div>
                  </>
                ) : (
                  // We couldn't decode the token address from the receipt (should be rare) —
                  // give the user the transaction hash instead of routing to a broken page.
                  <div className="bg-amber-950/40 border border-amber-800 text-amber-400 p-3 text-left text-xs space-y-2">
                    <p>
                      Your transaction confirmed, but we couldn't automatically detect the new
                      token address. Check the transaction for details:
                    </p>
                    <p className="font-mono break-all">{creationTxHash}</p>
                    <button
                      onClick={resetForm}
                      className="mt-2 px-3 py-1 border border-amber-700 uppercase text-[10px] font-bold hover:bg-amber-900/40"
                    >
                      Create Another
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateToken;
