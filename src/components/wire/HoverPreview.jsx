import React from 'react';
import CircuitSymbol from '../CircuitSymbol.jsx';
import { COMPONENT_LENGTH } from '../../wire/index.js';

/** Render the hover preview overlays (in-progress wire line, ghost
 *  vertex, ghost component) based on the active tool and hover kind. */
export default function HoverPreview({ wire, hover, selectedTool, drawingFromVertexId }) {
  const isWireTool = selectedTool === 'wire';
  const isCompTool = selectedTool === 'C' || selectedTool === 'L' || selectedTool === 'JJ';

  let drawingVertex = null;
  if (drawingFromVertexId !== null) {
    drawingVertex = wire.vertices.find((v) => v.id === drawingFromVertexId) || null;
  }

  let target = null;
  if (hover) {
    if (hover.kind === 'vertex') {
      const v = wire.vertices.find((vv) => vv.id === hover.id);
      if (v) target = { x: v.x, y: v.y };
    } else if (hover.x !== undefined) {
      target = { x: hover.x, y: hover.y };
    }
  }

  return (
    <>
      {/* In-progress drawing line */}
      {isWireTool && drawingVertex && target && (
        <line
          x1={drawingVertex.x}
          y1={drawingVertex.y}
          x2={target.x}
          y2={target.y}
          stroke="var(--accent-amber)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
          pointerEvents="none"
        />
      )}

      {/* Wire-tool ghost vertex (grid / free / on-wire) */}
      {isWireTool &&
        hover &&
        (hover.kind === 'grid' || hover.kind === 'free' || hover.kind === 'wire') && (
          <g pointerEvents="none" opacity={0.85}>
            {hover.kind === 'grid' && (
              <>
                <line
                  x1={hover.x - 9}
                  y1={hover.y}
                  x2={hover.x + 9}
                  y2={hover.y}
                  stroke="var(--accent-amber)"
                  strokeWidth={1}
                  opacity={0.45}
                />
                <line
                  x1={hover.x}
                  y1={hover.y - 9}
                  x2={hover.x}
                  y2={hover.y + 9}
                  stroke="var(--accent-amber)"
                  strokeWidth={1}
                  opacity={0.45}
                />
              </>
            )}
            <circle
              cx={hover.x}
              cy={hover.y}
              r={5}
              fill="none"
              stroke="var(--accent-amber)"
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
          </g>
        )}

      {/* Component-tool ghost (over a wire = will split + insert; over
          empty space = will spawn standalone). */}
      {isCompTool && hover && (hover.kind === 'componentOnWire' || hover.kind === 'componentFree') && (
        <g pointerEvents="none" opacity={0.55}>
          <CircuitSymbol
            type={selectedTool}
            x1={hover.x - (hover.dirX * COMPONENT_LENGTH) / 2}
            y1={hover.y - (hover.dirY * COMPONENT_LENGTH) / 2}
            x2={hover.x + (hover.dirX * COMPONENT_LENGTH) / 2}
            y2={hover.y + (hover.dirY * COMPONENT_LENGTH) / 2}
          />
        </g>
      )}
    </>
  );
}
