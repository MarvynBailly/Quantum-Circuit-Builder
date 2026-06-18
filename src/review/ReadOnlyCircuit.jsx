import React, { useMemo } from 'react';
import WireLayer from '../components/WireLayer.jsx';
import { parseImportPayload } from '../circuit/exportJSON.js';
import { autoDetectNodes } from '../wire/index.js';

/** Compute a transform that fits `points` (with x/y) into a W×H box. */
function fitTransform(points, W, H, pad = 18) {
  if (!points || points.length === 0) return 'translate(0,0) scale(1)';
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const scale = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h, 1.5);
  const tx = (W - scale * (minX + maxX)) / 2;
  const ty = (H - scale * (minY + maxY)) / 2;
  return `translate(${tx},${ty}) scale(${scale})`;
}

/**
 * Read-only render of a submitted circuit (the buildExportPayload JSON),
 * for the review page. Reuses the import parser + node auto-detection +
 * the canvas WireLayer (with no interaction handlers). Schematic-mode
 * submissions get a minimal fallback render.
 */
export default function ReadOnlyCircuit({ circuit, width = 380, height = 240 }) {
  const parsed = useMemo(() => {
    try {
      return parseImportPayload(circuit);
    } catch {
      return null;
    }
  }, [circuit]);

  const wireNodes = useMemo(() => {
    if (!parsed || parsed.kind !== 'wire') return [];
    const previousNodes = (parsed.nodeOverrides || []).map((o) => ({
      label: o.label,
      color: o.color,
      userLabel: !!o.label,
      userColor: !!o.color,
      isGround: !!o.is_ground,
      vertexIds: o.anchor != null ? [o.anchor] : [],
    }));
    return autoDetectNodes(parsed.wire, { nodes: previousNodes, edges: [] }).nodes;
  }, [parsed]);

  if (!parsed) {
    return <div style={errBox}>Could not render this circuit.</div>;
  }

  const box = {
    width,
    height,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  };

  if (parsed.kind === 'wire') {
    const transform = fitTransform(parsed.wire.vertices, width, height);
    return (
      <svg width={width} height={height} style={box}>
        <g transform={transform}>
          <WireLayer
            wire={parsed.wire}
            wireNodes={wireNodes}
            selection={[]}
            selectedTool={null}
            hover={null}
            drawingFromVertexId={null}
            showLabels
            zoom={1}
          />
        </g>
      </svg>
    );
  }

  // Schematic (legacy) fallback: minimal nodes + typed edges.
  const transform = fitTransform(parsed.nodes, width, height);
  const byId = new Map(parsed.nodes.map((n) => [n.id, n]));
  return (
    <svg width={width} height={height} style={box}>
      <g transform={transform}>
        {parsed.edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--text-secondary)" strokeWidth={2} />
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 4}
                fill="var(--text-muted)"
                fontSize={11}
                textAnchor="middle"
              >
                {e.type}
              </text>
            </g>
          );
        })}
        {parsed.nodes.map((n) => (
          <circle key={n.id} cx={n.x} cy={n.y} r={5} fill={n.isGround ? '#9ca3af' : 'var(--accent-blue)'} />
        ))}
      </g>
    </svg>
  );
}

const errBox = {
  padding: 16,
  color: 'var(--accent-red)',
  fontSize: 12,
};
