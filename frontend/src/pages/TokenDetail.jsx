// src/pages/TokenDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Activity,
  MessageCircle,
  BarChart3,
  DollarSign,
  Globe,
  Twitter,
  Send,
  Zap,
  Shield,
  Info,
  Clipboard,
  Check,
  X,
  Loader2,
} from "lucide-react";

import { fetchTokenByAddress } from "../api/supabaseTokens"; // <-- Supabase helper

// =========================================================================
// --- Utility helpers ---
// =========================================================================
const shortenAddress = (address) => {
  if (!address) return "N/A";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

const shortenAddressMobile = (address) => {
  if (!address) return "N/A";
  if (address.length <= 10) return address;
  return `${address.substring(0, 4)}...${address.substring(
    address.length - 3
  )}`;
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getExplorerLink = (address) => {
  if (!address) return "#";
  return `https://etherscan.io/address/${address}`;
};

// =========================================================================
// --- UI helpers & small components ---
// =========================================================================
const AuroraBackground = () => (
  <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
    <div className="absolute top-0 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/3 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))] animate-[aurora_8s_ease-in-out_infinite]" />
  </div>
);

const CustomCard = ({ children, className = "", ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.34, ease: "easeOut" }}
    className={`relative p-4 bg-slate-900/70 backdrop-blur-md rounded-xl shadow-xl overflow-hidden border border-slate-800 ${className}`}
    {...props}
  >
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const CopyButton = ({ textToCopy }) => {
  const [isCopied, setIsCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(textToCopy || "").then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1600);
    });
  };

  return (
    <motion.button
      onClick={copy}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 rounded-md bg-transparent hover:bg-blue-500/10 transition-colors duration-200 flex items-center gap-2"
      title="Copy address"
    >
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Check size={14} className="text-emerald-400" />
          </motion.div>
        ) : (
          <motion.div
            key="clipboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Clipboard size={14} className="text-slate-300" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-3 mb-3">
    {React.cloneElement(icon, { className: "w-5 h-5 text-blue-400" })}
    <h2 className="text-lg font-semibold text-white">{title}</h2>
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="relative z-10 w-full max-w-md p-4 bg-slate-900 rounded-xl border border-blue-400/12"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>
        <div>{children}</div>
      </motion.div>
    </div>
  );
};

// =========================================================================
// --- Mock Data Generation (used only as fallback) ---
// =========================================================================
function generateMockHolders(token, count, deployer) {
  const mockHolders = [];
  mockHolders.push({
    address: deployer,
    balance: `20,000,000 ${token.project?.symbol || "TKN"}`,
    percentage: "20.0%",
    isDeployer: true,
  });

  for (let i = 1; i < count; i++) {
    const address = `0x${Math.random().toString(16).slice(2).padEnd(40, "0")}`;
    const percentage = (Math.random() * 5 + 0.5).toFixed(1);
    const balance = Math.round(
      (parseFloat(token.project?.total_supply || 1000000000) *
        parseFloat(percentage)) /
        100
    ).toLocaleString();

    mockHolders.push({
      address,
      balance: `${balance} ${token.project?.symbol || "TKN"}`,
      percentage: `${percentage}%`,
      isDeployer: false,
    });
  }

  mockHolders.sort(
    (a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)
  );
  return mockHolders;
}

function generateMockTrades(count) {
  const trades = [];
  for (let i = 0; i < count; i++) {
    trades.push({
      type: Math.random() > 0.5 ? "buy" : "sell",
      amount: Math.round(Math.random() * 1000000),
      price: Math.random() * 0.005 + 0.0001,
      from: `0x${Math.random().toString(16).slice(2).padEnd(40, "0")}`,
      to: `0x${Math.random().toString(16).slice(2).padEnd(40, "0")}`,
    });
  }
  return trades;
}

