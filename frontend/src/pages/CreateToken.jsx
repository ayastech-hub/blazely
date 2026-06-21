// src/components/CreateToken.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import BlazelyLaunchpad from "../abi/BlazelyLaunchpad.json";
import { useWallet } from "../context/WalletContext";
import { useChainId, useAccount, useBalance } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ethers } from "ethers";
import { UploadCloud, Check, Copy, ExternalLink, AlertTriangle, X, Loader2, CheckCircle } from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { createToken as createTokenInDb } from "../api/tokensApi";
import * as supabaseClient from "../lib/supabaseClient";

const supabase = supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;
const TOTAL_SUPPLY = 1_000_000_000;
const PRICE_PER_TOKEN_ETH = 0.000000001;
const ETH_PER_TOKEN = 1 / PRICE_PER_TOKEN_ETH;

const parseErrorMessage = (err) => {
  if (err?.code === 4001 || err?.message?.includes("user rejected transaction") || err?.message?.includes("User denied transaction signature")) {
    return "Transaction rejected by user.";
  }
  if (err?.message?.includes("insufficient funds")) return "Insufficient ETH for gas.";
  if (err?.reason) return `Transaction failed: ${err.reason}`;
  if (err?.code === "23505") return "Address extraction failed. Please try again.";
  return "An unexpected error occurred.";
};

/* ------------------- Reusable High-Density Controls ------------------- */
const Field = ({ label, isError, maxLength, value = "", isTextarea, ...p }) => {
  const Comp = isTextarea ? "textarea" : "input";
  return (
    <div className="flex flex-col text-[11px] w-full">
      <div className="flex justify-between items-center text-slate-500 font-bold uppercase tracking-wider mb-1">
        <span>{label}</span>
        {maxLength && <span>{String(value).length}/{maxLength}</span>}
      </div>
      <Comp
        {...p}
        value={value}
        maxLength={maxLength}
        className={`w-full p-2 bg-[#030712] text-slate-200 border rounded-none font-mono text-xs focus:outline-none focus:border-slate-700 ${isError ? "border-rose-500" : "border-slate-900"}`}
      />
      {isError && <span className="text-rose-500 text-[10px] mt-0.5">{isError}</span>}
    </div>
  );
};

/* ------------------- Initial Buy Component ------------------- */
const InitialBuySection = ({ ethAmount, setEthAmount, walletBalance }) => {
  const [inputError, setInputError] = useState("");
  const balance = Number(walletBalance || 0);

  const handleEthChange = (e) => {
    const val = String(e.target.value).trim();
    setEthAmount(val);
    if (!val) return setInputError("");
    const eth = parseFloat(val);
    if (isNaN(eth) || eth <= 0) return setInputError("Enter a valid ETH amount");
    if (balance > 0 && eth > balance) return setInputError("Insufficient balance");
    if (((eth * ETH_PER_TOKEN) / TOTAL_SUPPLY) * 100 > 50) return setInputError("Initial buy cannot exceed 50% of total supply");
    inputError && setInputError("");
  };

  const setPercent = (pct) => {
    if (!balance || balance <= 0) return (setEthAmount(""), setInputError(""));
    const val = Math.max(0, balance - 0.001) * pct;
    const strVal = val.toFixed(6).replace(/\.?0+$/, "");
    setEthAmount(strVal);
    if (((parseFloat(strVal) * ETH_PER_TOKEN) / TOTAL_SUPPLY) * 100 > 50) {
      setInputError("Initial buy cannot exceed 50% of total supply");
    } else setInputError("");
  };

  const stats = useMemo(() => {
    const eth = parseFloat(ethAmount);
    if (!eth) return { tokens: "0", pct: "0.00" };
    return {
      tokens: (eth * ETH_PER_TOKEN).toLocaleString(undefined, { maximumFractionDigits: 0 }),
      pct: (((eth * ETH_PER_TOKEN) / TOTAL_SUPPLY) * 100).toFixed(4),
    };
  }, [ethAmount]);

  return (
    <div className="p-3 bg-[#0b0f19]/40 border border-slate-900 font-mono text-[11px]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-slate-400 font-bold uppercase tracking-wider">💰 INITIAL BUY (OPTIONAL)</span>
        <span className="text-slate-500">BAL: {Number(balance).toFixed(6)} ETH</span>
      </div>
      <div className="flex gap-2 mb-2 items-start">
        <div className="flex-1">
          <input
            type="number"
            placeholder="0.1"
            step="0.000001"
            value={ethAmount}
            onChange={handleEthChange}
            className={`w-full p-2 bg-[#030712] text-slate-200 border rounded-none text-xs focus:outline-none ${inputError ? "border-rose-500" : "border-slate-900"}`}
          />
        </div>
        <div className="flex gap-1 shrink-0">
          {[0.25, 0.5, 1].map((p, idx) => (
            <button key={idx} type="button" onClick={() => setPercent(p)} className="p-2 bg-[#030712] border border-slate-900 text-slate-400 hover:text-slate-200 text-[10px]">
              {p === 1 ? "MAX" : `${p * 100}%`}
            </button>
          ))}
        </div>
      </div>
      {inputError && <p className="text-rose-500 mb-2 text-[10px]">{inputError}</p>}
      <div className="bg-[#030712]/60 border border-slate-900/60 p-2 text-[10px] text-slate-400 space-y-1">
        <div className="flex justify-between"><span>EST_TOKENS:</span><span className="text-slate-200 font-bold">{stats.tokens}</span></div>
        <div className="flex justify-between"><span>SUPPLY_FILL:</span><span className="text-slate-200 font-bold">{stats.pct}%</span></div>
      </div>
    </div>
  );
};

