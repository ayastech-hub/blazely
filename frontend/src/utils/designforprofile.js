// src/utils/designforprofile.js
//
// Single source of truth for color values across the app. Every component
// should import { C } from here instead of hardcoding hex values in JSX.
// This mirrors the token set established during the Token Info Page rebuild.

export const C
  // surfaces
  bg: "#030712",
  panel: "#0b0f19",
  panelAlt: "#050811",
  panelSoft: "rgba(11, 15, 25, 0.4)",

  // borders
  border: "#0f172a",
  borderDim: "rgba(15, 23, 42, 0.6)",
  borderDashed: "#0f172a",

  // brand / accent
  teal: "#96d6cd",
  tealDim: "rgba(150, 214, 205, 0.08)",
  tealBorder: "rgba(150, 214, 205, 0.18)",

  // text
  bright: "#e2e8f0", // headings, primary values
  mid: "#94a3b8",    // secondary text, active labels
  sub: "#64748b",    // muted labels, metadata
  faint: "#475569",  // disabled / placeholder-level text

  // status
  rose: "#fb7185",
  roseDim: "rgba(244, 63, 94, 0.08)",
  roseBorder: "rgba(190, 18, 60, 0.35)",
};

export default C;
