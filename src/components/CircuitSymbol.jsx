import React from 'react';
import { ELEMENT_TYPES } from '../circuit/index.js';

/**
 * Renders an SVG schematic symbol for a circuit element between two points.
 * The lead segments use `wireColor`; the active part of the symbol uses
 * `color` (falling back to the element type's default color).
 */
export default function CircuitSymbol({ type, x1, y1, x2, y2, color, wireColor }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const c = color || ELEMENT_TYPES[type]?.color || 'var(--text-secondary)';
  const w = wireColor || 'var(--wire-color)';

  if (type === 'C') {
    const gap = 6;
    const plateH = 14;
    return (
      <g transform={`translate(${mx},${my}) rotate(${angle})`}>
        <line x1={-len / 2} y1={0} x2={-gap} y2={0} stroke={w} strokeWidth={2} />
        <line x1={-gap} y1={-plateH} x2={-gap} y2={plateH} stroke={c} strokeWidth={3} />
        <line x1={gap} y1={-plateH} x2={gap} y2={plateH} stroke={c} strokeWidth={3} />
        <line x1={gap} y1={0} x2={len / 2} y2={0} stroke={w} strokeWidth={2} />
      </g>
    );
  }

  if (type === 'L') {
    // Fewer coils with a wider span → each coil is longer, so the
    // sinusoidal-ish shape reads at small zoom levels and small icon
    // sizes. Coil region runs from -0.3·len to +0.3·len (60% of len);
    // the leads cover the remaining 20% on each side.
    const coils = 3;
    const span = 0.6;
    const half = (len * span) / 2;
    const cw = (len * span) / coils;
    let d = `M ${-half} 0 `;
    for (let i = 0; i < coils; i++) {
      const sx = -half + i * cw;
      d += `C ${sx + cw * 0.25} -14, ${sx + cw * 0.75} -14, ${sx + cw} 0 `;
    }
    return (
      <g transform={`translate(${mx},${my}) rotate(${angle})`}>
        <line x1={-len / 2} y1={0} x2={-half} y2={0} stroke={w} strokeWidth={2} />
        <path d={d} fill="none" stroke={c} strokeWidth={2.5} />
        <line x1={half} y1={0} x2={len / 2} y2={0} stroke={w} strokeWidth={2} />
      </g>
    );
  }

  // Josephson junction — cross symbol
  const sz = 10;
  return (
    <g transform={`translate(${mx},${my}) rotate(${angle})`}>
      <line x1={-len / 2} y1={0} x2={-sz} y2={0} stroke={w} strokeWidth={2} />
      <line x1={-sz} y1={-sz} x2={sz} y2={sz} stroke={c} strokeWidth={2.5} />
      <line x1={-sz} y1={sz} x2={sz} y2={-sz} stroke={c} strokeWidth={2.5} />
      <line x1={sz} y1={0} x2={len / 2} y2={0} stroke={w} strokeWidth={2} />
    </g>
  );
}
