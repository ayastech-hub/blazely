import React, { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import {
  User,
  TrendingUp,
  Sparkles,
  Shield,
  Edit3 as EditIcon,
  Check as CheckIcon,
  Copy as CopyIcon,
  Image,
  History,
  X as XIcon,
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import * as supabaseClient from "../lib/supabaseClient";

// Tabs & refactored components
import CreatedTokensTab from "../tabP/CreatedTokensTab";
import PortfolioAssetsTab from "../tabP/PortfolioAssetsTab";
import TransactionHistoryTab from "../tabP/TransactionHistoryTab";
import { DashboardCard, Modal, Toast, Edit3 } from "../tabP/ProfileComponents";

const supabase =
  supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

/* ----------------------------- Helpers ----------------------------- */
const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);
const sanitizeFilename = (name = "") =>
  String(name)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 200);

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
    if (existing) return existing;

    const payload = {
      wallet: wallet.toLowerCase(),
      created_at: new Date().toISOString(),
    };
    const { data: created, error: upsertErr } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "wallet" })
      .select()
      .maybeSingle();
    if (upsertErr) console.warn("ensureUserRow upsert error:", upsertErr);

    return created;
  } catch (err) {
    console.error("ensureUserRow unexpected error:", err);
    return null;
  }
};

/* ----------------------------- Tabs ----------------------------- */
const TABS = { CREATED: "Created", PORTFOLIO: "Portfolio", HISTORY: "History" };

