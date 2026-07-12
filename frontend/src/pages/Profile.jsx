// src/pages/Profile.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { User, TrendingUp, Sparkles, Shield, Edit3, Check, Copy, History, X, Users } from "lucide-react";
import { ConnectKitButton } from "connectkit";

import { useProfileData } from "../hooks/useProfileData";
import { C } from "../utils/designforprofile.js";
import { shortenAddress, explorerAddressUrl } from "../utils/format";

import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import NetworksTab from "../tabP/NetworksTab";
import { DashboardCard, Modal, ModalCloseButton, Toast } from "../tabP/ProfileComponents";
import { SocialConnect } from "../tabP/SocialConnect";
import { SocialMetrics } from "../tabP/SocialMetrics";

const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", NETWORKS: "Networks", HISTORY: "History" };

const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);

const Profile = () => {
  const { address, isConnected } = useAccount();
  // Bug fix: wagmi v2 has no `watch` option — use query.refetchInterval instead.
  const { data: balanceData } = useBalance({ address, query: { refetchInterval: 15000 } });

  const {
    user,
    createdTokens,
    portfolio,
    following,
    watchlist,
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loading,
    error,
    loadMoreTransactions,
    updateUser,
    updateToken,
    unfollowUser,
    removeWatchlistItem,
  } = useProfileData(address);

  const [activeTab, setActiveTab] = useState(TABS.CREATED);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [createdSearch, setCreatedSearch] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [tokenUpdateForm, setTokenUpdateForm] = useState({ telegram: "", twitter: "", website: "", description: "" });

  useEffect(() => {
    setNameInput(user?.display_name ?? "");
  }, [user]);

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

  const handleSocialsUpdate = async (socialsPayload) => {
    try {
      await updateUser(socialsPayload);
      showNotification("Social links saved.");
    } catch (err) {
      console.error("Failed to save social links:", err);
      showNotification("Couldn't save social links. Try again.");
    }
  };

  const handleUnfollowUser = async (targetWallet) => {
    try {
      await unfollowUser(targetWallet);
      showNotification("Unfollowed.");
    } catch (err) {
      console.error(err);
      showNotification("Couldn't unfollow. Try again.");
    }
  };

  const handleRemoveWatchlist = async (tokenAddress) => {
    try {
      await removeWatchlistItem(tokenAddress);
      showNotification("Removed from watchlist.");
    } catch (err) {
      console.error(err);
      showNotification("Couldn't remove from watchlist. Try again.");
    }
  };

  const openUpdateModal = (t) => {
    setSelectedToken(t);
    setTokenUpdateForm({
      telegram: t.telegram || "",
      twitter: t.twitter || "",
      website: t.website || "",
      description: t.description || "",
    });
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedToken) return;
    setModalSaving(true);
    try {
      await updateToken(selectedToken.address, { ...tokenUpdateForm }, logoFile);
      setIsModalOpen(false);
      showNotification("Token details updated.");
    } catch (err) {
      console.error(err);
      showNotification("Couldn't save token details. Try again.");
    } finally {
      setModalSaving(false);
    }
  };

  const saveName = async () => {
    const trimName = (nameInput || "").trim();
    if (trimName.length && !validateDisplayName(trimName)) {
      setNameError("Use only letters, numbers, and spaces.");
      return;
    }
    setNameSaving(true);
    try {
      await updateUser({ display_name: trimName || null });
      setIsEditingName(false);
      showNotification("Name saved.");
    } catch (err) {
      console.error(err);
      showNotification("Couldn't save name. Try again.");
    } finally {
      setNameSaving(false);
    }
  };

  const totalPortfolioValue = useMemo(
    () => portfolio.reduce((sum, t) => sum + (t.value_usd || 0), 0),
    [portfolio]
  );

  const filteredCreatedTokens = useMemo(
    () =>
      createdTokens.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(createdSearch.toLowerCase()) ||
          (t.symbol || "").toLowerCase().includes(createdSearch.toLowerCase())
      ),
    [createdTokens, createdSearch]
  );

  const filteredPortfolio = useMemo(
    () =>
      portfolio.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(portfolioSearch.toLowerCase()) ||
          (t.symbol || "").toLowerCase().includes(portfolioSearch.toLowerCase())
      ),
    [portfolio, portfolioSearch]
  );

  if (!isConnected) {
    return (
      <div className="font-mono min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: C.bg }}>
        <div
          className="max-w-md w-full p-6 rounded-lg text-center space-y-4"
          style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.border}` }}
        >
          <Shield size={28} className="mx-auto animate-pulse" style={{ color: C.sub }} />
          <h3 className="text-xs font-black tracking-widest uppercase" style={{ color: C.bright }}>
            Connect your wallet to view your profile
          </h3>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="w-full p-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.bright }}
              >
                Connect wallet
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    );
  }

  return (
    <div
      className="font-mono min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto"
      style={{ backgroundColor: C.bg, color: C.mid }}
    >
      {error && (
        <div
          className="p-3 rounded text-xs"
          style={{ backgroundColor: C.roseDim, border: `1px solid ${C.roseBorder}`, color: C.rose }}
        >
          {error}
        </div>
      )}

      {/* Header card: identity + balances */}
      <div
        className="p-5 rounded-lg shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-center"
        style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.border}` }}
      >
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-4 items-start min-w-0">
          <div
            className="w-14 h-14 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
          >
            <User size={22} style={{ color: C.mid }} />
          </div>
          <div className="min-w-0 flex-1 space-y-1 w-full">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider uppercase truncate" style={{ color: C.bright }}>
                {shortenAddress(address, 6)}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: C.sub }}>
              <span className="truncate select-all">{address}</span>
              <button onClick={copyAddress} className="p-0.5 transition-colors" style={{ color: C.sub }}>
                {copied ? <Check size={11} style={{ color: C.teal }} /> : <Copy size={11} />}
              </button>
              <a
                href={explorerAddressUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-0.5 transition-colors"
                style={{ color: C.faint }}
                title="View on explorer"
              >
                ↗
              </a>
            </div>

            <div className="pt-2">
              {!isEditingName ? (
                <button
                  onClick={() => {
                    setNameError("");
                    setIsEditingName(true);
                  }}
                  className="px-2.5 py-1 text-[9px] font-bold uppercase rounded flex items-center gap-1"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.sub }}
                >
                  <Edit3 size={10} /> {user?.display_name ? user.display_name : "Add a display name"}
                </button>
              ) : (
                <div className="flex flex-col gap-1 max-w-md mt-1">
                  <div className="flex gap-1.5">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Display name"
                      className="px-2 py-1 rounded text-xs focus:outline-none w-full"
                      style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.bright }}
                    />
                    <button
                      onClick={saveName}
                      disabled={nameSaving}
                      className="px-2.5 py-1 rounded text-[10px] font-bold"
                      style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.teal }}
                    >
                      {nameSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {nameError && <span className="text-[9px]" style={{ color: C.rose }}>{nameError}</span>}
                </div>
              )}
            </div>

            <SocialConnect userRow={user} onUpdate={handleSocialsUpdate} loading={loading} />
          </div>
        </div>

        <div
          className="lg:col-span-1 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6"
          style={{ borderColor: C.border }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="uppercase font-bold tracking-wider text-[9px] block" style={{ color: C.sub }}>
                Wallet balance
              </span>
              <span className="text-base font-black block tracking-tight" style={{ color: C.bright }}>
                {balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : "0.00"}
              </span>
              <span className="text-[9px] font-bold block uppercase" style={{ color: C.faint }}>
                {balanceData?.symbol || "ETH"}
              </span>
            </div>
            <div>
              <span className="uppercase font-bold tracking-wider text-[9px] block" style={{ color: C.sub }}>
                Portfolio value
              </span>
              <span className="text-base font-black block tracking-tight" style={{ color: C.bright }}>
                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-bold block uppercase" style={{ color: C.faint }}>
                USD
              </span>
            </div>
          </div>

          <SocialMetrics followingCount={following.length} watchlistCount={watchlist.length} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-px overflow-x-auto" style={{ borderColor: C.border }}>
        {[
          { id: TABS.CREATED, label: "Created", icon: Sparkles },
          { id: TABS.PORTFOLIO, label: "Portfolio", icon: TrendingUp },
          { id: TABS.NETWORKS, label: "Networks", icon: Users },
          { id: TABS.HISTORY, label: "History", icon: History },
        ].map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border-t border-x rounded-t-md shrink-0"
              style={{
                backgroundColor: active ? C.panelSoft : "transparent",
                color: active ? C.teal : C.sub,
                borderColor: active ? C.border : "transparent",
              }}
            >
              <t.icon size={11} style={{ color: active ? C.teal : C.faint }} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 rounded-lg p-1" style={{ backgroundColor: "rgba(11,15,25,0.1)", border: "1px solid rgba(15,23,42,0.4)" }}>
        {activeTab === TABS.CREATED && (
          <CreatedTokensTab
            data={filteredCreatedTokens}
            loading={loading}
            searchTerm={createdSearch}
            setSearchTerm={setCreatedSearch}
            openUpdateModal={openUpdateModal}
            DashboardCard={DashboardCard}
          />
        )}
        {activeTab === TABS.PORTFOLIO && (
          <PortfolioAssetsTab
            data={filteredPortfolio}
            loading={loading}
            searchTerm={portfolioSearch}
            setSearchTerm={setPortfolioSearch}
            DashboardCard={DashboardCard}
          />
        )}
        {activeTab === TABS.NETWORKS && (
          <NetworksTab
            following={following}
            watchlist={watchlist}
            onUnfollow={handleUnfollowUser}
            onRemoveWatchlist={handleRemoveWatchlist}
          />
        )}
        {activeTab === TABS.HISTORY && (
          <TransactionHistoryTab
            address={address}
            transactions={transactions}
            loading={loading}
            loadingMore={loadingMoreTransactions}
            hasMore={hasMoreTransactions}
            onLoadMore={loadMoreTransactions}
          />
        )}
      </div>

      {/* Token edit modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedToken && (
          <div className="p-5 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b pb-2.5 mb-4" style={{ borderColor: C.border }}>
              <span className="text-xs font-black tracking-wider uppercase" style={{ color: C.bright }}>
                Edit token details
              </span>
              <ModalCloseButton onClose={() => setIsModalOpen(false)} />
            </div>

            <div className="space-y-3.5">
              {["telegram", "twitter", "website"].map((f) => (
                <div key={f} className="flex flex-col">
                  <label className="font-bold uppercase tracking-wider text-[9px] mb-1" style={{ color: C.sub }}>
                    {f === "website" ? "Website" : f === "twitter" ? "Twitter / X" : "Telegram"}
                  </label>
                  <input
                    type="url"
                    value={tokenUpdateForm[f]}
                    placeholder={f === "website" ? "https://yourproject.com" : `https://${f}.com/yourcommunity`}
                    onChange={(e) => setTokenUpdateForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="p-2 rounded text-xs focus:outline-none"
                    style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.bright }}
                  />
                </div>
              ))}

              <div className="flex flex-col">
                <label className="font-bold uppercase tracking-wider text-[9px] mb-1" style={{ color: C.sub }}>
                  Logo (max 3MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="text-xs cursor-pointer"
                  style={{ color: C.mid }}
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold uppercase tracking-wider text-[9px] mb-1" style={{ color: C.sub }}>
                  Description
                </label>
                <textarea
                  rows={2.5}
                  maxLength={200}
                  value={tokenUpdateForm.description}
                  onChange={(e) => setTokenUpdateForm((p) => ({ ...p, description: e.target.value }))}
                  className="p-2 rounded text-xs focus:outline-none resize-none"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.bright }}
                />
              </div>

              <button
                onClick={handleUpdateSubmit}
                disabled={modalSaving}
                className="w-full p-2.5 rounded font-bold text-xs uppercase tracking-widest text-center"
                style={{ backgroundColor: !modalSaving ? C.teal : C.panel, color: !modalSaving ? C.bg : C.sub }}
              >
                {modalSaving ? "Saving..." : "Save changes"}
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
