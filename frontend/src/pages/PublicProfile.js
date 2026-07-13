// src/pages/PublicProfile.jsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { User, TrendingUp, Sparkles, History, Check, Copy, ArrowUpRight, Users, Eye } from "lucide-react";

import { usePublicProfileData } from "../hooks/usePublicProfileData";
import { C } from "../utils/designForProfile";
import { shortenAddress, explorerAddressUrl, formatUsd } from "../utils/format";

import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import FollowButton from "../tabP/FollowButton";
import { DashboardCard, Toast } from "../tabP/ProfileComponents";

const TABS = [
  { id: "created", label: "Created", icon: Sparkles },
  { id: "portfolio", label: "Portfolio", icon: TrendingUp },
  { id: "history", label: "History", icon: History },
];

const PublicProfile = ({ walletAddress }) => {
  const params = useParams();
  const viewingWallet = (walletAddress || params.walletAddress || "").toLowerCase() || null;

  const { address: connectedAddress, isConnected } = useAccount();

  const {
    user,
    createdTokens,
    portfolio,
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loadMoreTransactions,
    followCounts,
    isFollowing,
    followBusy,
    toggleFollow,
    isOwnProfile,
    loading,
    error,
  } = usePublicProfileData(viewingWallet, connectedAddress);

  const [activeTab, setActiveTab] = useState("created");
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "" });
  const [createdSearch, setCreatedSearch] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: "" }), 3000);
  };

  const copyAddress = async () => {
    if (!viewingWallet) return;
    await navigator.clipboard.writeText(viewingWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFollow = async () => {
    await toggleFollow();
    showNotification(isFollowing ? "Unfollowed." : "Now following.");
  };

  const totalPortfolioValue = portfolio.reduce((sum, t) => sum + (t.value_usd || 0), 0);

  const filteredCreatedTokens = createdTokens.filter(
    (t) =>
      (t.name || "").toLowerCase().includes(createdSearch.toLowerCase()) ||
      (t.symbol || "").toLowerCase().includes(createdSearch.toLowerCase())
  );

  const filteredPortfolio = portfolio.filter(
    (t) =>
      (t.name || "").toLowerCase().includes(portfolioSearch.toLowerCase()) ||
      (t.symbol || "").toLowerCase().includes(portfolioSearch.toLowerCase())
  );

  if (!viewingWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: C.bg }}>
        <div
          className="max-w-sm w-full p-8 rounded-2xl text-center space-y-3"
          style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, boxShadow: C.shadowCard }}
        >
          <User size={24} className="mx-auto" style={{ color: C.faint }} />
          <h3 className="text-base font-semibold" style={{ color: C.bright }}>
            No profile to show
          </h3>
          <p className="text-sm" style={{ color: C.sub }}>
            This link is missing a wallet address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-6xl mx-auto space-y-6">
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
          className="p-6 sm:p-7 rounded-2xl"
          style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, boxShadow: C.shadowCard }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${C.tealDim}, ${C.panel})`, border: `1px solid ${C.tealBorder}` }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(viewingWallet)}`}
                  alt={`avatar-${viewingWallet}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate" style={{ color: C.bright }}>
                  {user?.display_name || shortenAddress(viewingWallet, 6)}
                </h1>
                <div className="flex items-center gap-2 text-sm font-mono mt-0.5" style={{ color: C.sub }}>
                  <span className="truncate">{shortenAddress(viewingWallet, 6)}</span>
                  <button onClick={copyAddress} className="p-0.5 transition-colors hover:text-white" style={{ color: C.sub }}>
                    {copied ? <Check size={13} style={{ color: C.teal }} /> : <Copy size={13} />}
                  </button>
                  <a
                    href={explorerAddressUrl(viewingWallet)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 transition-colors hover:text-white"
                    style={{ color: C.faint }}
                    title="View on explorer"
                  >
                    <ArrowUpRight size={13} />
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
                  >
                    <Users size={13} style={{ color: C.sub }} />
                    <span className="text-xs font-medium" style={{ color: C.mid }}>
                      {followCounts.followers} followers
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
                  >
                    <Eye size={13} style={{ color: C.sub }} />
                    <span className="text-xs font-medium" style={{ color: C.mid }}>
                      {followCounts.following} following
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-stretch gap-3">
              <div
                className="px-4 py-3 rounded-xl flex-1 min-w-[140px] sm:flex-none"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
              >
                <span className="text-[11px] font-medium block mb-1" style={{ color: C.sub }}>
                  Portfolio value
                </span>
                <span className="text-lg font-semibold tabular-nums" style={{ color: C.bright }}>
                  {formatUsd(totalPortfolioValue)}
                </span>
              </div>

              {!isOwnProfile && (
                <FollowButton
                  isFollowing={isFollowing}
                  busy={followBusy}
                  onToggle={handleToggleFollow}
                  connectPrompt={!isConnected}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor: C.borderSoft }}>
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="relative px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
                style={{ color: active ? C.bright : C.sub }}
              >
                <t.icon size={15} style={{ color: active ? C.teal : C.faint }} />
                {t.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: C.teal }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "created" && (
            <CreatedTokensTab
              data={filteredCreatedTokens}
              loading={loading}
              searchTerm={createdSearch}
              setSearchTerm={setCreatedSearch}
              isPublicView
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
          {activeTab === "history" && (
            <TransactionHistoryTab
              address={viewingWallet}
              transactions={transactions}
              loading={loading}
              loadingMore={loadingMoreTransactions}
              hasMore={hasMoreTransactions}
              onLoadMore={loadMoreTransactions}
              onRefresh={() => {}}
            />
          )}
        </div>
      </div>

      <Toast message={notification.message} show={notification.show} />
    </div>
  );
};

export default PublicProfile;
