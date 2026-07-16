import React from "react";

/* Sits once at the root of a page, behind everything (z-0, pointer-events-none).
   Glass surfaces (GlassSurface, the Navbar island, FilterBar) need dynamic
   color behind them to actually look like glass — without it, backdrop-blur
   + backdrop-saturate on a flat background just produces a hazy gray box.
   These are large, heavily blurred, low-opacity color fields — intentionally
   subtle, not a visible "background image." */
export default function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.14] blur-[140px]"
        style={{ backgroundColor: "#96d6cd" }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full opacity-[0.12] blur-[140px]"
        style={{ backgroundColor: "#a855f7" }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[480px] h-[480px] rounded-full opacity-[0.08] blur-[140px]"
        style={{ backgroundColor: "#96d6cd" }}
      />
    </div>
  );
}
