import React from "react";

/* Subtle ambient depth only — no teal/purple wash that tinted the whole app. */
export default function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[400px] rounded-full opacity-[0.06] blur-[120px]"
        style={{ backgroundColor: "#ffffff" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px]"
        style={{ backgroundColor: "var(--teal)" }}
      />
    </div>
  );
}
