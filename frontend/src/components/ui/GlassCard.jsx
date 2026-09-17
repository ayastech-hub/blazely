// src/components/ui/GlassCard.jsx
//
// The ONE glass-morphism recipe for the whole app. Before this file existed,
// the exact same Tailwind string was independently copy-pasted into
// TokenCard.jsx, Navbar.jsx, TrendingTokens.jsx, and FilterBar.jsx — meaning
// a tweak to the glass effect in one of them silently drifted from the
// others. Every surface that wants "glass" should use GLASS / GlassCard from
// here, not redefine it locally.
import React from "react";

export const ACCENT = "var(--teal)";

// border + translucent white fill + blur + saturation + a soft outer shadow.
// This is what makes a surface read as "glass" instead of a flat panel —
// it needs the ambient <BackgroundGlow /> (rendered once in App.jsx) behind
// it to actually have color to blur, or it just looks like a hazy gray box.
export const GLASS =
  "border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-[1.6] backdrop-brightness-105 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.6)]";

// Nested elements *inside* a glass surface use a solid fill, never another
// blur layer — stacking backdrop-blur inside backdrop-blur muddies the
// effect and costs paint performance for no visual gain.
export const NESTED_FILL = "bg-[var(--bg)]/60 border border-white/[0.08]";

export function GlassCard({ children, className = "", isNew, glowTint, hover = true }) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-500 ${GLASS} ${
        isNew
          ? "border-[var(--teal)]/40 shadow-[0_0_0_1px_rgba(150,214,205,0.15),0_10px_40px_-8px_rgba(150,214,205,0.22)]"
          : ""
      } ${hover ? "hover:bg-white/[0.09] hover:border-white/[0.14]" : ""} ${className}`}
      style={{
        backgroundImage: glowTint
          ? `radial-gradient(120% 100% at 12% 0%, ${glowTint}, transparent 55%)`
          : undefined,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

// Kept as an alias so existing `import { GlassSurface } from "../components/TokenCard"`
// call sites don't all need to change at once — TokenCard.jsx re-exports this.
export const GlassSurface = GlassCard;
