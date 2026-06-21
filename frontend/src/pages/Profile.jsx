// src/components/Profile.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { User, TrendingUp, Sparkles, Shield, Edit3, Check, Copy, Image, History, X } from "lucide-react";
import { ConnectKitButton } from "connectkit";
import * as supabaseClient from "../lib/supabaseClient";

import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import { DashboardCard, Modal, Toast } from "../tabP/ProfileComponents";

const supabase = supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;
const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", HISTORY: "History" };

const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);
const sanitizeFilename = (s = "") => String(s).trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 200);

const getLogoPublicUrl = (path) => {
  if (!path) return null;
  try {
    const res = supabase.storage.from("logos").getPublicUrl(path);
    return res?.data?.publicUrl || res?.publicURL || res?.publicUrl || null;
  } catch { return null; }
};

const ensureUserRow = async (wallet) => {
  if (!wallet) return null;
  try {
    const { data: ext } = await supabase.from("users").select("*").eq("wallet", wallet.toLowerCase()).maybeSingle();
    if (ext) return ext;
    const { data: newRow } = await supabase.from("users").upsert({ wallet: wallet.toLowerCase(), created_at: new Date().toISOString() }, { onConflict: "wallet" }).select().maybeSingle();
    return newRow;
  } catch { return null; }
};

