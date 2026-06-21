import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { User, TrendingUp, Sparkles, Shield, Edit3, Check, Copy, History, X, Users, Eye, ArrowUpRight } from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { useNavigate } from "react-router-dom";
import * as supabaseClient from "../lib/supabaseClient";

import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import { DashboardCard, Modal, Toast } from "../tabP/ProfileComponents";

// Enterprise Modular Injectables
import { SocialConnect } from "../tabP/SocialConnect";
import { SocialMetrics } from "../tabP/SocialMetrics";

const supabase = supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;
const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", NETWORKS: "Networks", HISTORY: "History" };

const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);
const sanitizeFilename = (s = "") => String(s).trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 200);

const Profile = () => {
  const navigate = useNavigate();
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
  const [tokenUpdateForm, setTokenUpdateForm] = useState({ telegram: "", twitter: "", website: "", description: "" });
  
  // Real Tracking States
  const [followingList, setFollowingList] = useState([]);
  const [watchlistAssets, setWatchlistAssets] = useState([]);

  useEffect(() => { setNameInput(address ? (userRow?.display_name ?? "") : ""); }, [address, userRow]);

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: "" }), 3000);
  };

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Enterprise Social Callback Pipeline Hook
  const handleSocialsUpdate = async (socialsPayload) => {
    if (!address) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ ...socialsPayload, updated_at: new Date().toISOString() })
        .eq("wallet", address.toLowerCase())
        .select()
        .maybeSingle();
      if (error) throw error;
      setUserRow(data);
      showNotification("Identity registry coordinates locked successfully.");
    } catch (err) {
      console.error("Failed to commit social metadata payload:", err);
    }
  };

  // Action Handler: Remove Tracking Node
  const handleUnfollowUser = async (targetWallet, e) => {
    e.stopPropagation();
    if (!address) return;
    try {
      await supabase
        .from("user_follow")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_wallet", address.toLowerCase())
        .eq("following_wallet", targetWallet.toLowerCase());
      
      setFollowingList((prev) => prev.filter((item) => item.following_wallet.toLowerCase() !== targetWallet.toLowerCase()));
      showNotification("User Node network link uncoupled.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveWatchlist = async (tokenAddress, e) => {
    e.stopPropagation();
    if (!address) return;
    try {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_wallet", address.toLowerCase())
        .eq("token_address", tokenAddress.toLowerCase());

      setWatchlistAssets((prev) => prev.filter((item) => item.token_address.toLowerCase() !== tokenAddress.toLowerCase()));
      showNotification("Asset index purged from core Watchlist.");
    } catch (err) {
      console.error(err);
    }
  };

  const openUpdateModal = (t) => {
    setSelectedToken(t);
    setTokenUpdateForm({ telegram: t.telegram || "", twitter: t.twitter || "", website: t.website || "", description: t.description || "" });
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedToken || !address) return;
    setLoading(true);
    try {
      const updates = { ...tokenUpdateForm };
      if (logoFile) {
        const fExt = logoFile.name.split(".").pop() || "png";
        const fPath = `logos/${sanitizeFilename(selectedToken.address + "_" + Date.now())}.${fExt}`;
        await supabase.storage.from("logos").upload(fPath, logoFile, { cacheControl: "3600", upsert: true });
        updates.logo = supabase.storage.from("logos").getPublicUrl(fPath).data?.publicUrl ?? null;
      }

      const payload = { telegram: updates.telegram || null, twitter: updates.twitter || null, website: updates.website || null, description: updates.description || null, updated_at: new Date().toISOString() };
      await supabase.from("tokens").update(payload).eq("address", selectedToken.address);

      setCreatedTokens((p) => p.map((t) => t.address === selectedToken.address ? { ...t, ...payload } : t));
      setIsModalOpen(false);
      showNotification("Project operational index modified.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveName = async () => {
    if (!address) return;
    const trimName = (nameInput || "").trim();
    if (trimName.length && !validateDisplayName(trimName)) return setNameError("Invalid characters present.");
    try {
      const { data } = await supabase.from("users").upsert({ wallet: address.toLowerCase(), display_name: trimName || null }).select().maybeSingle();
      setUserRow(data);
      setIsEditingName(false);
      showNotification("Profile designation handle locked.");
    } catch (err) {
      console.error(err);
    }
  };

  // Master Initializer Hook
  useEffect(() => {
    if (!address) return;
    (async () => {
      setLoading(true);
      const wallet = address.toLowerCase();

      // Profile Initialization
      const userRowData = await ensureUserRow(wallet);
      setUserRow(userRowData);

      // Core Live Fetch: Tracking and Whitelist/Following Panels
      try {
        const { data: followData } = await supabase.from("user_follow").select("following_wallet, users(display_name)").eq("user_wallet", wallet).eq("is_active", true);
        const { data: watchData } = await supabase.from("watchlist").select("token_address, tokens(name, symbol)").eq("user_wallet", wallet);
        
        setFollowingList(followData || []);
        setWatchlistAssets(watchData || []);
      } catch (err) {
        console.error("Tracking indexing execution failed:", err);
      }

      // Load Tokens & Portfolio indices...
      try {
        const { data: cRows } = await supabase.from("tokens").select("*").eq("creator_wallet", wallet).order("created_at", { ascending: false });
        if (cRows) setCreatedTokens(cRows);
      } catch (err) { console.error(err); }

      setLoading(false);
    })();
  }, [address, isConnected]);

  const totalPortfolioValue = useMemo(() => portfolio.reduce((sum, t) => sum + parseFloat(String(t.value || "0")), 0), [portfolio]);

  if (!isConnected) {
    return (
      <div className="font-mono min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-[#0b0f19]/40 border border-slate-900 rounded-lg text-center space-y-4">
          <Shield size={28} className="mx-auto text-slate-600 animate-pulse" />
          <h3 className="text-xs font-black tracking-widest text-slate-200 uppercase">AUTHENTICATION_REQUIRED</h3>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="w-full p-2.5 bg-[#0b1324] border border-slate-800 hover:border-slate-600 rounded text-slate-200 text-xs font-bold uppercase tracking-wider transition-all">
                CONNECT_ENGINE_WALLET
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono min-h-screen bg-[#030712] text-slate-300 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Metrics Block Node Header */}
      <div className="p-5 bg-[#0b0f19]/40 border border-slate-900 rounded-lg shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-4 items-start min-w-0">
          <div className="w-14 h-14 bg-[#030712] border border-slate-800 rounded-md flex items-center justify-center shrink-0">
            <User size={22} className="text-slate-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-1 w-full">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-200 tracking-wider uppercase truncate">{address?.slice(0, 6)}...{address?.slice(-4)}</h1>
              <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-bold text-slate-500">USER_NODE</span>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="truncate select-all">{address}</span>
              <button onClick={copyAddress} className="text-slate-500 hover:text-[#96d6cd] p-0.5 transition-colors">
                {copied ? <Check size={11} className="text-[#96d6cd]" /> : <Copy size={11} />}
              </button>
            </div>
            
            <div className="pt-2">
              {!isEditingName ? (
                <button onClick={() => { setNameError(""); setIsEditingName(true); }} className="px-2.5 py-1 text-[9px] font-bold uppercase bg-[#030712] border border-slate-800 rounded text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <Edit3 size={10} /> {userRow?.display_name ? `ID: ${userRow.display_name}` : "ASSIGN_DESIGNATION"}
                </button>
              ) : (
                <div className="flex gap-1.5 max-w-md mt-1">
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Display Designation" className="px-2 py-1 bg-[#030712] border border-slate-850 rounded text-xs text-slate-200 focus:outline-none w-full" />
                  <button onClick={saveName} className="px-2.5 py-1 bg-[#0b1324] border border-slate-850 text-[#96d6cd] rounded text-[10px] font-bold">SAVE</button>
                </div>
              )}
            </div>

            {/* REAL USER SOCIAL HANDSHAKE MODULE */}
            <SocialConnect userRow={userRow} onUpdate={handleSocialsUpdate} loading={loading} />
          </div>
        </div>

        {/* Dynamic Financial Overview Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-900 pt-4 lg:pt-0 lg:pl-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 uppercase font-bold tracking-wider text-[9px] block">NATIVE_BAL</span>
              <span className="text-base font-black text-slate-200 block tracking-tight">{balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : "0.00"}</span>
              <span className="text-[9px] text-slate-600 font-bold block uppercase">{balanceData?.symbol || "ETH"} // Core_Gas</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-bold tracking-wider text-[9px] block">PORTFOLIO_VAL</span>
              <span className="text-base font-black text-slate-200 block tracking-tight">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-slate-600 font-bold block uppercase">USD_VALUE_INDEX</span>
            </div>
          </div>
          
          <SocialMetrics followingCount={followingList.length} watchlistCount={watchlistAssets.length} />
        </div>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="flex gap-1 border-b border-slate-900 pb-px overflow-x-auto">
        {[
          { id: TABS.CREATED, label: "SYS_CREATED", icon: Sparkles },
          { id: TABS.PORTFOLIO, label: "SYS_PORTFOLIO", icon: TrendingUp },
          { id: TABS.NETWORKS, label: "TRACKING_NETWORKS", icon: Users },
          { id: TABS.HISTORY, label: "SYS_HISTORY", icon: History }
        ].map((t) => {
          const Active = activeTab === t.id;
          return (
            <button
              key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border-t border-x rounded-t-md shrink-0 ${Active ? "bg-[#0b0f19]/40 text-[#96d6cd] border-slate-900 font-black relative" : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"}`}
            >
              <t.icon size={11} className={Active ? "text-[#96d6cd]" : "text-slate-600"} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Workspace Panel Views Frame */}
      <div className="min-w-0 bg-[#0b0f19]/10 rounded-lg border border-slate-900/40 p-1">
        {activeTab === TABS.CREATED && <CreatedTokensTab data={createdTokens} loading={loading} searchTerm={createdSearch} setSearchTerm={setCreatedSearch} openUpdateModal={openUpdateModal} DashboardCard={DashboardCard} />}
        {activeTab === TABS.PORTFOLIO && <PortfolioAssetsTab data={portfolio} loading={loading} searchTerm={portfolioSearch} setSearchTerm={setPortfolioSearch} DashboardCard={DashboardCard} />}
        {activeTab === TABS.HISTORY && <TransactionHistoryTab address={address} hideIfNoAddress={!isConnected} loading={loading} />}

        {/* Dynamic Connected Tracking / Whitelist Panel Workspace */}
        {activeTab === TABS.NETWORKS && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 animate-fadeIn">
            {/* Following Pipeline */}
            <div className="bg-[#050811] border border-slate-900 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2 mb-2">
                <Users size={12} className="text-[#96d6cd]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FOLLOWING_USERS_REGISTRY</span>
              </div>
              {followingList.length === 0 ? (
                <p className="text-[10px] text-slate-600 uppercase py-4">No active nodes connected.</p>
              ) : (
                followingList.map((item) => (
                  <div 
                    key={item.following_wallet}
                    onClick={() => navigate(`/user/${item.following_wallet}`)}
                    className="flex items-center justify-between p-2 bg-[#090e1a] border border-slate-850 rounded hover:border-slate-700 cursor-pointer transition-all group"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-[#96d6cd] transition-colors">
                        {item.users?.display_name || "Anonymous Cluster Node"}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block">{item.following_wallet.slice(0, 12)}...</span>
                    </div>
                    <button
                      onClick={(e) => handleUnfollowUser(item.following_wallet, e)}
                      className="text-[9px] font-bold bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 px-2 py-1 text-slate-400 hover:text-rose-400 rounded transition-all uppercase"
                    >
                      Unfollow
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Watchlist Asset Pipeline */}
            <div className="bg-[#050811] border border-slate-900 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2 mb-2">
                <Eye size={12} className="text-[#96d6cd]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WATCHLIST_ASSET_INDEX</span>
              </div>
              {watchlistAssets.length === 0 ? (
                <p className="text-[10px] text-slate-600 uppercase py-4">No tracks detected on system matrix.</p>
              ) : (
                watchlistAssets.map((item) => (
                  <div 
                    key={item.token_address}
                    onClick={() => navigate(`/token/${item.token_address}`)}
                    className="flex items-center justify-between p-2 bg-[#090e1a] border border-slate-850 rounded hover:border-slate-700 cursor-pointer transition-all group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-200 tracking-wide block group-hover:text-[#96d6cd] transition-colors">
                          ${item.tokens?.symbol || "TOKEN"}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono truncate">({item.tokens?.name || "Asset Index"})</span>
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono block mt-0.5">{item.token_address.slice(0, 14)}...</span>
                    </div>
                    <button
                      onClick={(e) => handleRemoveWatchlist(item.token_address, e)}
                      className="text-[9px] font-bold bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 px-2 py-1 text-slate-400 hover:text-rose-400 rounded transition-all uppercase"
                    >
                      Purge
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Project Community Info Setup Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedToken && (
          <div className="p-5 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-4">
              <span className="text-xs font-black text-slate-200 tracking-wider uppercase">PROJECT_INFO_CONFIGURATION</span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-200"><X size={14} /></button>
            </div>

            <div className="space-y-3.5">
              {["telegram", "twitter", "website"].map((f) => (
                <div key={f} className="flex flex-col">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">{f}_ROUTING_URL</label>
                  <input
                    type="url" 
                    value={tokenUpdateForm[f]} 
                    placeholder={f === "website" ? "https://projectdomain.com" : `https://${f}.com/community`}
                    onChange={(e) => setTokenUpdateForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="p-2 bg-[#030712] border border-slate-900 rounded text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                  />
                </div>
              ))}

              <div className="flex flex-col">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">PROJECT_LOGO_FILE (MAX 3MB)</label>
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-xs text-slate-400 file:bg-[#0b1324] file:text-slate-300 file:border-none file:px-2 file:py-1 file:rounded cursor-pointer" />
              </div>

              <div className="flex flex-col">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-1">PROJECT_DESCRIPTION</label>
                <textarea rows={2.5} maxLength={200} value={tokenUpdateForm.description} onChange={(e) => setTokenUpdateForm((p) => ({ ...p, description: e.target.value }))} className="p-2 bg-[#030712] border border-slate-900 rounded text-xs text-slate-200 focus:outline-none focus:border-slate-700 resize-none" />
              </div>

              <button
                onClick={handleUpdateSubmit} disabled={loading}
                style={{ backgroundColor: !loading ? '#96d6cd' : '', color: !loading ? '#030712' : '' }}
                className="w-full p-2.5 rounded font-bold text-xs uppercase tracking-widest text-center"
              >
                {loading ? "PROCESSING..." : "COMMIT_PROJECT_INDEX"}
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
