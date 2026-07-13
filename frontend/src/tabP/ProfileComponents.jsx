// src/tabP/ProfileComponents.jsx
import React from "react";
import { Check, Search, X } from "lucide-react";
import { C } from "../utils/designForProfile";

export const DashboardCard = ({
  title,
  subtitle,
  icon: Icon,
  count,
  isLoading,
  data,
  renderItem,
  emptyState,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  headerAction,
}) => (
  <div
    className="h-full flex flex-col min-h-[420px] p-5 sm:p-6"
    style={{ backgroundColor: C.panelSoft, border: `1px solid ${C.borderSoft}`, borderRadius: C.radiusCard, boxShadow: C.shadowCard }}
  >
    <div className="flex items-start justify-between mb-5 gap-3 shrink-0">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: C.tealDim, color: C.teal }}
        >
          <Icon size={16} />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: C.bright }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: C.sub }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {count > 0 && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: C.mid, backgroundColor: C.panel, border: `1px solid ${C.borderSoft}` }}
          >
            {count}
          </span>
        )}
        {headerAction}
      </div>
    </div>

    {onSearchChange && (
      <div className="relative mb-4 shrink-0">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2.5 pl-9 text-sm rounded-xl focus:outline-none transition-colors font-sans"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.borderSoft}`, color: C.bright }}
          onFocus={(e) => (e.target.style.borderColor = C.tealBorder)}
          onBlur={(e) => (e.target.style.borderColor = C.borderSoft)}
        />
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.faint }} />
      </div>
    )}

    <div className="flex-grow overflow-y-auto space-y-2 pr-1 -mr-1">
      {isLoading ? (
        <div className="flex items-center justify-center h-full py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2" style={{ borderColor: C.teal, borderTopColor: "transparent" }} />
        </div>
      ) : data.length === 0 ? (
        <div
          className="text-center py-16 h-full flex flex-col items-center justify-center border border-dashed rounded-xl"
          style={{ borderColor: C.borderDashed }}
        >
          {searchTerm ? (
            <span className="text-xs font-medium" style={{ color: C.rose }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
        style={{ backgroundColor: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: C.radiusCard }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalCloseButton = ({ onClose }) => (
  <button
    onClick={onClose}
    className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
    style={{ color: C.sub }}
  >
    <X size={16} />
  </button>
);

export const Toast = ({ message, show }) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium"
        style={{ backgroundColor: C.panelRaised, color: C.bright, border: `1px solid ${C.borderSoft}` }}
      >
        <Check size={14} className="shrink-0" style={{ color: C.teal }} />
        <span>{message}</span>
      </div>
    </div>
  );
};
