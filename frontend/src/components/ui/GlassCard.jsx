// Solid panel surfaces matching the neutral dark-grey palette.
// No frosted white glass — that was picking up BackgroundGlow and looking blue.
import React from "react";

export const ACCENT = "var(--teal)";

/** Card / panel surface — solid, not translucent glass */
export const GLASS =
  "bg-[var(--panel)] border border-[var(--border)]/80 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.45)]";

/** Nested chips / metrics inside a panel */
export const NESTED_FILL = "bg-[var(--panel-raised)] border border-[var(--border)]/50";

export function GlassCard({ children, className = "", isNew, glowTint, hover = true }) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${GLASS} ${
        isNew ? "ring-1 ring-teal/25" : ""
      } ${hover ? "hover:bg-[var(--panel-raised)] hover:border-[var(--border-hi)]" : ""} ${className}`}
      style={{
        backgroundImage: glowTint
          ? `radial-gradient(120% 100% at 12% 0%, ${glowTint}, transparent 55%)`
          : undefined,
      }}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export const GlassSurface = GlassCard;
