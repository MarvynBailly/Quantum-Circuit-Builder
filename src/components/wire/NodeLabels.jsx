import React from 'react';
import SvgLatex from '../SvgLatex.jsx';

const NODE_LABEL_OFFSET = 26;

/** Pick a label-offset direction for an electrical node so it doesn't
 *  sit on top of any wire leaving the node. */
function nodeLabelDirection(node, wire, vById) {
  if (!node.vertexIds || node.vertexIds.length === 0) return { x: 0, y: -1 };
  const vertexSet = new Set(node.vertexIds);
  let sx = 0;
  let sy = 0;
  for (const w of wire.wires) {
    let from;
    let to;
    if (vertexSet.has(w.from) && !vertexSet.has(w.to)) {
      from = vById.get(w.from);
      to = vById.get(w.to);
    } else if (vertexSet.has(w.to) && !vertexSet.has(w.from)) {
      from = vById.get(w.to);
      to = vById.get(w.from);
    } else continue;
    if (!from || !to) continue;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    sx += dx / L;
    sy += dy / L;
  }
  const sLen = Math.hypot(sx, sy);
  if (sLen < 1e-6) return { x: 0, y: -1 };
  return { x: -sx / sLen, y: -sy / sLen };
}

/** Render LaTeX labels for each electrical node. */
export default function NodeLabels({ wireNodes, wire, vById, labelScale, onHighlightNode }) {
  return (
    <>
      {wireNodes.map((n) => {
        if (!n.label) return null;
        const dir = nodeLabelDirection(n, wire, vById);
        const lx = n.x + dir.x * NODE_LABEL_OFFSET;
        const ly = n.y + dir.y * NODE_LABEL_OFFSET;
        return (
          <g key={`label-${n.id}`}>
            <g
              transform={`translate(${lx},${ly}) scale(${labelScale})`}
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