// map DB row (normalized token shape) into the UI structure your page expects
function mapRowToUI(normalized) {
  const row = normalized?.__raw || {}; // original DB row for optional fields
  const symbol = normalized?.symbol || row.symbol || "TKN";
  const name = normalized?.name || row.name || symbol;
  const tokenAddress =
    normalized?.token_address || row.address || row.token_address || "";

  // metrics: prefer DB fields then fallbacks
  const price_usd = Number(
    row.price_usd ?? row.metrics?.price_usd ?? row.price ?? 0
  );
  const volume_24h_usd = Number(
    row.volume_24h_usd ?? row.volume_24h ?? row.metrics?.volume_24h_usd ?? 0
  );
  const marketcap = Number(
    row.market_cap ?? row.marketcap_usd ?? row.metrics?.market_cap ?? 0
  );
  const liquidity = Number(
    row.liquidity_usd ??
      row.metrics?.liquidity_usd ??
      Math.round((marketcap || 0) * 0.02)
  );
  const holders = Number(
    row.holders ?? row.metrics?.holders ?? row.holders_count ?? 0
  );
  const price_change_24h = Number(
    row.price_change_24h ?? row.metrics?.price_change_24h ?? 0
  );

  // socials
  const socials = {
    twitter: row.twitter || row.socials?.twitter || normalized?.twitter || null,
    website: row.website || row.socials?.website || normalized?.website || null,
    telegram:
      row.telegram || row.socials?.telegram || normalized?.telegram || null,
  };

  // comments & holders & trades: prefer DB, else generate light mock
  const comments = row.comments ??
    row.community_comments ??
    row.comments_json ?? [
      {
        wallet: "0x1234abcd567890abcdef1234567890abcdef5678",
        text: "Community looks strong here — watch the liquidity.",
      },
    ];

  const top_holders_db = row.top_holders ?? row.holders_list ?? null;
  // Build main token object in the same shape your UI expects
  const tokenUI = {
    project: {
      name,
      symbol,
      token_address: tokenAddress,
      description:
        row.description ?? row.about ?? normalized?.description ?? "",
      total_supply:
        row.total_supply ?? row.supply ?? row.token_total_supply ?? 1000000000,
      decimals: row.decimals ?? 18,
      creator_wallet: (
        row.creator_wallet ||
        row.owner ||
        row.deployer ||
        ""
      ).toString(),
      created_at: row.created_at ?? null,
      logo_url: normalized?.logo ?? row.logo_url ?? row.logo ?? null,
      category: normalized?.category ?? row.category ?? null,
      socials,
    },
    metrics: {
      price_usd: price_usd,
      volume_24h_usd: volume_24h_usd,
      market_cap: marketcap,
      liquidity_usd: liquidity,
      holders: holders,
      price_change_24h: price_change_24h,
      recent_trades: row.recent_trades ?? row.trades ?? generateMockTrades(30),
    },
    top_holders: top_holders_db
      ? top_holders_db
      : generateMockHolders(
          {
            project: { symbol, total_supply: row.total_supply ?? 1000000000 },
          },
          25,
          (
            row.creator_wallet ||
            row.owner ||
            row.deployer ||
            "0xDeployerWalletAddress1234567890abcdef"
          ).toString()
        ),
    comments: comments,
  };

  return tokenUI;
}

