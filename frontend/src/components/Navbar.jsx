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
} from "lucide-react";
import blazelyLogo from "../assets/blazely-logo.png";
import { ConnectKitButton } from "connectkit";
import { supabase } from "../lib/supabaseClient";
import { useWallet } from "../context/WalletContext";

/* ---------- Helpers (modified) ---------- */
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

/* ---------- Small inline DiscordIcon ---------- */
const DiscordIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M20.317,4.485c-0.843-0.512-1.762-0.913-2.738-1.181c-0.08-0.024-0.164-0.038-0.25-0.038c-0.194,0-0.38,0.061-0.528,0.178 c-0.551,0.43-0.988,0.963-1.32,1.59c-1.398-0.293-2.822-0.293-4.22,0C10.932,4.996,10.495,4.463,9.944,4.033 c-0.148-0.117-0.334-0.178-0.528-0.178c-0.086,0-0.17,0.014-0.25,0.038C8.19,3.572,7.27,3.973,6.428,4.485 c-0.143,0.086-0.222,0.24-0.222,0.4c-0.002,0.322,0.043,0.643,0.134,0.959c-1.432,1.611-2.236,3.676-2.236,5.821 c0,4.469,2.83,8.232,6.588,9.261c0.141,0.038,0.283,0.013,0.404-0.065c0.121-0.078,0.203-0.203,0.22-0.341 c0.045-0.34,0.113-0.678,0.201-1.011c-0.574-0.229-1.117-0.528-1.612-0.89c-0.115-0.084-0.25-0.12-0.388-0.101 c-0.138,0.019-0.264,0.084-0.354,0.183c-1.2,1.309-2.793,2.02-4.444,2.02c-0.231,0-0.422-0.191-0.422-0.422 c0-0.211,0.157-0.389,0.363-0.418c0.822-0.114,1.604-0.393,2.321-0.817c0.126-0.074,0.205-0.205,0.215-0.347 c0.01-0.142-0.049-0.28-0.158-0.368C5.253,14.004,5.253,14.004,5.253,14c-0.404-0.34-0.778-0.72-1.112-1.134 c-0.093-0.114-0.24-0.169-0.389-0.15c-0.149,0.02-0.281,0.09-0.37,0.207c-0.297,0.395-0.57,0.81-0.81,1.238 c-0.05,0.088-0.131,0.15-0.226,0.174c-0.095,0.024-0.196,0.007-0.28-0.045c-0.422-0.26-0.81-0.564-1.16-0.906 C1.001,13.1,1,12.712,1,11.684c0-2.247,0.865-4.38,2.396-6.065C3.35,5.49,3.308,5.361,3.254,5.229 c-0.01-0.024-0.02-0.049-0.028-0.073c-0.002-0.005-0.003-0.01-0.005-0.015c-0.012-0.033-0.021-0.067-0.028-0.1 c-0.025-0.118-0.033-0.236-0.026-0.354c0.009-0.142,0.06-0.279,0.147-0.39c0.912-1.134,2.236-1.921,3.708-2.316 C7.458,1.905,7.91,1.83,8.366,1.83c1.47,0,2.916,0.329,4.22,0.939c1.52,0.708,2.784,1.789,3.708,3.172 c0.048,0.074,0.08,0.154,0.093,0.239c0.014,0.09,0.01,0.179-0.009,0.265c-0.067,0.296-0.18,0.581-0.334,0.85 c-0.06,0.104-0.078,0.23-0.047,0.347c0.031,0.117,0.108,0.214,0.215,0.27c0.887,0.465,1.693,1.042,2.396,1.733 c0.116,0.114,0.18,0.27,0.18,0.435c0,0.231-0.191,0.422-0.422,0.422c-1.651,0-3.244-0.711-4.444-2.02 c-0.09-0.099-0.216-0.164-0.354-0.183c-0.138-0.019-0.273,0.017-0.388,0.101c-0.495,0.362-1.038,0.661-1.612,0.89 c0.088,0.333,0.156,0.671,0.201,1.011c0.017,0.138,0.099,0.263,0.22,0.341c0.121,0.078,0.263,0.103,0.404,0.065 C20.17,19.916,23,16.153,23,11.684C23,9.539,22.196,7.474,20.764,5.864C20.855,5.543,20.9,5.222,20.898,4.885 C20.898,4.725,20.819,4.571,20.676,4.485z" />
  </svg>
);

