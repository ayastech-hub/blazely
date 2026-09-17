// Lighter solid panels vs page bg — no harsh edges.
import React from "react";

export const ACCENT = "var(--teal)";

/** Card / navbar surface — lighter than page bg, soft shadow, no thick border */
export const GLASS =
  "bg-[var(--panel)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]";

/** Nested chips / metrics */
export const NESTED_FILL = "bg-[var(--panel-raised)]";

export function GlassCard({ children, className = "", isNew, glowTint, hover = true }) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${GLASS} ${
        isNew ? "ring-1 ring-teal/30" : ""
      } ${hover ? "hover:bg-[var(--panel-raised)]" : ""} ${className}`}
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
