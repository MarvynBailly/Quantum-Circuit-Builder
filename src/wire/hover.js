/**
 * Resolve a cursor point to a "what would happen if you click here"
 * descriptor for wire-mode interaction.
 *
 * Hover priority:
 *   - existing vertex
 *   - existing component (selection only, when no tool is active)
 *   - existing wire edge
 *   - grid-snap (or free placement when shift is held)
 *
 * Returned shapes:
 *   { kind: 'vertex',           id, x, y }
 *   { kind: 'component',        id }                       (no tool)
 *   { kind: 'wire',             wireId, t, x, y }          (wire tool / no tool)
 *   { kind: 'grid' | 'free',    x, y }                     (wire tool only)
 *   { kind: 'componentOnWire',  wireId, t, x, y, dirX, dirY }   (C/L/JJ tool)
 *   { kind: 'componentFree',    x, y, dirX, dirY }         (C/L/JJ tool)
 *
 * Returns null when nothing applies.
 */

import {
  snapFraction,
  snapToComponent,
  snapToGrid,
  snapToVertex,
  snapToWire,
} from './snap.js';

export function computeHover(wire, selectedTool, pt, shiftKey) {
  const verts = wire.vertices;
  const vById = new Map(verts.map((v) => [v.id, v]));

  const vid = snapToVertex(verts, pt.x, pt.y);
  if (vid !== null) {
    const v = vById.get(vid);
    return { kind: 'vertex', id: vid, x: v.x, y: v.y };
  }

  // No tool — prefer existing components for selection.
  if (!selectedTool) {
    const compHit = snapToComponent(wire, pt.x, pt.y);
    if (compHit) return { kind: 'component', id: compHit.id };
  }

  const wireHit = snapToWire(wire, pt.x, pt.y);

  if (selectedTool === 'wire') {
    if (wireHit) {
      const w = wire.wires.find((e) => e.id === wireHit.id);
      const a = vById.get(w.from);
      const b = vById.get(w.to);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      let tFinal = wireHit.t;
      // Default: prefer a grid intersection that lies on (or near) the
      // wire so wire crossings land cleanly on the grid. Shift skips
      // this and uses the raw cursor projection.
      if (!shiftKey && len2 > 1e-9) {
        const g = snapToGrid(pt.x, pt.y);
        const tg = ((g.x - a.x) * dx + (g.y - a.y) * dy) / len2;
        if (tg >= 0 && tg <= 1) {
          const px = a.x + tg * dx;
          const py = a.y + tg * dy;
          if (Math.hypot(g.x - px, g.y - py) < 12) {
            tFinal = tg;
          }
        }
      }
      return {
        kind: 'wire',
        wireId: wireHit.id,
        t: tFinal,
        x: a.x + tFinal * dx,
        y: a.y + tFinal * dy,
      };
    }
    if (shiftKey) return { kind: 'free', x: pt.x, y: pt.y };
    const g = snapToGrid(pt.x, pt.y);
    return { kind: 'grid', x: g.x, y: g.y };
  }

  if (selectedTool === 'C' || selectedTool === 'L' || selectedTool === 'JJ') {
    if (wireHit) {
      const w = wire.wires.find((e) => e.id === wireHit.id);
      const a = vById.get(w.from);
      const b = vById.get(w.to);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const L = Math.hypot(dx, dy);
      const tFinal = shiftKey ? wireHit.t : snapFraction(wireHit.t);
      return {
        kind: 'componentOnWire',
        wireId: wireHit.id,
        t: tFinal,
        x: a.x + tFinal * dx,
        y: a.y + tFinal * dy,
        dirX: L > 0 ? dx / L : 1,
        dirY: L > 0 ? dy / L : 0,
      };
    }
    const base = shiftKey ? pt : snapToGrid(pt.x, pt.y);
    return {
      kind: 'componentFree',
      x: base.x,
      y: base.y,
      dirX: 1,
      dirY: 0,
    };
  }

  // No tool, no component hit — fall back to wire for selection.
  if (wireHit) {
    const w = wire.wires.find((e) => e.id === wireHit.id);
    const a = vById.get(w.from);
    const b = vById.get(w.to);
    return {
      kind: 'wire',
      wireId: wireHit.id,
      t: wireHit.t,
      x: a.x + wireHit.t * (b.x - a.x),
      y: a.y + wireHit.t * (b.y - a.y),
    };
  }
  return null;
}
