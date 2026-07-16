import React, { useState, useEffect } from "react";
import FilterBar from "../components/FilterBar";
import AIChatSupport from "../components/AIChatSupport";
import TradeAlertsMarquee from "../components/TradeAlertsMarquee";
import TrendingTokens from "../components/TrendingTokens";
import { ChevronLeft, ChevronRight, Twitter, Send, BookOpen } from "lucide-react";
import TokenList from "../components/TokenList";
import { fetchTokensFromSupabase } from "../api/supabaseTokens";
import { useTokenMovers } from "../hooks/useTokenMovers";
import Logo from "../components/Logo";
import BackgroundGlow from "../components/BackgroundGlow";

/* Shared with Navbar.jsx / TokenCard.jsx / FilterBar.jsx — keep in sync */
const ACCENT = "#96d6cd";
const NESTED_FILL = "bg-white/[0.04] border border-white/[0.08]";

const TOKENS_PER_PAGE = 12;

/* -------------------- Discord icon (matches Navbar.jsx) -------------------- */
const DiscordIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" role="img" fill="currentColor" {...props}>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.51,2.95-2.31A75.31,75.31,0,0,0,96,78.2c1,.8,2,1.58,3,2.31a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.54-18.83C129.9,49.52,123.75,26.74,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

/* -------------------- Pagination helpers -------------------- */
function buildPageList(currentPage, totalPages, maxVisible = 5) {
  const pages = [];
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, currentPage + half);
  if (currentPage - half < 1) end = Math.min(totalPages, end + (1 - (currentPage - half)));
  if (currentPage + half > totalPages) start = Math.max(1, start - (currentPage + half - totalPages));
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("left-ellipsis");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("right-ellipsis");
    pages.push(totalPages);
  }
  return pages;
}

const Pagination = ({ totalPages, currentPage, onPageChange, isMobile }) => {
  if (!totalPages || totalPages <= 1) return null;

  if (isMobile) {
    return (
      <nav className="mt-6 flex items-center justify-center gap-3">
        <button
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`w-9 h-9 flex items-center justify-center rounded-full text-slate-400 disabled:opacity-30 ${NESTED_FILL}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className={`text-[12px] text-slate-400 px-3 py-1.5 rounded-full ${NESTED_FILL}`}>
          Page <span className="font-mono font-semibold" style={{ color: ACCENT }}>{currentPage}</span> of {totalPages}
        </div>

        <button
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`w-9 h-9 flex items-center justify-center rounded-full text-slate-400 disabled:opacity-30 ${NESTED_FILL}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    );
  }

  const pages = buildPageList(currentPage, totalPages, 5);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
      <button
        aria-label="Previous page"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 disabled:opacity-30 transition-all hover:text-slate-200 ${NESTED_FILL}`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {pages.map((p, idx) =>
        typeof p === "number" ? (
          <button
            key={p}
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => onPageChange(p)}
            style={{
              backgroundColor: p === currentPage ? ACCENT : "",
              borderColor: p === currentPage ? ACCENT : "",
            }}
            className={`w-8 h-8 rounded-lg text-[12px] font-mono font-semibold transition-all border ${
              p === currentPage
                ? "text-[#030712] shadow-sm"
                : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
            }`}
          >
            {p}
          </button>
        ) : (
          <span key={`${p}-${idx}`} className="w-5 text-center text-slate-600 text-xs">
            …
          </span>
        )
      )}

      <button
        aria-label="Next page"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 disabled:opacity-30 transition-all hover:text-slate-200 ${NESTED_FILL}`}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
};

/* -------------------- Footer -------------------- */
const footerLinks = [
  { name: "Leaderboard", href: "/leaderboard" },
  { name: "Bridge", href: "/bridge" },
  { name: "Locking", href: "/locking" },
];
const footerSocials = [
  { name: "Twitter", href: "https://twitter.com", icon: Twitter },
  { name: "Telegram", href: "https://t.me", icon: Send },
  { name: "Discord", href: "https://discord.gg", icon: DiscordIcon },
  { name: "Docs", href: "https://docs.example.com", icon: BookOpen },
];

const Footer = () => (
  <footer className="mt-16 border-t border-white/[0.08] bg-white/[0.02]">
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
      {/* Brand */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-black text-sm" style={{ fontFamily: "'Fraunces', Georgia, serif", color: ACCENT }}>
            Blazely
          </span>
        </div>
        <p className="text-[13px] text-slate-500 max-w-xs leading-relaxed">
          A faster way to discover, trade, and launch tokens across the curve.
        </p>
      </div>

      {/* Links + socials */}
      <div className="flex flex-col sm:items-end gap-4">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
          {footerLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-[13px] text-slate-400 hover:text-white transition-colors">
              {link.name}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          {footerSocials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className={`p-2 rounded-lg text-slate-500 hover:text-[#96d6cd] hover:border-white/[0.14] transition-colors ${NESTED_FILL}`}
            >
              <s.icon size={14} />
            </a>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t border-white/[0.06]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-slate-600">© {new Date().getFullYear()} Blazely. All rights reserved.</p>
        <p className="text-[11px] text-slate-600 text-center sm:text-right max-w-md">
          Tokens on the curve are speculative and can lose value quickly. Only trade what you can afford to lose.
        </p>
      </div>
    </div>
  </footer>
);

/* -------------------- Home -------------------- */
export default function Home() {
  const [tokens, setTokens] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState("Last Trade");
  const [searchTerm, setSearchTerm] = useState("");
  const [listedOnly, setListedOnly] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pausedAll, setPausedAll] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const loadTokens = async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const { data, count, error } = await fetchTokensFromSupabase({
        page,
        perPage: TOKENS_PER_PAGE,
        sort: overrides.sort ?? sort,
        search: overrides.searchTerm ?? searchTerm,
        listedOnly: overrides.listedOnly ?? listedOnly,
      });

      if (error) throw error;
      setTokens(data);
      setTotalCount(count);
    } catch (err) {
      console.error("Error loading tokens:", err);
      setTokens([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    loadTokens(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Everything related to the live trades feed — Realtime subscription,
  // "new buy" shake pulses, and "move to front" reordering while sorted
  // by Last Trade — is fully owned by this hook. Home only supplies the
  // current page of tokens and reads back the live-patched result.
  const { tokens: liveTokens } = useTokenMovers({
    initialTokens: tokens,
    sort,
    isPaused: pausedAll,
    currentPage,
    moverSortKey: "Last Trade",
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / TOKENS_PER_PAGE));
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-[#030712] text-slate-100">
      <BackgroundGlow />

      <div className="relative z-10 flex flex-col flex-1">
      <TradeAlertsMarquee />

      <div className="pt-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        <TrendingTokens />
      </div>

      {/* Filter band — full-bleed edge to edge (matches the ticker above),
          content inside stays padded/centered to the same max-width as
          the rest of the page, instead of being boxed into the narrower
          card padding everything else sits in. */}
      <div className="w-full border-y border-white/[0.08] bg-white/[0.015] mt-6">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <FilterBar
            onSortChange={(s) => {
              setSort(s);
              setCurrentPage(1);
              loadTokens(1, { sort: s, searchTerm, listedOnly });
            }}
            onSearchChange={(q) => {
              setSearchTerm(q);
              setCurrentPage(1);
              loadTokens(1, { searchTerm: q, sort, listedOnly });
            }}
            onRefresh={() => loadTokens(currentPage)}
            onListedToggle={(val) => {
              const vb = Boolean(val);
              setListedOnly(vb);
              setCurrentPage(1);
              loadTokens(1, { listedOnly: vb, sort, searchTerm });
            }}
            onPauseToggle={(v) => setPausedAll(v)}
            onViewModeChange={setViewMode}
            initialSort={sort}
            searchTerm={searchTerm}
            listedOnly={listedOnly}
            isPaused={pausedAll}
            viewMode={viewMode}
          />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full flex-1 pt-6">
        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: TOKENS_PER_PAGE }).map((_, i) => (
              <div key={`ph-${i}`} className={`h-40 rounded-[24px] animate-pulse ${NESTED_FILL}`} />
            ))}
          </div>
        ) : (
          <TokenList data={liveTokens} view={viewMode} />
        )}

        <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={handlePageChange} isMobile={isMobile} />
        <AIChatSupport />
      </div>

      <Footer />
      </div>
    </div>
  );
}
