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

// Import components you need
import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import { DashboardCard, Toast } from "../tabP/ProfileComponents";

const supabase =
  supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

/* ----------------------------- Helpers ----------------------------- */
const getLogoPublicUrl = (path) => {
  if (!path) return null;
  try {
    const res = supabase.storage.from("logos").getPublicUrl(path);
    return res?.data?.publicUrl || res?.publicURL || res?.publicUrl || null;
  } catch (e) {
    console.warn("getLogoPublicUrl error:", e);
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
    console.error("ensureUserRow unexpected error:", err);
    return null;
  }
};

/* ----------------------------- Tabs ----------------------------- */
const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", HISTORY: "History" };

/* ----------------------------- Component ----------------------------- */
const PublicProfile = ({ walletAddress }) => {
  // Connected wallet (context only)
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
      console.error("Copy failed", err);
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
        // Fetch user row (for display properties) — safe if there's no row
        const row = await ensureUserRow(viewingWallet);
        setUserRow(row);

        // Fetch created tokens from Supabase
        const { data: createdRows, error: createdError } = await supabase
          .from("tokens")
          .select("*")
          .eq("creator_wallet", viewingWallet)
          .order("created_at", { ascending: false });

        if (createdError) {
          console.warn("Created tokens fetch error:", createdError);
          setCreatedTokens([]);
        } else {
          setCreatedTokens(
            (createdRows || []).map((r) => ({
              ...r,
              logo: r.logo_path
                ? getLogoPublicUrl(r.logo_path)
                : r.logo || null,
            }))
          );
        }

        // Fetch portfolio via API (works even if user not registered)
        const base = import.meta?.env?.VITE_API_BASE || "http://localhost:3000";
        const normalizedBase = base.replace(/\/$/, "");
        const apiUrl = `${normalizedBase}/api/portfolio?wallet=${encodeURIComponent(
          viewingWallet
        )}`;

        const portfolioRes = await fetch(apiUrl, {
          headers: { Accept: "application/json" },
        });

        if (!portfolioRes.ok) {
          // if the API is unavailable, fallback to empty portfolio
          console.warn(`Portfolio API returned ${portfolioRes.status}`);
          setPortfolio([]);
        } else {
          const boughtTokens = await portfolioRes.json();
          setPortfolio(
            (boughtTokens || []).map((r) => ({
              ...r,
              logo: r.logo_path
                ? getLogoPublicUrl(r.logo_path)
                : r.logo || null,
              amount: r.user_amount ?? r.amount ?? "0",
              value: r.user_value ?? r.value ?? "0",
              change24h: r.change24h ?? "+0.0%",
            }))
          );
        }
      } catch (err) {
        console.error("Public Profile load error:", err);
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

  const headerLogo = userRow?.logo_path
    ? getLogoPublicUrl(userRow.logo_path)
    : null;
  const displayName = userRow?.display_name ?? shortAddress; // show short address if no display name

  const dicebearAvatarUrl = viewingWallet
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
        viewingWallet
      )}`
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
        className={`tab-button flex-none inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-lg transition-all ${
          isActive ? "tab-button-active" : "text-slate-400 bg-slate-800/30"
        }`}
        aria-pressed={isActive}
      >
        <Icon className="w-5 h-5" />
        <span className="capitalize whitespace-nowrap text-xs sm:text-sm">
          {tabName}
        </span>
      </button>
    );
  };

  const InlineStyles = () => (
    <style>{`
      .tab-button, .tab-button * { -webkit-tap-highlight-color: transparent; }
      .tab-button {
        border: 1px solid rgba(255,255,255,0.03);
        background-color: rgba(255,255,255,0.02);
        color: rgba(255,255,255,0.9);
      }

      /* Active tab: near-black, slightly different from background */
      .tab-button-active,
      .tab-button:active,
      .tab-button:focus,
      .tab-button[aria-pressed="true"] {
        background-color: rgba(0,0,0,0.45) !important; /* near-black */
        color: #ffffff !important;
        box-shadow: 0 6px 18px rgba(0,0,0,0.55) !important;
        border: 1px solid rgba(255,255,255,0.03) !important;
        outline: none !important;
      }

      .tab-button:focus { outline: none !important; box-shadow: 0 6px 18px rgba(0,0,0,0.55) !important; }
      .no-hover *:hover { background-color: transparent !important; color: inherit !important; box-shadow: none !important; }
      .no-hover img { border-radius: 9999px !important; object-fit: cover !important; }
      .no-hover .token-logo, .no-hover .logo, .no-hover .rounded-full { border-radius: 9999px !important; overflow: hidden !important; }
      .no-hover .focus\\:ring-purple-400:focus { box-shadow: none !important; }
    `}</style>
  );

  if (!viewingWallet) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl text-center bg-slate-900/60 border border-slate-700 shadow-xl">
          <User className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">
            Wallet Not Found
          </h3>
          <p className="text-sm text-slate-300 mb-6">
            Please provide a valid wallet address in the URL.
          </p>
        </div>
      </div>
    );
  }

  const explorerBase = "https://etherscan.io/address"; // change to your chain explorer if needed

  return (
    <>
      <InlineStyles />
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
        {/* Public Profile Header Card */}
        <div className="mb-6 p-6 rounded-2xl shadow-xl transition-all duration-300 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/60 border border-slate-800/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 w-full">
              {/* circular avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/30 to-cyan-400/30 flex items-center justify-center border-2 border-cyan-400/50 shrink-0 overflow-hidden">
                {headerLogo ? (
                  <img
                    src={headerLogo}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <img
                    src={dicebearAvatarUrl}
                    alt={`avatar-${shortAddress}`}
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* displayName or shortened wallet as title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                  {displayName}
                </h1>

                <div className="flex items-center gap-3 mt-1">
                  {/* full on md+, shortened on small screens */}
                  <p className="text-slate-400 font-mono text-sm truncate hidden md:block">
                    {viewingWallet}
                  </p>
                  <p className="text-slate-400 font-mono text-sm truncate md:hidden">
                    {shortAddress}
                  </p>

                  {/* copy button */}
                  <button
                    onClick={copyAddress}
                    className="p-1 rounded-full transition-colors active:bg-white/10"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <CopyIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* explorer open (always works, even if user not registered) */}
                  <a
                    href={`${explorerBase}/${viewingWallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on explorer"
                    className="p-1 rounded-full hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right-side area intentionally empty (balances removed) */}
            <div />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 p-2 overflow-x-auto">
          <div className="inline-flex gap-3 items-center px-1">
            <TabButton tabName={TABS.CREATED} icon={Sparkles} />
            <TabButton tabName={TABS.PORTFOLIO} icon={TrendingUp} />
            <TabButton tabName={TABS.HISTORY} icon={History} />
          </div>
        </div>

        <div className="no-hover">{getTabComponent()}</div>

        <Toast
          message={notification.message}
          show={notification.show}
          open={notification.show}
        />
      </div>
    </>
  );
};

export default PublicProfile;
