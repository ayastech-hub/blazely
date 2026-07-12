/**
 * =================================================================================
 * utils/designTokens.js
 * =================================================================================
 * The exact color/typography tokens from the preview design, extracted to one file so
 * every panel component uses the same palette instead of re-declaring it. TypeScript types
 * removed (this codebase is .jsx, not .tsx) but every value is unchanged from the preview.
 * =================================================================================
 */

export const C = {
  bg: "#030712",
  bgDeep: "#02040a",
  panel: "#0a0f1c",
  panel2: "#0d1320",
  border: "#1e293b",
  borderHi: "#334155",
  teal: "#96d6cd",
  tealDim: "rgba(150,214,205,0.08)",
  tealGlow: "rgba(150,214,205,0.18)",
  red: "#fb7185",
  redDim: "rgba(251,113,133,0.10)",
  amber: "#fbbf24",
  amberDim: "rgba(251,191,36,0.10)",
  dim: "#334155",
  mid: "#475569",
  sub: "#cbd5e1",
  text: "#cbd5e1",
  bright: "#e2e8f0",
  mono: "'JetBrains Mono','Fira Mono','Cascadia Code','Consolas',monospace",
  sans: "'Inter','SF Pro Text',system-ui,sans-serif",
};
