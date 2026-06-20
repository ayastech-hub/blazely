// src/pages/PublicProfile.jsx
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  User,
  TrendingUp,
  Sparkles,
  Copy as CopyIcon,
  History,
  Check as CheckIcon,
  ExternalLink,
} from "lucide-react";
import * as supabaseClient from "../lib/supabaseClient";

// Component Pipeline Registry
import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import { DashboardCard, Toast } from "../tabP/ProfileComponents";

const supabase =
  supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

/* ----------------------------- Storage Pipeline Helpers ----------------------------- */
const getLogoPublicUrl = (path) => {
  if (!path) return null;
  try {
    const res = supabase.storage.from("logos").getPublicUrl(path);
    return res?.data?.publicUrl || res?.publicURL || res?.publicUrl || null;
  } catch (e) {
    console.warn("getLogoPublicUrl sequence failure:", e);
    return null;
  }
};

const ensureUserRow = async (wallet) => {
  if (!wallet) return null;
  try {
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("wallet", wallet.toLowerCase())
      .maybeSingle();
    return existing;
  } catch (err) {
    console.error("ensureUserRow registry fallback error:", err);
    return null;
  }
};

/* ----------------------------- Tab Parameters ----------------------------- */
const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", HISTORY: "History" };

/* ----------------------------- Core Functional Container ----------------------------- */
const PublicProfile = ({ walletAddress }) => {
  const { address: connectedAddress } = useAccount();
  const viewingWallet = walletAddress ? walletAddress.toLowerCase() : null;

  const [activeTab, setActiveTab] = useState(TABS.CREATED);
  const [portfolio, setPortfolio] = useState([]);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRow, setUserRow] = useState(null);
  const [createdSearch, setCreatedSearch] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });

  const copyAddress = async () => {
    if (!viewingWallet) return;
    try {
      await navigator.clipboard.writeText(viewingWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard operational interface failure:", err);
    }
  };

  useEffect(() => {
    if (!viewingWallet) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const row = await ensureUserRow(viewingWallet);
        setUserRow(row);

        const { data: createdRows, error: createdError } = await supabase
          .from("tokens")
          .select("*")
          .eq("creator_wallet", viewingWallet)
          .order("created_at", { ascending: false });

        if (createdError) {
          console.warn("Created tokens query termination:", createdError);
          setCreatedTokens([]);
        } else {
          setCreatedTokens(
            (createdRows || []).map((r) => ({
              ...r,
              logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : r.logo || null,
            }))
          );
        }

        const base = import.meta?.env?.VITE_API_BASE || "http://localhost:3000";
        const normalizedBase = base.replace(/\/$/, "");
        const apiUrl = `${normalizedBase}/api/portfolio?wallet=${encodeURIComponent(
          viewingWallet
        )}`;

        const portfolioRes = await fetch(apiUrl, {
          headers: { Accept: "application/json" },
        });

        if (!portfolioRes.ok) {
          console.warn(`Portfolio telemetry lookup status exception: ${portfolioRes.status}`);
          setPortfolio([]);
        } else {
          const boughtTokens = await portfolioRes.json();
          setPortfolio(
            (boughtTokens || []).map((r) => ({
              ...r,
              logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : r.logo || null,
              amount: r.user_amount ?? r.amount ?? "0",
              value: r.user_value ?? r.value ?? "0",
              change24h: r.change24h ?? "+0.0%",
            }))
          );
        }
      } catch (err) {
        console.error("Public Profile sequence configuration crash:", err);
        setCreatedTokens([]);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [viewingWallet]);

  const shortAddress = viewingWallet
    ? `${viewingWallet.slice(0, 6)}...${viewingWallet.slice(-4)}`
    : "";

  const headerLogo = userRow?.logo_path ? getLogoPublicUrl(userRow.logo_path) : null;
  const displayName = userRow?.display_name ?? shortAddress;

  const dicebearAvatarUrl = viewingWallet
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(viewingWallet)}`
    : null;

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

  const getTabComponent = () => {
    switch (activeTab) {
      case TABS.CREATED:
        return (
          <CreatedTokensTab
            data={filteredCreatedTokens}
            loading={loading}
            searchTerm={createdSearch}
            setSearchTerm={setCreatedSearch}
            openUpdateModal={() => {}}
            isPublicView={true}
            DashboardCard={DashboardCard}
          />
        );
      case TABS.PORTFOLIO:
        return (
          <PortfolioAssetsTab
            data={filteredPortfolio}
            loading={loading}
            searchTerm={portfolioSearch}
            setSearchTerm={setPortfolioSearch}
            DashboardCard={DashboardCard}
          />
        );
      case TABS.HISTORY:
        return (
          <TransactionHistoryTab
            address={viewingWallet}
            hideIfNoAddress={false}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  const TabButton = ({ tabName, icon: Icon }) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => setActiveTab(tabName)}
        style={{ 
          borderColor: isActive ? '#96d6cd30' : '',
          backgroundColor: isActive ? '#0b0f19' : ''
        }}
        className={`h-9 flex items-center gap-1.5 px-3 border border-slate-900 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors ${
          isActive ? "text-[#96d6cd] font-bold" : "text-slate-400 bg-[#0b0f19]/40 hover:text-slate-200"
        }`}
        aria-pressed={isActive}
      >
        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#96d6cd]" : "text-slate-500"}`} />
        <span>{tabName}</span>
      </button>
    );
  };

  if (!viewingWallet) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-5 border border-slate-900 bg-[#0b0f19]/40 rounded text-center">
          <User className="w-8 h-8 text-red-500/80 mx-auto mb-3" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200 mb-1">
            TARGET ADDRESS NULL
          </h3>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
            Provide a valid network identification payload inside the route.
          </p>
        </div>
      </div>
    );
  }

  const explorerBase = "https://etherscan.io/address";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans p-4 sm:p-6 max-w-[1600px] mx-auto">
      
      {/* Enterprise Identity Metric Frame */}
      <div className="mb-4 p-4 rounded bg-[#0b0f19]/40 backdrop-blur-md border border-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            
            {/* Structured Identity Image Module */}
            <div className="w-12 h-12 rounded-sm bg-[#030712] border border-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
              {headerLogo ? (
                <img
                  src={headerLogo}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={dicebearAvatarUrl}
                  alt={`avatar-${shortAddress}`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Profile Main Asset Callout */}
              <h1 className="text-sm font-black text-slate-200 uppercase tracking-wider truncate">
                {displayName}
              </h1>

              <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                <p className="text-slate-500 truncate hidden md:block tracking-wide">
                  {viewingWallet}
                </p>
                <p className="text-slate-500 truncate md:hidden tracking-wide">
                  {shortAddress}
                </p>

                <span className="text-slate-800">•</span>

                {/* Copy Operations Node */}
                <button
                  onClick={copyAddress}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                  title="Copy account hash"
                >
                  {copied ? (
                    <CheckIcon className="w-3 h-3 text-[#96d6cd]" />
                  ) : (
                    <CopyIcon className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                  )}
                </button>

                {/* Chain Telemetry Block Explorer Reference Link */}
                <a
                  href={`${explorerBase}/${viewingWallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Lookup signature metrics"
                  className="text-slate-600 hover:text-slate-400 transition-colors p-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Structured Registry Filter Tabs */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-900">
        <TabButton tabName={TABS.CREATED} icon={Sparkles} />
        <TabButton tabName={TABS.PORTFOLIO} icon={TrendingUp} />
        <TabButton tabName={TABS.HISTORY} icon={History} />
      </div>

      {/* Sub-tab Screen Output Engine */}
      <div className="w-full select-none">
        {getTabComponent()}
      </div>

      <Toast
        message={notification.message}
        show={notification.show}
        open={notification.show}
      />
    </div>
  );
};

export default PublicProfile;
