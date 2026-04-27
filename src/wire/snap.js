/**
 * Snap helpers — pure functions over a wire model + a cursor point.
 * Each returns either the snap target (id, parameter, etc.) or null.
 */

import { COMPONENT_LENGTH, FRACTIONS, GRID, SNAP_RADIUS } from './constants.js';
import { projectPointOnSegment } from './segmentMath.js';

export function snapToGrid(x, y, grid = GRID) {
  return { x: Math.round(x / grid) * grid, y: Math.round(y / grid) * grid };
}

/**
 * Snap parameter t∈[0,1] to one of the magnetic fractions if within
 * `tol` of one. Returns the snapped t (unchanged if no fraction is
 * in range).
 */
export function snapFraction(t, tol = 0.06) {
  let best = t;
  let bestD = tol;
  for (const f of FRACTIONS) {
    const d = Math.abs(t - f);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

export function snapToVertex(vertices, x, y, radius = SNAP_RADIUS) {
  let bestId = null;
  let bestD = radius;
  for (const v of vertices) {
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) {
      bestD = d;
      bestId = v.id;
    }
  }
  return bestId;
}

/**
 * Snap to the nearest wire edge. Returns { id, t, d, x, y } or null.
 * `excludeIds` skips wires whose id is in the set (useful when dragging
 * to ignore wires whose endpoint vertex is the one being moved).
 * `vById` is an optional pre-built id→vertex map; if omitted it's
 * rebuilt from `wire.vertices` (so callers on the hot path should
 * pass one).
 */
export function snapToWire(wire, x, y, radius = SNAP_RADIUS, excludeIds = null, vById = null) {
  const byId = vById ?? new Map(wire.vertices.map((v) => [v.id, v]));
  let best = null;
  for (const w of wire.wires) {
    if (excludeIds && excludeIds.has(w.id)) continue;
    const a = byId.get(w.from);
    const b = byId.get(w.to);
    if (!a || !b) continue;
    const proj = projectPointOnSegment(a, b, x, y);
    if (best === null || proj.d < best.d) {
      best = { id: w.id, t: proj.t, d: proj.d, x: proj.px, y: proj.py };
    }
  }
  if (!best || best.d > radius) return null;
  return best;
}

/**
 * Find the component whose body line is closest to (x,y). Used for
 * hit-testing existing components for selection or center-drag.
 * Accepts the same optional `vById` shortcut as `snapToWire`.
 */
export function snapToComponent(wire, x, y, radius = SNAP_RADIUS, vById = null) {
  const byId = vById ?? new Map(wire.vertices.map((v) => [v.id, v]));
  let best = null;
  for (const c of wire.components) {
    const a = byId.get(c.from);
    const b = byId.get(c.to);
    if (!a || !b) continue;
    const proj = projectPointOnSegment(a, b, x, y);
    if (best === null || proj.d < best.d) {
      best = { id: c.id, d: proj.d };
    }
  }
  if (!best || best.d > Math.max(radius, COMPONENT_LENGTH / 2)) return null;
  return best;
}
