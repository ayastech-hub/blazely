/**
 * =================================================================================
 * utils/bubblePacking.js
 * =================================================================================
 * HONESTY NOTE, read before assuming this is a physics simulation: the preview design's
 * bubble positions were hand-placed mock coordinates. This file computes REAL positions from
 * REAL holder percentages, but uses a deterministic spiral-placement algorithm, not a true
 * force-directed / collision-resolving physics simulation. It's a good, cheap, dependency-free
 * approximation: bubbles are sized correctly (area proportional to holding %, via sqrt scaling
 * so it's *area*, not radius, that's proportional — getting this wrong is a classic bubble
 * chart bug), and placed via a spiral so bigger holders land more centrally, but it does NOT
 * guarantee zero overlap the way a real physics packer does.
 *
 * IF YOU WANT TRUE PHYSICS-BASED PACKING (recommended once this is real user-facing data,
 * not just a working first version): add `d3-force` as a dependency and replace this file's
 * `computeBubbleLayout` with something like:
 *
 *   import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';
 *   const simulation = forceSimulation(nodes)
 *     .force('x', forceX(width / 2).strength(0.05))
 *     .force('y', forceY(height / 2).strength(0.05))
 *     .force('collide', forceCollide((d) => d.radius + 2))
 *     .stop();
 *   for (let i = 0; i < 300; i++) simulation.tick(); // run synchronously, no animation needed
 *
 * That gives you guaranteed non-overlapping circles via actual collision resolution. Swapping
 * it in only requires changing this one file — every component consuming
 * `computeBubbleLayout()`'s output shape (`{ x, y, r, ...holder }`) stays the same.
 * =================================================================================
 */

const MIN_RADIUS = 8;
const MAX_RADIUS = 80;

/**
 * @param {Array<{wallet_address: string, balance: string|number}>} holders sorted desc by balance
 * @param {number} totalSupply used to compute each holder's percentage
 * @param {number} width viewBox width
 * @param {number} height viewBox height
 * @returns {Array<{wallet_address: string, balance: number, pct: number, x: number, y: number, r: number}>}
 */
export function computeBubbleLayout(holders, totalSupply, width = 540, height = 320) {
  if (!holders || holders.length === 0 || !totalSupply) return [];

  const withPct = holders.map((h) => ({
    ...h,
    balance: Number(h.balance),
    pct: (Number(h.balance) / totalSupply) * 100,
  }));

  const maxPct = Math.max(...withPct.map((h) => h.pct));
  // Area-proportional radius: r ∝ sqrt(pct), not r ∝ pct — otherwise a 2x-larger holding
  // would visually look 4x bigger (area scales with r²), which misrepresents the data.
  const radiusFor = (pct) => {
    const scale = Math.sqrt(pct / maxPct);
    return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * scale;
  };

  const centerX = width / 2;
  const centerY = height / 2;

  return withPct.map((h, i) => {
    const r = radiusFor(h.pct);
    if (i === 0) {
      // Largest holder anchored at center, matching the preview's visual emphasis on the
      // top holder (usually the bonding curve / LP itself pre- and post-graduation).
      return { ...h, x: centerX, y: centerY, r };
    }
    // Simple spiral: angle increases per bubble, radius-from-center grows with index so
    // later (smaller) bubbles land further out. Cheap, deterministic, good enough for a
    // first version — see the d3-force upgrade note above for guaranteed non-overlap.
    const angle = i * 2.399963; // golden angle in radians — gives an even spiral spread
    const spiralRadius = 40 + i * 14;
    const x = Math.min(width - r, Math.max(r, centerX + Math.cos(angle) * spiralRadius));
    const y = Math.min(height - r, Math.max(r, centerY + Math.sin(angle) * spiralRadius));
    return { ...h, x, y, r };
  });
}
