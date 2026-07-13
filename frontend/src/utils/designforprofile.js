// src/utils/designForProfile.js
//
// Single source of truth for color/surface values used across the Profile
// page. Every component imports { C } from here instead of hardcoding hex
// values in JSX. (Renamed from designTokens.js.)

export const C = {
  // surfaces
  bg: "#030712",
  panel: "#0b0f19",
  panelAlt: "#0d1220",
  panelSoft: "rgba(11, 15, 25, 0.55)",
  panelRaised: "#10182a",

  // borders
  border: "#1b2333",
  borderSoft: "rgba(27, 35, 51, 0.6)",
  borderDashed: "#1b2333",

  // brand / accent
  teal: "#96d6cd",
  tealSoft: "#6fb8ad",
  tealDim: "rgba(150, 214, 205, 0.10)",
  tealBorder: "rgba(150, 214, 205, 0.25)",

  // text
  bright: "#f1f5f9",
  mid: "#a3b1c6",
  sub: "#6b7890",
  faint: "#4b5568",

  // status
  green: "#4ade80",
  greenDim: "rgba(74, 222, 128, 0.10)",
  rose: "#fb7185",
  roseDim: "rgba(244, 63, 94, 0.10)",
  roseBorder: "rgba(190, 18, 60, 0.35)",

  // shape
  radiusCard: "1rem",
  radiusPill: "999px",
  shadowCard: "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.25)",
};

export default C;
