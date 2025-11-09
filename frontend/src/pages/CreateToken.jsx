// File: src/pages/CreateToken.jsx
// Purpose: Create token page (Initial Token Contribution removed)
// Updated: integrated with Supabase DB via tokensApi.createToken + handles Remix factory creator arg
// Updates: Dynamic wallet connect button in Step 1, Step 4 copy/open buttons, mobile CA shortening

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LaunchpadFactory from "../../../contracts/LaunchpadFactory.json";
import { useWallet } from "../context/WalletContext";
import { useChainId } from "wagmi";
import { base } from "wagmi/chains";
import { ethers, BrowserProvider } from "ethers"; // <-- Import BrowserProvider for Ethers v6
import {
  UploadCloud,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  X,
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { motion } from "framer-motion";
import { useWalletClient } from "wagmi";

import { createToken as createTokenInDb } from "../api/tokensApi";
import * as supabaseClient from "../lib/supabaseClient";
const supabase =
  supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

// Helper function to convert Viem WalletClient to Ethers Signer
const walletClientToSigner = (walletClient) => {
  if (!walletClient || !walletClient.account || !walletClient.transport)
    return undefined;

  // Ethers v6 BrowserProvider is required to create a Signer from a window.ethereum/transport object
  const provider = new BrowserProvider(
    walletClient.transport,
    walletClient.chain.id
  );

  // Get the Signer object
  const signer = provider.getSigner(walletClient.account.address);

  return signer;
};

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
    error.code === 4001 ||
    (error.message &&
      (error.message.includes("user rejected transaction") ||
        error.message.includes("User denied transaction signature")))
  ) {
    return "Transaction rejected. Please approve the transaction in your wallet.";
  }
  if (error.message && error.message.includes("insufficient funds")) {
    return "Insufficient funds. Your wallet does not have enough ETH for gas.";
  }
  if (error.reason) {
    return `Transaction failed: ${error.reason}`;
  }
  // Check for the Supabase error code
  if (error.code === "23505") {
    return "Token address extraction failed. Please try again. If the issue persists, clear your browser cache.";
  }
  return "An unexpected error occurred. Please check the console for details.";
};

