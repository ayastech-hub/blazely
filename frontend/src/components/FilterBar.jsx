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

/* ---------- DESKTOP PORTAL DROPDOWN ---------- */
const DesktopDropdown = ({
  options,
  selectedValue,
  onSelect,
  label,
  children,
  width = 180,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const containerRef = useRef(null);
  const [portalRoot, setPortalRoot] = useState(null);
  const [menuStyles, setMenuStyles] = useState({ left: 0, top: 0, width });

  useClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (typeof document !== "undefined") {
      let node = document.getElementById("dropdown-portal-root");
      if (!node) {
        node = document.createElement("div");
        node.id = "dropdown-portal-root";
        document.body.appendChild(node);
      }
      setPortalRoot(node);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;
    let left = rect.right - width;
    if (left < padding) left = padding;
    let top = rect.bottom + window.scrollY + 4;
    setMenuStyles({ left: Math.round(left), top: Math.round(top), width });
  }, [isOpen, width]);

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{ borderColor: isOpen ? "#96d6cd40" : "" }}
        className="h-9 flex items-center justify-between gap-2 px-3 bg-[#0b0f19]/60 backdrop-blur-md border border-slate-900 rounded text-xs font-mono tracking-wide hover:bg-[#0b0f19]/90 hover:text-slate-200 transition-all"
      >
        <div className="flex items-center gap-1.5 opacity-70">
          {children}
          <span className="uppercase text-[10px]">{label}:</span>
        </div>
        <span className="text-slate-200 font-bold uppercase">{selectedValue}</span>
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
                position: "absolute",
                left: menuStyles.left,
                top: menuStyles.top,
                width: menuStyles.width,
                zIndex: 9999,
              }}
            >
              <div className="bg-[#030712] border border-slate-900 rounded shadow-2xl overflow-hidden p-1 space-y-0.5">
                {options.map((option) => {
                  const isSelected = selectedValue === option;
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                      style={{ color: isSelected ? "#96d6cd" : "" }}
                      className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase rounded flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-[#0b0f19] font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-[#0b0f19]/50"
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

/* ---------- VIEW MODE TOGGLE (grid / list) ---------- */
const ViewModeToggle = ({ viewMode, onChange, compact = false }) => (
  <div
    className={`flex items-center gap-0.5 bg-[#0b0f19]/60 border border-slate-900 rounded p-0.5 ${
      compact ? "" : "h-9"
    }`}
  >
    <button
      type="button"
      onClick={() => onChange("grid")}
      aria-label="Grid view"
      aria-pressed={viewMode === "grid"}
      style={{
        backgroundColor: viewMode === "grid" ? "#96d6cd" : "",
        color: viewMode === "grid" ? "#030712" : "",
      }}
      className={`flex items-center justify-center rounded px-2.5 h-full py-1.5 transition-all ${
        viewMode === "grid" ? "font-bold" : "text-slate-500 hover:text-slate-200"
      }`}
    >
      <LayoutGrid size={13} />
    </button>
    <button
      type="button"
      onClick={() => onChange("list")}
      aria-label="List view"
      aria-pressed={viewMode === "list"}
      style={{
        backgroundColor: viewMode === "list" ? "#96d6cd" : "",
        color: viewMode === "list" ? "#030712" : "",
      }}
      className={`flex items-center justify-center rounded px-2.5 h-full py-1.5 transition-all ${
        viewMode === "list" ? "font-bold" : "text-slate-500 hover:text-slate-200"
      }`}
    >
      <Rows3 size={13} />
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <div className="w-full flex items-center gap-2 mb-4 bg-[#0b0f19]/20 p-2 border border-slate-900 rounded box-border">
      {/* 1. Global Input Matrix System */}
      <div className="relative flex-1 md:flex-none md:w-72 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-slate-400 transition-colors" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="SEARCH BY IDENTIFIER / ADDR..."
          className="w-full h-9 pl-9 pr-8 bg-[#0b0f19]/60 border border-slate-900 rounded text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:border-slate-800 outline-none transition-all uppercase tracking-wider"
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

      {/* 2. Desktop Mode Controls Row View */}
      <div className="hidden md:flex items-center gap-1.5 flex-1 justify-start">
        <DesktopDropdown
          options={sorts}
          selectedValue={initialSort}
          onSelect={onSortChange}
          label="Sort"
        >
          <ListFilter className="w-3.5 h-3.5 text-slate-500" />
        </DesktopDropdown>

        <button
          onClick={() => onPauseToggle(!isPaused)}
          style={{ borderColor: isPaused ? "#ffaa4430" : "" }}
          className={`h-9 flex items-center gap-2 px-3 rounded text-xs font-mono tracking-wide border transition-all ${
            isPaused
              ? "bg-[#ffaa44]/5 text-[#ffaa44] font-bold"
              : "bg-[#0b0f19]/60 border-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-[#ffaa44] animate-pulse" : "bg-slate-700"}`} />
          <span className="uppercase text-[10px]">{isPaused ? "LIVE PAUSED" : "PAUSE STREAM"}</span>
        </button>

        <button
          type="button"
          onClick={() => onListedToggle(!listedOnly)}
          style={{ borderColor: listedOnly ? "#96d6cd50" : "" }}
          className={`h-9 flex items-center gap-2.5 px-3 rounded text-xs font-mono tracking-wide border select-none transition-all ${
            listedOnly
              ? "bg-[#96d6cd]/5 text-[#96d6cd] font-bold"
              : "bg-[#0b0f19]/60 border-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
              listedOnly ? "border-[#96d6cd] bg-[#96d6cd]/10" : "border-slate-700 bg-[#030712]"
            }`}
          >
            {listedOnly && <Check className="w-2.5 h-2.5 text-[#96d6cd] stroke-[3]" />}
          </div>
          <span className="uppercase text-[10px] tracking-wider">GRADUATED ONLY</span>
        </button>

        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
      </div>

      {/* Desktop Inline Static Refresh Pin */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="hidden md:flex h-9 w-9 items-center justify-center rounded bg-[#0b0f19]/60 border border-slate-900 text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-all flex-shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#96d6cd]" : ""}`} />
      </button>

      {/* 3. MOBILE INTERFACE EXPANSION CONTROLS BAR */}
      <div className="flex md:hidden items-center gap-1.5">
        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} compact />

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="h-9 px-3 flex items-center gap-2 bg-[#0d121f] border border-slate-900 rounded font-mono text-[11px] text-[#96d6cd] font-bold uppercase tracking-wider"
        >
          <SlidersHorizontal size={14} />
          <span>Filters</span>
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 w-9 flex items-center justify-center rounded bg-[#0d121f] border border-slate-900 text-slate-400"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#96d6cd]" : ""} />
        </button>
      </div>

      {/* MOBILE FULL INTERACTIVE BOTTOM TERMINAL DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[99999] md:hidden flex flex-col justify-end">
            {/* Opaque Ambient Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#030712]/80 backdrop-blur-sm"
            />

            {/* Bottom Form Sheet Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full bg-[#070a14] border-t border-slate-900 rounded-t-2xl p-5 font-mono select-none flex flex-col max-h-[85vh] overflow-y-auto"
            >
              {/* Drawer Top Handle Indicators */}
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-900">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <SlidersHorizontal size={13} className="text-[#96d6cd]" />
                  <span>Terminal Filter Deck</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full bg-slate-900/60 text-slate-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Action Parameter Matrix Stack */}
              <div className="space-y-6">
                {/* Section A: Selection Layout Order */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Metrics Sorting Layout
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {sorts.map((option) => {
                      const isSelected = initialSort === option;
                      return (
                        <button
                          key={option}
                          onClick={() => onSortChange(option)}
                          className={`py-3 px-3 rounded border text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-[#96d6cd]/5 border-[#96d6cd] text-[#96d6cd]"
                              : "bg-[#030712] border-slate-900 text-slate-400"
                          }`}
                        >
                          <span>{option}</span>
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section A.2: View mode */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Display Layout
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onViewModeChange("grid")}
                      className={`py-3 px-3 rounded border flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
                        viewMode === "grid"
                          ? "bg-[#96d6cd]/5 border-[#96d6cd] text-[#96d6cd]"
                          : "bg-[#030712] border-slate-900 text-slate-400"
                      }`}
                    >
                      <LayoutGrid size={13} /> Grid
                    </button>
                    <button
                      onClick={() => onViewModeChange("list")}
                      className={`py-3 px-3 rounded border flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
                        viewMode === "list"
                          ? "bg-[#96d6cd]/5 border-[#96d6cd] text-[#96d6cd]"
                          : "bg-[#030712] border-slate-900 text-slate-400"
                      }`}
                    >
                      <Rows3 size={13} /> List
                    </button>
                  </div>
                </div>

                {/* Section B: Functional Runtime States */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Data Control Filters
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {/* Live Stream Controller Toggle */}
                    <button
                      onClick={() => onPauseToggle(!isPaused)}
                      className={`w-full py-3.5 px-4 rounded border text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-all ${
                        isPaused
                          ? "bg-[#ffaa44]/5 border-[#ffaa44]/40 text-[#ffaa44]"
                          : "bg-[#030712] border-slate-900 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${isPaused ? "bg-[#ffaa44] animate-pulse" : "bg-slate-700"}`} />
                        <span>{isPaused ? "Live Streaming Suspended" : "Pause Realtime Stream"}</span>
                      </div>
                      <span className="text-[10px] opacity-40">{isPaused ? "[ACTIVE]" : "[OFF]"}</span>
                    </button>

                    {/* Graduation Allocation Pipeline Filter */}
                    <button
                      onClick={() => onListedToggle(!listedOnly)}
                      className={`w-full py-3.5 px-4 rounded border text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-all ${
                        listedOnly
                          ? "bg-[#96d6cd]/5 border-[#96d6cd]/40 text-[#96d6cd]"
                          : "bg-[#030712] border-slate-900 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            listedOnly ? "border-[#96d6cd]" : "border-slate-800"
                          }`}
                        >
                          {listedOnly && <Check size={10} className="stroke-[3]" />}
                        </div>
                        <span>Show Graduated Only</span>
                      </div>
                      <span className="text-[10px] opacity-40">{listedOnly ? "[ACTIVE]" : "[OFF]"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Execution Layer Core */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full mt-8 bg-[#96d6cd] hover:bg-[#83c0b7] text-[#030712] font-black text-xs uppercase tracking-widest py-3.5 rounded-xl text-center transition-all active:scale-[0.99]"
              >
                Apply Directives
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}