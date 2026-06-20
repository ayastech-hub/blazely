// src/components/FilterBar.jsx
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

const Dropdown = ({
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
  const [portalRoot] = useState(() => {
    if (typeof document === "undefined") return null;
    let node = document.getElementById("dropdown-portal-root");
    if (!node) {
      node = document.createElement("div");
      node.id = "dropdown-portal-root";
      document.body.appendChild(node);
    }
    return node;
  });

  const [menuStyles, setMenuStyles] = useState({ left: 0, top: 0, width });
  useClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;
    let left = rect.right - width;
    if (left < padding) left = padding;
    let top = rect.bottom + 4;
    setMenuStyles({ left: Math.round(left), top: Math.round(top), width });
  }, [isOpen, width]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        style={{ borderColor: isOpen ? '#96d6cd40' : '' }}
        className="h-9 flex items-center justify-between gap-2 px-3 bg-[#0b0f19]/60 backdrop-blur-md border border-slate-900 rounded text-xs font-mono tracking-wide hover:bg-[#0b0f19]/90 hover:text-slate-200 transition-all"
      >
        <div className="flex items-center gap-1.5 opacity-70">
          {children}
          <span className="uppercase text-[10px] hidden sm:inline">{label}:</span>
        </div>
        <span className="text-slate-200 font-bold uppercase">{selectedValue}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${isOpen ? "rotate-180 text-slate-300" : ""}`}
        />
      </button>

      {portalRoot &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "fixed",
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
                        style={{ color: isSelected ? '#96d6cd' : '' }}
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
            )}
          </AnimatePresence>,
          portalRoot
        )}
    </div>
  );
};

export default function FilterBar({
  onSortChange,
  onSearchChange,
  onRefresh,
  onListedToggle,
  onPauseToggle,
  searchTerm = "",
  listedOnly = false,
  isPaused = false,
  initialSort = "Last Trade",
}) {
  const sorts = ["Marketcap", "Last Trade", "Recently Listed", "24h Volume"];
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <div className="w-full flex flex-col lg:flex-row items-center gap-2 mb-4 bg-[#0b0f19]/20 p-2 border border-slate-900 rounded">
      {/* Search Input Framework */}
      <div className="relative w-full lg:w-72 group">
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

      {/* Filter Management Sequence */}
      <div className="flex items-center gap-1.5 w-full overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        
        {/* Sort Action Component */}
        <Dropdown
          options={sorts}
          selectedValue={initialSort}
          onSelect={onSortChange}
          label="Sort"
        >
          <ListFilter className="w-3.5 h-3.5 text-slate-500" />
        </Dropdown>

        {/* Live Tracking Core Toggle */}
        <button
          onClick={() => onPauseToggle(!isPaused)}
          style={{ borderColor: isPaused ? '#ffaa4430' : '' }}
          className={`h-9 flex items-center gap-2 px-3 rounded text-xs font-mono tracking-wide border transition-all ${
            isPaused 
              ? "bg-[#ffaa44]/5 text-[#ffaa44] font-bold" 
              : "bg-[#0b0f19]/60 border-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-[#ffaa44] animate-pulse" : "bg-slate-700"}`}
          />
          <span className="uppercase text-[10px]">{isPaused ? "LIVE PAUSED" : "PAUSE STREAM"}</span>
        </button>

        {/* Graduation Metric Filter */}
        <button
          onClick={() => onListedToggle(!listedOnly)}
          style={{ borderColor: listedOnly ? '#96d6cd30' : '' }}
          className={`h-9 flex items-center gap-2 px-3 rounded text-xs font-mono tracking-wide border transition-all ${
            listedOnly 
              ? "bg-[#96d6cd]/5 text-[#96d6cd] font-bold" 
              : "bg-[#0b0f19]/60 border-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Check
            className={`w-3.5 h-3.5 ${listedOnly ? "text-[#96d6cd]" : "text-slate-600"}`}
          />
          <span className="uppercase text-[10px]">GRADUATED ONLY</span>
        </button>

        <div className="flex-1 hidden lg:block" />

        {/* Re-sync Query Pipeline Action */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 w-9 flex items-center justify-center rounded bg-[#0b0f19]/60 border border-slate-900 text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-all ml-auto lg:ml-0 flex-shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#96d6cd]" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
