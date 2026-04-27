/** Component-edge operations: placement, edits, drag, symbol generation. */

import { ELEMENT_TYPES } from '../circuit/elementTypes.js';
import { COMPONENT_LENGTH } from './constants.js';

/** Generate a symbolic name like "C_{0}", "L_{1}", "E_J^{2}" that is
 *  not yet in use among existing components of any type. */
export function nextComponentSymbol(components, type) {
  const sym = ELEMENT_TYPES[type].symbol;
  const used = new Set(components.map((c) => c.value));
  let k = 0;
  let candidate;
  do {
    candidate = type === 'JJ' ? `E_J^{${k}}` : `${sym}_{${k}}`;
    k++;
  } while (used.has(candidate));
  return candidate;
}

/**
 * Place a stand-alone component centered at (x, y), oriented horizontally.
 * Creates two free vertices at the component's terminals and a single
 * component edge between them. Returns { wire, componentId }.
 */
export function placeStandaloneComponent(wire, x, y, type) {
  const half = COMPONENT_LENGTH / 2;
  const vAId = wire.nextVertexId;
  const vBId = wire.nextVertexId + 1;
  const compId = `c${wire.nextComponentId}`;
  const value = nextComponentSymbol(wire.components, type);
  return {
    wire: {
      ...wire,
      vertices: [
        ...wire.vertices,
        { id: vAId, x: x - half, y },
        { id: vBId, x: x + half, y },
      ],
      components: [
        ...wire.components,
        { id: compId, from: vAId, to: vBId, type, value },
      ],
      nextVertexId: vBId + 1,
      nextComponentId: wire.nextComponentId + 1,
    },
    componentId: compId,
  };
}

/**
 * Split a wire edge at parameter t and insert a component edge in the
 * middle. The wire is replaced by:
 *
 *     wire(A → P1) — component(P1 → P2) — wire(P2 → B)
 *
 * where P1, P2 are new vertices spaced ±COMPONENT_LENGTH/2 around the
 * click point. If the click is so close to an endpoint that one half
 * of the wire would be a near-zero stub, that side's component endpoint
 * snaps to the original endpoint instead (no stub wire is emitted).
 */
export function splitWireWithComponent(wire, wireId, t, type) {
  const w = wire.wires.find((e) => e.id === wireId);
  if (!w) return { wire, componentId: null };
  const a = wire.vertices.find((v) => v.id === w.from);
  const b = wire.vertices.find((v) => v.id === w.to);
  if (!a || !b) return { wire, componentId: null };

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) return { wire, componentId: null };

  const half = Math.min(COMPONENT_LENGTH, L * 0.9) / 2;
  const halfT = half / L;
  const tClamped = Math.max(halfT, Math.min(1 - halfT, t));
  let t1 = tClamped - halfT;
  let t2 = tClamped + halfT;
  if (t1 < 1e-3) t1 = 0;
  if (t2 > 1 - 1e-3) t2 = 1;

  let nextV = wire.nextVertexId;
  const newVertices = [...wire.vertices];
  let p1Id;
  let p2Id;
  if (t1 === 0) {
    p1Id = w.from;
  } else {
    p1Id = nextV++;
    newVertices.push({ id: p1Id, x: a.x + t1 * dx, y: a.y + t1 * dy });
  }
  if (t2 === 1) {
    p2Id = w.to;
  } else {
    p2Id = nextV++;
    newVertices.push({ id: p2Id, x: a.x + t2 * dx, y: a.y + t2 * dy });
  }

  let nextW = wire.nextWireId;
  const newWires = wire.wires.filter((e) => e.id !== wireId);
  if (t1 > 0) {
    newWires.push({ id: `w${nextW++}`, from: w.from, to: p1Id });
  }
  if (t2 < 1) {
    newWires.push({ id: `w${nextW++}`, from: p2Id, to: w.to });
  }

  const compId = `c${wire.nextComponentId}`;
  const value = nextComponentSymbol(wire.components, type);
  const newComp = { id: compId, from: p1Id, to: p2Id, type, value };

  return {
    wire: {
      ...wire,
      vertices: newVertices,
      wires: newWires,
      components: [...wire.components, newComp],
      nextVertexId: nextV,
      nextWireId: nextW,
      nextComponentId: wire.nextComponentId + 1,
    },
    componentId: compId,
  };
}

export function removeComponent(wire, componentId) {
  return { ...wire, components: wire.components.filter((c) => c.id !== componentId) };
}

export function setComponentType(wire, componentId, type) {
  return {
    ...wire,
    components: wire.components.map((c) =>
      c.id === componentId
        ? {
            ...c,
            type,
            value: nextComponentSymbol(
              wire.components.filter((cc) => cc.id !== componentId),
              type,
            ),
            ...(c.userColor ? {} : { color: undefined }),
          }
        : c,
    ),
  };
}

export function setComponentValue(wire, componentId, value) {
  return {
    ...wire,
    components: wire.components.map((c) => (c.id === componentId ? { ...c, value } : c)),
  };
}

export function setComponentColor(wire, componentId, color) {
  return {
    ...wire,
    components: wire.components.map((c) =>
      c.id === componentId ? { ...c, color, userColor: true } : c,
    ),
  };
}

/** Renumber every component of the given type sequentially as
 *  symbol_{0}, symbol_{1}, ... (or E_J^{k} for JJ) in current array
 *  order. Use to clean up labels that became sparse after deletes /
 *  merges. */
export function renumberComponentsOfType(wire, typeKey) {
  const sym = ELEMENT_TYPES[typeKey]?.symbol;
  if (!sym) return wire;
  let k = 0;
  return {
    ...wire,
    components: wire.components.map((c) => {
      if (c.type !== typeKey) return c;
      const value = typeKey === 'JJ' ? `E_J^{${k}}` : `${sym}_{${k}}`;
      k++;
      return { ...c, value };
    }),
  };
}

/**
 * Move a component's center to (cx, cy). Both endpoint vertices
 * translate together, preserving the component's orientation and
 * length. Wires connected to those endpoints follow because they
 * share vertex ids.
 *
 * If `snap` is provided, the component snaps onto the nearest wire
 * within the snap radius: the center lands on the wire and the
 * component reorients to lie along the wire direction. Pass null
 * (or omit) for free translation.
 */
export function moveComponentCenter(wire, componentId, cx, cy, snap = null) {
  const c = wire.components.find((cc) => cc.id === componentId);
  if (!c) return wire;
  const a = wire.vertices.find((v) => v.id === c.from);
  const b = wire.vertices.find((v) => v.id === c.to);
  if (!a || !b) return wire;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  let ux = L > 1e-6 ? dx / L : 1;
  let uy = L > 1e-6 ? dy / L : 0;
  let half = L > 1e-6 ? L / 2 : COMPONENT_LENGTH / 2;
  let centerX = cx;
  let centerY = cy;

  if (snap) {
    centerX = snap.x;
    centerY = snap.y;
    if (snap.dirX !== undefined && snap.dirY !== undefined) {
      ux = snap.dirX;
      uy = snap.dirY;
    }
    if (snap.maxHalf !== undefined) {
      half = Math.min(half, snap.maxHalf);
    }
  }

  const ax = centerX - half * ux;
  const ay = centerY - half * uy;
  const bx = centerX + half * ux;
  const by = centerY + half * uy;

  return {
    ...wire,
    vertices: wire.vertices.map((v) => {
      if (v.id === c.from) return { ...v, x: ax, y: ay };
      if (v.id === c.to) return { ...v, x: bx, y: by };
      return v;
    }),
  };
}
