import React from 'react';
import SvgLatex from '../SvgLatex.jsx';

const PERP_DIST = 16;
const FALLBACK_OFFSET = 32;

/** Compute the on-canvas position for a node's label.
 *
 *  We pick a wire segment associated with the node and place the label
 *  at the *midpoint* of that segment, offset perpendicular to the side.
 *
 *  Preference order:
 *    1. Longest internal wire (both endpoints belong to the node) —
 *       safe because no other node can claim it, so adjacent labels
 *       never collide.
 *    2. Longest outgoing wire — only used when the node is a single
 *       vertex with no internal wires.
 *    3. Fallback above the vertex (truly orphan node).
 *
 *  The perpendicular side is chosen consistently: horizontal-ish
 *  segments get labels above; vertical-ish segments get labels to the
 *  right. This is independent of which way the segment "points," so
 *  the same wire produces the same label side regardless of how
 *  endpoints are stored. */
function nodeLabelPosition(node, wires, vById) {
  const fallback = { x: node.x, y: node.y - FALLBACK_OFFSET };
  if (!node.vertexIds || node.vertexIds.length === 0) return fallback;
  const vertexSet = new Set(node.vertexIds);

  const internal = [];
  const outgoing = [];

  for (const w of wires) {
    const fromIn = vertexSet.has(w.from);
    const toIn = vertexSet.has(w.to);
    if (!fromIn && !toIn) continue;
    const a = vById.get(w.from);
    const b = vById.get(w.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const seg = { ax: a.x, ay: a.y, bx: b.x, by: b.y, ux: dx / L, uy: dy / L, L };
    if (fromIn && toIn) internal.push(seg);
    else outgoing.push(seg);
  }

  const pool = internal.length > 0 ? internal : outgoing;
  if (pool.length === 0) return fallback;

  let chosen = pool[0];
  for (const s of pool) if (s.L > chosen.L) chosen = s;

  const mx = (chosen.ax + chosen.bx) / 2;
  const my = (chosen.ay + chosen.by) / 2;

  const perpA = { x: -chosen.uy, y: chosen.ux };
  const perpB = { x: chosen.uy, y: -chosen.ux };
  const perp =
    perpA.y < perpB.y || (perpA.y === perpB.y && perpA.x > perpB.x) ? perpA : perpB;

  return {
    x: mx + perp.x * PERP_DIST,
    y: my + perp.y * PERP_DIST,
  };
}

/** Render LaTeX labels for each electrical node. */
function NodeLabels({ wireNodes, wires, vById, labelScale, onHighlightNode }) {
  return (
    <>
      {wireNodes.map((n) => {
        if (!n.label) return null;
        const pos = nodeLabelPosition(n, wires, vById);
        return (
          <g key={`label-${n.id}`}>
            <g
              transform={`translate(${pos.x},${pos.y}) scale(${labelScale})`}
              pointerEvents={onHighlightNode ? 'auto' : 'none'}
              style={onHighlightNode ? { cursor: 'pointer' } : undefined}
              onMouseDown={onHighlightNode ? (e) => e.stopPropagation() : undefined}
              onClick={
                onHighlightNode
                  ? (e) => {
                      e.stopPropagation();
                      onHighlightNode(n.id);
                    }
                  : undefined
              }
            >
              <SvgLatex
                text={`${n.isGround ? '⏚\\, ' : ''}${n.label}`}
                x={0}
                y={0}
                fontSize={16}
                color="var(--text-primary)"
                fontWeight={600}
              />
            </g>
          </g>
        );
      })}
    </>
  );
}

export default React.memo(NodeLabels);
