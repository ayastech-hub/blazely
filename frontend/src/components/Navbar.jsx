// src/components/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Twitter,
  Send,
  BookOpen,
  Search,
  Plus,
  Wallet,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import Logo from "./Logo";
import { ConnectKitButton } from "connectkit";
import { supabase } from "../lib/supabaseClient";
import { useWallet } from "../context/WalletContext";

/* ---------- Helpers (modified layout styling alignment) ---------- */
const getAvatarUrl = (addr = "") =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
    (addr || "").toLowerCase()
  )}`;

const formatAddress = (address = "") =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

const formatMarketCap = (cap = 0) => {
  if (cap >= 1000000) return `$${(cap / 1000000).toFixed(2)}M`;
  if (cap >= 1000) return `$${(cap / 1000).toFixed(2)}K`;
  return `$${Number(cap || 0).toFixed(2)}`;
};

/* ---------- Vector Discord Icon (Online Standard Reference Link) ---------- */
const DiscordIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 127.14 96.36"
    role="img"
    fill="currentColor"
    {...props}
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.51,2.95-2.31A75.31,75.31,0,0,0,96,78.2c1,.8,2,1.58,3,2.31a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.54-18.83C129.9,49.52,123.75,26.74,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

/* ---------- Nav & social links ---------- */
const navLinks = [
  { name: "Home", path: "/", end: true },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Bridge", path: "/bridge" },
  { name: "Locking", path: "/locking" }, // Added the Locking Token feature route link
  { name: "Profile", path: "/profile" },
];
const socialLinks = [
  { name: "Twitter", href: "https://twitter.com", icon: Twitter },
  { name: "Telegram", href: "https://t.me", icon: Send },
  { name: "Discord", href: "https://discord.gg", icon: DiscordIcon },
  { name: "Docs", href: "https://docs.example.com", icon: BookOpen },
];

const Navbar = ({ onSearchChange = () => {} }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ tokens: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tokens");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(""); 
  const { connectWallet, isAuthenticated, isAuthenticating } = useWallet();

  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [mobileOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus?.(), 80);
      setSearchResults({ tokens: [], users: [] });
      setQuery("");
      setLoading(false);
      setErrorMsg("");
      setCopiedAddress("");
    }
  }, [searchOpen]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults({ tokens: [], users: [] });
      setLoading(false);
      setErrorMsg("");
      return;
    }
    debounceRef.current = setTimeout(() => fetchSupabaseData(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(""), 1400);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const fetchSupabaseData = useCallback(
    async (searchQuery) => {
      if (!searchQuery || !searchQuery.trim()) return;
      setLoading(true);
      setErrorMsg("");
      let tokenData = [];
      let userData = [];
      try {
        const ilikePattern = `%${searchQuery}%`;
        const { data: tokens, error: tokenError } = await supabase
          .from("tokens")
          .select("symbol, address, logo_url, market_cap")
          .or(
            `symbol.ilike.${ilikePattern},address.ilike.${ilikePattern},name.ilike.${ilikePattern}`
          )
          .order("market_cap", { ascending: false, nulls: "last" })
          .limit(10);
        if (tokenError) throw tokenError;
        tokenData = tokens || [];
      } catch (err) {
        console.error("Tokens search error:", err);
        setErrorMsg("Failed to fetch tokens.");
      }

      try {
        const ilikePattern = `%${searchQuery}%`;
        const { data: users, error: userError } = await supabase
          .from("users")
          .select("wallet, display_name")
          .or(`display_name.ilike.${ilikePattern},wallet.ilike.${ilikePattern}`)
          .limit(5);
        if (userError) throw userError;
        userData = users || [];
      } catch (err) {
        console.error("Users search error:", err);
        setErrorMsg((prev) =>
          prev ? prev + " Users fetch failed." : "Failed to fetch users."
        );
      }

      setSearchResults({ tokens: tokenData, users: userData });

      if ((tokenData?.length || 0) === 0 && (userData?.length || 0) > 0)
        setActiveTab("users");

      setLoading(false);
    },
    [setActiveTab]
  );

  const handleSubmitSearch = (e) => {
    e?.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) fetchSupabaseData(query.trim());
    else setSearchResults({ tokens: [], users: [] });
  };

  const getNavLinkClass = ({ isActive }) =>
    `relative px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
      isActive
        ? "text-[#96d6cd] bg-[#96d6cd]/5 border border-[#96d6cd]/20"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
    }`;

  const getMobileLinkClass = (path, end) => {
    const isActive = end
      ? location.pathname === path
      : location.pathname.startsWith(path);
    return (
      `flex items-center justify-start p-3 rounded font-bold uppercase tracking-wider text-xs transition-colors duration-150 ` +
      (isActive
        ? "text-[#96d6cd] bg-[#96d6cd]/10 border-l-2 border-[#96d6cd]"
        : "text-slate-300 hover:bg-slate-900/50")
    );
  };

  const renderResults = () => {
    const tokens = searchResults.tokens || [];
    const users = searchResults.users || [];
    const hasResults = tokens.length > 0 || users.length > 0;
    const activeData = activeTab === "tokens" ? tokens : users;

    if (loading)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#96d6cd] mb-4" />
          <p className="text-xs font-mono tracking-widest uppercase">Querying Matrix Database...</p>
        </div>
      );

    if (errorMsg)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-rose-400 py-12 font-mono text-xs uppercase tracking-wider">
          <X size={32} className="mb-3 opacity-60" />
          <p>Search Context Interrupted</p>
          <p className="text-slate-500 mt-1 text-[10px]">{errorMsg}</p>
        </div>
      );

    if (query.trim() === "")
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
          <Search size={32} className="text-slate-800 mb-3" />
          <p className="text-xs text-slate-500 font-mono max-w-sm uppercase tracking-wide leading-relaxed">
            Input token identifier, address registry, or alias key.
          </p>
        </div>
      );

    if (!hasResults)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-12 font-mono text-xs uppercase tracking-wider">
          <X size={32} className="text-rose-500/40 mb-3" />
          <p>Sequence Terminated.</p>
          <span className="text-[10px] text-slate-600 mt-1">Zero cross-references located for "{query}"</span>
        </div>
      );

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex border-b border-slate-900 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("tokens")}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "tokens" ? "bg-[#96d6cd]/10 text-[#96d6cd]" : "text-slate-500 hover:text-slate-300"}`}
          >
            Tokens ({tokens.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "users" ? "bg-[#96d6cd]/10 text-[#96d6cd]" : "text-slate-500 hover:text-slate-300"}`}
          >
            Users ({users.length})
          </button>
        </div>

        <div className="mt-3 space-y-1 overflow-y-auto pr-1 max-h-[350px] scrollbar-thin scrollbar-thumb-slate-800">
          {activeData.map((item, index) => {
            const address = item.address || item.wallet || "";
            const avatarSrc = item.logo_url || getAvatarUrl(address);
            const isToken = activeTab === "tokens";
            const formattedCA = formatAddress(address);

            return (
              <div
                key={index}
                className="flex items-center p-2 rounded border border-transparent hover:border-slate-900 hover:bg-[#030712]/50 transition-all duration-150"
              >
                <Link
                  to={`/${isToken ? `token/${address}` : `user/${address}`}`}
                  className="flex items-center flex-1 gap-3 min-w-0"
                  onClick={() => setSearchOpen(false)}
                  style={{ textDecoration: "none" }}
                >
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-8 h-8 rounded bg-slate-900 object-cover border border-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-bold text-xs truncate">
                      {isToken ? item.symbol : item.display_name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {isToken ? `CA: ${formattedCA}` : formattedCA}
                      </p>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyToClipboard(address);
                        }}
                        className="p-0.5 rounded hover:bg-slate-900"
                      >
                        {copiedAddress === address ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} className="text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isToken && (
                    <div className="flex flex-col items-end ml-4">
                      <p className="text-[10px] font-mono text-emerald-400/90 whitespace-nowrap bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                        {formatMarketCap(item.market_cap)}
                      </p>
                    </div>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  
              
          return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#030712] border-b border-slate-900/60 shadow-lg">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Core Placement */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            
            {/* 3. REPLACE THE OLD <img /> ACCENT WITH YOUR COMPONENT: */}
            <Logo 
              size={28} 
              className="transform group-hover:rotate-6 transition-transform duration-200" 
            />
            
            <span 
              className="font-black text-sm uppercase tracking-widest transition-colors duration-200"
              style={{ color: '#96d6cd' }}
            >
              Blazely
            </span>
          </Link>

          {/* Desktop Links View */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.end}
                className={getNavLinkClass}
              >
                {link.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Action Blocks Deck */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:inline-flex p-2 rounded hover:bg-slate-900 transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Open search"
          >
            <Search size={15} />
          </button>

          <Link
            to="/create"
            style={{ backgroundColor: '#96d6cd' }}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[#030712] font-bold uppercase tracking-wider text-[11px] hover:opacity-90 transition-all"
            aria-label="Create new token"
          >
            <Plus size={12} />
            <span>Launch Asset</span>
          </Link>

          <div className="hidden md:block">
            <ConnectKitButton.Custom>
              {({ isConnected, show, address, ensName }) => {
                const displayAddress =
                  ensName || address
                    ? `${address.slice(0, 6)}...${address?.slice(-4)}`
                    : "Initialize Node";

                return (
                  <button
                    disabled={isAuthenticating}
                    onClick={async () => {
                      if (!isConnected) {
                        show();
                        return;
                      }
                      if (!isAuthenticated) {
                        await connectWallet();
                      }
                    }}
                    className="px-3 py-1.5 rounded bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                  >
                    <Wallet size={13} className="text-slate-500" />
                    <span className={isAuthenticated ? "font-mono text-[#96d6cd]" : ""}>
                      {isAuthenticating ? "Signing Core…" : displayAddress}
                    </span>
                  </button>
                );
              }}
            </ConnectKitButton.Custom>
          </div>

          {/* Handheld Responsive Command Triggers */}
          <div className="flex items-center lg:hidden gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded text-slate-400 hover:text-slate-200"
              aria-label="Open search"
            >
              <Search size={16} />
            </button>

            <button
              onClick={() => setMobileOpen((s) => !s)}
              aria-label="Toggle menu"
              className="p-2 rounded text-slate-400 hover:text-slate-200"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE FULL SOLID INTERFACE SLIDEOUT DRAWER */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-[#030712]/95 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[280px] max-w-[80vw] h-full bg-[#0b0f19] border-l border-slate-900 p-5 flex flex-col z-50 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-900">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Navigation Deck</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5">
              {[...navLinks, { name: "Launch Asset", path: "/create" }].map(
                (link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={getMobileLinkClass(link.path, link.end)}
                  >
                    <span>{link.name}</span>
                  </Link>
                )
              )}
            </nav>

            {/* Mobile Account Accessor Node */}
            <div className="pt-4 border-t border-slate-900">
              <ConnectKitButton.Custom>
                {({ isConnected, show, address, ensName }) => {
                  const displayAddress =
                    ensName || address
                      ? `${address.slice(0, 6)}...${address?.slice(-4)}`
                      : "Initialize Node";
                  return (
                    <button
                      onClick={show}
                      className="w-full px-4 py-2.5 rounded bg-[#030712] border border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                    >
                      <Wallet size={14} className="text-slate-500" />
                      <span className={isConnected ? "font-mono text-[#96d6cd]" : ""}>
                        {displayAddress}
                      </span>
                    </button>
                  );
                }}
              </ConnectKitButton.Custom>
            </div>

            {/* Micro Social Network Anchors */}
            <div className="mt-5 grid grid-cols-4 gap-2 pt-4 border-t border-slate-900/60">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded bg-[#030712] border border-slate-900 text-slate-400 hover:text-[#96d6cd] transition-all"
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATRIX SEARCH OPAQUE OVERLAY SYSTEM */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-3 sm:p-4 md:p-6 lg:p-12">
          <div
            className="absolute inset-0 bg-[#030712]"
            onClick={() => setSearchOpen(false)}
            aria-hidden="true"
          />
          <form
            onSubmit={handleSubmitSearch}
            className="relative w-full max-w-3xl max-h-[80vh] bg-[#0b0f19] border border-slate-900 rounded-lg p-4 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-3 w-full border-b border-slate-900 pb-3 mb-2">
              <Search className="text-slate-500 w-5 h-5" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query asset metrics, network key, creator block..."
                className="flex-1 bg-transparent outline-none text-slate-100 text-sm font-medium placeholder:text-slate-700"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchResults({ tokens: [], users: [] });
                  if (query.trim() === "") setSearchOpen(false);
                }}
                className="p-1 text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            {renderResults()}
          </form>
        </div>
      )}
    </header>
  );
};

export default Navbar;
