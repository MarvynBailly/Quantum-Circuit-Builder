/**
 * Ground markers attached to wire vertices.
 *
 * A ground is a boundary condition (φ = const) on whichever electrical
 * node owns its vertex, not a two-terminal element. A node is grounded
 * iff any of its vertices appears in `wire.grounds`.
 *
 * Each entry also carries a (dx, dy) offset describing where the
 * ⏚ glyph hangs relative to the anchor vertex. Placement is two-click:
 * the first click sets the anchor (splitting a wire if needed); the
 * second click sets the offset, controlling which side of the wire the
 * glyph sits on and how far the stem extends.
 */

import { GRID, SNAP_RADIUS } from './constants.js';
import { snapToGrid, snapToVertex, snapToWire } from './snap.js';
import { splitWireAt } from './wireOps.js';

/** Default offset when none is supplied (south, one grid cell). */
export const DEFAULT_GROUND_OFFSET = { dx: 0, dy: GRID };

const ensureGrounds = (wire) => ({
  ...wire,
  grounds: wire.grounds ?? [],
  nextGroundId: wire.nextGroundId ?? 0,
});

export function hasGround(wire, vertexId) {
  return (wire.grounds ?? []).some((g) => g.vertexId === vertexId);
}

export function addGround(wire, vertexId, dx = DEFAULT_GROUND_OFFSET.dx, dy = DEFAULT_GROUND_OFFSET.dy) {
  const w = ensureGrounds(wire);
  if (hasGround(w, vertexId)) return w;
  const id = `g${w.nextGroundId}`;
  return {
    ...w,
    grounds: [...w.grounds, { id, vertexId, dx, dy }],
    nextGroundId: w.nextGroundId + 1,
  };
}

export function removeGround(wire, groundId) {
  const w = ensureGrounds(wire);
  return { ...w, grounds: w.grounds.filter((g) => g.id !== groundId) };
}

export function removeGroundsForVertex(wire, vertexId) {
  const w = ensureGrounds(wire);
  return { ...w, grounds: w.grounds.filter((g) => g.vertexId !== vertexId) };
}

/**
 * First click of the two-click placement. Returns:
 *   { wire, vertexId }
 *
 *   - vertexId: the anchor vertex to bind the ground to (or null if
 *     the click missed both a vertex and a wire — caller should ignore).
 *   - wire: the (possibly mutated) wire model — a new vertex may have
 *     been created by splitting a wire under the cursor.
 *
 * When the click lands on a wire (no existing vertex under the cursor),
 * the split point snaps to a grid intersection on the wire if one lies
 * within the snap window — same logic as the wire tool. Pass
 * `shiftKey=true` to bypass the grid snap and split exactly under the
 * cursor.
 *
 * The function does NOT toggle off existing grounds; the caller is
 * responsible for blocking re-placement on already-grounded nodes.
 */
export function beginGroundAt(wire, x, y, shiftKey = false) {
  const vid = snapToVertex(wire.vertices, x, y);
  if (vid !== null) {
    return { wire, vertexId: vid };
  }
  const hit = snapToWire(wire, x, y, SNAP_RADIUS);
  if (hit) {
    let t = hit.t;
    if (!shiftKey) {
      const w = wire.wires.find((ww) => ww.id === hit.id);
      const a = w && wire.vertices.find((v) => v.id === w.from);
      const b = w && wire.vertices.find((v) => v.id === w.to);
      if (a && b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (len2 > 1e-9) {
          const g = snapToGrid(x, y);
          const tg = ((g.x - a.x) * dx + (g.y - a.y) * dy) / len2;
          if (tg >= 0 && tg <= 1) {
            const px = a.x + tg * dx;
            const py = a.y + tg * dy;
            if (Math.hypot(g.x - px, g.y - py) < 12) t = tg;
          }
        }
      }
    }
    const r = splitWireAt(wire, hit.id, t);
    return { wire: r.wire, vertexId: r.vertexId };
  }
  return { wire, vertexId: null };
}

/** Replace a ground's offset (used when dragging the glyph). */
export function setGroundOffset(wire, groundId, dx, dy) {
  const w = ensureGrounds(wire);
  return {
    ...w,
    grounds: w.grounds.map((g) => (g.id === groundId ? { ...g, dx, dy } : g)),
  };
}

/**
 * Snap the ground glyph's tip to the nearest grid intersection and
 * return the resulting (dx, dy) offset relative to the anchor.
 * Diagonals are allowed — the tip can land on any grid point, not just
 * the cardinal axes. Pass `freeForm=true` to skip the snap and use the
 * raw cursor offset.
 *
 * The anchor itself need not be on the grid (vertices created by
 * splitting an off-axis wire aren't), so the resulting (dx, dy) may
 * not be a clean GRID multiple — it's whatever positions the tip on
 * the closest grid intersection. A zero-length stem is pushed out one
 * cell in the dominant cursor direction.
 */
export function snapGroundOffset(anchorX, anchorY, cursorX, cursorY, freeForm = false) {
  const dx = cursorX - anchorX;
  const dy = cursorY - anchorY;
  if (freeForm) {
    if (dx === 0 && dy === 0) return { ...DEFAULT_GROUND_OFFSET };
    return { dx, dy };
  }
  const tip = snapToGrid(cursorX, cursorY);
  let ndx = tip.x - anchorX;
  let ndy = tip.y - anchorY;
  if (Math.abs(ndx) < 1e-6 && Math.abs(ndy) < 1e-6) {
    if (dx === 0 && dy === 0) return { ...DEFAULT_GROUND_OFFSET };
    if (Math.abs(dx) >= Math.abs(dy)) {
      ndx = dx >= 0 ? GRID : -GRID;
      ndy = 0;
    } else {
      ndx = 0;
      ndy = dy >= 0 ? GRID : -GRID;
    }
  }
  return { dx: ndx, dy: ndy };
}

/**
 * Rewire the grounds array after a vertex merge: any ground attached
 * to `fromId` now points to `intoId`, and duplicate grounds on the
 * resulting vertex collapse to one.
 */
export function remapGroundsAfterMerge(wire, fromId, intoId) {
  const grounds = (wire.grounds ?? []).map((g) =>
    g.vertexId === fromId ? { ...g, vertexId: intoId } : g,
  );
  const seen = new Set();
  const deduped = [];
  for (const g of grounds) {
    if (seen.has(g.vertexId)) continue;
    seen.add(g.vertexId);
    deduped.push(g);
  }
  return { ...wire, grounds: deduped };
}