const CreateToken = () => {
  // Hook call inside the component
  const { data: walletClient } = useWalletClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const { signer, wallet } = useWallet();
  const chainId = useChainId();

  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    supply: "1000000000",
    type: "",
    website: "",
    telegram: "",
    twitter: "",
    description: "",
  });

  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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
  const handleChange = (e) =>
    setTokenData({ ...tokenData, [e.target.name]: e.target.value });

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const canProceed =
    tokenData.name.trim() && tokenData.symbol.trim() && tokenData.type;
  const handleSubmit = () => canProceed && setStep(2);

  async function sendTokenToDatabase(tokenInfo, logo) {
    try {
      return await createTokenInDb(tokenInfo, logo);
    } catch (err) {
      console.error("Error saving token:", err);
      throw err;
    }
  }

  // ---------- Deploy token with creator argument ----------
  const handleDeploy = async () => {
    try {
      setStep(3);
      setLoading(true);

      // 1. Basic checks
      if (!walletClient && !signer) throw new Error("Wallet not connected");
      if (chainId !== base.id)
        throw new Error("Please switch your wallet to Base Mainnet");

      // 2. Obtain Ethers Signer object from Viem WalletClient (Wagmi v2 standard)
      let actualSigner = signer; // Try custom signer first

      if (!actualSigner || !actualSigner.getAddress) {
        // If custom signer is not a valid Ethers Signer, use the Viem WalletClient
        if (walletClient) {
          actualSigner = await walletClientToSigner(walletClient);
        } else {
          // Fallback to window.ethereum (less reliable in modern wagmi/viem)
          const provider = new ethers.BrowserProvider(window.ethereum);
          actualSigner = await provider.getSigner();
        }
      }

      if (!actualSigner || !actualSigner.getAddress) {
        throw new Error(
          "Could not get an Ethers Signer from the connected wallet. Please reconnect."
        );
      }

      const creatorAddress = await actualSigner.getAddress();
      console.log("Connected wallet:", creatorAddress);

      const factoryAddress = LaunchpadFactory.address;
      const factoryAbi = LaunchpadFactory.abi;
      const factory = new ethers.Contract(
        factoryAddress,
        factoryAbi,
        actualSigner // Use the resolved Ethers Signer
      );

      const supply = ethers.parseUnits(
        tokenData.supply?.toString() || "1000000000",
        18
      );

      // Send transaction
      const tx = await factory.createToken(
        tokenData.name,
        tokenData.symbol,
        supply,
        creatorAddress,
        { gasLimit: 8_000_000 }
      );

      console.log("Tx submitted:", tx.hash);
      const receipt = await tx.wait();
      console.log("Receipt:", receipt);

      // Parse TokenCreated event
      const tokenCreatedLog = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .find((l) => l.name === "TokenCreated");

      const newTokenAddress =
        tokenCreatedLog?.args?.tokenAddress ||
        receipt?.contractAddress ||
        "Unknown";
      setTokenAddress(newTokenAddress);

      // Save token metadata to DB
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp?.user?.id || null;

      const tokenMeta = {
        address: newTokenAddress,
        name: tokenData.name,
        symbol: tokenData.symbol,
        website: tokenData.website,
        twitter: tokenData.twitter,
        telegram: tokenData.telegram,
        description: tokenData.description,
        creator_wallet: creatorAddress.toLowerCase(),
        creator_uid: uid,
        chain_id: chainId,
      };

      await sendTokenToDatabase(tokenMeta, logoFile);

      setStep(4);
      setLoading(false);
    } catch (err) {
      console.error("Deployment Error:", err);
      setError(parseErrorMessage(err));
      setStep(2);
      setLoading(false);
    }
  };

  // ---------- end handleDeploy ----------

  const tokenTypes = [
    { value: "Meme", label: "Meme" },
    { value: "Infra", label: "Infrastructure (Infra)" },
    { value: "Social", label: "Social" },
    { value: "DePIN", label: "DePIN" },
    { value: "AI", label: "Artificial Intelligence (AI)" },
    { value: "Game", label: "Game" },
    { value: "DeFi", label: "DeFi" },
    { value: "Other", label: "Other" },
  ];

  const stepTitles = {
    1: "Configure Your Token",
    2: "Review & Confirm",
    3: "Deployment in Progress",
    4: "Deployment Successful",
  };

  const currentSupplyDisplay = tokenData.supply.trim()
    ? Number(tokenData.supply).toLocaleString()
    : Number(1000000000).toLocaleString() + " (Default)";

  const copyAddressToClipboard = async (addr) => {
    try {
      if (!addr) return;
      await navigator.clipboard.writeText(addr);
      setCopied(true);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const shortenedAddress = (addr) => {
    if (!addr) return "";
    const start = addr.slice(0, 6);
    const end = addr.slice(-4);
    return `${start}...${end}`;
  };

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
            {[1, 2, 3, 4].map((stepNum, index) => (
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
                {index < 3 && (
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

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormSection title="Token Logo" icon="🎨">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-24 h-24 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-dashed border-slate-700 bg-slate-900/50 transition-all ${
                      logoPreview ? "border-cyan-500" : ""
                    }`}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <UploadCloud className="text-slate-500" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-md hover:bg-slate-700 transition cursor-pointer text-sm font-semibold"
                    >
                      Upload Image
                    </label>
                    <p className="text-xs text-slate-500 mt-2">
                      Square image recommended.
                    </p>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Token Category" icon="🎯">
                <Select
                  name="type"
                  value={tokenData.type}
                  onChange={handleChange}
                  label="Select Category *"
                  options={tokenTypes}
                />
              </FormSection>
            </div>

            <FormSection title="Essential Details" icon="⚡">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  name="name"
                  placeholder="e.g. Super AI Token"
                  value={tokenData.name}
                  onChange={handleChange}
                  label="Token Name *"
                />
                <Input
                  name="symbol"
                  placeholder="e.g. SAI"
                  value={tokenData.symbol}
                  onChange={handleChange}
                  label="Symbol *"
                />
              </div>

              <Textarea
                name="description"
                placeholder="A short description of your project (max 300 characters)"
                value={tokenData.description}
                onChange={handleChange}
                label="Description"
                rows={3}
                maxLength={300}
              />

              <Input
                type="number"
                name="supply"
                placeholder="e.g. 1000000000 (Default is 1 Billion)"
                value={tokenData.supply}
                onChange={handleChange}
                label="Total Supply (Optional - Default 1,000,000,000)"
              />
            </FormSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormSection title="Social Links" icon="🔗">
                <div className="space-y-4">
                  <Input
                    name="website"
                    placeholder="https://..."
                    value={tokenData.website}
                    onChange={handleChange}
                    label="Website"
                  />
                  <Input
                    name="telegram"
                    placeholder="https://t.me/..."
                    value={tokenData.telegram}
                    onChange={handleChange}
                    label="Telegram"
                  />
                  <Input
                    name="twitter"
                    placeholder="https://x.com/..."
                    value={tokenData.twitter}
                    onChange={handleChange}
                    label="Twitter"
                  />
                </div>
              </FormSection>
            </div>

            <div className="pt-4 border-t border-slate-800/50">
              {/* Dynamic bottom action:
                  - If user already connected (walletClient or signer): Continue to Review (normal).
                  - If not connected: show Connect Wallet button that triggers ConnectKit modal.
              */}
              {!wallet && !walletClient ? (
                <div className="w-full">
                  <ConnectKitButton.Custom>
                    {({ show }) => (
                      <button
                        onClick={show}
                        className="w-full font-bold py-3 rounded-lg transition-all duration-300 text-base inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-cyan-500/20"
                      >
                        Connect Wallet to Begin 🔗
                      </button>
                    )}
                  </ConnectKitButton.Custom>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed}
                  className={`w-full font-bold py-3 rounded-lg transition-all duration-300 text-base relative overflow-hidden group ${
                    canProceed
                      ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-xl hover:shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span className="relative">Continue to Review 🚀</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="animate-fadeIn space-y-6">
            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-4 mb-6">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center font-bold text-2xl text-cyan-400">
                    {tokenData.symbol?.charAt(0) || "T"}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{tokenData.name}</h2>
                  <p className="text-cyan-400 font-mono">${tokenData.symbol}</p>
                </div>
              </div>

              {tokenData.description && (
                <div className="p-3 bg-slate-800/50 rounded-lg mb-4">
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  <p className="text-sm font-medium text-white">
                    {tokenData.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <ReviewStat label="Total Supply" value={currentSupplyDisplay} />
                <ReviewStat
                  label="Category"
                  value={`${
                    tokenTypes.find((t) => t.value === tokenData.type)?.icon
                  } ${tokenData.type}`}
                />
              </div>
            </div>

            {(tokenData.website || tokenData.telegram || tokenData.twitter) && (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                <h3 className="font-semibold text-lg text-pink-400 mb-2">
                  Social Links
                </h3>
                {tokenData.website && (
                  <SocialLink label="Website" value={tokenData.website} />
                )}
                {tokenData.telegram && (
                  <SocialLink label="Telegram" value={tokenData.telegram} />
                )}
                {tokenData.twitter && (
                  <SocialLink label="Twitter" value={tokenData.twitter} />
                )}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-slate-800/50">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition font-semibold"
              >
                Back & Edit
              </button>
              <button
                onClick={handleDeploy}
                disabled={!walletClient && !signer}
                className={`flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/20 font-bold transition ${
                  !walletClient && !signer
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Deploy Token
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 & 4 */}
        {step >= 3 && (
          <div className="text-center p-8 rounded-xl bg-slate-900/50 border border-slate-800 animate-fadeIn">
            {step === 3 && (
              <StatusDisplay
                icon="⏳"
                message="Deploying your token. Please approve the transaction in your wallet..."
              />
            )}

            {step === 4 && (
              <div className="flex flex-col items-center gap-6">
                <StatusDisplay icon="✅" message={`Deployment successful!`} />

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 w-full max-w-xl">
                  <p className="text-sm text-slate-400 mb-2">Token Address</p>

                  {/* Mobile shortened / desktop full */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-mono break-all">
                      <span className="sm:hidden">
                        {/* show shortened on small viewports */}
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
                      onClick={() => {
                        // go to token page in same tab (or can open new)
                        navigate(`/token/${tokenAddress}`);
                      }}
                      className="px-4 py-2 rounded-lg bg-cyan-600 font-semibold hover:brightness-110 transition"
                    >
                      View Token Page
                    </button>

                    <button
                      onClick={() => {
                        // create another token -> reset
                        setStep(1);
                        setTokenAddress(null);
                        setTokenData({
                          name: "",
                          symbol: "",
                          supply: "1000000000",
                          type: "",
                          website: "",
                          telegram: "",
                          twitter: "",
                          description: "",
                        });
                        setLogoFile(null);
                        setLogoPreview(null);
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

// ---------- Helper UI Components ----------
const FormSection = ({ title, icon, children }) => (
  <div className="p-4 md:p-6 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
    <h3 className="flex items-center gap-2 font-semibold text-lg text-cyan-400">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="flex flex-col">
    {label && <label className="text-sm text-slate-400 mb-1">{label}</label>}
    <input
      {...props}
      className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
    />
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div className="flex flex-col">
    {label && <label className="text-sm text-slate-400 mb-1">{label}</label>}
    <textarea
      {...props}
      className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
    />
  </div>
);

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
    <div className="text-6xl">{icon}</div>
    <p className="text-white/90 font-medium">{message}</p>
  </div>
);

export default CreateToken;
