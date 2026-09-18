// src/pages/Profile.jsx
//
// PURPOSE
// The connected wallet's own profile: identity header, wallet/portfolio
// stats, and five tabs (Created, Portfolio, Networks, History, Dev Tools).
// See PublicProfile.jsx for the read-only version of this same layout used
// when viewing someone else's wallet (shares tab components — CreatedTokensTab,
// PortfolioAssetsTab, TransactionHistoryTab — but not this file itself).
//
// STRUCTURE NOTE
// Tab content renders directly on the page, not inside another bordered
// container — this was deliberately un-done after an earlier pass wrapped
// everything in an extra box. Each tab's own items still have their own
// card styling; only the outer wrapper was removed. Keep it that way —
// don't re-add a container around the tab content.
//
// AUTH NOTE
// `address`/`isConnected` come from wagmi directly (not the WalletContext
// SIWE session) because this page only needs to know "is a wallet plugged
// in" to decide what to render — it doesn't perform any write that needs
// the verified identity itself. Every actual write this page triggers
// (edit profile, edit token, unfollow, etc.) goes through hooks that hit
// Supabase, where RLS (supabase/migrations/) is the real enforcement layer
// regardless of what this component believes `address` is.
import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { User, TrendingUp, Sparkles, Shield, Edit3, Check, Copy, History, Users, ArrowUpRight, Wallet, Wrench } from "lucide-react";
import { ConnectKitButton } from "connectkit";

import { useProfileData } from "../hooks/useProfileData";
import { C } from "../utils/designForProfile";
import LiquidTabs from "../components/ui/LiquidTabs";
import { shortenAddress, explorerAddressUrl, formatUsd } from "../utils/formatProfile";

import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import NetworksTab from "../tabP/NetworksTab";
import DevToolsTab from "../tabP/DevToolsTab";
import { DashboardCard, Modal, ModalCloseButton, Toast } from "../tabP/ProfileComponents";

const TABS = [
  { id: "created", label: "Created", icon: Sparkles },
  { id: "portfolio", label: "Portfolio", icon: TrendingUp },
  { id: "networks", label: "Networks", icon: Users },
  { id: "history", label: "History", icon: History },
  { id: "devtools", label: "Dev Tools", icon: Wrench },
];

const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);

