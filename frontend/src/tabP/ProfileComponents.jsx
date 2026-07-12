// src/tabP/ProfileComponents.jsx
import React from "react";
import { Check, Search, X } from "lucide-react";
import { C } from "../utils/designforprofile.js";

export const DashboardCard = ({
  title,
  icon: Icon,
  count,
  isLoading,
  data,
  renderItem,
  emptyState,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
}) => (
  <div
    className="font-mono h-full flex flex-col min-h-[400px] p-4 rounded-none"
    style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.border}` }}
  >
    <div className="flex items-center justify-between mb-4 shrink-0">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 flex items-center justify-center rounded-none"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.sub }}
        >
          <Icon size={14} />
        </div>
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: C.bright }}>
          {title}
        </h3>
      </div>
      {count > 0 && (
        <span className="text-[10px] font-mono uppercase font-bold tracking-widest" style={{ color: C.sub }}>
          {count} {count === 1 ? "item" : "items"}
        </span>
      )}
    </div>

    {onSearchChange && (
      <div className="relative mb-3 shrink-0">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 pl-8 text-xs rounded-none focus:outline-none"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.bright }}
        />
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.faint }} />
      </div>
    )}

    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
      {isLoading ? (
        <div className="flex items-center justify-center h-full py-12">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent" style={{ borderColor: C.teal, borderTopColor: "transparent" }} />
        </div>
      ) : data.length === 0 ? (
        <div
          className="text-center py-12 h-full flex flex-col items-center justify-center border border-dashed"
          style={{ borderColor: C.borderDashed, backgroundColor: "rgba(3,7,18,0.5)" }}
        >
          {searchTerm ? (
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: C.rose }}>
              No results for &ldquo;{searchTerm}&rdquo;
            </span>
          ) : (
            emptyState
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item, idx) => (
            <div key={item.address || item.token_address || item.tx_hash || idx}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        className="relative z-10 max-w-md w-full rounded-none shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
        style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalCloseButton = ({ onClose }) => (
  <button onClick={onClose} className="hover:opacity-80" style={{ color: "#64748b" }}>
    <X size={14} />
  </button>
);

export const Toast = ({ message, show }) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] font-mono">
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-none shadow-2xl text-[10px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: C.panel, color: C.bright, border: `1px solid ${C.border}` }}
      >
        <Check size={12} className="shrink-0" style={{ color: C.teal }} />
        <span>{message}</span>
      </div>
    </div>
  );
};
