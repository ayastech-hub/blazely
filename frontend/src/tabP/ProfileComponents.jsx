import React from "react";
import {
  Check,
  Search,
  Edit3, // Exported for use in the modal header in Profile.jsx
} from "lucide-react";

// DashboardCard is kept here as a reusable presentational component for the tabs
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
  iconBgColor,
}) => (
  <div className="card relative overflow-hidden h-full flex flex-col min-h-[400px]">
    <div className="relative z-10 flex flex-col flex-grow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${iconBgColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {count > 0 && (
          <span className="text-xs text-slate-400 bg-white/10 px-2.5 py-1 rounded-full">
            {count} items
          </span>
        )}
      </div>

      {onSearchChange && (
        <div className="relative mb-3 shrink-0">
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            // MODIFIED: Changed focus ring/border color to slate-500
            className="w-full px-4 py-2 pl-10 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 transition-all text-sm"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}

      <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-3 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            {/* Kept purple-400 spin for loading visibility */}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 h-full flex flex-col items-center justify-center">
            {searchTerm ? (
              <p className="text-slate-500">
                No tokens found for "{searchTerm}".
              </p>
            ) : (
              emptyState
            )}
          </div>
        ) : (
          <div>
            {data.map((item, index) => (
              <div key={item.address || index}>{renderItem(item)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export const Modal = ({ isOpen, onClose, children }) => (
  <>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute left-0 right-0 top-0 bottom-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          // MODIFIED: Changed border to requested border-slate-800/60
          className="relative z-10 max-w-md w-full bg-slate-900/80 border border-slate-800/60 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
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
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
        <div
          // MODIFIED: Changed background and border from emerald to dark slate/gray
          className="flex items-center gap-3 bg-slate-700/90 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-500/40"
        >
          <Check className="w-5 h-5 text-emerald-400" />
          {/* Keep check icon bright */}
          <span className="font-medium">{message}</span>
        </div>
      </div>
    )}
  </>
);

// Export Edit3 for use in the modal header within Profile.jsx
export { Edit3 };
