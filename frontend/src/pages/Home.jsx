// src/pages/Home.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import FilterBar from "../components/FilterBar";
import AIChatSupport from "../components/AIChatSupport";
import TradeAlertsMarquee from "../components/TradeAlertsMarquee";
import TrendingTokens from "../components/TrendingTokens";
import {
  ChevronLeft,
  ChevronRight,
  Twitter,
  Send,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
// FIX 1: Import the correct emitter that TokenList.jsx is listening to
import { buyEmitter } from "../utils/buyEmitter";
// FIX 2: Import the TokenList component
import TokenList from "../components/TokenList";

const TOKENS_PER_PAGE = 12;

// --- Pagination helpers (keep these unchanged) ---
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
          className="px-3 py-1 rounded-md text-sm font-medium bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4 inline-block" />
        </button>

        <div className="text-sm text-slate-300 px-2 py-1 rounded-md bg-slate-800/40">
          Page
          <span className="font-semibold text-white px-1">{currentPage}</span> /
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
    <nav className="mt-8 flex items-center justify-center gap-2 flex-wrap">
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

// --- Footer ---
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
  const [sort, setSort] = useState("Last Trade");
  const [searchTerm, setSearchTerm] = useState("");
  const [listedOnly, setListedOnly] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pausedAll, setPausedAll] = useState(false);
  const pausedAllRef = useRef(pausedAll);

  useEffect(() => {
    pausedAllRef.current = pausedAll;
  }, [pausedAll]);

  const navigate = useNavigate();

  // --- Load tokens from Supabase ---
  // NOTE: this is intentionally NOT memoized — we call it directly from filter handlers
  // and from the page effect. When called from effects that depend on currentPage we
  // disable exhaustive-deps to avoid stale/multiple fetch races.
  const loadTokens = async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const from = (page - 1) * TOKENS_PER_PAGE;
      const to = from + TOKENS_PER_PAGE - 1;

      // allow immediate overrides so filter handlers can call loadTokens(1, { ... })
      const effectiveSearch = overrides.searchTerm ?? searchTerm;
      const effectiveSort = overrides.sort ?? sort;
      const effectiveListed = overrides.listedOnly ?? listedOnly;

      let query = supabase.from("tokens").select(
        `
          id,
          address,
          name,
          symbol,
          logo_path,
          telegram,
          website,
          twitter,
          graduated,
          created_at,
          market_cap,
          volume_24h,
          price,
          last_trade_at,
          token_metrics_latest:token_metrics_latest (
            market_cap,
            volume_24h,
            price,
            market_cap_text,
            volume_24h_text
          )
        `,
        { count: "exact" }
      );

      if (effectiveListed) query = query.eq("graduated", true);

      // SEARCH: match name OR symbol for more intuitive results
      if (effectiveSearch) {
        const escaped = String(effectiveSearch)
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_");
        query = query.or(`name.ilike.%${escaped}%,symbol.ilike.%${escaped}%`);
      }

      let orderByColumn = "created_at";
      let ascending = false;

      switch (effectiveSort) {
        case "Last Trade":
          orderByColumn = "last_trade_at";
          ascending = false;
          break;
        case "Marketcap":
          orderByColumn = "market_cap";
          ascending = false;
          break;
        case "24h Volume":
          orderByColumn = "volume_24h";
          ascending = false;
          break;
        case "Recently Listed":
          orderByColumn = "created_at";
          ascending = false;
          break;
      }

      query = query.order(orderByColumn, { ascending });
      if (orderByColumn !== "created_at") {
        query = query.order("created_at", { ascending: false });
      }
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      const normalized = (data || []).map((t) => {
        const latestMetrics = t.token_metrics_latest?.[0];
        const marketcapValue = latestMetrics?.market_cap ?? t.market_cap ?? 0;
        const volumeValue = latestMetrics?.volume_24h ?? t.volume_24h ?? 0;
        const priceValue = latestMetrics?.price ?? t.price ?? 0;

        // --- Get the public URL for the logo ---
        const logoUrl = t.logo_path
          ? supabase.storage.from("logos").getPublicUrl(t.logo_path).data
              .publicUrl
          : null;

        return {
          ...t,
          logoUrl, // <-- add this
          marketcap: marketcapValue,
          volume_24h: volumeValue,
          price: priceValue,
          initialMetrics: {
            market_cap_text: latestMetrics?.market_cap_text || "",
            volume_24h_text: latestMetrics?.volume_24h_text || "",
          },
        };
      });

      setTokens(normalized);
      setTotalCount(count || normalized.length);
    } catch (err) {
      console.error("Error loading tokens:", err);
      setTokens([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // --- Detect mobile ---
  useEffect(() => {
    const onResize = () =>
      setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- Page Change Effect ---
  useEffect(() => {
    // loadTokens is intentionally not in deps (we control calls explicitly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadTokens(currentPage);
  }, [currentPage]);
  // 1. Move the ref to the top level of your Home component (above the effects)
  const tokensRef = useRef([]);

  // 2. Add this effect to keep the ref updated whenever the tokens change
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // 3. Inside your WebSocket useEffect, REMOVE "const tokensRef = { current: tokens };"
  // Simply use "tokensRef.current" directly in your flushBuffer function.
  // --- WebSocket for live trades (batched) ---
  useEffect(() => {
    const BATCH_WINDOW_MS = 150;
    const HEARTBEAT_INTERVAL_MS = 20_000;
    let reconnectBackoff = 1000;
    const MAX_BACKOFF = 30_000;

    const WS_URL = import.meta.env.VITE_TRADES_WS || "ws://localhost:8080";

    let ws = null;
    let shouldStop = false;
    const buffer = new Map();
    let flushTimer = null;
    let heartbeatTimer = null;
    let lastPong = Date.now();

    const updateTokensRef = (val) => (tokensRef.current = val);
    const setTokensOnce = (updater) => {
      setTokens((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        updateTokensRef(next);
        return next;
      });
    };

    const flushBuffer = () => {
      if (!buffer.size) return;
      const updates = Array.from(buffer.values());
      buffer.clear();
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      requestAnimationFrame(() => {
        const current = tokensRef.current || [];
        if (!current.length) return;

        const idxMap = new Map(
          current.map((t) => [String(t.address).toLowerCase(), t])
        );
        const newArr = [...current];
        const toFront = []; // Will store { addr, token: patched }

        for (const p of updates) {
          const addr = (p.token || p.address || "").toLowerCase();
          if (!addr) continue;
          const existing = idxMap.get(addr);
          if (!existing) continue;

          // Find the current index to patch, since the list might have been moved.
          const currentIdx = newArr.findIndex(
            (t) => String(t.address).toLowerCase() === addr
          );
          if (currentIdx === -1) continue;

          const patched = { ...newArr[currentIdx] };
          if (p.price != null) patched.price = p.price;
          if (p.last_trade_at) patched.last_trade_at = p.last_trade_at;
          patched._last_trade = {
            tx_hash: p.tx_hash,
            eth: p.eth,
            token_amount: p.token_amount,
          };

          // Update the array with patched data
          newArr[currentIdx] = patched;

          // Mark for movement if it's a new buy
          if (p.type === "buy" || p.isBuy) {
            toFront.push({ addr, token: patched });
          }
        }

        // If paused, only patch values
        if (pausedAllRef.current) {
          setTokensOnce(newArr);
          return;
        }

        // --- FIX: Conditional Movement and Shake Emission ---
        if (sort === "Last Trade") {
          // <-- Only move tokens if sorting by Last Trade
          // Move bought tokens to front
          for (let i = toFront.length - 1; i >= 0; i--) {
            const { addr } = toFront[i];
            const pos = newArr.findIndex(
              (t) => (t.address || "").toLowerCase() === addr
            );

            if (pos > -1) {
              const [tok] = newArr.splice(pos, 1);
              newArr.unshift(tok);
              // Emit shake event after successful move
              buyEmitter.emit("buy", addr);
            }
          }
        } else {
          // If not sorting by Last Trade, DO NOT move the token,
          // but still emit the shake event so it shakes in its current sorted position.
          for (const { addr } of toFront) {
            buyEmitter.emit("buy", addr);
          }
        }

        setTokensOnce(newArr);
      });
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushBuffer();
      }, BATCH_WINDOW_MS);
    };

    const startHeartbeat = () => {
      lastPong = Date.now();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        try {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          if (Date.now() - lastPong > HEARTBEAT_INTERVAL_MS * 2) {
            ws.close();
            return;
          }
          ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
        } catch {}
      }, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    };

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
      } catch (err) {
        setTimeout(connect, reconnectBackoff);
        return;
      }

      ws.addEventListener("open", () => {
        reconnectBackoff = 1000;
        startHeartbeat();
      });

      ws.addEventListener("message", (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.type === "pong") {
            lastPong = Date.now();
            return;
          }
          const { type, payload: inner } = payload.type
            ? payload
            : { type: "trade", payload };
          if (type !== "trade" || !inner) return;
          const addr = (inner.token || inner.address || "").toLowerCase();
          if (!addr) return;

          // Add data to buffer, marking it as a buy if needed
          const bufferedData = buffer.get(addr) || { address: addr };
          const newTradeData = { ...bufferedData, ...inner };
          if (inner.type === "buy" || inner.isBuy) {
            newTradeData.isBuy = true;
          }
          buffer.set(addr, newTradeData);

          scheduleFlush();
        } catch {}
      });

      ws.addEventListener("close", () => {
        stopHeartbeat();
        if (!shouldStop) setTimeout(connect, reconnectBackoff);
        reconnectBackoff = Math.min(reconnectBackoff * 1.5, MAX_BACKOFF);
      });

      ws.addEventListener("error", () => {
        try {
          ws.close();
        } catch {}
      });
    };

    connect();

    return () => {
      shouldStop = true;
      try {
        ws.close();
      } catch {}
      if (flushTimer) clearTimeout(flushTimer);
      stopHeartbeat();
      buffer.clear();
    };
  }, [sort]); // only re-create socket when `sort` changes

  const totalPages = Math.max(1, Math.ceil(totalCount / TOKENS_PER_PAGE));
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-slate-950 text-white">
      <div className="pt-0">
        <TradeAlertsMarquee />
      </div>

      <div className="pt-20 px-6 max-w-7xl mx-auto w-full">
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
          initialSort={sort}
        />

        <div className="flex items-center gap-4 mb-2 mt-6">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" />
          <h2 className="text-2xl font-bold">Token Explorer</h2>
          <div className="flex-1 h-px bg-slate-800/40 ml-2" />
          <div className="text-sm text-slate-400">
            {totalCount} token{totalCount !== 1 ? "s" : ""}
          </div>
        </div>

        {/* FIX 4: Ensure TokenList is used (it is) */}
        {loading ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: TOKENS_PER_PAGE }).map((_, i) => (
              <div
                key={`ph-${i}`}
                className="p-3 rounded-xl bg-white/5 border border-transparent animate-pulse h-40"
              />
            ))}
          </div>
        ) : (
          <TokenList data={tokens} isPaused={pausedAll} />
        )}

        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          isMobile={isMobile}
        />
        <AIChatSupport />
      </div>
      <Footer />
    </div>
  );
}