/* ---------- Nav & social links ---------- */
const navLinks = [
  { name: "Home", path: "/", end: true },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Bridge", path: "/bridge" },
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
  const [copiedAddress, setCopiedAddress] = useState(""); // for search-result copy feedback
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Copy helper (used only inside search results)
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(""), 1400);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  // Supabase fetch (price removed from token select)
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

      // Only auto-switch to users if no tokens
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
    `relative px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 lg:hover:shadow-inner ${
      isActive
        ? "text-white lg:text-transparent lg:bg-clip-text lg:bg-gradient-to-r lg:from-cyan-400 lg:via-purple-400 lg:to-pink-400"
        : "text-slate-300 hover:text-white hover:bg-slate-800/40"
    }`;

  const getMobileLinkClass = (path, end) => {
    const isActive = end
      ? location.pathname === path
      : location.pathname.startsWith(path);
    return (
      `flex items-center justify-start p-3 rounded-lg font-medium transition-colors duration-200 ` +
      (isActive
        ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-slate-800/60"
        : "text-white hover:bg-slate-900/50")
    );
  };

  const renderResults = () => {
    const tokens = searchResults.tokens || [];
    const users = searchResults.users || [];
    const hasResults = tokens.length > 0 || users.length > 0;
    const activeData = activeTab === "tokens" ? tokens : users;

    if (loading)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4" />
          <p>Searching for {query}...</p>
        </div>
      );

    if (errorMsg)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-rose-400">
          <X size={48} className="mb-4" />
          <p className="text-lg">Search error</p>
          <p className="text-sm mt-2 text-slate-400">{errorMsg}</p>
        </div>
      );

    if (query.trim() === "")
      return (
        <div className="flex flex-col items-center justify-center flex-1">
          <Search size={64} className="text-purple-600/50" />
          <p className="mt-4 text-slate-500">
            Type a token symbol, name, or address and press
            <strong>Enter</strong> to search.
          </p>
        </div>
      );

    if (!hasResults)
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
          <X size={48} className="text-red-500/50 mb-4" />
          <p className="text-xl">Token or User not found.</p>
          <p className="text-sm mt-2 text-slate-500">
            No results for "{query}". Try another search term.
          </p>
        </div>
      );

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex border-b border-slate-800/70 p-1">
          <button
            onClick={() => setActiveTab("tokens")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "tokens" ? "bg-slate-800/60 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Tokens ({tokens.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "users" ? "bg-slate-800/60 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Users ({users.length})
          </button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {activeData.map((item, index) => {
            const address = item.address || item.wallet || "";
            const avatarSrc = item.logo_url || getAvatarUrl(address);
            const isToken = activeTab === "tokens";
            const formattedCA = formatAddress(address);

            return (
              <div
                key={index}
                className="flex items-center p-3 rounded-lg hover:bg-slate-800/40 transition-colors duration-150"
              >
                <Link
                  to={`/${isToken ? `token/${address}` : `user/${address}`}`} // <- user route fixed
                  className="flex items-center flex-1 gap-4 min-w-0"
                  onClick={() => setSearchOpen(false)}
                  style={{ textDecoration: "none" }}
                >
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-10 h-10 rounded-full bg-slate-700 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {isToken ? item.symbol : item.display_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-slate-400 truncate">
                        {isToken ? `CA: ${formattedCA}` : formattedCA}
                      </p>

                      {/* inline copy button (still present here) */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyToClipboard(address);
                        }}
                        title="Copy address"
                        className="p-1 rounded-md hover:bg-slate-700/50"
                      >
                        {copiedAddress === address ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isToken && (
                    <div className="flex flex-col items-end ml-4">
                      <p className="text-xs text-green-400 whitespace-nowrap">
                        Market Cap: {formatMarketCap(item.market_cap)}
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
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={blazelyLogo}
                alt="Blazely"
                className="w-10 h-10 rounded-lg shadow-sm transform transition-transform duration-300 hover:rotate-6"
              />
              <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                Blazely
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-4">
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

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex p-2 rounded-full hover:bg-slate-800/60 transition-colors text-slate-300"
              aria-label="Open search"
            >
              <Search size={18} />
            </button>

            <Link
              to="/create"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold shadow-md hover:scale-[1.01] transition-transform"
              aria-label="Create new token"
            >
              <Plus size={16} />
              <span className="text-sm">Create</span>
            </Link>

            <div className="hidden md:block">
              <ConnectKitButton.Custom>
                {({ isConnected, show, address, ensName }) => {
                  const displayAddress =
                    ensName || address
                      ? `${address.slice(0, 6)}...${address?.slice(-4)}`
                      : "Connect Wallet";

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
                      className="px-4 py-2 rounded-full bg-transparent text-white text-sm font-medium hover:bg-slate-800/40 flex items-center gap-2 transition-colors duration-200"
                    >
                      <Wallet size={16} />
                      <span className={isAuthenticated ? "font-mono" : ""}>
                        {isAuthenticating ? "Signing…" : displayAddress}
                      </span>
                    </button>
                  );
                }}
              </ConnectKitButton.Custom>
            </div>

            <div className="flex items-center lg:hidden gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 rounded-full hover:bg-slate-800/60 transition-colors text-slate-300"
                aria-label="Open search"
              >
                <Search size={18} />
              </button>

              <button
                onClick={() => setMobileOpen((s) => !s)}
                aria-label="Toggle menu"
                className="p-2 rounded-full hover:bg-slate-800/60 transition-colors text-slate-300"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 h-full w-[70vw] max-w-[70vw] bg-slate-950/95 backdrop-blur-lg border-r-[3px] border-r-purple-600/60 p-6 flex flex-col">
            <div className="flex items-center justify-end mb-6">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 text-white"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {[...navLinks, { name: "Create", path: "/create" }].map(
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

            <div className="mt-4 flex justify-center">
              <div className="w-full max-w-xs">
                <ConnectKitButton.Custom>
                  {({ isConnected, show, address, ensName }) => {
                    // MOBILE button now matches the desktop connect style (but full width)
                    const displayAddress =
                      ensName || address
                        ? `${address.slice(0, 6)}...${address?.slice(-4)}`
                        : "Connect Wallet";
                    return (
                      <button
                        onClick={show}
                        className="w-full px-4 py-3 rounded-full bg-transparent text-white text-sm font-medium hover:bg-slate-800/40 flex items-center justify-center gap-2"
                      >
                        <Wallet size={18} />
                        <span className={isConnected ? "font-mono" : ""}>
                          {displayAddress}
                        </span>
                      </button>
                    );
                  }}
                </ConnectKitButton.Custom>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/60"
                >
                  <s.icon className="w-4 h-4 text-slate-300" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      {searchOpen && (
        <div className="fixed inset-0 z-40 flex justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSearchOpen(false)}
            aria-hidden="true"
          />
          <form
            onSubmit={handleSubmitSearch}
            className="relative z-50 w-full max-w-4xl
             max-h-[60vh] min-h-[25vh]
             bg-slate-900/95 border border-slate-800/70
             rounded-xl p-5 backdrop-blur-sm
             flex flex-col"
          >
            <div className="flex items-center gap-2 w-full border-b border-slate-700 pb-2">
              <Search className="text-slate-400 w-6 h-6" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by token symbol, name, or address..."
                className="flex-1 bg-transparent outline-none text-white text-lg placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchResults({ tokens: [], users: [] });
                  if (query.trim() === "") setSearchOpen(false);
                }}
                aria-label="Clear search"
                className="p-2"
              >
                <X size={20} className="text-slate-400" />
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
