// src/components/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { ACCENT, GLASS } from "./ui/GlassCard";
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
  ArrowRight,
} from "lucide-react";
import Logo from "./Logo";
import { ConnectKitButton } from "connectkit";
import { supabase } from "../lib/supabaseClient";
import { useWallet } from "../context/WalletContext";

/* ============================================================
   Design tokens
   Liquid-glass spec (single layer, per Apple HIG guidance):
   - backdrop-blur ~32px, saturate ~160%, brightness ~105%
   - tint: white 6–10% on dark surfaces
   - one specular highlight along the top edge only
   - interactive controls sit on SOLID nested fills, never on
     raw glass, so contrast and hit targets stay predictable
   ============================================================ */

const SpecularEdge = () => (
  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
);

/* ---------- Discord icon ---------- */
const DiscordIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" role="img" fill="currentColor" {...props}>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.51,2.95-2.31A75.31,75.31,0,0,0,96,78.2c1,.8,2,1.58,3,2.31a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.54-18.83C129.9,49.52,123.75,26.74,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

/* ---------- Helpers ---------- */
const getAvatarUrl = (addr = "") =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent((addr || "").toLowerCase())}`;

const formatAddress = (address = "") => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "");

const formatMarketCap = (cap = 0) => {
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
  if (cap >= 1_000) return `$${(cap / 1_000).toFixed(2)}K`;
  return `$${Number(cap || 0).toFixed(2)}`;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/.test(navigator.platform || "");

/* ---------- Nav & social links ---------- */
const navLinks = [
  { name: "Home", path: "/", end: true },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Bridge", path: "/bridge" },
  { name: "Locking", path: "/locking" },
  { name: "Bounty", path: "/bounty" },
  { name: "Profile", path: "/profile" },
];
const socialLinks = [
  { name: "Twitter", href: "https://twitter.com", icon: Twitter },
  { name: "Telegram", href: "https://t.me", icon: Send },
  { name: "Discord", href: "https://discord.gg", icon: DiscordIcon },
  { name: "Docs", href: "https://docs.example.com", icon: BookOpen },
];

/* ============================================================
   Component
   ============================================================ */
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

  /* Lock scroll while an overlay is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [mobileOpen, searchOpen]);

  /* Reset + focus search on open */
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

  /* Global shortcuts: Cmd/Ctrl+K or "/" opens search, Esc closes overlays */
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "/" && !typing && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
        else if (mobileOpen) setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, mobileOpen]);

  /* Debounced live search */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchSupabaseData = useCallback(async (searchQuery) => {
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
        .or(`symbol.ilike.${ilikePattern},address.ilike.${ilikePattern},name.ilike.${ilikePattern}`)
        .order("market_cap", { ascending: false, nulls: "last" })
        .limit(10);
      if (tokenError) throw tokenError;
      tokenData = tokens || [];
    } catch (err) {
      console.error("Tokens search error:", err);
      setErrorMsg("Something went wrong loading tokens.");
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
      setErrorMsg((prev) => (prev ? prev + " Wallets failed to load too." : "Something went wrong loading wallets."));
    }

    setSearchResults({ tokens: tokenData, users: userData });
    if ((tokenData?.length || 0) === 0 && (userData?.length || 0) > 0) setActiveTab("users");
    setLoading(false);
  }, []);

  const handleSubmitSearch = (e) => {
    e?.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) fetchSupabaseData(query.trim());
    else setSearchResults({ tokens: [], users: [] });
  };

  const getNavLinkClass = ({ isActive }) =>
    `relative px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-wide transition-all duration-200 ${
      isActive ? "text-[var(--bg)] bg-[var(--teal)]" : "text-[var(--text-mid)] hover:text-white hover:bg-white/[0.08]"
    }`;

  const getMobileLinkClass = (path, end) => {
    const isActive = end ? location.pathname === path : location.pathname.startsWith(path);
    return `flex items-center justify-between p-3.5 rounded-xl text-sm font-semibold transition-colors duration-150 ${
      isActive ? "text-[var(--bg)] bg-[var(--teal)]" : "text-[var(--text-bright-2)] hover:bg-white/[0.06]"
    }`;
  };

  const shortcutHint = useMemo(() => (isMac ? "⌘K" : "Ctrl K"), []);

  const renderResults = () => {
    const tokens = searchResults.tokens || [];
    const users = searchResults.users || [];
    const hasResults = tokens.length > 0 || users.length > 0;
    const activeData = activeTab === "tokens" ? tokens : users;

    if (loading)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-mid-2)] py-14">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/10 border-t-[var(--teal)] mb-4" />
          <p className="text-sm text-[var(--text-mid-2)]">Searching…</p>
        </div>
      );

    if (errorMsg)
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-14 text-center px-6">
          <div className="w-9 h-9 rounded-full bg-[var(--rose)]/10 border border-[var(--rose)]/20 flex items-center justify-center mb-3">
            <X size={16} className="text-[var(--rose)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-bright-2)]">Search is unavailable</p>
          <p className="text-[var(--text-faint-2)] mt-1 text-xs max-w-xs">{errorMsg} Try again in a moment.</p>
        </div>
      );

    if (query.trim() === "")
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-14 text-center px-6">
          <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-3">
            <Search size={15} className="text-[var(--text-faint-2)]" />
          </div>
          <p className="text-sm text-[var(--text-mid)] font-medium">Search tokens or wallets</p>
          <p className="text-xs text-[var(--text-faint-2)] mt-1 max-w-xs">Type a name, ticker, or paste an address to get started.</p>
        </div>
      );

    if (!hasResults)
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-14 text-center px-6">
          <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-3">
            <Search size={15} className="text-[var(--border-mid)]" />
          </div>
          <p className="text-sm text-[var(--text-mid)] font-medium">No results for "{query}"</p>
          <p className="text-xs text-[var(--text-faint-2)] mt-1">Check the spelling or try a full address.</p>
        </div>
      );

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex gap-1 px-1 pb-3">
          {[
            { key: "tokens", label: "Tokens", count: tokens.length },
            { key: "users", label: "Wallets", count: users.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key ? "bg-white/[0.08] text-white" : "text-[var(--text-faint-2)] hover:text-[var(--text-mid)]"
              }`}
            >
              {tab.label} <span className="text-[var(--text-faint-2)] font-normal">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="space-y-0.5 overflow-y-auto pr-1 max-h-[360px]">
          {activeData.map((item, index) => {
            const address = item.address || item.wallet || "";
            const avatarSrc = item.logo_url || getAvatarUrl(address);
            const isToken = activeTab === "tokens";
            const formattedCA = formatAddress(address);

            return (
              <div
                key={index}
                className="flex items-center rounded-xl hover:bg-white/[0.05] transition-colors duration-150"
              >
                <Link
                  to={`/${isToken ? `token/${address}` : `user/${address}`}`}
                  className="flex items-center flex-1 gap-3 min-w-0 p-2.5"
                  onClick={() => setSearchOpen(false)}
                >
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-9 h-9 rounded-lg bg-white/[0.05] object-cover border border-white/[0.08] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-bright)] font-semibold text-sm truncate">
                      {isToken ? item.symbol : item.display_name || "Unnamed wallet"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] text-[var(--text-faint-2)] font-mono truncate">{formattedCA}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyToClipboard(address);
                        }}
                        className="p-0.5 rounded hover:bg-white/10 shrink-0"
                        aria-label="Copy address"
                      >
                        {copiedAddress === address ? (
                          <Check size={11} className="text-[var(--green-2)]" />
                        ) : (
                          <Copy size={11} className="text-[var(--border-mid)] hover:text-[var(--text-mid-2)]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isToken && (
                    <span className="shrink-0 text-[11px] font-mono font-semibold text-[var(--green-2)] bg-[var(--green)]/10 px-2 py-1 rounded-md border border-[var(--green)]/20">
                      {formatMarketCap(item.market_cap)}
                    </span>
                  )}
                  <ArrowRight size={13} className="text-[var(--border-hi)] shrink-0" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      {/* ============ Floating glass island ============ */}
      <div className="mx-auto max-w-[1440px]">
        <div className={`relative flex items-center justify-between h-[60px] px-3 sm:px-4 rounded-[20px] ${GLASS}`}>
          <SpecularEdge />

          {/* Brand + desktop nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <Logo size={36} className="transition-transform duration-200 group-hover:scale-105" />
              <span
                className="hidden sm:block font-black text-[15px] tracking-tight transition-colors duration-200 group-hover:text-white"
                style={{ fontFamily: "'Fraunces', Georgia, serif", color: ACCENT }}
              >
                Blazely
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-[var(--bg)]/20 border border-white/[0.06]">
              {navLinks.map((link) => (
                <NavLink key={link.name} to={link.path} end={link.end} className={getNavLinkClass}>
                  {link.name}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Search trigger — solid nested fill, not raw glass */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-full bg-[var(--bg)]/25 border border-white/[0.08] text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] hover:border-white/[0.14] transition-all duration-200 w-48"
              aria-label="Search"
            >
              <Search size={14} />
              <span className="text-[13px]">Search…</span>
              <kbd className="ml-auto text-[10px] font-mono font-semibold text-[var(--text-faint-2)] bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5">
                {shortcutHint}
              </kbd>
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-full text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] hover:bg-white/[0.06]"
              aria-label="Search"
            >
              <Search size={17} />
            </button>

            <Link
              to="/create"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[var(--bg)] font-bold text-[12px] tracking-wide hover:brightness-105 active:scale-[0.97] transition-all duration-150 shadow-[0_2px_12px_-2px_rgba(150,214,205,0.5)]"
              style={{ backgroundColor: ACCENT }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Launch token
            </Link>

            <div className="hidden md:block">
              <ConnectKitButton.Custom>
                {({ isConnected, show, address, ensName }) => {
                  const displayAddress = ensName || (address ? formatAddress(address) : "Connect wallet");
                  return (
                    <button
                      disabled={isAuthenticating}
                      onClick={async () => {
                        if (!isConnected) return show();
                        if (!isAuthenticated) await connectWallet();
                      }}
                      className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-[var(--bg)]/25 border border-white/[0.08] text-[var(--text-mid)] hover:border-white/[0.16] hover:text-white text-[13px] font-semibold transition-all duration-200 disabled:opacity-60"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: isAuthenticated ? `${ACCENT}22` : "rgba(255,255,255,0.06)" }}
                      >
                        <Wallet size={12} className={isAuthenticated ? "" : "text-[var(--text-faint-2)]"} style={isAuthenticated ? { color: ACCENT } : undefined} />
                      </span>
                      <span className={isAuthenticated ? "font-mono" : ""} style={isAuthenticated ? { color: ACCENT } : undefined}>
                        {isAuthenticating ? "Connecting…" : displayAddress}
                      </span>
                    </button>
                  );
                }}
              </ConnectKitButton.Custom>
            </div>

            {/* Mobile triggers */}
            <div className="flex items-center lg:hidden gap-1">
              <button
                onClick={() => setMobileOpen((s) => !s)}
                aria-label="Toggle menu"
                className="p-2 rounded-full text-[var(--text-mid)] hover:text-white hover:bg-white/[0.06]"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Mobile drawer ============ */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-[min(100vw,320px)] flex flex-col bg-[var(--panel)] shadow-[-8px_0_32px_rgba(0,0,0,0.5)]"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[15px] font-semibold text-[var(--text-bright)]">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-full text-[var(--text-mid-2)] hover:text-[var(--text-bright)] hover:bg-[var(--panel-raised)]"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={getMobileLinkClass(link.path, link.end)}
                >
                  <span>{link.name}</span>
                </Link>
              ))}
              <Link
                to="/create"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm font-semibold text-[var(--bg)] bg-[var(--teal)] mt-2"
              >
                Create token
              </Link>
            </nav>

            <div className="px-4 pt-3 space-y-3 border-t border-[var(--border)]/40">
              <ConnectKitButton.Custom>
                {({ isConnected, show, address, ensName }) => {
                  const displayAddress = ensName || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet");
                  return (
                    <button
                      type="button"
                      onClick={show}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[var(--panel-raised)] text-[var(--text-bright)]"
                    >
                      <Wallet size={14} className="text-[var(--text-faint-2)]" />
                      <span className={isConnected ? "font-mono" : ""} style={isConnected ? { color: ACCENT } : undefined}>
                        {displayAddress}
                      </span>
                    </button>
                  );
                }}
              </ConnectKitButton.Custom>

              <div className="grid grid-cols-4 gap-2 pb-1">
                {socialLinks.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-[var(--panel-raised)] text-[var(--text-mid-2)] hover:text-[var(--teal)] transition-colors"
                  >
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Search — solid scrim + one glass panel (no stacked transparency) ============ */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex justify-center pt-20 sm:pt-28 px-3">
          <div className="absolute inset-0 bg-[var(--bg)]/85" onClick={() => setSearchOpen(false)} aria-hidden="true" />
          <form
            onSubmit={handleSubmitSearch}
            className={`relative w-full max-w-xl max-h-[75vh] ${GLASS} rounded-[22px] p-3 flex flex-col overflow-hidden`}
          >
            <SpecularEdge />
            <div className="flex items-center gap-3 w-full px-2 pb-3 mb-1 border-b border-white/[0.08]">
              <Search className="text-[var(--text-faint-2)] w-4 h-4 shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tokens, wallets, or paste an address…"
                className="flex-1 bg-transparent outline-none text-[var(--text-bright)] text-sm placeholder:text-[var(--border-mid)]"
              />
              <kbd className="hidden sm:block text-[10px] font-mono text-[var(--text-faint-2)] bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 shrink-0">
                Esc
              </kbd>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 text-[var(--text-faint-2)] hover:text-[var(--text-mid)] shrink-0"
                aria-label="Close search"
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
