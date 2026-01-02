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
    let top = rect.bottom + 8;
    setMenuStyles({ left: Math.round(left), top: Math.round(top), width });
  }, [isOpen, width]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        className="h-11 flex items-center justify-between gap-2 px-3.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl text-sm font-medium hover:bg-slate-800/60 hover:border-purple-500/50 transition-all"
      >
        {children}
        <span className="text-slate-400 text-xs hidden sm:inline">
          {label}:
        </span>
        <span className="text-white font-medium">{selectedValue}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {portalRoot &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  position: "fixed",
                  left: menuStyles.left,
                  top: menuStyles.top,
                  width: menuStyles.width,
                  zIndex: 9999,
                }}
              >
                <div className="bg-slate-900 border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden">
                  {options.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-800 ${selectedValue === option ? "text-purple-400 bg-purple-500/10" : "text-slate-300"}`}
                    >
                      {option}
                      {selectedValue === option && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
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
    <div className="w-full flex flex-col md:flex-row items-center gap-3 mb-6">
      {/* Search Input */}
      <div className="relative w-full md:w-80 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or symbol..."
          className="w-full h-11 pl-10 pr-10 bg-slate-800/40 border border-slate-700/50 rounded-xl text-sm focus:border-purple-500/50 outline-none transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Actions */}
      <div className="flex items-center gap-2 w-full overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <Dropdown
          options={sorts}
          selectedValue={initialSort}
          onSelect={onSortChange}
          label="Sort"
        >
          <ListFilter className="w-4 h-4 text-slate-400" />
        </Dropdown>

        <button
          onClick={() => onPauseToggle(!isPaused)}
          className={`h-11 flex items-center gap-2 px-3.5 rounded-xl text-sm font-medium border transition-all ${isPaused ? "bg-orange-500/10 border-orange-500/50 text-orange-400" : "bg-slate-800/40 border-slate-700/50 text-slate-300"}`}
        >
          <div
            className={`w-3 h-3 rounded-full ${isPaused ? "bg-orange-500 animate-pulse" : "bg-slate-600"}`}
          />
          <span>{isPaused ? "Live Paused" : "Pause Live"}</span>
        </button>

        <button
          onClick={() => onListedToggle(!listedOnly)}
          className={`h-11 flex items-center gap-2 px-3.5 rounded-xl text-sm font-medium border transition-all ${listedOnly ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-slate-800/40 border-slate-700/50 text-slate-300"}`}
        >
          <Check
            className={`w-4 h-4 ${listedOnly ? "text-emerald-400" : "text-slate-600"}`}
          />
          <span>Graduated</span>
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-11 w-11 flex items-center justify-center rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
