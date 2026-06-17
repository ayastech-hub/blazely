import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BlazelyLaunchpad from "../abi/BlazelyLaunchpad.json";
import { useWallet } from "../context/WalletContext";
import { useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useAccount, useBalance } from "wagmi";
import { ethers } from "ethers";

import {
  UploadCloud,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { motion } from "framer-motion";

import { createToken as createTokenInDb } from "../api/tokensApi";
import * as supabaseClient from "../lib/supabaseClient";

const supabase =
  supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

const ErrorAlert = ({ message, onClose }) => (
  <div className="fixed top-8 right-8 z-50 animate-slideIn">
    <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-red-500/80 to-rose-600/80 backdrop-blur-md border border-red-400/50 shadow-2xl shadow-red-500/20">
      <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-bold text-white">Deployment Failed</h3>
        <p className="text-sm text-white/90 mt-1">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5 text-white/80" />
      </button>
    </div>
  </div>
);

const parseErrorMessage = (error) => {
  if (
    error?.code === 4001 ||
    (error?.message &&
      (error.message.includes("user rejected transaction") ||
        error.message.includes("User denied transaction signature")))
  ) {
    return "Transaction rejected. Please approve the transaction in your wallet.";
  }
  if (error?.message && error.message.includes("insufficient funds")) {
    return "Insufficient funds. Your wallet does not have enough ETH for gas.";
  }
  if (error?.reason) {
    return `Transaction failed: ${error.reason}`;
  }
  if (error?.code === "23505") {
    return "Token address extraction failed. Please try again. If the issue persists, clear your browser cache.";
  }
  return "An unexpected error occurred. Please check the console for details.";
};

// --- InitialBuySection ---
const InitialBuySection = ({ ethAmount, setEthAmount, walletBalance }) => {
  const [inputError, setInputError] = useState("");

  const TOTAL_SUPPLY = 1_000_000_000;
  const MAX_PERCENT = 50;
  const PRICE_PER_TOKEN_ETH = 0.000000001;
  const ETH_PER_TOKEN = 1 / PRICE_PER_TOKEN_ETH;

  const balance = Number(walletBalance || 0);

  const handleEthChange = (e) => {
    const value = String(e.target.value).trim();
    setEthAmount(value);

    if (!value) {
      setInputError("");
      return;
    }

    const eth = parseFloat(value);
    if (isNaN(eth) || eth <= 0) {
      setInputError("Enter a valid ETH amount");
      return;
    }

    if (balance > 0 && eth > balance) {
      setInputError("Insufficient balance");
      return;
    }

    const tokens = eth * ETH_PER_TOKEN;
    const percentage = (tokens / TOTAL_SUPPLY) * 100;
    if (percentage > MAX_PERCENT) {
      setInputError("Initial buy cannot exceed 50% of total supply");
      return;
    }

    setInputError("");
  };

  const setPercentOfBalance = (pct) => {
    if (!balance || balance <= 0) {
      setEthAmount("");
      setInputError("");
      return;
    }
    const GAS_BUFFER = 0.001;
    const usable = Math.max(0, balance - GAS_BUFFER);
    const value = (usable * pct).toFixed(6).replace(/\.?0+$/, "");
    setEthAmount(value);

    // check max percent when using buttons
    const tokens = parseFloat(value) * ETH_PER_TOKEN;
    const percentage = (tokens / TOTAL_SUPPLY) * 100;
    if (percentage > MAX_PERCENT) {
      setInputError("Initial buy cannot exceed 50% of total supply");
    } else {
      setInputError("");
    }
  };

  const useMax = () => setPercentOfBalance(1);
  const useHalf = () => setPercentOfBalance(0.5);
  const useQuarter = () => setPercentOfBalance(0.25);

  const { estimatedTokens, supplyPercentage } = useMemo(() => {
    const eth = parseFloat(ethAmount);
    if (!eth) return { estimatedTokens: "0", supplyPercentage: "0.00" };

    const tokens = eth * ETH_PER_TOKEN;
    return {
      estimatedTokens: tokens.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      supplyPercentage: ((tokens / TOTAL_SUPPLY) * 100).toFixed(4),
    };
  }, [ethAmount]);

  const formattedBalance =
    typeof balance === "number" && !Number.isNaN(balance)
      ? balance.toFixed(6)
      : "—";

  return (
    <FormSection title="Initial Buy (Optional)" icon="💰">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              label="ETH Amount"
              type="number"
              inputMode="decimal"
              step="0.000001"
              placeholder="0.1"
              value={ethAmount}
              onChange={handleEthChange}
              isError={!!inputError && inputError !== "Insufficient balance"}
              aria-invalid={!!inputError}
            />
            {inputError && (
              <p className="text-sm mt-2 text-red-400">{inputError}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-slate-400">
              Balance:{" "}
              <span className="font-medium text-white ml-1">
                {formattedBalance} ETH
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={useQuarter}
            className="px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-sm"
          >
            25%
          </button>
          <button
            type="button"
            onClick={useHalf}
            className="px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-sm"
          >
            50%
          </button>
          <button
            type="button"
            onClick={useMax}
            className="px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-sm"
          >
            Max
          </button>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-white mt-2">
          <div className="flex justify-between text-sm">
            <span>Estimated Tokens</span>
            <span className="font-semibold">{estimatedTokens}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>Supply %</span>
            <span className="font-semibold">{supplyPercentage}%</span>
          </div>
        </div>
      </div>
    </FormSection>
  );
};

const CreateToken = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const { address: connectedAddress, isConnected } = useAccount();
  const [ethAmount, setEthAmount] = useState("");
  const { signer } = useWallet();

  // wagmi balance
  const { data: balanceData } = useBalance({
    address: connectedAddress,
    watch: true,
  });

  const parseBalanceToEth = (bal) => {
    if (!bal) return 0;
    try {
      return parseFloat(ethers.formatEther(bal));
    } catch (e) {
      const maybe = Number(String(bal));
      return Number.isFinite(maybe) ? maybe : 0;
    }
  };

  const walletBalanceEth = parseBalanceToEth(balanceData?.value);

  // central ETH validation (used to disable deploy)
  // keeps same logic as InitialBuySection
  const TOTAL_SUPPLY = 1_000_000_000;
  const PRICE_PER_TOKEN_ETH = 0.000000001;
  const ETH_PER_TOKEN = 1 / PRICE_PER_TOKEN_ETH;

  const ethValidation = (() => {
    if (ethAmount == null || String(ethAmount).trim() === "") {
      return { ok: true, reason: null };
    }
    const v = parseFloat(String(ethAmount).trim());
    if (isNaN(v) || v <= 0) return { ok: false, reason: "invalid" };
    if (walletBalanceEth && v > walletBalanceEth)
      return { ok: false, reason: "insufficient_balance" };

    const tokens = v * ETH_PER_TOKEN;
    const percentage = (tokens / TOTAL_SUPPLY) * 100;
    if (percentage > 50) return { ok: false, reason: "exceeds_supply" };

    return { ok: true, reason: null };
  })();

  const initialBuyTooLarge =
    ethValidation.reason === "insufficient_balance" ||
    ethValidation.reason === "exceeds_supply";

  const chainId = useChainId();
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    website: "",
    telegram: "",
    twitter: "",
    description: "",
  });
  const [socialErrors, setSocialErrors] = useState({
    website: "",
    telegram: "",
    twitter: "",
  });

  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [invalidCharError, setInvalidCharError] = useState({
    name: "",
    symbol: "",
  });

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value ?? "";
    let errorMessage = "";

    const allowedChars = /^[A-Za-z0-9]*$/;

    // Token Name
    if (name === "name") {
      // strip emoji-like ranges
      newValue = newValue.replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83D[\uDC00-\uDE4F])/g,
        ""
      );
      newValue = newValue.slice(0, 40);
      const filtered = newValue
        .split("")
        .filter((c) => allowedChars.test(c) || c === " ")
        .join("");
      if (filtered !== newValue)
        errorMessage = "Only letters, numbers and spaces allowed";
      newValue = filtered;
    }

    // Token Symbol
    else if (name === "symbol") {
      newValue = newValue.replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83D[\uDC00-\uDE4F])/g,
        ""
      );
      newValue = newValue.slice(0, 15);
      const filtered = newValue
        .split("")
        .filter((c) => allowedChars.test(c))
        .join("");
      if (filtered !== newValue)
        errorMessage = "Only letters and numbers allowed, no spaces";
      newValue = filtered;
    }

    // Socials: validate URL format
    if (["website", "telegram", "twitter"].includes(name)) {
      let errorMessage = "";

      if (newValue) {
        if (name === "website") {
          // website must start with http:// or https://
          if (!/^https?:\/\//i.test(newValue)) {
            errorMessage = "Invalid URL. Must start with http:// or https://";
          }
        } else if (name === "telegram") {
          // Telegram must match t.me/username
          if (!/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/i.test(newValue)) {
            errorMessage =
              "Invalid Telegram URL. Format: https://t.me/username";
          }
        } else if (name === "twitter") {
          // Twitter/X must match twitter.com/username or x.com/username
          if (!/^https?:\/\/(twitter|x)\.com\/[a-zA-Z0-9_]+$/i.test(newValue)) {
            errorMessage =
              "Invalid Twitter/X URL. Format: https://twitter.com/username";
          }
        }
      }

      setSocialErrors((prev) => ({ ...prev, [name]: errorMessage }));
    }

    // update token data and invalid-char errors
    setTokenData((prev) => ({ ...prev, [name]: newValue }));
    setInvalidCharError((prev) => ({ ...prev, [name]: errorMessage }));
  };

  const MAX_FILE_SIZE_MB = 5;

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Invalid file type. Please upload an image.");
      return;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024); // bytes → MB
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const canProceed =
    tokenData.name.trim() &&
    tokenData.symbol.trim() &&
    logoFile &&
    !Object.values(invalidCharError).some(Boolean);

  async function sendTokenToDatabase(tokenInfo, logo) {
    if (!tokenInfo.creator_wallet)
      throw new Error("Missing creator_wallet for token record");
    if (!tokenInfo.chain_id)
      throw new Error("Missing chain_id for token record");
    if (!tokenInfo.address) throw new Error("Missing token contract address");

    const creatorLower = tokenInfo.creator_wallet?.toLowerCase();
    const addressLower = tokenInfo.address
      ? tokenInfo.address.toLowerCase()
      : tokenInfo.address;

    const upsertPayload = {
      address: addressLower,
      name: tokenInfo.name?.toLowerCase() || null,
      symbol: tokenInfo.symbol?.toLowerCase() || null,
      website: tokenInfo.website || null,
      twitter: tokenInfo.twitter || null,
      telegram: tokenInfo.telegram || null,
      description: tokenInfo.description || null,
      creator_wallet: creatorLower,
      chain_id: tokenInfo.chain_id,
      updated_at: new Date().toISOString(),
    };

    if (tokenInfo.decimals !== undefined)
      upsertPayload.decimals = tokenInfo.decimals;

    if (typeof createTokenInDb === "function") {
      try {
        const res = await createTokenInDb(upsertPayload, logo);
        return res;
      } catch (err) {
        console.warn(
          "tokensApi.createToken failed; falling back to direct supabase upsert",
          err
        );
      }
    }

    const { data, error } = await supabase
      .from("tokens")
      .upsert(upsertPayload, { onConflict: "address" });
    if (error) throw error;

    if (logo) {
      try {
        const fileName = `${Date.now()}_${logo.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("logos")
          .upload(fileName, logo, {
            cacheControl: "3600",
            upsert: false,
          });
        if (!uploadErr) {
          const { data: urlData } = await supabase.storage
            .from("logos")
            .getPublicUrl(fileName);
          const logoUrl = urlData?.publicUrl || null;
          if (logoUrl) {
            const { error: updateErr } = await supabase
              .from("tokens")
              .update({
                logo_path: logoUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("address", addressLower);
            if (updateErr)
              console.warn("Failed to update token logo_path:", updateErr);
          }
        } else {
          console.warn("Logo upload failed:", uploadErr);
        }
      } catch (err) {
        console.warn("Logo handling error:", err);
      }
    }

    return data;
  }

  const handleDeploy = async () => {
    try {
      setStep(2);
      setLoading(true);

      if (!signer) {
        setError("Please connect your wallet to deploy.");
        setStep(1);
        setLoading(false);
        return;
      }

      const creatorAddress = (await signer.getAddress())?.toLowerCase();
      const actualSigner = signer;

      if (!actualSigner || !actualSigner.getAddress)
        throw new Error(
          "Could not get an Ethers Signer from the connected wallet. Please reconnect."
        );

      const launchpadAddress =
        BlazelyLaunchpad.address ||
        "0xf23fFE56BB661d2462F60E8B4D18A45444f20156";
      const launchpadAbi = BlazelyLaunchpad.abi || BlazelyLaunchpad;
      const launchpad = new ethers.Contract(
        launchpadAddress,
        launchpadAbi,
        actualSigner
      );

      const name = String(tokenData.name).trim();
      const symbol = String(tokenData.symbol).trim();
      if (!name || !symbol)
        throw new Error("Token name and symbol are required");

      let value = 0n;
      const parsedEthAmount = parseFloat(ethAmount);
      if (!isNaN(parsedEthAmount) && parsedEthAmount > 0) {
        try {
          value = ethers.parseEther(String(ethAmount));
        } catch (e) {
          throw new Error("Invalid format for ETH amount.");
        }
      }

      const tx = await launchpad.create(name, symbol, {
        gasLimit: 8_000_000,
        value,
      });
      const receipt = await tx.wait();

      // decode logs using launchpad interface first, fallback to manual match
      let newTokenAddress = null;
      try {
        for (const log of receipt.logs) {
          try {
            const parsed = launchpad.interface.parseLog(log);
            if (parsed && parsed.name === "Launched" && parsed.args) {
              newTokenAddress = parsed.args.token ?? parsed.args[0];
              break;
            }
          } catch {
            // ignore
          }
        }
      } catch (err) {
        // ignore
      }

      if (!newTokenAddress) {
        try {
          const iface = new ethers.Interface([
            "event Launched(address indexed token, address creator, uint256 supply, string name, string symbol)",
          ]);
          const launchpadLower = launchpadAddress.toLowerCase();
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== launchpadLower) continue;
            try {
              const parsed = iface.parseLog(log);
              if (parsed && parsed.name === "Launched" && parsed.args) {
                newTokenAddress = parsed.args.token ?? parsed.args[0];
                break;
              }
            } catch {
              // ignore
            }
          }
        } catch (err) {
          // ignore
        }
      }

      if (!newTokenAddress && receipt.events && receipt.events.length) {
        const ev = receipt.events.find((e) => e && e.event === "Launched");
        if (ev && ev.args) newTokenAddress = ev.args.token ?? ev.args[0];
      }

      if (!newTokenAddress) newTokenAddress = "Unknown";

      const newTokenAddressLower =
        typeof newTokenAddress === "string"
          ? newTokenAddress.toLowerCase()
          : newTokenAddress;
      setTokenAddress(newTokenAddressLower);

      const tokenMeta = {
        address: newTokenAddressLower,
        name: tokenData.name,
        symbol: tokenData.symbol,
        website: tokenData.website,
        twitter: tokenData.twitter,
        telegram: tokenData.telegram,
        description: tokenData.description,
        creator_wallet: creatorAddress,
        chain_id: chainId || sepolia.id,
        decimals: 18,
      };

      await sendTokenToDatabase(tokenMeta, logoFile);

      setStep(3);
      setLoading(false);
    } catch (err) {
      setError(parseErrorMessage(err));
      setStep(1);
      setLoading(false);
      console.error(err);
    }
  };

  const stepTitles = {
    1: "CREATE YOUR TOKEN",
    2: "Deployment in Progress",
    3: "Deployment Successful",
  };

  const copyAddressToClipboard = async (addr) => {
    if (!addr) return;
    await navigator.clipboard.writeText(addr);
    setCopied(true);
  };
  const shortenedAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // computed disabled state for deploy button
  const nameSymbolInvalid = Object.values(invalidCharError).some(Boolean);
  const socialInvalid = Object.values(socialErrors).some(Boolean);

  const deployDisabled =
    loading ||
    !canProceed ||
    initialBuyTooLarge ||
    nameSymbolInvalid ||
    socialInvalid;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 relative">
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto relative z-10 transition-opacity duration-300"
      >
        <div className="mb-10">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNum, index) => (
              <React.Fragment key={stepNum}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                      step >= stepNum
                        ? "bg-gradient-to-br from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {step > stepNum ? <Check size={16} /> : stepNum}
                  </div>
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 transition-all duration-500 ${
                      step > stepNum
                        ? "bg-gradient-to-r from-cyan-500 to-purple-500"
                        : "bg-slate-800"
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-center mt-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {stepTitles[step]}
            </h1>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            {/* Logo block (mobile order 1, lg order 2 -> placed on right on lg) */}
            <div className="order-1 lg:order-2 lg:col-span-1">
              <FormSection title="Token image *">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) {
                      const sizeMB = file.size / (1024 * 1024);
                      if (sizeMB > MAX_FILE_SIZE_MB) {
                        setError(
                          `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`
                        );
                        return;
                      }
                      setLogoFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogoPreview(ev.target.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/40 flex items-center justify-center">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <UploadCloud className="text-white/70" />
                    )}
                  </div>

                  <label className="px-4 py-2 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition text-sm font-semibold text-white">
                    Upload or Drag Logo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </label>

                  {/* Add helper text here */}
                  <p className="text-xs text-slate-400 mt-1 text-center">
                    Image only. Max size: {MAX_FILE_SIZE_MB} MB.
                  </p>
                </div>
              </FormSection>
            </div>

            {/* Name + Symbol (mobile order 2, lg order 1 -> left column) */}
            <div className="order-2 lg:order-1 lg:col-span-2 space-y-8">
              <FormSection>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Token Name *"
                    name="name"
                    value={tokenData.name}
                    onChange={handleChange}
                    maxLength={40}
                    isError={invalidCharError.name}
                    aria-invalid={!!invalidCharError.name}
                  />
                  <Input
                    label="Symbol *"
                    name="symbol"
                    value={tokenData.symbol}
                    onChange={handleChange}
                    maxLength={15}
                    isError={invalidCharError.symbol}
                    aria-invalid={!!invalidCharError.symbol}
                  />
                </div>

                <Textarea
                  label="Description"
                  name="description"
                  value={tokenData.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={300}
                />
              </FormSection>

              {/* Social Links */}
              <FormSection>
                <div className="space-y-4">
                  <Input
                    label="Website"
                    name="website"
                    placeholder="https://yourwebsite.com"
                    value={tokenData.website}
                    onChange={handleChange}
                    isError={!!socialErrors.website}
                  />
                  {socialErrors.website && (
                    <p className="text-red-400 text-sm mt-1">
                      {socialErrors.website}
                    </p>
                  )}

                  <Input
                    label="Telegram"
                    name="telegram"
                    placeholder="https://t.me/username"
                    value={tokenData.telegram}
                    onChange={handleChange}
                    isError={!!socialErrors.telegram}
                  />
                  {socialErrors.telegram && (
                    <p className="text-red-400 text-sm mt-1">
                      {socialErrors.telegram}
                    </p>
                  )}

                  <Input
                    label="Twitter / X"
                    name="twitter"
                    placeholder="https://x.com/username"
                    value={tokenData.twitter}
                    onChange={handleChange}
                    isError={!!socialErrors.twitter}
                  />
                  {socialErrors.twitter && (
                    <p className="text-red-400 text-sm mt-1">
                      {socialErrors.twitter}
                    </p>
                  )}
                </div>
              </FormSection>
            </div>

            {/* Initial Buy & Deploy (mobile order 5 & 6, lg order 2 -> right column) */}
            <div className="order-5 lg:order-2 lg:col-span-1 space-y-6">
              <InitialBuySection
                ethAmount={ethAmount}
                setEthAmount={setEthAmount}
                walletBalance={walletBalanceEth}
              />

              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button
                    onClick={isConnected ? handleDeploy : show}
                    disabled={deployDisabled}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${
                      isConnected
                        ? !deployDisabled
                          ? "bg-gradient-to-r from-cyan-500 to-purple-600 hover:brightness-110 shadow-lg shadow-cyan-500/20"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-500 to-cyan-500 hover:brightness-110"
                    }`}
                    title={
                      deployDisabled
                        ? "Fix errors before deployment"
                        : "Deploy Token"
                    }
                  >
                    {loading
                      ? "Deploying..."
                      : isConnected
                        ? "Deploy Token "
                        : "Connect Wallet "}
                  </button>
                )}
              </ConnectKitButton.Custom>

              {/* provide small helper under the button explaining why disabled when relevant */}
              <div className="text-xs text-slate-400">
                {!isConnected && <div>Connect wallet to deploy.</div>}
              </div>
            </div>
          </div>
        )}

        {step >= 2 && (
          <div className="text-center p-8 rounded-xl bg-slate-900/50 border border-slate-800 animate-fadeIn">
            {step === 2 && (
              <StatusDisplay
                icon={
                  <Loader2 className="w-16 h-16 animate-spin text-cyan-400" />
                }
                message="Deploying your token. Please approve the transaction in your wallet..."
              />
            )}
            {step === 3 && (
              <div className="flex flex-col items-center gap-6">
                <StatusDisplay
                  icon={<CheckCircle className="w-16 h-16 text-green-400" />}
                  message="Deployment successful!"
                />

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 w-full max-w-xl">
                  <p className="text-sm text-slate-400 mb-2">Token Address</p>

                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-mono break-all">
                      <span className="sm:hidden">
                        {shortenedAddress(tokenAddress)}
                      </span>
                      <span className="hidden sm:inline">{tokenAddress}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyAddressToClipboard(tokenAddress)}
                        className="p-2 rounded-md hover:bg-white/6 transition"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`/token/${tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md hover:bg-white/6 transition inline-flex items-center"
                        title="Open token page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {copied && (
                    <p className="mt-3 text-xs text-green-400">Copied!</p>
                  )}

                  <div className="mt-4 flex gap-3 justify-center">
                    <button
                      onClick={() => navigate(`/token/${tokenAddress}`)}
                      className="px-4 py-2 rounded-lg bg-cyan-600 font-semibold hover:brightness-110 transition"
                    >
                      View Token
                    </button>
                    <button
                      onClick={() => {
                        setStep(1);
                        setTokenAddress(null);
                        setTokenData({
                          name: "",
                          symbol: "",
                          type: "",
                          website: "",
                          telegram: "",
                          twitter: "",
                          description: "",
                        });
                        setLogoFile(null);
                        setLogoPreview(null);
                        setEthAmount("");
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 font-semibold hover:bg-slate-700 transition"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const FormSection = ({ title, icon, children }) => (
  <div className="p-4 md:p-6 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
    <h3 className="flex items-center gap-2 font-semibold text-lg text-cyan-400">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const Input = ({ label, isError, name, value, maxLength, ...props }) => {
  const displayLen = String(value ?? "").length;
  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm text-white mb-1 flex justify-between">
          {label}
          {maxLength && (
            <span className="text-xs text-slate-400">
              {displayLen}/{maxLength}
            </span>
          )}
        </label>
      )}
      <input
        {...props}
        name={name}
        value={value ?? ""}
        maxLength={maxLength}
        className={`p-3 rounded-lg bg-slate-800 border text-white placeholder:text-white/60 focus:outline-none focus:ring-2 ${
          isError
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-700 focus:ring-cyan-500"
        }`}
        aria-invalid={!!isError}
      />
      {isError && <p className="text-red-400 text-xs mt-1">{isError}</p>}
    </div>
  );
};

const Textarea = ({ label, maxLength, value, ...props }) => {
  const displayLen = String(value ?? "").length;
  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-sm text-white mb-1 flex justify-between">
          {label}
          {maxLength && (
            <span className="text-xs text-slate-400">
              {displayLen}/{maxLength}
            </span>
          )}
        </label>
      )}
      <textarea
        {...props}
        maxLength={maxLength}
        value={value ?? ""}
        className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </div>
  );
};

const Select = ({ label, options, ...props }) => (
  <div className="flex flex-col">
    {label && <label className="text-sm text-slate-400 mb-1">{label}</label>}
    <select
      {...props}
      className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const ReviewStat = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm">
    <p className="text-slate-400">{label}</p>
    <p className="font-medium text-white mt-1">{value}</p>
  </div>
);

const SocialLink = ({ label, value }) => (
  <a
    href={value}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
  >
    <ExternalLink className="w-4 h-4" /> {label}: {value}
  </a>
);

const StatusDisplay = ({ icon, message }) => (
  <div className="flex flex-col items-center gap-4">
    <div>{icon}</div>
    <p className="text-white/90 font-medium text-center">{message}</p>
  </div>
);

export default CreateToken;
