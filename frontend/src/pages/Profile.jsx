// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  TrendingUp,
  Sparkles,
  Edit3,
  Check,
  Eye,
  Shield,
  Edit3 as EditIcon,
  Check as CheckIcon,
  Copy as CopyIcon,
  Search,
  Image,
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import * as supabaseClient from "../lib/supabaseClient";
const supabase =
  supabaseClient.supabase ?? supabaseClient.default ?? supabaseClient;

// validation helper
const validateDisplayName = (s = "") => /^[A-Za-z0-9 ]{1,30}$/.test(s);

// sanitize filename helper
const sanitizeFilename = (name = "") =>
  String(name)
    .trim()
    .replace(/\s+/g, "_") // spaces -> underscore
    .replace(/[^a-zA-Z0-9._-]/g, "") // remove other unsafe chars
    .slice(0, 200);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

const DashboardCard = ({
  title,
  icon: Icon,
  count,
  isLoading,
  data,
  renderItem,
  emptyState,
  searchTerm,
  onSearchChange,
  iconBgColor,
}) => (
  <motion.div
    variants={itemVariants}
    className="card relative overflow-hidden h-full flex flex-col"
  >
    <div className="relative z-10 flex flex-col flex-grow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${iconBgColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {count > 0 && (
          <span className="text-xs text-slate-400 bg-white/10 px-2.5 py-1 rounded-full">
            {count} items
          </span>
        )}
      </div>

      {onSearchChange && (
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}

      <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 h-full flex flex-col items-center justify-center">
            {searchTerm ? (
              <p className="text-slate-500">
                No tokens found for "{searchTerm}".
              </p>
            ) : (
              emptyState
            )}
          </div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            initial="hidden"
            animate="visible"
          >
            {data.map((item, index) => (
              <motion.div
                key={item.address || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.03,
                }}
              >
                {renderItem(item)}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  </motion.div>
);

const Modal = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div
          className="absolute left-0 right-0 top-24 bottom-0 bg-black/60 backdrop-blur-sm pointer-events-none"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 max-w-md w-full bg-slate-900/80 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Toast = ({ message, show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
      >
        <div className="flex items-center gap-3 bg-emerald-500/90 backdrop-blur-md text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-400/40">
          <Check className="w-5 h-5" />
          <span className="font-medium">{message}</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// standardized public url getter
const getLogoPublicUrl = (path) => {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    return data?.publicUrl ?? null;
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
    if (upsertErr) return null;
    return created;
  } catch (err) {
    console.error("ensureUserRow unexpected error:", err);
    return null;
  }
};

const Profile = () => {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address, watch: true });

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
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
  };

  // UPDATED: improved upload + DB update with ownership check & filename sanitization
  const handleUpdateSubmit = async () => {
    if (!selectedToken) return;
    setLoading(true);
    try {
      // ensure authenticated and get user id
      const userResp = await supabase.auth.getUser();
      const uid = userResp?.data?.user?.id;
      if (!uid) throw new Error("Authentication required to update token.");

      // ensure the current user is the creator of the token
      const tokenCreator =
        selectedToken.creator_wallet || selectedToken.creator || null;
      if (
        tokenCreator &&
        tokenCreator.toLowerCase() !== address.toLowerCase() &&
        tokenCreator.toLowerCase() !== (uid || "").toLowerCase()
      ) {
        throw new Error("You are not authorized to update this token.");
      }

      const updates = { ...tokenUpdateForm };

      if (logoFile) {
        // validate file type & size (limit ~3MB)
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
        const baseName = sanitizeFilename(
          `${selectedToken.address}_${Date.now()}`
        );
        const fileName = `${baseName}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: logoFile.type,
          });

        if (uploadError) throw uploadError;

        // get public url
        const { data: publicUrlData } = supabase.storage
          .from("logos")
          .getPublicUrl(filePath);

        updates.logo_path = filePath;
        updates.logo = publicUrlData?.publicUrl ?? null;
      }

      // Only allow update where the address matches and the creator_wallet matches the current wallet address.
      const updatePayload = {
        telegram: updates.telegram || null,
        twitter: updates.twitter || null,
        website: updates.website || null,
        description: updates.description || null,
        logo_path: updates.logo_path || selectedToken.logo_path || null,
      };

      const query = supabase
        .from("tokens")
        .update(updatePayload)
        .eq("address", selectedToken.address);

      // If token has a creator_wallet column, scope update to that owner to avoid RLS block on client
      if (selectedToken.creator_wallet) {
        query.eq("creator_wallet", selectedToken.creator_wallet);
      }

      const { data, error } = await query.select().maybeSingle();
      if (error) {
        // improved error messaging for RLS
        console.error("Token update error:", error);
        if (String(error.message || "").includes("row-level security")) {
          throw new Error(
            "Row-level security prevented this update. Run the RLS SQL policies provided in the project README or update the DB policy to allow the token owner to update their token."
          );
        }
        throw error;
      }

      setCreatedTokens((prev) =>
        prev.map((t) =>
          t.address === selectedToken.address
            ? {
                ...t,
                telegram: updatePayload.telegram || "",
                twitter: updatePayload.twitter || "",
                website: updatePayload.website || "",
                description: updatePayload.description || "",
                logo: updates.logo || t.logo,
                logo_path: updatePayload.logo_path || t.logo_path,
              }
            : t
        )
      );

      showNotification("Token updated successfully!");
      closeModal();
    } catch (err) {
      console.error("Error updating token:", err);
      // user-friendly alert + console
      alert(
        "Failed to update token: " +
          (err.message || String(err)) +
          "\nSee console for details."
      );
    } finally {
      setLoading(false);
    }
  };

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
          .update({ display_name: null })
          .eq("wallet", address.toLowerCase())
          .select()
          .maybeSingle();
        if (error) throw error;
        setUserRow(data ?? null);
        setIsEditingName(false);
        showNotification("Profile updated successfully (name removed).");
      } catch (err) {
        console.error("Error removing display name:", err);
        alert("Failed to remove display name: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!validateDisplayName(trimmed)) {
      setNameError("Use letters, numbers and spaces only (max 30 chars)");
      return;
    }
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
      console.error("Error saving display name:", err);
      alert("Failed to update profile: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!address) return;
    (async () => {
      setLoading(true);
      try {
        const wallet = address.toLowerCase();
        const row = await ensureUserRow(wallet);
        setUserRow(row);
        const { data: createdRows, error: createdError } = await supabase
          .from("tokens")
          .select("*")
          .eq("creator_wallet", wallet)
          .order("created_at", { ascending: false });
        if (createdError) {
          console.error("Error fetching created tokens:", createdError);
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
        let tokensBought = [];
        if (row && Array.isArray(row.tokens_bought))
          tokensBought = row.tokens_bought.map((a) =>
            typeof a === "string" ? a.toLowerCase() : a
          );
        if (!tokensBought || tokensBought.length === 0) setPortfolio([]);
        else {
          const { data: boughtRows, error: boughtErr } = await supabase
            .from("tokens")
            .select("*")
            .in("address", tokensBought);
          if (boughtErr) {
            console.error("Error fetching bought tokens:", boughtErr);
            setPortfolio([]);
          } else {
            setPortfolio(
              (boughtRows || []).map((r) => ({
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
        }
      } catch (err) {
        console.error("Unexpected error loading profile data:", err);
        setCreatedTokens([]);
        setPortfolio([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [address, isConnected]);

  const totalPortfolioValue = portfolio.reduce(
    (sum, token) =>
      sum + parseFloat(String(token.value || "0").replace(/,/g, "")),
    0
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950">
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute left-0 right-0 top-24 bottom-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
            <div className="relative z-10 flex items-start justify-center h-full p-4 pt-24">
              <motion.div
                className="max-w-md w-full p-6 sm:p-8 rounded-2xl text-center bg-slate-900/60 border border-slate-700 shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">
                  Please connect your Web3 wallet
                </h3>
                <p className="text-sm text-slate-300 mb-6">
                  Connect your wallet to view your profile and manage your
                  tokens.
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-full">
                    <ConnectKitButton.Custom>
                      {({ show }) => (
                        <button
                          onClick={show}
                          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg"
                        >
                          Connect Wallet
                        </button>
                      )}
                    </ConnectKitButton.Custom>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const displayName = userRow?.display_name ?? null;
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";
  const filteredCreatedTokens = createdTokens.filter(
    (token) =>
      token.name?.toLowerCase().includes(createdSearch.toLowerCase()) ||
      token.symbol?.toLowerCase().includes(createdSearch.toLowerCase())
  );
  const filteredPortfolio = portfolio.filter(
    (token) =>
      token.name?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
      token.symbol?.toLowerCase().includes(portfolioSearch.toLowerCase())
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8"
    >
      {/* header card omitted for brevity (unchanged) */}
      <motion.div variants={itemVariants} className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 w-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-400/20 flex items-center justify-center border-2 border-cyan-400/30">
              <User className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                {displayName || shortAddress}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400 font-mono text-sm truncate">
                  {address}
                </p>
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckIcon className="w-4 h-4 text-green-400" />
                  ) : (
                    <CopyIcon className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              {address && (
                <div className="mt-3">
                  {!isEditingName ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={startEditName}
                        title="Edit display name"
                        className="inline-flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg"
                      >
                        <EditIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-slate-300">
                          {displayName ? "Edit name" : "Set name"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-2 mt-2">
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="letters & numbers (max 30)"
                        className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm w-full"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveName}
                          className="px-3 py-2 rounded-lg bg-emerald-500 text-black font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditName}
                          className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {nameError && (
                <div className="text-xs text-red-400 mt-1">{nameError}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-sm text-slate-400 mb-1">
                Native Balance ({balanceData?.symbol})
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {balanceData
                  ? `${Number(formatEther(balanceData.value)).toFixed(4)}`
                  : "—"}
              </p>
            </div>
            <div className="h-12 w-px bg-white/10"></div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Token Assets Value</p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                $
                {totalPortfolioValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DashboardCard components unchanged - keep as-is */}
        <DashboardCard
          title="Tokens Created"
          icon={Sparkles}
          iconBgColor="border-purple-400/30 text-purple-400"
          count={filteredCreatedTokens.length}
          isLoading={loading}
          data={filteredCreatedTokens}
          searchTerm={createdSearch}
          onSearchChange={setCreatedSearch}
          emptyState={
            <>
              <Sparkles className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-slate-500">No tokens created yet.</p>
            </>
          }
          renderItem={(token) => (
            <div className="p-3 rounded-2xl bg-white/4 border border-slate-800">
              <div className="grid grid-cols-3 items-center gap-3">
                <a
                  href={`/token/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 col-span-2 md:col-span-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className="font-bold text-purple-300">
                        {(token.symbol || "T").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">
                      {token.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {token.symbol}
                    </p>
                  </div>
                </a>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    $
                    {(token.market_cap || 0).toLocaleString(undefined, {
                      notation: "compact",
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-slate-400">Market Cap</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => openUpdateModal(token)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"
                    title="Edit token"
                  >
                    <Edit3 className="w-4 h-4 text-purple-400" />
                  </button>
                  <a
                    href={`/token/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"
                    title="View"
                  >
                    <Eye className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
          )}
        />

        <DashboardCard
          title="Portfolio Assets"
          icon={TrendingUp}
          iconBgColor="border-cyan-400/30 text-cyan-400"
          count={filteredPortfolio.length}
          isLoading={loading}
          data={filteredPortfolio}
          searchTerm={portfolioSearch}
          onSearchChange={setPortfolioSearch}
          emptyState={
            <>
              <TrendingUp className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-slate-500">Your portfolio is empty.</p>
            </>
          }
          renderItem={(token) => (
            <a
              href={`/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-2xl bg-white/4 border border-slate-800 no-underline"
            >
              <div className="grid grid-cols-3 items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className="font-bold text-cyan-300">
                        {(token.symbol || "T").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">
                      {token.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {token.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {Number(token.amount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">Amount</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">
                    $
                    {Number(token.value || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      String(token.change24h || "").startsWith("+")
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {token.change24h}
                  </p>
                </div>
              </div>
            </a>
          )}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {selectedToken && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Edit3 className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-xl font-bold text-white">
                  Update Token Info
                </h3>
                <p className="text-sm text-slate-400">
                  {selectedToken.name} ({selectedToken.symbol})
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {["telegram", "twitter", "website"].map((name) => {
                const placeholder =
                  name === "telegram"
                    ? "https://t.me/yourtoken"
                    : name === "twitter"
                    ? "https://twitter.com/yourtoken"
                    : "https://yourtoken.com";
                return (
                  <div key={name}>
                    <label className="block text-sm font-medium text-slate-300 mb-2 capitalize">
                      {name}
                    </label>
                    <input
                      type="url"
                      value={tokenUpdateForm[name]}
                      onChange={(e) =>
                        setTokenUpdateForm((p) => ({
                          ...p,
                          [name]: e.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                    />
                  </div>
                );
              })}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-500">
                    {logoFile ? (
                      <img
                        src={URL.createObjectURL(logoFile)}
                        alt="New Logo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : tokenUpdateForm.logo ? (
                      <img
                        src={tokenUpdateForm.logo}
                        alt="Current Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-8 h-8" />
                    )}
                  </div>
                  <label className="flex-1 block">
                    <span className="sr-only">Choose logo file</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/svg+xml"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0])
                          setLogoFile(e.target.files[0]);
                      }}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-300 hover:file:bg-purple-500/20"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={tokenUpdateForm.description}
                  onChange={(e) =>
                    setTokenUpdateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your token..."
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 text-white hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                Update Token
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={notification.message} show={notification.show} />
    </motion.div>
  );
};

export default Profile;
