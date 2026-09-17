// src/components/ui/Alert.jsx
//
// One reusable alert/banner for warning, error, success, and info states —
// replaces the several ad-hoc versions that had each picked slightly
// different corner radii and opacity values (CreateToken.jsx, Locking.jsx).
import React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";

const VARIANTS = {
  warning: { color: "var(--amber)", bg: "var(--amber-deep)", Icon: AlertTriangle },
  error: { color: "var(--rose)", bg: "var(--rose-deep)", Icon: XCircle },
  success: { color: "var(--green)", bg: "var(--green-deep)", Icon: CheckCircle2 },
  info: { color: "var(--teal)", bg: "var(--panel-alt)", Icon: Info },
};

export default function Alert({ variant = "info", title, children, onDismiss, className = "" }) {
  const { color, bg, Icon } = VARIANTS[variant] || VARIANTS.info;

  return (
    <div
      className={`p-3.5 rounded-2xl backdrop-blur-md border flex items-start gap-3 text-xs ${className}`}
      style={{ background: `${bg}4d`, borderColor: `${color}80`, color }}
    >
      <Icon size={14} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold mb-0.5" style={{ color: "var(--text-bright)" }}>{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
