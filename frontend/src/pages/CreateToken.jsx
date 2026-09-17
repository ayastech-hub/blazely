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
 * UI-ONLY ADDITION (this revision):
 *
 *   The "Advanced Configuration" block (fee receiver, buy/sell tax, creator vault/vesting,
 *   sniper protection, whitelist) is presentational only. It is deliberately NOT wired into
 *   `prepareMetadata`, `handleDeploy`, or the contract call — there is no backend/contract
 *   support for these yet. All state for it lives in the single `advanced` object below,
 *   clearly separated from the real submission state, so it's obvious what's live vs. UI
 *   scaffold when the backend/contract work lands. Search for "ADVANCED CONFIG" to find
 *   every piece of it.
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
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Copy,
  ExternalLink,
  CheckCircle,
  ChevronDown,
  Droplets,
  Percent,
  Lock,
  ShieldAlert,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { createClient } from "@supabase/supabase-js";
import { GlassSurface } from "../components/TokenCard";
import Alert from "../components/ui/Alert";
import Loading from "../components/ui/Loading";
import {
  MAX_TAX_PERCENT,
  SHORT_DURATION_PRESETS,
  VESTING_DURATION_PRESETS,
  Field,
  InitialBuySection,
  DurationSelector,
  FieldLabel,
  AdvancedFeatureRow,
} from "../components/createTokenConfig";

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

  // ---------------------------------------------------------------------------------
  // ADVANCED CONFIG state — UI only, see file-level note at the top of this file.
  // `advancedOpen` is the top-level "show me the advanced section at all" toggle;
  // each feature then has its own `enabled` (does it apply) and `expanded` (am I
  // looking at its fields right now) state.
  // ---------------------------------------------------------------------------------
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [feeReceiver, setFeeReceiver] = useState({ enabled: false, expanded: false, address: "" });

  const [tax, setTax] = useState({
    enabled: false,
    expanded: false,
    buyTax: 0,
    sellTax: 0,
    startPeriod: "launch", // "launch" | "graduation"
    duration: "1h",
    customValue: "",
    customUnit: "hours",
  });

  const [vault, setVault] = useState({
    enabled: false,
    expanded: false,
    duration: "3mo",
    customValue: "",
    customUnit: "months",
  });

  const [sniper, setSniper] = useState({
    enabled: false,
    expanded: false,
    maxWalletPercent: 2,
    duration: "1h",
    customValue: "",
    customUnit: "hours",
  });

  const [whitelist, setWhitelist] = useState({ enabled: false, expanded: false, wallets: "" });

  const clampTax = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 0;
    return Math.min(MAX_TAX_PERCENT, Math.max(0, n));
  };

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
    <div className="font-mono text-[var(--text-mid)] p-3 sm:p-8 relative">
      {/* --- Error toast --- */}
      {error && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] sm:max-w-sm">
          <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* --- Wrong network banner --- */}
      {wrongNetwork && (
        <div className="mb-4 max-w-3xl mx-auto">
          <Alert variant="warning">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span>You're connected to the wrong network.</span>
              <button
                onClick={() => switchChain?.({ chainId: EXPECTED_CHAIN_ID })}
                className="px-3 py-1.5 rounded-lg border border-[var(--amber)]/60 uppercase text-[10px] font-bold hover:bg-[var(--amber-deep-2)]/30 transition-colors shrink-0"
              >
                Switch Network
              </button>
            </div>
          </Alert>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* --- Form (always visible — submitting/success now render as an overlay on top instead of replacing this) --- */}
        <div className="bg-[var(--bg-alt)]/20 border border-[var(--border)] rounded-2xl p-4 sm:p-6 space-y-4">
          {/* --- Logo (moved to the top: the first thing you set for a new token) --- */}
          <GlassSurface className="rounded-[28px] p-4 flex flex-col items-center">
                  <div className="text-[10px] font-bold text-[var(--text-faint-2)] border-b border-white/[0.07] pb-2 w-full uppercase tracking-wider text-left mb-3">
                    Logo (optional)
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleLogoFile(e.dataTransfer.files?.[0]);
                    }}
                    className="w-full max-w-xs mx-auto bg-[var(--bg)]/20 rounded-2xl border border-dashed border-white/[0.14] p-4 flex flex-col items-center justify-center min-h-[140px]"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        className="w-20 h-20 rounded-xl border border-white/[0.08] object-cover"
                        alt="Logo preview"
                      />
                    ) : (
                      <UploadCloud size={24} className="text-[var(--border-mid)] mb-2" />
                    )}
                    <label className="mt-2 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-mid)] hover:text-teal hover:border-teal/30 cursor-pointer transition-colors">
                      Choose file
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handleLogoFile(e.target.files?.[0])}
                      />
                    </label>
                    <span className="text-[9px] text-[var(--border-mid)] mt-2">Max size: 5MB</span>
                  </div>
          </GlassSurface>

          {/* --- Core parameters + social links --- */}
          <GlassSurface className="rounded-[28px] p-4 space-y-4">
                <div className="text-[10px] font-bold text-[var(--text-faint-2)] border-b border-white/[0.07] pb-2 uppercase tracking-wider">
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

                <div className="text-[10px] font-bold text-[var(--text-faint-2)] border-b border-white/[0.07] pb-2 pt-2 uppercase tracking-wider">
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
          </GlassSurface>

          {/* --- Initial buy --- */}
                <InitialBuySection
                  ethAmount={ethAmount}
                  setEthAmount={setEthAmount}
                  walletBalance={walletBalanceEth}
                  errorMessage={ethValidation.ok ? null : ethValidation.message}
                  tokensPerEth={TOKENS_PER_ETH}
                  totalSupply={TOTAL_SUPPLY}
                />

          {/* --- Advanced configuration — now sits above the deploy button, not below it --- */}
            {/* =========================================================================
                ADVANCED CONFIGURATION — UI ONLY (no backend/contract wiring yet)
                Collapsed by default so a simple launch stays a short form; opening this
                reveals five independently-collapsible features, each off by default.
                ========================================================================= */}
            <GlassSurface className="rounded-[28px]">
              <button
                type="button"
                onClick={() => setAdvancedOpen((p) => !p)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[var(--text-mid-2)] shrink-0">
                  <SlidersHorizontal size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-bright-2)]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      Advanced Configuration
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint-2)] bg-white/[0.05] px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-faint-2)] mt-0.5">
                    Fees, tax, vesting, and anti-snipe protection — for serious launches.
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-[var(--text-faint-2)] transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {advancedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-2.5">
                      {/* --- Fee Receiver --- */}
                      <AdvancedFeatureRow
                        icon={Droplets}
                        title="Fee Receiver"
                        description="Send a share of trading fees to a custom wallet instead of the default treasury."
                        enabled={feeReceiver.enabled}
                        onEnabledChange={(v) => setFeeReceiver((p) => ({ ...p, enabled: v }))}
                        expanded={feeReceiver.expanded}
                        onToggleExpanded={() => setFeeReceiver((p) => ({ ...p, expanded: !p.expanded }))}
                      >
                        <FieldLabel>Receiver Address</FieldLabel>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={feeReceiver.address}
                          onChange={(e) => setFeeReceiver((p) => ({ ...p, address: e.target.value }))}
                          className="w-full p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-mono text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
                        />
                        <p className="text-[10px] text-[var(--text-faint-2)]">
                          Leave empty to keep fees going to the default treasury address.
                        </p>
                      </AdvancedFeatureRow>

                      {/* --- Buy / Sell Tax --- */}
                      <AdvancedFeatureRow
                        icon={Percent}
                        title="Buy / Sell Tax"
                        description={`Charge up to ${MAX_TAX_PERCENT}% on trades, for a limited window or indefinitely.`}
                        enabled={tax.enabled}
                        onEnabledChange={(v) => setTax((p) => ({ ...p, enabled: v }))}
                        expanded={tax.expanded}
                        onToggleExpanded={() => setTax((p) => ({ ...p, expanded: !p.expanded }))}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FieldLabel>Buy Tax</FieldLabel>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={MAX_TAX_PERCENT}
                                step="0.1"
                                value={tax.buyTax}
                                onChange={(e) => setTax((p) => ({ ...p, buyTax: clampTax(e.target.value) }))}
                                className="w-full p-2.5 pr-7 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint-2)] text-[10px] font-bold">%</span>
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Sell Tax</FieldLabel>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={MAX_TAX_PERCENT}
                                step="0.1"
                                value={tax.sellTax}
                                onChange={(e) => setTax((p) => ({ ...p, sellTax: clampTax(e.target.value) }))}
                                className="w-full p-2.5 pr-7 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint-2)] text-[10px] font-bold">%</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Start Period</FieldLabel>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { key: "launch", label: "At Launch" },
                              { key: "graduation", label: "After Graduation" },
                            ].map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setTax((p) => ({ ...p, startPeriod: opt.key }))}
                                className={`py-2 px-2 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all ${
                                  tax.startPeriod === opt.key
                                    ? "bg-teal/10 border-teal/40 text-teal"
                                    : "bg-[var(--bg)]/20 border-white/[0.08] text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Tax Duration</FieldLabel>
                          <DurationSelector
                            presets={SHORT_DURATION_PRESETS}
                            value={tax.duration}
                            onChange={(v) => setTax((p) => ({ ...p, duration: v }))}
                            customValue={tax.customValue}
                            customUnit={tax.customUnit}
                            onCustomValueChange={(v) => setTax((p) => ({ ...p, customValue: v }))}
                            onCustomUnitChange={(v) => setTax((p) => ({ ...p, customUnit: v }))}
                          />
                        </div>
                      </AdvancedFeatureRow>

                      {/* --- Creator Vault / Vesting --- */}
                      <AdvancedFeatureRow
                        icon={Lock}
                        title="Creator Vault (Vesting)"
                        description="Lock the tokens you buy at launch and release them gradually over time."
                        enabled={vault.enabled}
                        onEnabledChange={(v) => setVault((p) => ({ ...p, enabled: v }))}
                        expanded={vault.expanded}
                        onToggleExpanded={() => setVault((p) => ({ ...p, expanded: !p.expanded }))}
                      >
                        <FieldLabel>Vesting Duration</FieldLabel>
                        <DurationSelector
                          presets={VESTING_DURATION_PRESETS}
                          value={vault.duration}
                          onChange={(v) => setVault((p) => ({ ...p, duration: v }))}
                          customValue={vault.customValue}
                          customUnit={vault.customUnit}
                          onCustomValueChange={(v) => setVault((p) => ({ ...p, customValue: v }))}
                          onCustomUnitChange={(v) => setVault((p) => ({ ...p, customUnit: v }))}
                        />
                        <p className="text-[10px] text-[var(--text-faint-2)]">
                          Your initial-buy tokens unlock linearly over this period — a common
                          signal of long-term commitment for serious projects.
                        </p>
                      </AdvancedFeatureRow>

                      {/* --- Sniper Protection --- */}
                      <AdvancedFeatureRow
                        icon={ShieldAlert}
                        title="Sniper Protection"
                        description="Cap how much of the supply any single wallet can hold, for a window after launch."
                        enabled={sniper.enabled}
                        onEnabledChange={(v) => setSniper((p) => ({ ...p, enabled: v }))}
                        expanded={sniper.expanded}
                        onToggleExpanded={() => setSniper((p) => ({ ...p, expanded: !p.expanded }))}
                      >
                        <FieldLabel>Max Wallet (% of supply)</FieldLabel>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={sniper.maxWalletPercent}
                            onChange={(e) =>
                              setSniper((p) => ({
                                ...p,
                                maxWalletPercent: Math.min(10, Math.max(0.1, parseFloat(e.target.value) || 0.1)),
                              }))
                            }
                            className="w-full p-2.5 pr-7 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint-2)] text-[10px] font-bold">%</span>
                        </div>

                        <FieldLabel>Protection Duration</FieldLabel>
                        <DurationSelector
                          presets={SHORT_DURATION_PRESETS}
                          value={sniper.duration}
                          onChange={(v) => setSniper((p) => ({ ...p, duration: v }))}
                          customValue={sniper.customValue}
                          customUnit={sniper.customUnit}
                          onCustomValueChange={(v) => setSniper((p) => ({ ...p, customValue: v }))}
                          onCustomUnitChange={(v) => setSniper((p) => ({ ...p, customUnit: v }))}
                        />
                        <p className="text-[10px] text-[var(--text-faint-2)]">
                          Wallets cannot hold more than this share of supply until protection
                          expires. Addresses on the whitelist below bypass this cap.
                        </p>
                      </AdvancedFeatureRow>

                      {/* --- Whitelist --- */}
                      <AdvancedFeatureRow
                        icon={Users}
                        title="Whitelist (Bypass List)"
                        description="Wallets that skip the sniper-protection cap entirely."
                        enabled={whitelist.enabled}
                        onEnabledChange={(v) => setWhitelist((p) => ({ ...p, enabled: v }))}
                        expanded={whitelist.expanded}
                        onToggleExpanded={() => setWhitelist((p) => ({ ...p, expanded: !p.expanded }))}
                      >
                        <FieldLabel>Whitelisted Wallets</FieldLabel>
                        <textarea
                          rows={4}
                          placeholder={"0x1234...\n0xabcd... (one per line)"}
                          value={whitelist.wallets}
                          onChange={(e) => setWhitelist((p) => ({ ...p, wallets: e.target.value }))}
                          className="w-full p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-xs font-mono text-[var(--input-text)] focus:outline-none focus:border-[var(--input-border-focus)]"
                        />
                        <p className="text-[10px] text-[var(--text-faint-2)]">
                          One address per line. These wallets bypass the sniper-protection
                          wallet cap above.
                        </p>
                      </AdvancedFeatureRow>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassSurface>

          {/* --- Deploy --- */}
                {/*
                  The core bug fix lives here: `disabled` is now ONLY applied when the wallet
                  is already connected. When disconnected, the button must always be clickable
                  so the user can actually open the wallet-connect modal.
                */}
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <button
                      onClick={isConnected ? handleDeploy : show}
                      disabled={isConnected && !isFormValid}
                      style={
                        isConnected && !isFormValid
                          ? {}
                          : { backgroundColor: "var(--teal)", color: "var(--bg)" }
                      }
                      className={`w-full p-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-center transition-all ${
                        isConnected && !isFormValid
                          ? "bg-white/[0.03] text-[var(--border-mid)] border border-white/[0.08] cursor-not-allowed"
                          : "hover:opacity-90"
                      }`}
                    >
                      {isConnected ? "Deploy Token" : "Connect Wallet"}
                    </button>
                  )}
                </ConnectKitButton.Custom>
                {!isConnected && (
                  <div className="text-[9px] text-center text-[var(--border-mid)] uppercase">
                    Connect a wallet to continue
                  </div>
                )}
        </div>

        {/* --- Submitting / success — an overlay on top of the form, not a separate page/step --- */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-lg"
              >
              <GlassSurface className="rounded-[28px] p-6 flex flex-col items-center justify-center text-center">
            {step === 2 && (
              <div className="py-4">
                <Loading label={loadingLabel || "Processing..."} size="lg" />
              </div>
            )}

            {step === 3 && (
              <div className="w-full max-w-xl space-y-4">
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(150,214,205,0.12)", border: "1px solid var(--teal)" }}
                  >
                    <CheckCircle size={26} style={{ color: "var(--teal)" }} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--text-bright-2)]">
                    Token Deployed
                  </span>
                </div>

                {tokenAddress ? (
                  <>
                    <div className="bg-[var(--bg)]/20 border border-white/[0.08] rounded-2xl p-3.5 text-left">
                      <div className="text-[9px] font-bold text-[var(--text-faint-2)] uppercase tracking-wider mb-1">
                        Contract Address
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono text-[var(--text-mid)] truncate break-all">
                          {tokenAddress}
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => navigator.clipboard.writeText(tokenAddress)}
                            className="p-1.5 rounded-lg border border-white/[0.08] text-[var(--text-mid-2)] hover:text-teal hover:border-teal/30 transition-colors"
                            title="Copy address"
                          >
                            <Copy size={12} />
                          </button>
                          <Link
                            to={`/token/${tokenAddress}`}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-white/[0.08] text-[var(--text-mid-2)] hover:text-teal hover:border-teal/30 transition-colors"
                            title="Open token page"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Purely cosmetic indexing indicator — see the effect above */}
                    <div className="text-[10px] text-[var(--text-faint-2)] uppercase tracking-wide">
                      {indexingStatus === "ready"
                        ? "Metadata indexed — token page is fully ready."
                        : "Finalizing metadata (logo, socials)... your token is already live on-chain."}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <button
                        onClick={() => navigate(`/token/${tokenAddress}`)}
                        style={{ backgroundColor: "var(--teal)", color: "var(--bg)" }}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                      >
                        View Token
                      </button>
                      <button
                        onClick={resetForm}
                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] hover:border-white/[0.14] transition-colors"
                      >
                        Create Another
                      </button>
                    </div>
                  </>
                ) : (
                  // We couldn't decode the token address from the receipt (should be rare) —
                  // give the user the transaction hash instead of routing to a broken page.
                  <Alert variant="warning" className="text-left">
                    <p>
                      Your transaction confirmed, but we couldn't automatically detect the new
                      token address. Check the transaction for details:
                    </p>
                    <p className="font-mono break-all mt-1">{creationTxHash}</p>
                    <button
                      onClick={resetForm}
                      className="mt-2 px-3 py-1.5 rounded-lg border border-[var(--amber)]/60 uppercase text-[10px] font-bold hover:bg-[var(--amber-deep-2)]/30 transition-colors"
                    >
                      Create Another
                    </button>
                  </Alert>
                )}
              </div>
            )}
              </GlassSurface>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreateToken;