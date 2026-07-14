import React, { useState, useEffect } from "react";
import FilterBar from "../components/FilterBar";
import AIChatSupport from "../components/AIChatSupport";
import TradeAlertsMarquee from "../components/TradeAlertsMarquee";
import TrendingTokens from "../components/TrendingTokens";
import { ChevronLeft, ChevronRight, Twitter, Send, BookOpen } from "lucide-react";
import TokenList from "../components/TokenList";
import { fetchTokensFromSupabase } from "../api/supabaseTokens";
import { useTokenMovers } from "../hooks/useTokenMovers";

const TOKENS_PER_PAGE = 12;

// --- Pagination helpers ---
function buildPageList(currentPage, totalPages, maxVisible = 5) {
  const pages = [];
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, currentPage + half);
  if (currentPage - half < 1)
    end = Math.min(totalPages, end + (1 - (currentPage - half)));
  if (currentPage + half > totalPages)
    start = Math.max(1, start - (currentPage + half - totalPages));
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
          className="px-3 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold uppercase disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5 inline-block" />
        </button>

        <div className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08]">
          PAGE <span className="font-bold text-[#96d6cd] px-0.5">{currentPage}</span> / {totalPages}
        </div>

        <button
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold uppercase disabled:opacity-30"
        >
          <ChevronRight className="w-3.5 h-3.5 inline-block" />
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
        className="flex items-center justify-center w-7 h-7 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 disabled:opacity-30 transition-all hover:text-slate-200"
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
              backgroundColor: p === currentPage ? "#96d6cd" : "",
              borderColor: p === currentPage ? "#96d6cd" : "",
            }}
            className={`w-7 h-7 rounded text-[11px] font-mono font-bold transition-all border ${
              p === currentPage
                ? "text-[#030712] shadow-sm"
                : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
            }`}
          >
            {String(p).padStart(2, "0")}
          </button>
        ) : (
          <span key={`${p}-${idx}`} className="w-5 text-center font-mono text-slate-600 text-xs">
            ...
          </span>
        )
      )}

      <button
        aria-label="Next page"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-7 h-7 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 disabled:opacity-30 transition-all hover:text-slate-200"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
};

const Footer = () => (
  <footer className="mt-16 border-t border-white/[0.08] bg-white/[0.015] backdrop-blur-sm">
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="text-xs font-black uppercase tracking-widest" style={{ color: "#96d6cd" }}>
          Blazely
        </div>
        <p className="text-[10px] font-mono text-slate-600">&copy; {new Date().getFullYear()} CORE</p>
      </div>

      <div className="flex items-center gap-1">
        <a href="#" aria-label="Twitter" className="p-2 rounded text-slate-500 hover:text-[#96d6cd] hover:bg-white/[0.06] transition-colors">
          <Twitter size={14} />
        </a>
        <a href="#" aria-label="Telegram" className="p-2 rounded text-slate-500 hover:text-[#96d6cd] hover:bg-white/[0.06] transition-colors">
          <Send size={14} />
        </a>
        <a href="#" aria-label="Docs" className="p-2 rounded text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
          <BookOpen size={14} />
        </a>
      </div>
    </div>
    <div className="max-w-[1600px] mx-auto px-4 pb-4">
      <p className="text-[9px] font-mono uppercase tracking-wider text-slate-600 text-center">
        RISK NOTE: SPECULATIVE PROTOCOL ASSETS INDUCE CAPITAL EXPOSURE. OPERATE WITH AUTONOMY.
      </p>
    </div>
  </footer>
);

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
  const [view, setView] = useState("grid");

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

  // Everything related to the live trades feed — websocket lifecycle,
  // "new buy" shake pulses, and "move to front" reordering while sorted
  // by Last Trade — is fully owned by this hook. Home only supplies the
  // current page of tokens and reads back the live-patched result.
  const { tokens: liveTokens } = useTokenMovers({
    initialTokens: tokens,
    sort,
    isPaused: pausedAll,
    moverSortKey: "Last Trade",
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / TOKENS_PER_PAGE));
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-[#030712] text-slate-100">
      <div>
        <TradeAlertsMarquee />
      </div>

      <div className="pt-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full flex-1">
        <TrendingTokens />

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
  onViewModeChange={setView}   {/* was onViewChange */}
  initialSort={sort}
  searchTerm={searchTerm}
  listedOnly={listedOnly}
  isPaused={pausedAll}
  viewMode={view}              {/* was view */}
/>
         

        <div className="flex items-center gap-3 mb-4 mt-8 pb-2 border-b border-white/[0.08]">
          <div className="w-1.5 h-3.5 rounded-sm" style={{ backgroundColor: "#96d6cd" }} />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Token Registry Feed
          </h2>
          <div className="flex-1" />
          <div className="text-[10px] font-mono text-slate-500 bg-white/[0.03] border border-white/[0.08] px-2 py-0.5 rounded">
            COUNT: {totalCount} ACTIVE
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: TOKENS_PER_PAGE }).map((_, i) => (
              <div key={`ph-${i}`} className="p-3 bg-white/[0.02] border border-white/[0.06] animate-pulse h-40 rounded-2xl" />
            ))}
          </div>
        ) : (
          <TokenList data={liveTokens} view={view} />
        )}

        <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={handlePageChange} isMobile={isMobile} />
        <AIChatSupport />
      </div>
      <Footer />
    </div>
  );
}
