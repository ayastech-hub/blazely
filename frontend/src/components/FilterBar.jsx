import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Check,
  ListFilter,
  ChevronDown,
  Search,
  X,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
} from "lucide-react";

/* Shared with Navbar.jsx / TokenCard.jsx / TrendingTokens.jsx — keep in sync */
const ACCENT = "#96d6cd";
const NESTED_FILL = "bg-white/[0.04] border border-white/[0.08]";

const useClickOutside = (ref, handler) => {
  useEffect(() => {
    if (!ref) return;
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("pointerdown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("pointerdown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
};

// Lazily creates (and reuses) a plain div appended directly to
// document.body. Rendering into this instead of wherever the component
// happens to sit in the tree means floating UI can never get trapped
// inside an ancestor with `overflow: hidden`, a CSS `transform`, or its
// own internal scroll container — all of which silently break
// `position: fixed` children by changing what they're positioned
// relative to.
function useBodyPortalRoot(id) {
  const [node, setNode] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    setNode(el);
  }, [id]);

  return node;
}

/* ---------- SWITCH ----------
   A track + thumb, used two ways:
   - <Switch> is a standalone interactive control (its own <button>) for
     compact desktop chips.
   - <SwitchTrack> is the presentational half only (no button), for the
     mobile drawer where the *whole row* is the tap target — nesting a
     <button> inside another <button> there would be invalid HTML. */
const SwitchTrack = ({ checked, activeColor = ACCENT, size = "md" }) => {
  const dims = size === "sm" ? { w: 32, h: 18, thumb: 14, pad: 2 } : { w: 40, h: 22, thumb: 18, pad: 2 };
  const travel = dims.w - dims.pad * 2 - dims.thumb;
  return (
    <span
      className="relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200"
      style={{ width: dims.w, height: dims.h, backgroundColor: checked ? activeColor : "rgba(255,255,255,0.1)" }}
    >
      <motion.span
        className="inline-block rounded-full bg-[#030712]"
        style={{ width: dims.thumb, height: dims.thumb, marginLeft: dims.pad }}
        animate={{ x: checked ? travel : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </span>
  );
};

const Switch = ({ checked, onChange, activeColor = ACCENT, label, size = "md" }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="shrink-0"
  >
    <SwitchTrack checked={checked} activeColor={activeColor} size={size} />
  </button>
);

/* ---------- DESKTOP PORTAL DROPDOWN ---------- */
const DesktopDropdown = ({ options, selectedValue, onSelect, label, children, width = 180 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const containerRef = useRef(null);
  const portalRoot = useBodyPortalRoot("dropdown-portal-root");
  const [menuStyles, setMenuStyles] = useState({ left: 0, top: 0, width });

  useClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const padding = 8;

      let left = rect.right - width;
      if (left < padding) left = padding;
      const maxLeft = window.innerWidth - width - padding;
      if (left > maxLeft) left = Math.max(padding, maxLeft);

      // Pure viewport coordinates — paired with position:fixed below, this
      // stays correct regardless of page scroll position or any ancestor's
      // own internal scrolling, unlike `rect.bottom + window.scrollY` which
      // only works when the *window* itself is the only scrolling context.
      const top = rect.bottom + 4;

      setMenuStyles({ left: Math.round(left), top: Math.round(top), width });
    };

    updatePosition();

    // `true` = capture phase, so this also fires for scroll events on any
    // inner scrollable ancestor, not just the window.
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, width]);

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{ borderColor: isOpen ? "#96d6cd40" : "" }}
        className={`h-9 flex items-center justify-between gap-2 px-3 rounded text-xs tracking-wide hover:bg-white/[0.07] hover:text-slate-200 transition-all ${NESTED_FILL}`}
      >
        <div className="flex items-center gap-1.5 opacity-70">
          {children}
          <span className="text-[11px]">{label}</span>
        </div>
        <span className="text-slate-200 font-semibold">{selectedValue}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-slate-300" : ""
          }`}
        />
      </button>

      {portalRoot &&
        isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                left: menuStyles.left,
                top: menuStyles.top,
                width: menuStyles.width,
                zIndex: 99999,
              }}
            >
              <div className="bg-[#0b0f19]/95 backdrop-blur-2xl backdrop-saturate-[1.6] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5">
                {options.map((option) => {
                  const isSelected = selectedValue === option;
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                      style={{ color: isSelected ? ACCENT : "" }}
                      className={`w-full text-left px-3 py-2 text-[12px] rounded-lg flex items-center justify-between transition-colors ${
                        isSelected ? "bg-white/[0.06] font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>,
          portalRoot
        )}
    </div>
  );
};