const Profile = () => {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address, watch: true });

  const [activeTab, setActiveTab] = useState(TABS.CREATED);
  const [portfolio, setPortfolio] = useState([]);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRow, setUserRow] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [createdSearch, setCreatedSearch] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [tokenUpdateForm, setTokenUpdateForm] = useState({ telegram: "", twitter: "", website: "", logo: "", description: "" });

  useEffect(() => { setNameInput(address ? (userRow?.display_name ?? "") : ""); }, [address, userRow]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: "" }), 3000);
  };

  const openUpdateModal = (t) => {
    setSelectedToken(t);
    setTokenUpdateForm({ telegram: t.telegram || "", twitter: t.twitter || "", website: t.website || "", logo: t.logo || "", description: t.description || "" });
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedToken || !address) return alert("Connect wallet to update token.");
    setLoading(true);
    try {
      const creator = (selectedToken.creator_wallet || selectedToken.creator || "").toLowerCase();
      if (creator !== address.toLowerCase()) throw new Error("Only the creator wallet can update this token.");

      const updates = { ...tokenUpdateForm };
      if (logoFile) {
        if (!["image/png", "image/jpeg", "image/gif", "image/svg+xml"].includes(logoFile.type)) throw new Error("Unsupported file type.");
        if (logoFile.size > 3 * 1024 * 1024) throw new Error("Logo max size limit is 3MB.");

        const fExt = logoFile.name.split(".").pop() || "png";
        const fPath = `logos/${sanitizeFilename(selectedToken.address + "_" + Date.now())}.${fExt}`;
        const { error: upErr } = await supabase.storage.from("logos").upload(fPath, logoFile, { cacheControl: "3600", upsert: true, contentType: logoFile.type });
        if (upErr) throw upErr;

        updates.logo_path = fPath;
        updates.logo = supabase.storage.from("logos").getPublicUrl(fPath).data?.publicUrl ?? null;
      }

      const payload = { telegram: updates.telegram || null, twitter: updates.twitter || null, website: updates.website || null, description: updates.description || null, logo_path: updates.logo_path || selectedToken.logo_path || null, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("tokens").update(payload).eq("address", selectedToken.address).eq("creator_wallet", address.toLowerCase());
      if (error) throw error;

      setCreatedTokens((p) => p.map((t) => t.address === selectedToken.address ? { ...t, ...payload, logo: updates.logo || t.logo } : t));
      showNotification("Token record successfully updated.");
      setIsModalOpen(false);
    } catch (err) { alert(err.message || String(err)); } finally { setLoading(false); }
  };

  const saveName = async () => {
    if (!address) return;
    const trimName = (nameInput || "").trim();
    setLoading(true);
    try {
      if (!trimName.length) {
        const { data, error } = await supabase.from("users").update({ display_name: null, updated_at: new Date().toISOString() }).eq("wallet", address.toLowerCase()).select().maybeSingle();
        if (error) throw error;
        setUserRow(data);
        setIsEditingName(false);
        return showNotification("Name payload index cleared.");
      }
      if (!validateDisplayName(trimName)) return setNameError("Format error: A-Z, 0-9 and spaces only (Max 30).");

      const { data, error } = await supabase.from("users").upsert({ wallet: address.toLowerCase(), display_name: trimName, updated_at: new Date().toISOString() }, { onConflict: "wallet" }).select().maybeSingle();
      if (error) throw error;
      setUserRow(data);
      setIsEditingName(false);
      showNotification("Display designation accepted.");
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

     useEffect(() => {
    if (!address) return;
    (async () => {
      setLoading(true);
      try {
        const wallet = address.toLowerCase();
        setUserRow(await ensureUserRow(wallet));

        // FIX: Implement logical .or constraint checking to guarantee cross-case matching coverage
        const { data: cRows, error: tokenErr } = await supabase
          .from("tokens")
          .select("*")
          .or(`creator_wallet.eq.${wallet},creator_wallet.eq.${address}`)
          .order("created_at", { ascending: false });
          
        if (tokenErr) throw tokenErr;

        setCreatedTokens((cRows || []).map((r) => ({ ...r, logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : r.logo || null })));

        const base = import.meta?.env?.VITE_API_BASE || "http://localhost:3000";
        const res = await fetch(`${base.replace(/\/$/, "")}/api/portfolio?wallet=${encodeURIComponent(wallet)}`, { headers: { Accept: "application/json" } });
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          setPortfolio((await res.json() || []).map((r) => ({ ...r, logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : r.logo || null, amount: r.user_amount ?? r.amount ?? "0", value: r.user_value ?? r.value ?? "0", change24h: r.change24h ?? "+0.0%" })));
        }
      } catch (e) { console.error("Identity collection error", e); } finally { setLoading(false); }
    })();
  }, [address, isConnected]);


  const totalPortfolioValue = useMemo(() => portfolio.reduce((sum, t) => sum + parseFloat(String(t.value || "0").replace(/,/g, "")), 0), [portfolio]);
  const filteredCreatedTokens = useMemo(() => createdTokens.filter((t) => t.name?.toLowerCase().includes(createdSearch.toLowerCase()) || t.symbol?.toLowerCase().includes(createdSearch.toLowerCase())), [createdTokens, createdSearch]);
  const filteredPortfolio = useMemo(() => portfolio.filter((t) => t.name?.toLowerCase().includes(portfolioSearch.toLowerCase()) || t.symbol?.toLowerCase().includes(portfolioSearch.toLowerCase())), [portfolio, portfolioSearch]);

  if (!isConnected) {
    return (
      <div className="font-mono min-h-screen bg-[#030712] flex items-center justify-center p-4 text-slate-400">
        <div className="max-w-md w-full p-4 bg-[#0b0f19]/40 border border-slate-900 text-center space-y-4">
          <Shield size={24} className="mx-auto text-slate-500" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">AUTHENTICATION_REQUIRED</h3>
            <p className="text-[11px] text-slate-500 uppercase mt-1">Initialize Web3 engine block configuration link to access terminal</p>
          </div>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="w-full p-2.5 bg-[#030712] border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider">
                CONNECT_WALLET
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono min-h-screen bg-[#030712] text-slate-300 p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Metrics Node Module */}
      <div className="p-4 bg-[#0b0f19]/40 border border-slate-900 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex gap-3 items-start min-w-0">
          <div className="w-12 h-12 bg-[#030712] border border-slate-900 flex items-center justify-center shrink-0">
            <User size={18} className="text-slate-500" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-sm font-black text-slate-200 tracking-wider uppercase truncate">{address?.slice(0, 6)}...{address?.slice(-4)}</h1>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 break-all select-all">
              <span>{address}</span>
              <button onClick={copyAddress} className="text-slate-500 hover:text-slate-300 shrink-0">
                {copied ? <Check size={11} className="text-[#96d6cd]" /> : <Copy size={11} />}
              </button>
            </div>
            
            <div className="pt-2">
              {!isEditingName ? (
                <button onClick={() => { setNameError(""); setIsEditingName(true); setNameInput(userRow?.display_name ?? ""); }} className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#030712] border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <Edit3 size={10} /> {userRow?.display_name ? `ID: ${userRow.display_name}` : "ASSIGN_DISPLAY_NAME"}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-1.5 max-w-md mt-1">
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="A-Z, 0-9 (Max 30)" className="px-2 py-1 bg-[#030712] border border-slate-900 text-xs text-slate-200 focus:outline-none" />
                  <div className="flex gap-1">
                    <button onClick={saveName} disabled={loading} className="px-2 py-1 bg-[#0b0f19] border border-slate-800 text-[#96d6cd] text-[10px] font-bold uppercase">SAVE</button>
                    <button onClick={() => setIsEditingName(false)} className="px-2 py-1 bg-[#030712] border border-slate-900 text-slate-500 text-[10px] font-bold uppercase">CANCEL</button>
                  </div>
                </div>
              )}
              {nameError && <p className="text-rose-500 text-[9px] mt-1 uppercase">!! {nameError}</p>}
            </div>
          </div>
        </div>

        {/* Engine Metrics Dashboard Column Right */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-2 text-left font-mono border-t lg:border-t-0 lg:border-l border-slate-900 pt-4 lg:pt-0 lg:pl-6 text-[11px]">
          <div>
            <span className="text-slate-500 uppercase font-bold block tracking-wider mb-0.5">NATIVE_BAL</span>
            <span className="text-sm font-black text-slate-200 block">{balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : "0.00"}</span>
            <span className="text-[9px] text-slate-600 font-bold block">{balanceData?.symbol || "ETH"}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-bold block tracking-wider mb-0.5">PORTFOLIO_VAL</span>
            <span className="text-sm font-black text-slate-200 block">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[9px] text-slate-600 font-bold block">USD_VALUE_INDEX</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="flex gap-1 border-b border-slate-900 pb-px overflow-x-auto">
        {[
          { id: TABS.CREATED, label: "SYS_CREATED", icon: Sparkles },
          { id: TABS.PORTFOLIO, label: "SYS_PORTFOLIO", icon: TrendingUp },
          { id: TABS.HISTORY, label: "SYS_HISTORY", icon: History }
        ].map((t) => {
          const Active = activeTab === t.id;
          return (
            <button
              key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border-t border-x rounded-none shrink-0 ${Active ? "bg-[#0b0f19]/40 text-[#96d6cd] border-slate-900" : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"}`}
            >
              <t.icon size={11} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Primary Workspace View Frame */}
      <div className="min-w-0">
        {activeTab === TABS.CREATED && <CreatedTokensTab data={filteredCreatedTokens} loading={loading} searchTerm={createdSearch} setSearchTerm={setCreatedSearch} openUpdateModal={openUpdateModal} DashboardCard={DashboardCard} />}
        {activeTab === TABS.PORTFOLIO && <PortfolioAssetsTab data={filteredPortfolio} loading={loading} searchTerm={portfolioSearch} setSearchTerm={setPortfolioSearch} DashboardCard={DashboardCard} />}
        {activeTab === TABS.HISTORY && <TransactionHistoryTab address={address} hideIfNoAddress={!isConnected} loading={loading} />}
      </div>

      {/* Update Token Node Configuration Panel Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedToken && (
          <div className="p-4 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-4">
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-200 block tracking-wider uppercase">UPDATE_TOKEN_METADATA</span>
                <span className="text-[10px] text-slate-500 block truncate font-bold uppercase">${selectedToken.symbol} // {selectedToken.name}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-200"><X size={14} /></button>
            </div>

            <div className="space-y-3">
              {["telegram", "twitter", "website"].map((f) => (
                <div key={f} className="flex flex-col">
                  <label className="text-slate-500 font-bold uppercase tracking-wider mb-1">{f}_ROUTING_URL</label>
                  <input
                    type="url" value={tokenUpdateForm[f]} maxLength={f === "website" ? 100 : 40}
                    placeholder={f === "telegram" ? "https://t.me/channel" : f === "twitter" ? "https://x.com/handle" : "https://domain.com"}
                    onChange={(e) => setTokenUpdateForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="p-2 bg-[#030712] border border-slate-900 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              ))}

              <div className="flex flex-col">
                <label className="text-slate-500 font-bold uppercase tracking-wider mb-1">IMAGE_RESOURCE_LOGO (MAX 3MB)</label>
                <div className="flex items-center gap-2 p-2 bg-[#030712] border border-slate-900">
                  <input type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-xs file:bg-[#0b0f19] file:border file:border-slate-800 file:text-slate-400 file:text-[10px] file:font-bold file:px-2 file:py-0.5 text-slate-400" />
                  {logoFile ? <span className="text-[10px] text-[#96d6cd] font-bold shrink-0">READY</span> : selectedToken.logo && <img src={selectedToken.logo} className="w-5 h-5 object-cover border border-slate-800 shrink-0" />}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between text-slate-500 font-bold uppercase tracking-wider mb-1"><span>DESCRIPTION</span><span>{String(tokenUpdateForm.description || "").length}/200</span></div>
                <textarea rows={2} maxLength={200} value={tokenUpdateForm.description} onChange={(e) => setTokenUpdateForm((p) => ({ ...p, description: e.target.value }))} className="p-2 bg-[#030712] border border-slate-900 text-xs text-slate-200 focus:outline-none resize-none" />
              </div>

              <button
                onClick={handleUpdateSubmit} disabled={loading}
                style={{ backgroundColor: !loading ? '#96d6cd' : '', color: !loading ? '#030712' : '' }}
                className={`w-full p-2.5 font-bold text-xs uppercase tracking-widest text-center transition-all ${loading ? "bg-slate-900 text-slate-600 border border-slate-900 cursor-not-allowed" : "hover:opacity-95"}`}
              >
                {loading ? "PROCESSING..." : "COMMIT_METADATA_CHANGES"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={notification.message} show={notification.show} />
    </div>
  );
};

export default Profile;