/* ------------------- Main Component ------------------- */
const CreateToken = () => {
  const navigate = useNavigate();
  const chainId = useChainId();
  const { signer } = useWallet();
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address: connectedAddress, watch: true });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [ethAmount, setEthAmount] = useState("");
  const [error, setError] = useState(null);
  const [dbWarning, setDbWarning] = useState(null);
  const [copied, setCopied] = useState(false);

  const [tokenData, setTokenData] = useState({ name: "", symbol: "", website: "", telegram: "", twitter: "", description: "" });
  const [socialErrors, setSocialErrors] = useState({ website: "", telegram: "", twitter: "" });
  const [invalidCharError, setInvalidCharError] = useState({ name: "", symbol: "" });

  const walletBalanceEth = useMemo(() => {
    if (!balanceData?.value) return 0;
    try { return parseFloat(ethers.formatEther(balanceData.value)); } catch { return 0; }
  }, [balanceData]);

  const ethValidation = useMemo(() => {
    if (!ethAmount || !String(ethAmount).trim()) return { ok: true, reason: null };
    const v = parseFloat(String(ethAmount).trim());
    if (isNaN(v) || v <= 0) return { ok: false, reason: "invalid" };
    if (walletBalanceEth && v > walletBalanceEth) return { ok: false, reason: "insufficient_balance" };
    if (((v * ETH_PER_TOKEN) / TOTAL_SUPPLY) * 100 > 50) return { ok: false, reason: "exceeds_supply" };
    return { ok: true, reason: null };
  }, [ethAmount, walletBalanceEth]);

  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 8000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (copied) { const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t); } }, [copied]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nv = value ?? "";
    let err = "";
    const regex = /^[A-Za-z0-9]*$/;

    if (name === "name") {
      nv = nv.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83D[\uDC00-\uDE4F])/g, "").slice(0, 40);
      const flt = nv.split("").filter((c) => regex.test(c) || c === " ").join("");
      if (flt !== nv) err = "Only alphanumeric values and spaces allowed";
      nv = flt;
      setInvalidCharError((p) => ({ ...p, name: err }));
    } else if (name === "symbol") {
      nv = nv.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83D[\uDC00-\uDE4F])/g, "").slice(0, 15);
      const flt = nv.split("").filter((c) => regex.test(c)).join("");
      if (flt !== nv) err = "Only numbers and letters allowed, no spaces";
      nv = flt;
      setInvalidCharError((p) => ({ ...p, symbol: err }));
    } else if (["website", "telegram", "twitter"].includes(name) && nv) {
      if (name === "website" && !/^https?:\/\//i.test(nv)) err = "Must start with http:// or https://";
      else if (name === "telegram" && !/^https:\/\/t\.me\/[a-zA-Z0-9_]+$/i.test(nv)) err = "Format requirement: https://t.me/username";
      else if (name === "twitter" && !/^https?:\/\/(twitter|x)\.com\/[a-zA-Z0-9_]+$/i.test(nv)) err = "Format requirement: https://x.com/username";
      setSocialErrors((p) => ({ ...p, [name]: err }));
    }
    setTokenData((p) => ({ ...p, [name]: nv }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Upload must be an image file.");
    if (file.size / (1024 * 1024) > 5) return setError("File size limit is 5MB.");
    setLogoFile(file);
    const r = new FileReader();
    r.onload = (ev) => setLogoPreview(ev.target.result);
    r.readAsDataURL(file);
  };

  async function sendTokenToDatabase(meta, logo) {
    const payload = {
      address: meta.address?.toLowerCase(),
      name: meta.name?.toLowerCase() || null,
      symbol: meta.symbol?.toLowerCase() || null,
      website: meta.website || null,
      twitter: meta.twitter || null,
      telegram: meta.telegram || null,
      description: meta.description || null,
      creator_wallet: meta.creator_wallet?.toLowerCase(),
      chain_id: meta.chain_id,
      updated_at: new Date().toISOString(),
      decimals: 18
    };

    if (typeof createTokenInDb === "function") {
      try { return await createTokenInDb(payload, logo); } catch { /* pass-through */ }
    }
    const { error: dberr } = await supabase.from("tokens").upsert(payload, { onConflict: "address" });
    if (dberr) throw dberr;

    if (logo) {
      try {
        const fName = `${Date.now()}_${logo.name}`;
        const { error: upErr } = await supabase.storage.from("logos").upload(fName, logo, { cacheControl: "3600", upsert: false });
        if (!upErr) {
          const { data: urlData } = await supabase.storage.from("logos").getPublicUrl(fName);
          if (urlData?.publicUrl) {
            await supabase.from("tokens").update({ logo_path: urlData.publicUrl, updated_at: new Date().toISOString() }).eq("address", payload.address);
          }
        }
      } catch (e) { console.warn("Logo storage fault line ignored", e); }
    }
  }

  const handleDeploy = async () => {
    let finalAddress = null;
    setError(null);
    setDbWarning(null);

    // STEP A: Deploy Smart Contract Execution
    try {
      setStep(2);
      setLoading(true);
      if (!signer) throw new Error("Wallet connectivity drop. Please authenticate.");
      
      const creator = (await signer.getAddress())?.toLowerCase();
      const lpAddr = BlazelyLaunchpad.address || "0xf23fFE56BB661d2462F60E8B4D18A45444f20156";
      const contract = new ethers.Contract(lpAddr, BlazelyLaunchpad.abi || BlazelyLaunchpad, signer);

      const name = String(tokenData.name).trim();
      const symbol = String(tokenData.symbol).trim();
      let val = 0n;
      if (parseFloat(ethAmount) > 0) val = ethers.parseEther(String(ethAmount));

      const tx = await contract.create(name, symbol, { gasLimit: 8000000, value: val });
      const receipt = await tx.wait();

      let tokenAddressParsed = null;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p && p.name === "Launched") { 
            tokenAddressParsed = p.args.token ?? p.args[0]; 
            break; 
          }
        } catch {}
      }
      
      if (!tokenAddressParsed) tokenAddressParsed = "Unknown";
      finalAddress = String(tokenAddressParsed).toLowerCase();
      setTokenAddress(finalAddress);

      // STEP B: Safely Try Syncing database inside separate handler
      try {
        await sendTokenToDatabase({
          address: finalAddress, name, symbol, website: tokenData.website,
          twitter: tokenData.twitter, telegram: tokenData.telegram,
          description: tokenData.description, creator_wallet: creator, chain_id: chainId || sepolia.id
        }, logoFile);
      } catch (dbErr) {
        console.error("Database tracking sync failed:", dbErr);
        // Do not crash execution or reverse layout view. Alert user they can capture the CA manually.
        setDbWarning("Contract deployed successfully, but metadata could not be indexed due to connection blocklines.");
      }

      // Proceed directly to Success panel representation
      setStep(3);
    } catch (err) {
      console.error("Deployment step rejected:", err);
      setError(parseErrorMessage(err));
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = tokenData.name.trim() && tokenData.symbol.trim() && logoFile && !Object.values(invalidCharError).some(Boolean);
  const isDeployDisabled = loading || !isFormValid || !ethValidation.ok || Object.values(socialErrors).some(Boolean);

  return (
    <div className="font-mono min-h-screen bg-[#030712] text-slate-300 p-4 sm:p-8 relative">
      {error && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-rose-950/90 border border-rose-800 text-slate-100 flex items-start gap-3 text-xs max-w-sm">
          <AlertTriangle size={14} className="shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block mb-0.5">DEPLOYMENT_EXCEPTION</span>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-200"><X size={14} /></button>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Progress Grid Tracker Block */}
        <div className="flex items-center gap-1 mb-8 border border-slate-900 bg-[#0b0f19]/20 p-2 text-[10px] font-bold text-slate-500 tracking-widest">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex-1 flex items-center gap-2 px-2 py-1 ${step === n ? "bg-[#96d6cd]/10 border border-[#96d6cd]/40 text-[#96d6cd]" : "bg-[#030712]/40 border border-slate-900"}`}>
              <span>[{String(n).padStart(2, "0")}]</span>
              <span className="uppercase">{n === 1 ? "SPECIFICATION" : n === 2 ? "TRANSMITTING" : "VERIFIED"}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Identity Core Configuration Column */}
            <div className="lg:col-span-2 bg-[#0b0f19]/40 border border-slate-900 p-4 space-y-4">
              <div className="text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 uppercase tracking-wider">CORE_PARAMETERS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Token Name *" name="name" value={tokenData.name} onChange={handleChange} maxLength={40} isError={invalidCharError.name} />
                <Field label="Symbol *" name="symbol" value={tokenData.symbol} onChange={handleChange} maxLength={15} isError={invalidCharError.symbol} />
              </div>
              <Field label="Description" name="description" value={tokenData.description} onChange={handleChange} maxLength={300} isTextarea rows={3} />
              
              <div className="text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 pt-2 uppercase tracking-wider">NET_ROUTING_SOCIALS</div>
              <div className="space-y-3">
                <Field label="Website" name="website" placeholder="https://yourwebsite.com" value={tokenData.website} onChange={handleChange} isError={socialErrors.website} />
                <Field label="Telegram" name="telegram" placeholder="https://t.me/username" value={tokenData.telegram} onChange={handleChange} isError={socialErrors.telegram} />
                <Field label="Twitter / X" name="twitter" placeholder="https://x.com/username" value={tokenData.twitter} onChange={handleChange} isError={socialErrors.twitter} />
              </div>
            </div>

            {/* Assets Image Input and Integration Control Side */}
            <div className="space-y-4 lg:col-span-1">
              <div className="bg-[#0b0f19]/40 border border-slate-900 p-4 flex flex-col items-center">
                <div className="text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1 w-full uppercase tracking-wider text-left mb-3">ASSET_IMAGE</div>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file?.type.startsWith("image/") && file.size / (1024 * 1024) <= 5) {
                      setLogoFile(file);
                      const r = new FileReader(); r.onload = (ev) => setLogoPreview(ev.target.result); r.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-[#030712] border border-dashed border-slate-900 p-4 flex flex-col items-center justify-center min-h-[140px]"
                >
                  {logoPreview ? (
                    <img src={logoPreview} className="w-20 h-20 border border-slate-900 object-cover rounded-none" alt="logo preview" />
                  ) : (
                    <UploadCloud size={24} className="text-slate-600 mb-2" />
                  )}
                  <label className="mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[#0b0f19] border border-slate-800 text-slate-300 hover:text-slate-100 cursor-pointer">
                    CHOOSE_FILE
                    <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                  </label>
                  <span className="text-[9px] text-slate-600 mt-2">MAX SIZE: 5MB</span>
                </div>
              </div>

              <InitialBuySection ethAmount={ethAmount} setEthAmount={setEthAmount} walletBalance={walletBalanceEth} />

              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button
                    onClick={isConnected ? handleDeploy : show}
                    disabled={isDeployDisabled}
                    style={{ backgroundColor: !isDeployDisabled ? '#96d6cd' : '', color: !isDeployDisabled ? '#030712' : '' }}
                    className={`w-full p-3 font-bold text-xs uppercase tracking-widest text-center transition-all rounded-none ${isDeployDisabled ? "bg-slate-900 text-slate-600 border border-slate-900 cursor-not-allowed" : "hover:opacity-90"}`}
                  >
                    {loading ? "TRANSMITTING..." : isConnected ? "DEPLOY CONTRACT" : "INITIALIZE WALLET"}
                  </button>
                )}
              </ConnectKitButton.Custom>
              {!isConnected && <div className="text-[9px] text-center text-slate-600 uppercase">SYS_NOTICE // CONNECTION REQ</div>}
            </div>
          </div>
        )}

        {step >= 2 && (
          <div className="bg-[#0b0f19]/40 border border-slate-900 p-6 flex flex-col items-center justify-center text-center">
            {step === 2 && (
              <div className="py-8 space-y-4">
                <Loader2 size={32} className="animate-spin text-slate-500 mx-auto" />
                <p className="text-xs uppercase tracking-wider font-bold max-w-sm text-slate-300">
                  Transmitting cryptographic initialization sequence. Awaiting signature validation inside connected engine nodes...
                </p>
              </div>
            )}
            {step === 3 && (
              <div className="w-full max-w-xl space-y-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <CheckCircle size={32} style={{ color: '#96d6cd' }} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-200">DEPLOYMENT_SUCCESSFUL</span>
                </div>

                {dbWarning && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800 text-amber-400 text-left text-xs uppercase tracking-wide flex gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <p>{dbWarning}</p>
                  </div>
                )}
                
                <div className="bg-[#030712] border border-slate-900 p-3 text-left">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">REGISTERED_CONTRACT_ADDRESS</div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono text-slate-300 truncate tracking-wide uppercase break-all">{tokenAddress}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={async () => { await navigator.clipboard.writeText(tokenAddress); setCopied(true); }} className="p-1 border border-slate-800 text-slate-400 hover:text-slate-200" title="Copy address hash"><Copy size={12} /></button>
                      {tokenAddress !== "Unknown" && (
                        <Link to={`/token/${tokenAddress}`} target="_blank" className="p-1 border border-slate-800 text-slate-400 hover:text-slate-200" title="Open metrics layout"><ExternalLink size={12} /></Link>
                      )}
                    </div>
                  </div>
                  {copied && <p className="text-[10px] text-[#96d6cd] mt-1 font-bold">HASH_COPIED_TO_CLIPBOARD</p>}
                </div>

                <div className="flex gap-2 justify-center pt-2">
                  {tokenAddress !== "Unknown" && (
                    <button onClick={() => navigate(`/token/${tokenAddress}`)} style={{ backgroundColor: '#96d6cd', color: '#030712' }} className="px-4 py-1.5 text-xs font-black uppercase tracking-wider hover:opacity-90">VIEW_TOKEN</button>
                  )}
                  <button
                    onClick={() => {
                      setStep(1); setTokenAddress(null); setLogoFile(null); setLogoPreview(null); setEthAmount("");
                      setTokenData({ name: "", symbol: "", website: "", telegram: "", twitter: "", description: "" });
                      setDbWarning(null);
                    }}
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#030712] border border-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    RESET_INTERFACE
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateToken;