/* ---------- VIEW MODE TOGGLE (grid / list) — desktop only ---------- */
const ViewModeToggle = ({ viewMode, onChange }) => (
  <div className={`hidden md:flex items-center gap-0.5 p-0.5 rounded ${NESTED_FILL}`}>
    <button
      type="button"
      onClick={() => onChange("grid")}
      aria-pressed={viewMode === "grid"}
      aria-label="Grid view"
      style={{
        backgroundColor: viewMode === "grid" ? ACCENT : "",
        color: viewMode === "grid" ? "#030712" : "",
      }}
      className={`h-8 w-8 flex items-center justify-center rounded transition-all ${
        viewMode === "grid" ? "font-bold" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      <LayoutGrid className="w-3.5 h-3.5" />
    </button>
    <button
      type="button"
      onClick={() => onChange("list")}
      aria-pressed={viewMode === "list"}
      aria-label="List view"
      style={{
        backgroundColor: viewMode === "list" ? ACCENT : "",
        color: viewMode === "list" ? "#030712" : "",
      }}
      className={`h-8 w-8 flex items-center justify-center rounded transition-all ${
        viewMode === "list" ? "font-bold" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      <Rows3 className="w-3.5 h-3.5" />
    </button>
  </div>
);

/* ---------- MAIN EXPORTED FILTERBAR CORE ---------- */
export default function FilterBar({
  onSortChange,
  onSearchChange,
  onRefresh,
  onListedToggle,
  onPauseToggle,
  onViewModeChange,
  searchTerm = "",
  listedOnly = false,
  isPaused = false,
  initialSort = "Last Trade",
  viewMode = "grid",
}) {
  const sorts = ["Marketcap", "Last Trade", "Recently Listed", "24h Volume"];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerPortalRoot = useBodyPortalRoot("mobile-drawer-portal-root");

  const isLive = !isPaused;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const drawer = (
    <AnimatePresence>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[99999] md:hidden flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#030712]/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative w-full bg-[#0b0f19]/95 backdrop-blur-2xl backdrop-saturate-[1.6] border-t border-white/[0.08] rounded-t-[24px] p-5 select-none flex flex-col max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <SlidersHorizontal size={15} style={{ color: ACCENT }} />
                <span>Filters</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full bg-white/[0.06] text-slate-500 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Section A: Sort */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-semibold">Sort by</label>
                <div className="grid grid-cols-2 gap-2">
                  {sorts.map((option) => {
                    const isSelected = initialSort === option;
                    return (
                      <button
                        key={option}
                        onClick={() => onSortChange(option)}
                        className={`py-3 px-3 rounded-xl border text-left text-[12px] font-medium flex items-center justify-between transition-all ${
                          isSelected ? "bg-[#96d6cd]/10 border-[#96d6cd]/50 text-[#96d6cd]" : "bg-white/[0.03] border-white/[0.08] text-slate-400"
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && <Check size={13} className="stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section A.2: Layout (grid / list) */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-semibold">Layout</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onViewModeChange("grid")}
                    className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 text-[12px] font-medium transition-all ${
                      viewMode === "grid" ? "bg-[#96d6cd]/10 border-[#96d6cd]/50 text-[#96d6cd]" : "bg-white/[0.03] border-white/[0.08] text-slate-400"
                    }`}
                  >
                    <LayoutGrid size={14} /> Grid
                  </button>
                  <button
                    onClick={() => onViewModeChange("list")}
                    className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 text-[12px] font-medium transition-all ${
                      viewMode === "list" ? "bg-[#96d6cd]/10 border-[#96d6cd]/50 text-[#96d6cd]" : "bg-white/[0.03] border-white/[0.08] text-slate-400"
                    }`}
                  >
                    <Rows3 size={14} /> List
                  </button>
                </div>
              </div>

              {/* Section B: Live data — a real settings list. Each row IS
                  the tap target (role="switch" on the row itself), so the
                  switch inside is presentational only — avoids nesting a
                  <button> inside a <button>. */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold">Live data</label>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isLive}
                  onClick={() => onPauseToggle(isLive)}
                  className={`w-full py-3 px-3.5 rounded-xl border flex items-center justify-between transition-all ${NESTED_FILL} ${
                    isLive ? "border-[#96d6cd]/30" : ""
                  }`}
                >
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-slate-200">Live updates</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isLive ? "Streaming new trades in real time" : "Feed is paused"}
                    </p>
                  </div>
                  <SwitchTrack checked={isLive} />
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={listedOnly}
                  onClick={() => onListedToggle(!listedOnly)}
                  className={`w-full py-3 px-3.5 rounded-xl border flex items-center justify-between transition-all ${NESTED_FILL} ${
                    listedOnly ? "border-[#96d6cd]/30" : ""
                  }`}
                >
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-slate-200">Graduated only</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Hide tokens still on the bonding curve</p>
                  </div>
                  <SwitchTrack checked={listedOnly} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full mt-8 text-[#030712] font-bold text-sm py-3.5 rounded-xl text-center transition-all active:scale-[0.99]"
              style={{ backgroundColor: ACCENT }}
            >
              Apply
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`w-full flex items-center gap-2 mb-4 p-2 rounded-xl ${NESTED_FILL}`}>
      {/* 1. Search */}
      <div className="relative flex-1 md:flex-none md:w-72 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-slate-400 transition-colors" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or address"
          className="w-full h-9 pl-9 pr-8 bg-black/20 border border-white/[0.08] rounded-lg text-[13px] text-slate-200 placeholder-slate-600 focus:border-white/[0.2] outline-none transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Desktop controls */}
      <div className="hidden md:flex items-center gap-1.5 flex-1 justify-start">
        <DesktopDropdown options={sorts} selectedValue={initialSort} onSelect={onSortChange} label="Sort">
          <ListFilter className="w-3.5 h-3.5 text-slate-500" />
        </DesktopDropdown>

        {/* Live updates — compact switch chip */}
        <div className={`h-9 flex items-center gap-2.5 pl-3 pr-2.5 rounded ${NESTED_FILL}`}>
          <span className="text-[11px] text-slate-300 whitespace-nowrap">Live updates</span>
          <Switch checked={isLive} onChange={(v) => onPauseToggle(!v)} label="Toggle live updates" size="sm" />
        </div>

        {/* Graduated only — compact switch chip */}
        <div className={`h-9 flex items-center gap-2.5 pl-3 pr-2.5 rounded ${NESTED_FILL}`}>
          <span className="text-[11px] text-slate-300 whitespace-nowrap">Graduated only</span>
          <Switch checked={listedOnly} onChange={onListedToggle} label="Toggle graduated only" size="sm" />
        </div>

        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
      </div>

      {/* Desktop refresh */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`hidden md:flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-all flex-shrink-0 ${NESTED_FILL}`}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          style={{ color: isRefreshing ? ACCENT : undefined }}
        />
      </button>

      {/* 3. Mobile controls */}
      <div className="flex md:hidden items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`h-9 px-3 flex items-center gap-2 rounded text-[12px] font-semibold ${NESTED_FILL}`}
          style={{ color: ACCENT }}
        >
          <SlidersHorizontal size={14} />
          <span>Filters</span>
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`h-9 w-9 flex items-center justify-center rounded text-slate-400 ${NESTED_FILL}`}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} style={{ color: isRefreshing ? ACCENT : undefined }} />
        </button>
      </div>

      {/* Drawer is portaled straight to document.body — never trapped by
          this component's own position in the page. */}
      {drawerPortalRoot && createPortal(drawer, drawerPortalRoot)}
    </div>
  );
}