/* ----------------------------- Component ----------------------------- */
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
  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });
  const [tokenUpdateForm, setTokenUpdateForm] = useState({
    telegram: "",
    twitter: "",
    website: "",
    logo: "",
    description: "",
  });
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (!address) {
      setUserRow(null);
      setNameInput("");
      return;
    }
    setNameInput(userRow?.display_name ?? "");
  }, [address, userRow]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openUpdateModal = (token) => {
    setSelectedToken(token);
    setTokenUpdateForm({
      telegram: token.telegram || "",
      twitter: token.twitter || "",
      website: token.website || "",
      logo: token.logo || "",
      description: token.description || "",
    });
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedToken(null);
    setLogoFile(null);
  };

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: "" }), 3000);
  }; /* ------------------- Update Token ------------------- */

  const handleUpdateSubmit = async () => {
    if (!selectedToken || !address)
      return alert("Connect wallet to update token.");
    setLoading(true);
    try {
      const tokenCreator = (
        selectedToken.creator_wallet ||
        selectedToken.creator ||
        ""
      ).toLowerCase();
      if (!tokenCreator || tokenCreator !== address.toLowerCase())
        throw new Error("Only the creator wallet can update this token.");

      const updates = { ...tokenUpdateForm };

      if (logoFile) {
        const allowed = [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/svg+xml",
        ];
        if (!allowed.includes(logoFile.type))
          throw new Error("Unsupported file type for logo.");
        if (logoFile.size > 3 * 1024 * 1024)
          throw new Error("Logo too large. Max 3MB.");

        const fileExt = logoFile.name.split(".").pop() || "png";
        const fileName = `${sanitizeFilename(
          selectedToken.address + "_" + Date.now()
        )}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: logoFile.type,
          });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("logos")
          .getPublicUrl(filePath);
        updates.logo_path = filePath;
        updates.logo = publicUrlData?.publicUrl ?? null;
      }

      const updatePayload = {
        telegram: updates.telegram || null,
        twitter: updates.twitter || null,
        website: updates.website || null,
        description: updates.description || null,
        logo_path: updates.logo_path || selectedToken.logo_path || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("tokens")
        .update(updatePayload)
        .eq("address", selectedToken.address)
        .eq("creator_wallet", address.toLowerCase())
        .select()
        .maybeSingle();

      if (error) throw error;

      setCreatedTokens((prev) =>
        prev.map((t) =>
          t.address === selectedToken.address
            ? { ...t, ...updatePayload, logo: updates.logo || t.logo }
            : t
        )
      );

      showNotification("Token updated successfully!");
      closeModal();
    } catch (err) {
      console.error("Error updating token:", err);
      alert("Failed to update token: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }; /* ------------------- Display Name ------------------- */

  const startEditName = () => {
    setNameError("");
    setIsEditingName(true);
    setNameInput(userRow?.display_name ?? "");
  };
  const cancelEditName = () => {
    setNameInput(userRow?.display_name ?? "");
    setNameError("");
    setIsEditingName(false);
  };

  const saveName = async () => {
    if (!address) return;
    const trimmed = (nameInput || "").trim();

    if (trimmed.length === 0) {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("users")
          .update({
            display_name: null,
            updated_at: new Date().toISOString(),
          })
          .eq("wallet", address.toLowerCase())
          .select()
          .maybeSingle();
        if (error) throw error;
        setUserRow(data ?? null);
        setIsEditingName(false);
        showNotification("Profile updated successfully (name removed).");
      } catch (err) {
        console.error(err);
        alert("Failed to remove display name: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateDisplayName(trimmed))
      return setNameError(
        "Use letters, numbers and spaces only (max 30 chars)"
      );

    try {
      setLoading(true);
      const payload = {
        wallet: address.toLowerCase(),
        display_name: trimmed,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("users")
        .upsert(payload, { onConflict: "wallet" })
        .select()
        .maybeSingle();
      if (error) throw error;
      setUserRow(data ?? null);
      setIsEditingName(false);
      showNotification("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }; /* ------------------- Load Profile + Tokens (Bought via API) ------------------- */

  useEffect(() => {
    if (!address) return;

    (async () => {
      setLoading(true);
      try {
        const wallet = address.toLowerCase(); // Ensure user row exists

        const row = await ensureUserRow(wallet);
        setUserRow(row); // Fetch created tokens locally from Supabase

        const { data: createdRows, error: createdError } = await supabase
          .from("tokens")
          .select("*")
          .eq("creator_wallet", wallet)
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
        } // --- IMPORTANT CHANGE: make sure front-end hits backend origin (not vite dev server)
        // prefer VITE_API_BASE, otherwise fall back to localhost:3000 (dev)

        const base = import.meta?.env?.VITE_API_BASE || "http://localhost:3000";
        const normalizedBase = base.replace(/\/$/, "");
        const apiUrl = `${normalizedBase}/api/portfolio?wallet=${encodeURIComponent(
          wallet
        )}`; // If your backend uses cookies and needs credentials, uncomment credentials line below.

        const portfolioRes = await fetch(apiUrl, {
          // credentials: "include",
          headers: { Accept: "application/json" },
        });

        const contentType = portfolioRes.headers.get("content-type") || "";

        if (!portfolioRes.ok) {
          const text = await portfolioRes
            .text()
            .catch(() => "[unreadable body]");
          throw new Error(
            `API returned ${portfolioRes.status} ${portfolioRes.statusText}: ${text.slice(
              0,
              1000
            )}`
          );
        }

        if (!contentType.includes("application/json")) {
          const text = await portfolioRes
            .text()
            .catch(() => "[unreadable body]");
          throw new Error(
            `Expected JSON from ${apiUrl} but got: ${text.slice(0, 1000)}`
          );
        }

        const boughtTokens = await portfolioRes.json(); // Map tokens to UI-friendly shape

        setPortfolio(
          (boughtTokens || []).map((r) => ({
            ...r,
            logo: r.logo_path ? getLogoPublicUrl(r.logo_path) : r.logo || null,
            amount: r.user_amount ?? r.amount ?? "0",
            value: r.user_value ?? r.value ?? "0",
            change24h: r.change24h ?? "+0.0%",
          }))
        );
      } catch (err) {
        console.error("Profile load error:", err);
        setCreatedTokens([]);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [address, isConnected]);

  const totalPortfolioValue = portfolio.reduce(
    (sum, token) =>
      sum +
      parseFloat(
        String(token.value || "0")
          .toString()
          .replace(/,/g, "")
      ),
    0
  ); /* ------------------- Render ------------------- */

  const InlineStyles = () => (
    <style>{`
      .tab-button, .tab-button * { -webkit-tap-highlight-color: transparent; }
      .tab-button { 
        border: 1px solid rgba(255,255,255,0.03); 
        background-color: rgba(255,255,255,0.02); 
        color: rgba(255,255,255,0.7);
        transition: all 0.2s ease;
      }
      .tab-button:hover { 
        background-color: rgba(255,255,255,0.05); 
        color: rgba(255,255,255,0.9);
      }
      .tab-button-active,
      .tab-button:active,
      .tab-button:focus,
      .tab-button[aria-pressed="true"] {
        background-color: #3b82f6 !important;
        color: #fff !important;
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3) !important;
        border: 1px solid #3b82f6 !important;
        outline: none !important;
      }
      .tab-button:focus { outline: none !important; }
      .no-hover *:hover { background-color: transparent !important; color: inherit !important; box-shadow: none !important; }
      .no-hover img { border-radius: 8px !important; object-fit: cover !important; }
      .no-hover .token-logo, .no-hover .logo, .no-hover .rounded-full { border-radius: 8px !important; overflow: hidden !important; }
    `}</style>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <InlineStyles />
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl text-center bg-slate-900/60 border border-slate-700 shadow-xl">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">
            Please connect your Web3 wallet
          </h3>
          <p className="text-sm text-slate-300 mb-6">
            Connect your wallet to view your profile and manage your tokens.
          </p>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button
                onClick={show}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg transition-opacity active:opacity-90"
              >
                Connect Wallet
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    );
  }

  const displayName = userRow?.display_name ?? null;
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";
  const filteredCreatedTokens = createdTokens.filter(
    (t) =>
      t.name?.toLowerCase().includes(createdSearch.toLowerCase()) ||
      t.symbol?.toLowerCase().includes(createdSearch.toLowerCase())
  );
  const filteredPortfolio = portfolio.filter(
    (t) =>
      t.name?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
      t.symbol?.toLowerCase().includes(portfolioSearch.toLowerCase())
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
            openUpdateModal={openUpdateModal}
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
            address={address}
            hideIfNoAddress={!isConnected}
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
        className={`tab-button flex-none inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
          isActive ? "tab-button-active" : "text-slate-400"
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

  return (
    <>
      <InlineStyles />
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
        {/* Profile Header Card */}
        <div className="mb-6 p-4 sm:p-6 rounded-2xl shadow-xl transition-all duration-300 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/60 border border-slate-800/60">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            {/* Left: Avatar + Name + Address */}
            <div className="flex items-start gap-3 sm:gap-4 w-full lg:w-auto">
              {/* Avatar Placeholder */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600/40 to-blue-600/40 flex items-center justify-center border-2 border-purple-400/50 shrink-0">
                <User className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Wallet Address as Main Title */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">
                  {shortAddress}
                </h1>

                {/* Full Address with Copy */}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-400 font-mono text-xs sm:text-sm truncate">
                    {address}
                  </p>
                  <button
                    onClick={copyAddress}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors active:bg-white/20 shrink-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <CopyIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Display Name Edit Section */}
                {address && (
                  <div className="mt-3">
                    {!isEditingName ? (
                      <button
                        onClick={startEditName}
                        title="Edit display name"
                        className="inline-flex items-center gap-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors active:bg-white/20"
                      >
                        <EditIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-xs sm:text-sm text-slate-300">
                          {displayName
                            ? `Edit: ${displayName}`
                            : "Set display name"}
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                        <input
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="letters & numbers (max 30)"
                          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={saveName}
                            disabled={loading}
                            className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditName}
                            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors active:opacity-80 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {nameError && (
                      <div className="text-xs text-red-400 mt-2 flex items-start gap-1">
                        <span className="mt-0.5">⚠</span>
                        <span>{nameError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Balances */}
            <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0 w-full lg:w-auto lg:justify-end">
              <div>
                <p className="text-xs sm:text-sm text-slate-400 mb-1">
                  Native Balance
                </p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {balanceData
                    ? Number(formatEther(balanceData.value)).toFixed(4)
                    : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {balanceData?.symbol || ""}
                </p>
              </div>
              <div className="hidden sm:block h-12 w-px bg-white/10" />
              <div>
                <p className="text-xs sm:text-sm text-slate-400 mb-1">
                  Portfolio Value
                </p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  $
                  {totalPortfolioValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 p-2 overflow-x-auto">
          <div className="inline-flex gap-2 sm:gap-3 items-center">
            <TabButton tabName={TABS.CREATED} icon={Sparkles} />
            <TabButton tabName={TABS.PORTFOLIO} icon={TrendingUp} />
            <TabButton tabName={TABS.HISTORY} icon={History} />
          </div>
        </div>

        {/* Tab Content */}
        <div className="no-hover">{getTabComponent()}</div>

        {/* Update Token Modal */}
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          {selectedToken && (
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <EditIcon className="w-6 h-6 text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                      Update Token Info
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 truncate">
                      {selectedToken.name} ({selectedToken.symbol})
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 transition-colors active:bg-slate-700 shrink-0"
                  aria-label="Close modal"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Social Links */}
                {["telegram", "twitter", "website"].map((name) => (
                  <div key={name}>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 capitalize">
                      {name}
                    </label>
                    <input
                      type="url"
                      name={name}
                      placeholder={
                        name === "telegram"
                          ? "https://t.me/yourtoken"
                          : name === "twitter"
                            ? "https://twitter.com/yourtoken"
                            : "https://yourtoken.com"
                      }
                      value={tokenUpdateForm[name]}
                      onChange={(e) =>
                        setTokenUpdateForm((prev) => ({
                          ...prev,
                          [name]: e.target.value,
                        }))
                      }
                      maxLength={name === "website" ? 100 : 40}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm"
                    />
                  </div>
                ))}

                {/* Logo Upload */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    Logo (PNG, JPG, GIF, SVG) — Max 3MB
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/svg+xml"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/40 active:file:bg-purple-500/60 text-white text-sm"
                    />
                    {logoFile ? (
                      <span className="text-xs text-green-400 shrink-0">
                        ✓ {logoFile.name}
                      </span>
                    ) : selectedToken.logo ? (
                      <div className="w-10 h-10 rounded-md border border-slate-700 shrink-0 overflow-hidden">
                        <img
                          src={selectedToken.logo}
                          alt="Current Logo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Image className="w-6 h-6 text-slate-500 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                    Description (max 200 chars)
                  </label>
                  <textarea
                    name="description"
                    placeholder="A short description of your token..."
                    value={tokenUpdateForm.description}
                    onChange={(e) =>
                      setTokenUpdateForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={200}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm resize-none"
                  />
                  <div className="text-xs text-slate-400 mt-1 text-right">
                    {(tokenUpdateForm.description || "").length}/200
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleUpdateSubmit}
                  disabled={loading}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-3 font-semibold rounded-lg shadow-lg transition-all text-sm sm:text-base ${
                    loading
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed opacity-50"
                      : "bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:shadow-purple-500/30 active:opacity-90"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save Updates"
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Notification Toast */}
        <Toast message={notification.message} show={notification.show} />
      </div>
    </>
  );
};

export default Profile;