const Profile = () => {
  const { address, isConnected } = useAccount();
  // wagmi v2 has no `watch` option — use query.refetchInterval instead.
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

  const [activeTab, setActiveTab] = useState("created");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [copied, setCopied] = useState(false);
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
    setIsTokenModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedToken) return;
    setModalSaving(true);
    try {
      await updateToken(selectedToken.address, { ...tokenUpdateForm }, logoFile);
      setIsTokenModalOpen(false);
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
      <div className="min-h-[60vh] flex items-center justify-center p-4" style={{ backgroundColor: C.bg }}>
        <div
          className="max-w-sm w-full p-8 rounded-2xl text-center space-y-5"
          style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, boxShadow: C.shadowCard }}
        >
          <div
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
            style={{ backgroundColor: C.tealDim }}
          >
            <Shield size={20} style={{ color: C.teal }} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: C.bright }}>
              Connect your wallet
            </h3>
            <p className="text-sm mt-1" style={{ color: C.sub }}>
              Connect to view your profile, holdings, and history.
            </p>
          </div>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: C.teal, color: C.bg }}
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
    <div className="px-1 py-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {error && (
          <div
            className="p-3.5 rounded-xl text-sm"
            style={{ backgroundColor: C.roseDim, border: `1px solid ${C.roseBorder}`, color: C.rose }}
          >
            {error}
          </div>
        )}

        {/* Header card */}
        <div
          className="p-4 sm:p-7 rounded-2xl"
          style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, boxShadow: C.shadowCard }}
        >
          <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:text-left justify-between gap-6">
            <div className="flex flex-col items-center lg:flex-row lg:items-center gap-4 min-w-0 w-full lg:w-auto">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${C.tealDim}, ${C.panel})`, border: `1px solid ${C.tealBorder}` }}
              >
                <User size={26} style={{ color: C.teal }} />
              </div>
              <div className="min-w-0 w-full lg:w-auto">
                <h1 className="text-lg font-semibold truncate" style={{ color: C.bright }}>
                  {user?.display_name || shortenAddress(address, 6)}
                </h1>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-sm font-mono mt-0.5" style={{ color: C.sub }}>
                  <span className="truncate">{shortenAddress(address, 6)}</span>
                  <button onClick={copyAddress} className="p-0.5 transition-colors hover:text-white" style={{ color: C.sub }}>
                    {copied ? <Check size={13} style={{ color: C.teal }} /> : <Copy size={13} />}
                  </button>
                  <a
                    href={explorerAddressUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 transition-colors hover:text-white"
                    style={{ color: C.faint }}
                    title="View on explorer"
                  >
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-stretch gap-3 w-full lg:w-auto">
              <div
                className="px-4 py-3 rounded-xl lg:flex-1 lg:min-w-[140px] lg:flex-none"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet size={12} style={{ color: C.faint }} />
                  <span className="text-[11px] font-medium" style={{ color: C.sub }}>
                    Wallet balance
                  </span>
                </div>
                <span className="text-lg font-semibold tabular-nums" style={{ color: C.bright }}>
                  {balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : "0.00"}{" "}
                  <span className="text-xs font-normal" style={{ color: C.sub }}>
                    {balanceData?.symbol || "ETH"}
                  </span>
                </span>
              </div>
              <div
                className="px-4 py-3 rounded-xl lg:flex-1 lg:min-w-[140px] lg:flex-none"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} style={{ color: C.faint }} />
                  <span className="text-[11px] font-medium" style={{ color: C.sub }}>
                    Portfolio value
                  </span>
                </div>
                <span className="text-lg font-semibold tabular-nums" style={{ color: C.bright }}>
                  {formatUsd(totalPortfolioValue)}
                </span>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="col-span-2 lg:col-span-1 px-4 py-3 lg:py-0 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/5 lg:flex-1 lg:min-w-[140px] lg:flex-none"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, color: C.mid }}
              >
                <Edit3 size={14} />
                Edit profile
              </button>
            </div>
          </div>
        </div>

        {/* Unified tabs + content (one panel surface) */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.panel }}>
          <div className="flex justify-center px-2 pt-3 pb-2 sm:px-5 sm:pt-4">
            <div className="w-full overflow-x-auto scrollbar-hide">
              <LiquidTabs
                size="md"
                value={activeTab}
                onChange={setActiveTab}
                className="w-full"
                items={TABS.map((t) => ({
                  id: t.id,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <t.icon size={13} className="hidden sm:inline" />
                      {t.label}
                    </span>
                  ),
                }))}
              />
            </div>
          </div>
          <div className="px-2 pb-4 sm:px-5 sm:pb-6 pt-1 min-h-[200px]">
            {activeTab === "created" && (
              <CreatedTokensTab
                data={filteredCreatedTokens}
                loading={loading}
                searchTerm={createdSearch}
                setSearchTerm={setCreatedSearch}
                openUpdateModal={openUpdateModal}
                DashboardCard={DashboardCard}
              />
            )}
            {activeTab === "portfolio" && (
              <PortfolioAssetsTab
                data={filteredPortfolio}
                loading={loading}
                searchTerm={portfolioSearch}
                setSearchTerm={setPortfolioSearch}
                DashboardCard={DashboardCard}
              />
            )}
            {activeTab === "networks" && (
              <NetworksTab
                following={following}
                watchlist={watchlist}
                onUnfollow={handleUnfollowUser}
                onRemoveWatchlist={handleRemoveWatchlist}
              />
            )}
            {activeTab === "history" && (
              <TransactionHistoryTab
                address={address}
                transactions={transactions}
                loading={loading}
                loadingMore={loadingMoreTransactions}
                hasMore={hasMoreTransactions}
                onLoadMore={loadMoreTransactions}
              />
            )}
            {activeTab === "devtools" && <DevToolsTab address={address} />}
          </div>
        </div>
      </div>

      {/* Edit profile modal: display name + social links */}
      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b" style={{ borderColor: C.borderSoft }}>
            <span className="text-base font-semibold" style={{ color: C.bright }}>
              Edit profile
            </span>
            <ModalCloseButton onClose={() => setIsEditProfileOpen(false)} />
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: C.sub }}>
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ backgroundColor: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--input-text)" }}
                />
                <button
                  onClick={saveName}
                  disabled={nameSaving}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, color: C.teal }}
                >
                  {nameSaving ? "Saving..." : "Save"}
                </button>
              </div>
              {nameError && <span className="text-xs" style={{ color: C.rose }}>{nameError}</span>}
            </div>

          </div>
        </div>
      </Modal>

      {/* Token edit modal */}
      <Modal isOpen={isTokenModalOpen} onClose={() => setIsTokenModalOpen(false)}>
        {selectedToken && (
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b" style={{ borderColor: C.borderSoft }}>
              <span className="text-base font-semibold" style={{ color: C.bright }}>
                Edit token details
              </span>
              <ModalCloseButton onClose={() => setIsTokenModalOpen(false)} />
            </div>

            <div className="space-y-4">
              {["telegram", "twitter", "website"].map((f) => (
                <div key={f} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: C.sub }}>
                    {f === "website" ? "Website" : f === "twitter" ? "Twitter / X" : "Telegram"}
                  </label>
                  <input
                    type="url"
                    value={tokenUpdateForm[f]}
                    placeholder={f === "website" ? "https://yourproject.com" : `https://${f}.com/yourcommunity`}
                    onChange={(e) => setTokenUpdateForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ backgroundColor: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--input-text)" }}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: C.sub }}>
                  Logo (max 3MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="text-sm cursor-pointer"
                  style={{ color: C.mid }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: C.sub }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={tokenUpdateForm.description}
                  onChange={(e) => setTokenUpdateForm((p) => ({ ...p, description: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                  style={{ backgroundColor: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--input-text)" }}
                />
              </div>

              <button
                onClick={handleUpdateSubmit}
                disabled={modalSaving}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-center"
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
