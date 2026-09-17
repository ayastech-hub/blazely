// src/components/ui/Loading.jsx
//
// One central loading state for the whole app. Before this, Bridge.jsx,
// Locking.jsx, Leaderboard.jsx, Profile.jsx, PublicProfile.jsx,
// TokenInfoPage.jsx, and CreateToken.jsx each wrote their own Loader2 +
// centering markup independently. (For grid-of-cards loading, use
// TokenCardSkeleton from TokenCard.jsx instead — this component is for
// single-target/page-level loading.)
//
// A self-contained, single SVG that animates the app's ACTUAL logo mark
// (the same path data as components/Logo.jsx) drawing and redrawing itself
// via stroke-dasharray/-dashoffset, plus the shadow-accent bolt pulsing —
// rather than compositing a separate generic ring around a static logo.
// One <svg> with inline <style>/keyframes, same technique you'd use for
// any hand-built brand loader: no React state needed to drive the
// animation itself, it's pure CSS running inside the SVG.
import React from "react";

const SIZES = { sm: 32, md: 52, lg: 72 };
const TEXT_SIZES = { sm: 11, md: 12, lg: 13 };

// Approximate total length of the outline path below (viewBox 0-100) — a
// slight overestimate is fine for an infinite "draw" loop; it doesn't need
// to be pixel-exact the way a one-shot "draw complete then stop" would.
const PATH_LENGTH = 160;

export default function Loading({ label = "Loading…", size = "md", fullSection = false, className = "" }) {
  const px = SIZES[size] || SIZES.md;
  const text = TEXT_SIZES[size] || TEXT_SIZES.md;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullSection ? "min-h-[50vh]" : "py-10"
      } ${className}`}
    >
      <svg width={px} height={px} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style>{`
          .blz-loading-outline {
            fill: none;
            stroke: var(--teal);
            stroke-width: 5;
            stroke-linejoin: round;
            stroke-linecap: round;
            stroke-dasharray: ${PATH_LENGTH};
            stroke-dashoffset: ${PATH_LENGTH};
            animation: blz-loading-draw 1.6s ease-in-out infinite;
          }
          .blz-loading-accent {
            fill: var(--teal);
            transform-origin: 46px 60px;
            animation: blz-loading-pulse 1.6s ease-in-out infinite;
          }
          @keyframes blz-loading-draw {
            0%   { stroke-dashoffset: ${PATH_LENGTH}; opacity: 0.3; }
            50%  { stroke-dashoffset: 0; opacity: 1; }
            100% { stroke-dashoffset: -${PATH_LENGTH}; opacity: 0.3; }
          }
          @keyframes blz-loading-pulse {
            0%, 100% { opacity: 0.25; transform: scale(0.9); }
            50%      { opacity: 0.6;  transform: scale(1.08); }
          }
        `}</style>

        {/* Same path data as components/Logo.jsx — the "B + lightning" mark */}
        <path className="blz-loading-outline" d="M38 25 H58 C66 25, 68 33, 58 39 C68 43, 66 53, 54 53 H42 L30 75 L44 47 H36 L52 25" />
        <polygon className="blz-loading-accent" points="46,47 54,47 41,73" />
      </svg>

      {label && (
        <span style={{ fontSize: text, color: "var(--text-mid)", fontFamily: "monospace", letterSpacing: "0.04em" }}>
          {label}
        </span>
      )}
    </div>
  );
}
