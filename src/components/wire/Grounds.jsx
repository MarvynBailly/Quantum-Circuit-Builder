import React from 'react';

const DEFAULT_STEM = 30;

/**
 * Reusable schematic-ground glyph: a stem from the anchor vertex out to
 * the chosen offset, then three shrinking horizontal bars at the stem's
 * far end, perpendicular to the stem direction.
 *
 * The whole glyph is drawn in a frame translated to the anchor and
 * rotated so the stem points along the requested (dx, dy). In the
 * canonical frame the stem points "south" (+y), bars at y = L, L+5,
 * L+10 — that way the rotation handles every direction uniformly.
 */
export function GroundGlyph({ x, y, dx = 0, dy = DEFAULT_STEM, color = 'currentColor', strokeWidth = 2, opacity = 1 }) {
  const L = Math.hypot(dx, dy) || DEFAULT_STEM;
  // Rotate so the canonical "south" axis aligns with (dx, dy).
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
  return (
    <g transform={`translate(${x},${y}) rotate(${angleDeg})`} opacity={opacity}>
      <line x1={0} y1={0} x2={0} y2={L} stroke={color} strokeWidth={strokeWidth} />
      <line x1={-12} y1={L} x2={12} y2={L} stroke={color} strokeWidth={strokeWidth} />
      <line x1={-8} y1={L + 5} x2={8} y2={L + 5} stroke={color} strokeWidth={strokeWidth} />
      <line x1={-4} y1={L + 10} x2={4} y2={L + 10} stroke={color} strokeWidth={strokeWidth} />
    </g>
  );
}

/** Render every ground in the wire model, tinted with the owning node's
 *  color. Each ground is selectable and draggable: the wrapping group
 *  carries hit-areas (transparent stem stroke + cap rect) so the user
 *  can click anywhere along the glyph to grab it. */
function Grounds({
  grounds = [],
  vById,
  vertexNodeId,
  colorForNode,
  isSelected,
  onGroundMouseDown,
  onGroundClick,
  flashingGroundId = null,
  selectedTool = null,
}) {
  return (
    <g>
      {grounds.map((g) => {
        const v = vById.get(g.vertexId);
        if (!v) return null;
        const nodeId = vertexNodeId.get(g.vertexId);
        const baseColor = colorForNode(nodeId);
        const flashing = flashingGroundId === g.id;
        const groundSelected = isSelected ? isSelected('wireGround', g.id) : false;
        const color = flashing ? 'var(--accent-red)' : baseColor;
        const dx = g.dx ?? 0;
        const dy = g.dy ?? DEFAULT_STEM;
        const L = Math.hypot(dx, dy) || DEFAULT_STEM;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
        const cursor = selectedTool ? 'pointer' : 'grab';
        const interactive = !!onGroundMouseDown;
        // Hit-area: a wide invisible stroke along the stem plus a wide
        // rect over the bars. Drawn in the same rotated frame as the
        // glyph so it tracks any orientation.
        return (
          <g
            key={g.id}
            className={flashing ? 'qcb-ground-flash' : undefined}
            style={interactive ? { cursor } : undefined}
            onMouseDown={
              interactive ? (e) => onGroundMouseDown(g.id, e) : undefined
            }
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    if (onGroundClick) onGroundClick(g.id, e);
                  }
                : undefined
            }
          >
            <g transform={`translate(${v.x},${v.y}) rotate(${angleDeg})`}>
              {groundSelected && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={L}
                    stroke={baseColor}
                    strokeWidth={10}
                    opacity={0.25}
                    pointerEvents="none"
                  />
                  <rect
                    x={-14}
                    y={L - 2}
                    width={28}
                    height={16}
                    fill={baseColor}
                    opacity={0.2}
                    pointerEvents="none"
                  />
                </>
              )}
              {interactive && (
                <>
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={L}
                    stroke="transparent"
                    strokeWidth={18}
                    pointerEvents="stroke"
                  />
                  <rect
                    x={-16}
                    y={L - 4}
                    width={32}
                    height={20}
                    fill="transparent"
                    pointerEvents="all"
                  />
                </>
              )}
              <line x1={0} y1={0} x2={0} y2={L} stroke={color} strokeWidth={2} pointerEvents="none" />
              <line x1={-12} y1={L} x2={12} y2={L} stroke={color} strokeWidth={2} pointerEvents="none" />
              <line x1={-8} y1={L + 5} x2={8} y2={L + 5} stroke={color} strokeWidth={2} pointerEvents="none" />
              <line x1={-4} y1={L + 10} x2={4} y2={L + 10} stroke={color} strokeWidth={2} pointerEvents="none" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

export default React.memo(Grounds);
