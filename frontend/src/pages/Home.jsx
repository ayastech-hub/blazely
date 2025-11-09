// src/pages/Home.jsx
import React, { useState, useEffect, useCallback } from "react";
import TokenCard from "../components/TokenCard";
import FilterBar from "../components/FilterBar";
import LiveTradeFeed from "../components/LiveTradeFeed";
import {
  ChevronLeft,
  ChevronRight,
  Twitter,
  Send,
  BookOpen,
} from "lucide-react";

import { fetchTokensFromSupabase } from "../api/supabaseTokens";

// -----------------------------
const TOKENS_PER_PAGE = 12;

function buildPageList(currentPage, totalPages, maxVisible = 5) {
  const pages = [];
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, currentPage + half);
  if (currentPage - half < 1) {
    end = Math.min(totalPages, end + (1 - (currentPage - half)));
  }
  if (currentPage + half > totalPages) {
    start = Math.max(1, start - (currentPage + half - totalPages));
  }
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
      <nav
        aria-label="Token list pagination"
        className="mt-6 flex items-center justify-center gap-3"
      >
        <button
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-md text-sm font-medium bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4 inline-block" />
        </button>

        <div className="text-sm text-slate-300 px-2 py-1 rounded-md bg-slate-800/40">
          Page{" "}
          <span className="font-semibold text-white px-1">{currentPage}</span> /{" "}
          {totalPages}
        </div>

        <button
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-md text-sm font-medium bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4 inline-block" />
        </button>
      </nav>
    );
  }

  const pages = buildPageList(currentPage, totalPages, 5);
  return (
    <nav
      aria-label="Token list pagination"
      className="mt-8 flex items-center justify-center gap-2 flex-wrap"
    >
      <button
        aria-label="Previous page"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, idx) =>
        typeof p === "number" ? (
          <button
            key={p}
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md"
                : "bg-slate-800/40 text-slate-300 hover:bg-slate-800/70"
            }`}
          >
            {p}
          </button>
        ) : (
          <span
            key={`${p}-${idx}`}
            className="px-3 py-1 text-sm text-slate-500"
          >
            …
          </span>
        )
      )}

      <button
        aria-label="Next page"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-40"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

const Footer = () => (
  <footer className="mt-12 border-t border-gray-800/50 bg-gray-900/40">
    <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
          Blazely
        </div>
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="#"
          aria-label="Twitter"
          className="p-2 rounded-md text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition-colors text-sm"
        >
          <Twitter size={16} />
        </a>
        <a
          href="#"
          aria-label="Telegram"
          className="p-2 rounded-md text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition-colors text-sm"
        >
          <Send size={16} />
        </a>
        <a
          href="#"
          aria-label="Docs"
          className="p-2 rounded-md text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-colors text-sm"
        >
          <BookOpen size={16} />
        </a>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 pb-3">
      <p className="text-[10px] text-slate-500 text-center">
        Disclaimer: Trading is highly speculative. Use at your own risk.
      </p>
    </div>
  </footer>
);

export default function Home() {
  const [tokens, setTokens] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Marketcap");
  const [searchTerm, setSearchTerm] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const [showLiveAlert, setShowLiveAlert] = useState(true);

  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onResize = () =>
      setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // load tokens (memoized)
  const loadTokens = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data, count, error } = await fetchTokensFromSupabase({
          page,
          perPage: TOKENS_PER_PAGE,
          filter,
          search: searchTerm,
          sort,
        });
        if (error) {
          console.error("Error fetching tokens:", error);
          setTokens([]);
          setTotalCount(0);
        } else {
          setTokens(data || []);
          setTotalCount(count || (data ? data.length : 0));
        }
      } catch (err) {
        console.error("Load tokens unexpected error:", err);
        setTokens([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [filter, searchTerm, sort]
  );

  // initial load + reload when filter/sort/search/page change
  useEffect(() => {
    setCurrentPage(1);
    loadTokens(1);
  }, [filter, searchTerm, sort, loadTokens]);

  useEffect(() => {
    loadTokens(currentPage);
  }, [currentPage, loadTokens]);

  // derived
  const totalTokens = totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalTokens / TOKENS_PER_PAGE));
  const paginatedTokens = tokens; // tokens already paged server-side

  const handlePageChange = (page) => {
    const p = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(p);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative pt-16 flex flex-col bg-slate-950 text-white">
      {showLiveAlert && (
        <div className="fixed left-0 right-0 top-16 z-50 flex items-center justify-center pointer-events-none">
          <div className="max-w-7xl w-full px-6 pointer-events-auto">
            <div className="flex items-center justify-between gap-4 rounded-b-lg bg-gradient-to-r from-purple-700/95 to-cyan-600/95 text-white shadow-lg border border-slate-800/50 py-2 px-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <div className="text-sm font-medium">Live Buys</div>
                <div className="hidden sm:block text-sm text-white/90">
                  <LiveTradeFeed
                    inline
                    compact
                    showOnlyLaunchpadBuys
                    minAmountEth={0.01}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLiveAlert(false)}
                  className="text-xs text-white/90 bg-white/5 px-3 py-1 rounded-md hover:bg-white/10"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-6">
            <FilterBar
              onFilterChange={(f) => setFilter(f)}
              onSortChange={(s) => setSort(s)}
              onSearchChange={(q) => setSearchTerm(q)}
              onRefresh={() => loadTokens(currentPage)}
            />

            <div className="flex items-center gap-4 mb-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" />
              <h2 className="text-2xl font-bold">Token Explorer</h2>
              <div className="flex-1 h-px bg-slate-800/40 ml-2" />
              <div className="text-sm text-slate-400">
                {totalTokens} token{totalTokens !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-3 sm:px-6">
        <div className="max-w-7xl mx-auto px-0 sm:px-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {loading ? (
              // simple loading placeholders
              Array.from({ length: TOKENS_PER_PAGE }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="p-3 rounded-xl bg-white/5 border border-transparent animate-pulse h-40"
                />
              ))
            ) : paginatedTokens.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400">
                No tokens found.
              </div>
            ) : (
              paginatedTokens.map((t, i) => (
                <div
                  key={t.address || t.id || i}
                  className="transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                >
                  <TokenCard token={t} index={i} />
                </div>
              ))
            )}
          </div>

          <div className="mt-6">
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
