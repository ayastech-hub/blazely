/**
 * utils/designTokens.js
 * =============================================================================
 * JS mirror of index.css :root (ACTIVE palette).
 * Use C.* for inline styles; use var(--*) in Tailwind classNames.
 * When changing a color, update index.css AND this file.
 * =============================================================================
 */

export const C = {
  /* Surfaces */
  bg: "#0a0a0c",
  bgDeep: "#0a0a0c",
  bgAlt: "#111114",
  panel: "#1f1f26",
  panel2: "#1f1f26",
  panelAlt: "#1f1f26",
  panelSoft: "rgba(31, 31, 38, 0.95)",
  panelRaised: "#2a2a32",

  /* Borders */
  border: "#2e2e38",
  borderSoft: "rgba(42, 42, 50, 0.6)",
  borderHi: "#3d3d48",
  borderDashed: "#2a2a32",

  /* Brand */
  teal: "#96d6cd",
  tealSoft: "#6fb8ad",
  tealDim: "rgba(150, 214, 205, 0.10)",
  tealGlow: "rgba(150, 214, 205, 0.18)",
  tealBorder: "rgba(150, 214, 205, 0.25)",

  /* Text */
  bright: "#f0f0f3",
  mid: "#a0a0ab",
  sub: "#a0a0ab",
  text: "#c4c4cc",
  faint: "#6e6e78",
  dim: "#55555e",

  /* Status */
  red: "#ef4f4f",
  redDim: "rgba(239, 79, 79, 0.10)",
  rose: "#fb7c93",
  roseDim: "rgba(251, 124, 147, 0.10)",
  roseBorder: "rgba(190, 18, 60, 0.35)",
  amber: "#f5b942",
  amberDim: "rgba(245, 185, 66, 0.10)",
  green: "#2fce6e",
  greenDim: "rgba(47, 206, 110, 0.10)",

  /* Shape */
  radiusCard: "1rem",
  radiusPill: "999px",
  shadowCard: "0 8px 24px rgba(0, 0, 0, 0.35)",

  /* Type */
  mono: "'JetBrains Mono','Fira Mono','Cascadia Code','Consolas',monospace",
  sans: "'Inter','SF Pro Text',system-ui,sans-serif",
  serif: "'Fraunces', Georgia, serif",
};

export default C;
