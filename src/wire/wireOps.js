/** Operations on wire (pure-conductor) edges. */

export function addWire(wire, fromId, toId) {
  if (fromId === toId) return wire;
  const dup = wire.wires.find(
    (w) => (w.from === fromId && w.to === toId) || (w.from === toId && w.to === fromId),
  );
  if (dup) return wire;
  const id = `w${wire.nextWireId}`;
  return {
    ...wire,
    wires: [...wire.wires, { id, from: fromId, to: toId }],
    nextWireId: wire.nextWireId + 1,
  };
}

export function deleteWire(wire, wireId) {
  return { ...wire, wires: wire.wires.filter((w) => w.id !== wireId) };
}

/**
 * Insert a vertex at parameter t along a wire edge, splitting it into
 * two halves. Returns { wire, vertexId, halfAId, halfBId }.
 */
export function splitWireAt(wire, wireId, t) {
  const w = wire.wires.find((e) => e.id === wireId);
  if (!w) return { wire, vertexId: null, halfAId: null, halfBId: null };
  const a = wire.vertices.find((v) => v.id === w.from);
  const b = wire.vertices.find((v) => v.id === w.to);
  if (!a || !b) return { wire, vertexId: null, halfAId: null, halfBId: null };

  const x = a.x + t * (b.x - a.x);
  const y = a.y + t * (b.y - a.y);
  const vid = wire.nextVertexId;
  const halfAId = `w${wire.nextWireId}`;
  const halfBId = `w${wire.nextWireId + 1}`;

  return {
    wire: {
      ...wire,
      vertices: [...wire.vertices, { id: vid, x, y }],
      wires: wire.wires
        .filter((e) => e.id !== wireId)
        .concat([
          { id: halfAId, from: w.from, to: vid },
          { id: halfBId, from: vid, to: w.to },
        ]),
      nextVertexId: vid + 1,
      nextWireId: wire.nextWireId + 2,
    },
    vertexId: vid,
    halfAId,
    halfBId,
  };
}