// =========================================================================
// --- Holder List --- (unchanged, using UI token structure)
// =========================================================================
const TokenHoldersList = ({ token, isMobile, className = "" }) => {
  const DEPLOYER_ADDRESS = token.project.creator_wallet || "";
  const MOBILE_LIMIT = 10;
  const DESKTOP_LIMIT = 20;

  const limit = isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT;
  const holdersToShow = (token.top_holders || []).slice(0, limit);

  return (
    <CustomCard className={`flex flex-col ${className}`}>
      <SectionHeader icon={<Users />} title={`Top ${limit} Holders`} />
      <div
        className={`space-y-3 overflow-y-auto pr-2 custom-scrollbar ${
          isMobile ? "max-h-[300px]" : "flex-grow min-h-0"
        }`}
      >
        {holdersToShow.map((holder, i) => {
          const isDeployer =
            holder.address?.toLowerCase() === DEPLOYER_ADDRESS?.toLowerCase();
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center justify-between p-2 rounded-lg transition-all border ${
                isDeployer
                  ? "bg-purple-900/40 border-purple-500/30"
                  : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isDeployer
                      ? "bg-purple-500 text-white"
                      : "bg-slate-700 text-white/80"
                  }`}
                >
                  #{i + 1}
                </div>
                <div className="min-w-0">
                  <a
                    href={getExplorerLink(holder.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-mono text-sm truncate hover:text-blue-400"
                  >
                    {shortenAddress(holder.address)}
                  </a>
                  {isDeployer && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs font-semibold text-yellow-400">
                        Deployer
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white font-semibold text-sm">
                  {String(holder.balance).split(" ")[0]}
                </p>
                <p className="text-blue-400 text-xs font-mono">
                  {holder.percentage}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </CustomCard>
  );
};

// =========================================================================
// --- Compact Info Card --- (unchanged - uses token object shape)
// =========================================================================
const CompactInfo = ({ token }) => {
  const isPositive = (token.metrics?.price_change_24h || 0) >= 0;
  const contract = token.project?.token_address;
  const creator = token.project?.creator_wallet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex w-full flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4 rounded-2xl bg-slate-900/80 shadow-2xl shadow-blue-400/10 backdrop-blur-md border border-slate-800"
    >
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white overflow-hidden shadow-md shrink-0"
        >
          {token.project?.logo_url ? (
            <img
              src={token.project.logo_url}
              alt="logo"
              className="w-full h-full object-cover"
            />
          ) : (
            token.project?.symbol?.charAt(0) || "T"
          )}
        </motion.div>
        <div className="flex flex-col min-w-0 items-center sm:items-start flex-grow">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white truncate">
              {token.project?.name}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-blue-400/20 ml-1">
              {token.project?.symbol}
            </span>
          </div>
          <motion.span
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`mt-1 text-sm font-bold transition-colors ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {token.metrics?.price_usd?.toFixed(6) || "N/A"} USD (
            {Math.abs(token.metrics?.price_change_24h || 0).toFixed(1)}%)
          </motion.span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-4 lg:hidden"
      >
        <div className="bg-slate-800/60 rounded-lg px-2 py-2 text-center">
          <p className="text-xs text-slate-400">Market Cap</p>
          <p className="text-sm font-bold text-white mt-1">
            {formatCurrency(token.metrics?.market_cap)}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-2 py-2 text-center">
          <p className="text-xs text-slate-400">Liquidity</p>
          <p className="text-sm font-bold text-white mt-1">
            {formatCurrency(token.metrics?.liquidity_usd)}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-2 py-2 text-center">
          <p className="text-xs text-slate-400">24h Vol</p>
          <p className="text-sm font-bold text-white mt-1">
            {formatCurrency(token.metrics?.volume_24h_usd)}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-2 py-2 text-center">
          <p className="text-xs text-slate-400">Holders</p>
          <p className="text-sm font-bold text-white mt-1">
            {(token.metrics?.holders || 0).toLocaleString() ?? "N/A"}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="flex flex-col gap-2 mt-2"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Contract:</span>
          <a
            href={getExplorerLink(token.project?.token_address)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-blue-300 hover:text-blue-400 transition-colors"
          >
            {shortenAddress(token.project?.token_address)}
          </a>
          <CopyButton textToCopy={token.project?.token_address} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Creator:</span>
          <a
            href={getExplorerLink(token.project?.creator_wallet)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-blue-300 hover:text-blue-400 transition-colors"
          >
            {shortenAddress(token.project?.creator_wallet)}
          </a>
          <CopyButton textToCopy={token.project?.creator_wallet} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="flex items-center gap-2 mt-2 flex-wrap"
      >
        {token.project?.socials?.website && (
          <a
            href={token.project.socials.website}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-800 hover:bg-blue-500/20 transition-transform hover:scale-110"
            title="Website"
          >
            <Globe className="w-4 h-4 text-blue-400" />
          </a>
        )}
        {token.project?.socials?.twitter && (
          <a
            href={token.project.socials.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-800 hover:bg-blue-500/20 transition-transform hover:scale-110"
            title="Twitter"
          >
            <Twitter className="w-4 h-4 text-blue-400" />
          </a>
        )}
        {token.project?.socials?.telegram && (
          <a
            href={token.project.socials.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-800 hover:bg-blue-500/20 transition-transform hover:scale-110"
            title="Telegram"
          >
            <Send className="w-4 h-4 text-blue-400" />
          </a>
        )}
      </motion.div>
    </motion.div>
  );
};

// =========================================================================
// --- TradeCard, CommunityChat, ChartAndActivity ---
// --- (kept same as your original file with small adjustments) ---
// =========================================================================

// TradeCard component (unchanged logic except uses token structure)
const TradeCard = ({ token }) => {
  if (!token) return null;
  const [tradeMode, setTradeMode] = useState("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [userBalance] = useState(10000);
  const [userTokenBalance] = useState(5000);

  const calculateReceiveAmount = () => {
    if (!tradeAmount || isNaN(parseFloat(tradeAmount))) return "0.00";
    const amount = parseFloat(tradeAmount);
    return tradeMode === "buy"
      ? (amount / token.metrics?.price_usd).toFixed(4)
      : (amount * token.metrics?.price_usd).toFixed(4);
  };

  const isBuy = tradeMode === "buy";

  const onConfirmClick = () => setShowConfirm(true);

  const performTrade = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setShowConfirm(false);
      setShowSuccess(true);
      setTradeAmount("");
      setTimeout(() => setShowSuccess(false), 700);
    }, 700);
  };

  return (
    <CustomCard className="h-full flex flex-col">
      <SectionHeader icon={<DollarSign />} title="Trade" />

      <div className="relative bg-slate-950/50 p-1 rounded-lg flex mb-4">
        {["buy", "sell"].map((mode) => (
          <button
            key={mode}
            onClick={() => setTradeMode(mode)}
            className="relative flex-1 py-2 text-sm font-semibold text-center transition rounded-md z-10"
          >
            {tradeMode === mode && (
              <motion.div
                layoutId="trade-mode-active"
                className={`absolute inset-0 rounded-md ${
                  mode === "buy" ? "bg-emerald-600/80" : "bg-red-600/80"
                }`}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative text-white">
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3 flex-grow flex flex-col">
        <div className="p-3 bg-slate-950/50 rounded-md border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>{isBuy ? "You Pay" : "You Sell"}</span>
            <span>
              Balance:{" "}
              {isBuy
                ? `${userBalance.toLocaleString()} USD`
                : `${userTokenBalance.toLocaleString()} ${
                    token.project?.symbol
                  }`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-2xl font-bold text-white outline-none"
            />
            <span className="font-semibold text-slate-300">
              {isBuy ? "USD" : token.project?.symbol}
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/50 rounded-md border border-slate-800">
          <p className="text-xs text-slate-400 mb-1">You Receive (Estimated)</p>
          <div className="flex items-center gap-2">
            <p className="w-full bg-transparent text-2xl font-bold text-white">
              {calculateReceiveAmount()}
            </p>
            <span
              className={`font-semibold ${
                isBuy ? "text-emerald-400" : "text-slate-300"
              }`}
            >
              {isBuy ? token.project?.symbol : "USD"}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirmClick}
          disabled={!tradeAmount || processing}
          className={`w-full mt-auto font-bold py-3 rounded-md transition-all duration-200 flex items-center justify-center gap-2 text-base ${
            isBuy
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-red-600 hover:bg-red-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {processing ? (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Loader2 className="w-5 h-5" />
            </motion.div>
          ) : (
            <Shield className="w-5 h-5" />
          )}
          {processing ? "Processing..." : `Confirm ${isBuy ? "Buy" : "Sell"}`}
        </motion.button>
      </div>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={`Confirm ${isBuy ? "Buy" : "Sell"}`}
      >
        <p className="text-slate-300 mb-3">
          You're about to {isBuy ? "spend" : "sell"}{" "}
          <strong className="text-white">{tradeAmount || "0.00"}</strong>{" "}
          {isBuy ? "USD" : token.project?.symbol}. This action cannot be undone.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 py-2 rounded-md bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={performTrade}
            className="px-3 py-2 rounded-md bg-blue-600"
          >
            {processing ? "Processing..." : "Proceed"}
          </button>
        </div>
      </Modal>

      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Trade Successful"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-600/20">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold">
              {isBuy ? "Buy" : "Sell"} completed
            </p>
            <p className="text-slate-400 text-sm">
              {tradeAmount || "0.00"}{" "}
              {isBuy ? "USD spent" : token.project?.symbol + " sold"}
            </p>
          </div>
        </div>
      </Modal>
    </CustomCard>
  );
};

// CommunityChat (unchanged except uses token.comments)
const CommunityChat = ({ token, comment, setComment, className = "" }) => {
  if (!token) return null;
  const handleSubmitComment = () => {
    if (comment.trim() === "") return;
    // For now: local mock behavior — later replace with Supabase insert call
    alert(`Comment submitted: "${comment}". (Mock action)`);
    setComment("");
  };

  return (
    <CustomCard className={`flex flex-col ${className}`}>
      <SectionHeader icon={<MessageCircle />} title="Community" />
      <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-0 h-[300px] lg:h-auto">
        {token.comments?.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0 flex items-center justify-center text-sm font-bold">
              {c.wallet?.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">
                <a
                  href={getExplorerLink(c.wallet)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  {shortenAddress(c.wallet)}
                </a>
              </p>
              <div className="bg-slate-950/50 p-2 rounded-md text-sm text-white">
                {c.text}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-blue-400/10">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
          placeholder="Join the conversation..."
          className="flex-1 p-2 bg-slate-950/50 rounded-md border border-blue-400/8 text-white placeholder-slate-500 outline-none text-sm"
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmitComment}
          disabled={comment.trim() === ""}
          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>
    </CustomCard>
  );
};

// ChartAndActivity (unchanged; uses token.metrics.recent_trades)
const ChartAndActivity = ({ token, address, className = "" }) => {
  if (!token) return null;
  const ALL_TRADES = token.metrics.recent_trades || [];

  return (
    <CustomCard className={`flex flex-col ${className}`}>
      <div>
        <SectionHeader icon={<BarChart3 />} title="Live Price Chart" />
        <div className="w-full h-[450px] bg-slate-950/50 rounded-md overflow-hidden">
          <iframe
            src={`https://dexscreener.com/ethereum/${address}?embed=1&theme=dark&trades=0&info=0`}
            className="w-full h-full"
            frameBorder="0"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col flex-grow">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">
            Recent Transactions
          </h2>
        </div>

        <div className="flex-grow min-h-0 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-2 custom-scrollbar h-[300px] lg:h-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-2 font-semibold">Type</th>
                <th className="p-2 font-semibold">
                  Amount ({token.project.symbol})
                </th>
                <th className="p-2 font-semibold hidden sm:table-cell">
                  Price (USD)
                </th>
                <th className="p-2 font-semibold text-right">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {ALL_TRADES.map((tr, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-800 last:border-none hover:bg-slate-900/50 transition-colors"
                >
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        tr.type === "buy"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {tr.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 text-white font-semibold">
                    {tr.amount.toLocaleString()}
                  </td>
                  <td className="p-2 text-slate-300 hidden sm:table-cell">
                    ${tr.price.toFixed(6)}
                  </td>
                  <td className="p-2 text-right text-slate-400 font-mono text-xs">
                    <a
                      href={getExplorerLink(tr.from)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors"
                    >
                      {shortenAddress(tr.from)}
                    </a>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {ALL_TRADES.length === 0 && (
            <p className="text-center text-slate-500 py-6">
              No recent trades found.
            </p>
          )}
        </div>
      </div>
    </CustomCard>
  );
};

// =========================================================================
// --- Main component: Single-page TokenDetail ---
// =========================================================================
export default function TokenDetail() {
  const { address } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  // mobile view segmentation
  const [mobileView, setMobileView] = useState("overview");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (!address) {
          setToken(null);
          setLoading(false);
          return;
        }
        const param = address.toString().toLowerCase();
        const { data: normalized, error } = await fetchTokenByAddress(param);
        if (error) {
          console.error("Supabase fetch token error:", error);
          // keep showing fallback "not found" behavior
          setToken(null);
        } else if (!normalized) {
          setToken(null);
        } else {
          const mapped = mapRowToUI(normalized);
          if (mounted) setToken(mapped);
        }
      } catch (err) {
        console.error("Unexpected token load error:", err);
        setToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-400 mx-auto" />
          <p className="text-slate-400 mt-3">Loading token data...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Token not found in the database.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-md"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <AuroraBackground />

      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-blue-400/8"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.06 }}
              onClick={() => navigate("/")}
              className="p-2 bg-slate-800/70 rounded-md hover:bg-blue-500/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            <div className="hidden lg:flex flex-col">
              <h1 className="text-lg font-semibold">
                {token.project?.name}{" "}
                <span className="text-slate-400 font-mono text-sm">
                  ({token.project?.symbol})
                </span>
              </h1>
            </div>
          </div>

          <div className="lg:hidden">
            <div className="bg-slate-900/80 backdrop-blur rounded-md p-1 flex gap-1">
              {[
                { id: "overview", label: "Overview" },
                { id: "chart", label: "Chart" },
                { id: "holders", label: "Holders" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMobileView(m.id)}
                  className={`px-3 py-1 rounded-md text-sm font-semibold ${
                    mobileView === m.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="hidden lg:block">
          <CompactInfo token={token} />

          <div className="grid grid-cols-12 gap-6 mt-6">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              <ChartAndActivity
                token={token}
                address={token.project?.token_address}
                className="flex-grow"
              />
              <CommunityChat
                token={token}
                comment={comment}
                setComment={setComment}
                className="flex-grow"
              />
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <TradeCard token={token} />

              <CustomCard>
                <SectionHeader icon={<Zap />} title="Key Metrics" />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Market Cap",
                      value: formatCurrency(token.metrics?.market_cap),
                    },
                    {
                      label: "24h Vol",
                      value: formatCurrency(token.metrics?.volume_24h_usd),
                    },
                    {
                      label: "Holders",
                      value:
                        token.metrics?.holders !== undefined
                          ? token.metrics?.holders?.toLocaleString()
                          : "N/A",
                    },
                    {
                      label: "Liquidity",
                      value: formatCurrency(token.metrics?.liquidity_usd),
                    },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="p-2 bg-slate-900/60 rounded-md text-center border border-slate-800 text-xs"
                    >
                      <p className="text-slate-400 truncate">{m.label}</p>
                      <p className="text-white font-semibold text-sm mt-1">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              </CustomCard>

              <CustomCard>
                <SectionHeader icon={<Info />} title="About" />
                <p className="text-slate-400 text-sm leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  {token.project?.description}
                </p>
              </CustomCard>

              <TokenHoldersList
                token={token}
                isMobile={false}
                className="flex-grow"
              />
            </div>
          </div>
        </div>

        <div className="block lg:hidden space-y-4">
          {mobileView === "overview" && (
            <div className="space-y-4">
              <CompactInfo token={token} />
              <CustomCard>
                <SectionHeader icon={<Info />} title="About" />
                <p className="text-slate-400 text-sm leading-relaxed">
                  {token.project?.description}
                </p>
              </CustomCard>
              <TradeCard token={token} />
            </div>
          )}

          {mobileView === "chart" && (
            <div className="space-y-4">
              <ChartAndActivity
                token={token}
                address={token.project?.token_address}
              />
            </div>
          )}

          {mobileView === "holders" && (
            <div className="space-y-4">
              <TokenHoldersList token={token} isMobile={true} />
              <CommunityChat
                token={token}
                comment={comment}
                setComment={setComment}
              />
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.45);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.75);
        }
        @keyframes aurora {
          from {
            transform: translate(-50%, -33%) rotate(0deg);
          }
          50% {
            transform: translate(-50%, -33%) rotate(180deg);
          }
          to {
            transform: translate(-50%, -33%) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
