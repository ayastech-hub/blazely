// src/components/FilterBar.jsx
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  RefreshCw,
  Check,
  ListFilter,
} from "lucide-react";

const filters = ["All", "AI", "Meme", "DeFi", "GameFi", "Infrastructure"];
const sorts = ["", "Marketcap", "Recently Listed", "24h Volume"];

/* ---------- improved useClickOutside (handles pointer + touch) ---------- */
const useClickOutside = (ref, handler) => {
  useEffect(() => {
    if (!ref) return;
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    // pointerdown covers mouse + touch + pen
    document.addEventListener("pointerdown", listener);
    // fallback for some mobile environments
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("pointerdown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
};

/* ----------------- Dropdown with portal (not clipped) ----------------- */
const Dropdown = ({ options, selectedValue, onSelect, label, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // store portal root (create if not exists)
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

  // computed menu styles (absolute in viewport)
  const [menuStyles, setMenuStyles] = useState({ left: 0, top: 0, width: 192 });

  useClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // matches w-48
    const padding = 8;
    // Default align right edge of trigger to right edge of menu
    let left = rect.right - menuWidth;
    if (left < padding) left = padding;
    // Prefer below the trigger, if not enough space open upward
    let top = rect.bottom + 8;
    const estimatedMenuHeight = Math.min(options.length * 40 + 8, 320); // rough estimate
    if (top + estimatedMenuHeight > window.innerHeight - padding) {
      // open upward
      top = rect.top - 8 - estimatedMenuHeight;
      if (top < padding) top = padding;
    }
    setMenuStyles({
      left: Math.round(left),
      top: Math.round(top),
      width: menuWidth,
    });
  }, [isOpen, options.length]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((p) => !p)}
        className="h-11 flex items-center justify-between gap-2 px-3.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-lg text-sm font-medium hover:bg-slate-800/60 hover:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 whitespace-nowrap"
      >
        {children}
        <span className="text-slate-400 text-xs hidden sm:inline">
          {label}:
        </span>
        <span className="text-white font-medium text-sm">{selectedValue}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {portalRoot &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  left: `${menuStyles.left}px`,
                  top: `${menuStyles.top}px`,
                  width: `${menuStyles.width}px`,
                  zIndex: 9999,
                }}
              >
                <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/70 rounded-lg shadow-xl overflow-hidden">
                  {options.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-700/60 transition-colors ${
                        selectedValue === option
                          ? "text-white bg-slate-700/40"
                          : "text-slate-300"
                      }`}
                    >
                      <span>{option}</span>
                      {selectedValue === option && (
                        <Check className="w-4 h-4 text-purple-400" />
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

/* --------------------------- FilterBar --------------------------- */
export default function FilterBar({
  onFilterChange = () => {},
  onSortChange = () => {},
  onRefresh = async () => {},
  onSearchChange = () => {},
}) {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedSort, setSelectedSort] = useState("Marketcap");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (isRefreshing || !onRefresh) return;
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full"
    >
      {/* Search Bar - Full width on mobile */}
      <div className="relative flex-1 w-full sm:max-w-xs md:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearchChange(e.target.value);
          }}
          placeholder="Search tokens..."
          className="h-11 w-full pl-10 pr-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
        />
      </div>

      {/* Filters Row - Horizontal scroll on small screens */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:overflow-visible">
        {/* Category dropdown */}
        <div className="flex-shrink-0">
          <Dropdown
            options={filters}
            selectedValue={selectedFilter}
            onSelect={(value) => {
              setSelectedFilter(value);
              onFilterChange(value);
            }}
            label="Category"
          >
            <ListFilter className="w-4 h-4 text-slate-400" />
          </Dropdown>
        </div>

        {/* Sort dropdown */}
        <div className="flex-shrink-0">
          <Dropdown
            options={sorts}
            selectedValue={selectedSort}
            onSelect={(value) => {
              setSelectedSort(value);
              onSortChange(value);
            }}
            label="Sort by"
          >
            <ListFilter className="w-4 h-4 text-slate-400" />
          </Dropdown>
        </div>

        {/* Refresh */}
        <motion.button
          type="button"
          onClick={handleRefreshClick}
          aria-label="Refresh list"
          disabled={isRefreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 text-slate-400 hover:text-white hover:border-purple-500/50 hover:bg-slate-800/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}
