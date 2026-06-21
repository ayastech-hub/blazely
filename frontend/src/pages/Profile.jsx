// src/components/Profile.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { User, TrendingUp, Sparkles, Shield, Edit3, Check, Copy, History, X } from "lucide-react";
import { ConnectKitButton } from "connectkit";
import * as supabaseClient from "../lib/supabaseClient";

import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import { DashboardCard, Modal, Toast } from "../tabP/ProfileComponents";

// Modular UI Injectables
import { SocialConnect } from "../tabP/SocialConnect";
import { SocialMetrics } from ".
/tabP/SocialMetrics";

const supabase = supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;
const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", HISTORY: "History" };

const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);
const sanitizeFilename = (s = "") => String(s).trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 200);

const getLogoPublicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
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
  
  // Custom tracking state counts
  const [followingCount, setFollowingCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);

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

  const handleSocialsUpdate = async (socialsPayload) => {
    if (!address) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ ...socialsPayload, updated_at: new Date().toISOString() })
        .eq("wallet", address.toLowerCase())
        .select()
        .maybeSingle();
      if (error) throw error;
      setUserRow(data);
      showNotification("Social coordinates successfully locked.");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
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
      const wallet = address.toLowerCase();

      try {
        const userRowData = await ensureUserRow(wallet);
        setUserRow(userRowData);
      } catch (userErr) {
        console.error("Non-fatal user initialization skip:", userErr);
      }

      // Fetch Follows & Watchlist row lengths dynamically from Supabase
      try {
        const { count: followingCountData } = await supabase.from("user_follow").select("*", { count: "exact", head: true }).eq("user_wallet", wallet).eq("is_active", true);
        const { count: watchlistCountData } = await supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_wallet", wallet);
        setFollowingCount(followingCountData || 0);
        setWatchlistCount(watchlistCountData || 0);
      } catch (countErr) {
        console.error("Error reading network metadata counters:", countErr);
      }

      try {
        const { data: cRows, error: tokenErr } = await supabase
          .from("tokens")
          .select("*")
          .or(`creator_wallet.eq.${wallet},creator_wallet.eq.${address}`)
          .order("created_at", { ascending: false });
          
        if (tokenErr) throw tokenErr;

        if (cRows) {
          setCreatedTokens(cRows.map((r) => ({ 
            ...r, 
            logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : (r.logo_url || r.logo || null) 
          })));
        }
      } catch (dbErr) {
        console.error("Supabase direct pull error caught:", dbErr);
      }

      try {
        const base = import.meta?.env?.VITE_API_BASE || "http://localhost:3000";
        const res = await fetch(`${base.replace(/\/$/, "")}/api/portfolio?wallet=${encodeURIComponent(wallet)}`, { headers: { Accept: "application/json" } });
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          setPortfolio((await res.json() || []).map((r) => ({ ...r, logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : (r.logo_url || r.logo || null), amount: r.user_amount ?? r.amount ?? "0", value: r.user_value ?? r.value ?? "0", change24h: r.change24h ?? "+0.0%" })));
        }
      } catch (portfolioError) {
        console.error("Local network ecosystem portfolio API skipped cleanly:", portfolioError);
      }
      
      setLoading(false);
    })();
  }, [address, isConnected]);

  const totalPortfolioValue = useMemo(() => portfolio.reduce((sum, t) => sum + parseFloat(String(t.value || "0").replace(/,/g, "")), 0), [portfolio]);
  const filteredCreatedTokens = useMemo(() => createdTokens.filter((t) => (t.name || "").toLowerCase().includes(createdSearch.toLowerCase()) || (t.symbol || "").toLowerCase().includes(createdSearch.toLowerCase())), [createdTokens, createdSearch]);
  const filteredPortfolio = useMemo(() => portfolio.filter((t) => (t.name || "").toLowerCase().includes(portfolioSearch.toLowerCase()) || (t.symbol || "").toLowerCase().includes(portfolioSearch.toLowerCase())), [portfolio, portfolioSearch]);

  if (!isConnected) {
    return (
      <div className="font-mono min-h-screen bg-[#030712] flex items-center justify-center p-4 text-slate-400">
        <div className="max-w-md w-full p-6 bg-[#0b0f19]/40 border border-slate-900 rounded-lg text-center space-y-4 shadow-xl shadow-black/50">
          <Shield size={28} className="mx-auto text-slate-600 animate-pulse" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">AUTHENTICATION_REQUIRED</h3>
            <p className="text-[11px] text-slate-500 uppercase mt-1">Initialize Web3 engine block configuration link to access terminal</p>
          </div>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="w-full p-2.5 bg-[#030712] border border-slate-800 hover:border-slate-600 hover:text-white rounded text-slate-200 text-xs font-bold uppercase tracking-wider transition-all">
                CONNECT_WALLET
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono min-h-screen bg-[#030712] text-slate-300 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Metrics Node Module */}
      <div className="p-5 bg-[#0b0f19]/40 border border-slate-900 rounded-lg shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-4 items-start min-w-0">
          <div className="w-14 h-14 bg-[#030712] border border-slate-800 rounded-md flex items-center justify-center shrink-0 shadow-inner">
            <User size={22} className="text-slate-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-1 w-full">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-200 tracking-wider uppercase truncate">{address?.slice(0, 6)}...{address?.slice(-4)}</h1>
              <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-bold text-slate-500">USER_NODE</span>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-500 break-all select-all font-mono">
              <span className="truncate max-w-xs sm:max-w-md">{address}</span>
              <button onClick={copyAddress} className="text-slate-500 hover:text-[#96d6cd] transition-colors shrink-0 p-0.5 hover:bg-[#030712] rounded border border-transparent hover:border-slate-800">
                {copied ? <Check size={11} className="text-[#96d6cd]" /> : <Copy size={11} />}
              </button>
            </div>
            
            <div className="pt-2">
              {!isEditingName ? (
                <button onClick={() => { setNameError(""); setIsEditingName(true); setNameInput(userRow?.display_name ?? ""); }} className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-[#030712] border border-slate-800 rounded text-slate-400 hover:text-slate-200 hover:border-slate-700 flex items-center gap-1 transition-all">
                  <Edit3 size={10} /> {userRow?.display_name ? `ID: ${userRow.display_name}` : "ASSIGN_DISPLAY_NAME"}
                </button>
              ) : (
                <div className="flex gap-1.5 max-w-md mt-1">
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="A-Z, 0-9 (Max 30)" className="px-2 py-1.5 bg-[#030712] border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-slate-700 w-full" />
                  <div className="flex gap-1 shrink-0">
                    <button onClick={saveName} disabled={loading} className="px-2.5 py-1 bg-[#0b0f19] border border-slate-800 text-[#96d6cd] rounded text-[10px] font-bold uppercase transition-all hover:bg-slate-900">SAVE</button>
                    <button onClick={() => setIsEditingName(false)} className="px-2.5 py-1 bg-[#030712] border border-slate-800 text-slate-500 rounded text-[10px] font-bold uppercase transition-all hover:text-slate-400">CANCEL</button>
                  </div>
                </div>
              )}
              {nameError && <p className="text-rose-500 text-[9px] mt-1 uppercase tracking-tight">!! {nameError}</p>}
            </div>

            {/* Social Connect Module */}
            <SocialConnect userRow={userRow} onUpdate={handleSocialsUpdate} loading={loading} />
          </div>
        </div>

        {/* Engine Metrics Dashboard Column Right */}
        <div className="lg:col-span-1 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-900 pt-4 lg:pt-0 lg:pl-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 uppercase font-bold block tracking-wider text-[9px] mb-0.5">NATIVE_BAL</span>
              <span className="text-base font-black text-slate-200 block tracking-tight">{balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : "0.00"}</span>
              <span className="text-[9px] text-slate-600 font-bold block uppercase">{balanceData?.symbol || "ETH"} // Core_Gas</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-bold block tracking-wider text-[9px] mb-0.5">PORTFOLIO_VAL</span>
              <span className="text-base font-black text-slate-200 block tracking-tight">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-slate-600 font-bold block uppercase">USD_VALUE_INDEX</span>
            </div>
          </div>
          
          {/* Realtime dynamic database follower indicators */}
          <SocialMetrics followingCount={followingCount} watchlistCount={watchlistCount} />
        </div>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="flex gap-1 border-b border-slate-900 pb-px overflow-x-auto scrollbar-hide">
        {[
          { id: TABS.CREATED, label: "SYS_CREATED", icon: Sparkles },
          { id: TABS.PORTFOLIO, label: "SYS_PORTFOLIO", icon: TrendingUp },
          { id: TABS.HISTORY, label: "SYS_HISTORY", icon: History }
        ].map((t) => {
          const Active = activeTab === t.id;
          return (
            <button
              key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border-t border-x rounded-t-md shrink-0 ${Active ? "bg-[#0b0f19]/40 text-[#96d6cd] border-slate-900 font-black relative before:absolute before:bottom-[-1px] before:left-0 before:right-0 before:h-[1px] before:bg-[#0b0f19]" : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"}`}
            >
              <t.icon size={11} className={Active ? "text-[#96d6cd]" : "text-slate-600"} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Primary Workspace View Frame */}
      <div className="min-w-0 bg-[#0b0f19]/10 rounded-lg border border-slate-900/40 p-1">
        {activeTab === TABS.CREATED && <CreatedTokensTab data={filteredCreatedTokens} loading={loading} searchTerm={createdSearch} setSearchTerm={setCreatedSearch} openUpdateModal={openUpdateModal} DashboardCard={DashboardCard} />}
        {activeTab === TABS.PORTFOLIO && <PortfolioAssetsTab data={filteredPortfolio} loading={loading} searchTerm={portfolioSearch} setSearchTerm={setPortfolioSearch} DashboardCard={DashboardCard} />}
        {activeTab === TABS.HISTORY && <TransactionHistoryTab address={address} hideIfNoAddress={!isConnected} loading={loading} />}
      </div>

      {/* Update Token Node Configuration Panel Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedToken && (
          <div className="p-5 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-4">
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-200 block tracking-wider uppercase">UPDATE_TOKEN_METADATA</span>
                <span className="text-[10px] text-slate-500 block truncate font-bold uppercase">${selectedToken.symbol} // {selectedToken.name}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-200 p-1 hover:bg-slate-900 rounded"><X size={14} /></button>
            </div>

            <div className="space-y-3.5">
              {["telegram", "twitter", "website"].map((f) => (
                <div key={f} className="flex flex-col">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">{f}_ROUTING_URL</label>
                  <input
                    type="url" value={tokenUpdateForm[f]} maxLength={f === "website" ? 100 : 40}
                    placeholder={f === "telegram" ? "https://t.me/channel" : f === "twitter" ? "https://x.com/handle" : "https://domain.com"}
                    onChange={(e) => setTokenUpdateForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="p-2 bg-[#030712] border border-slate-900 rounded text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                  />
                </div>
              ))}

              <div className="flex flex-col">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">IMAGE_RESOURCE_LOGO (MAX 3MB)</label>
                <div className="flex items-center justify-between gap-2 p-2 bg-[#030712] border border-slate-900 rounded">
                  <input type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-xs file:bg-[#0b0f19] file:border file:border-slate-800 file:text-slate-400 file:text-[10px] file:font-bold file:px-2 file:py-0.5 file:rounded text-slate-400 w-full" />
                  {logoFile ? <span className="text-[10px] text-[#96d6cd] font-bold shrink-0 bg-[#96d6cd]/10 px-1.5 py-0.5 border border-#96d6cd/20 rounded">READY</span> : selectedToken.logo && <img src={selectedToken.logo} className="w-5 h-5 object-cover border border-slate-800 rounded shrink-0" />}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1"><span>DESCRIPTION</span><span>{String(tokenUpdateForm.description || "").length}/200</span></div>
                <textarea rows={2.5} maxLength={200} value={tokenUpdateForm.description} onChange={(e) => setTokenUpdateForm((p) => ({ ...p, description: e.target.value }))} className="p-2 bg-[#030712] border border-slate-900 rounded text-xs text-slate-200 focus:outline-none focus:border-slate-700 resize-none" />
              </div>

              <button
                onClick={handleUpdateSubmit} disabled={loading}
                style={{ backgroundColor: !loading ? '#96d6cd' : '', color: !loading ? '#030712' : '' }}
                className={`w-full p-2.5 rounded font-bold text-xs uppercase tracking-widest text-center transition-all shadow-md ${loading ? "bg-slate-900 text-slate-600 border border-slate-900 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.99]"}`}
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
