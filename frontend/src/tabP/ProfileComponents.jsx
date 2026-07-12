// src/tabp/ProfileComponents.jsx
import React from "react";
import { Check, Search, Edit3 } from "lucide-react";

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
}) => (
  <div className="font-mono h-full flex flex-col min-h-[400px] bg-[#0b0f19]/40 border border-slate-900 p-4 rounded-none">
    <div className="flex items-center justify-between mb-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#030712] border border-slate-900 flex items-center justify-center text-slate-500 rounded-none">
          <Icon size={14} />
        </div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">{title}</h3>
      </div>
      {count > 0 && (
        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">
          [{count}_ITEMS]
        </span>
      )}
    </div>

    {onSearchChange && (
      <div className="relative mb-3 shrink-0">
        <input
          type="text"
          placeholder="SEARCH_BY_METRIC..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 pl-8 bg-[#030712] border border-slate-900 text-xs text-slate-200 placeholder-slate-600 rounded-none focus:outline-none"
        />
        <Search size={12} className="text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    )}

    <div className="flex-grow overflow-y-auto space-y-2 pr-1">
      {isLoading ? (
        <div className="flex items-center justify-center h-full py-12">
          <div className="animate-spin rounded-none h-5 w-5 border border-[#96d6cd] border-t-transparent"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 h-full flex flex-col items-center justify-center border border-dashed border-slate-900 bg-[#030712]/50">
          {searchTerm ? (
            <span className="text-[10px] text-rose-500 uppercase tracking-wider font-bold">!! QUERY_EMPTY // "{searchTerm}"</span>
          ) : (
            emptyState
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item, idx) => (
            <div key={item.address || idx}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const Modal = ({ isOpen, onClose, children }) => (
  <>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono">
        <div className="absolute inset-0 bg-black/75" onClick={onClose} />
        <div 
          className="relative z-10 max-w-md w-full bg-[#030712] border border-slate-900 rounded-none shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    )}
  </>
);

export const Toast = ({ message, show }) => (
  <>
    {show && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] font-mono">
        <div className="flex items-center gap-2 bg-[#0b0f19] text-slate-200 px-4 py-2 rounded-none border border-slate-800 shadow-2xl text-[10px] font-bold uppercase tracking-wider">
          <Check size={12} className="text-[#96d6cd] shrink-0" />
          <span>{message}</span>
        </div>
      </div>
    )}
  </>
);

export { Edit3 };
