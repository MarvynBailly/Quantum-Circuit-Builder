import React from 'react';
import CircuitSymbol from './CircuitSymbol.jsx';
import SvgLatex from './SvgLatex.jsx';
import { ELEMENT_TYPES } from '../circuit/index.js';

const LABEL_OFFSET = 22;
const HIT_AREA_WIDTH = 14;

/**
 * Compute a label anchor and rotation for an edge so the label sits
 * perpendicular to the wire, biased below it, and is never upside-down.
 */
function computeLabelPlacement(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  let labelX = mx;
  let labelY = my - LABEL_OFFSET;
  if (len > 1) {
    let px = -dy / len;
    let py = dx / len;
    if (py > 0 || (py === 0 && px < 0)) {
      px = -px;
      py = -py;
    }
    labelX = mx + px * LABEL_OFFSET;
    labelY = my + py * LABEL_OFFSET;
  }

  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;

  return { x: labelX, y: labelY, angle };
}

export default function CircuitEdge({ edge, from, to, isSelected, showLabel, onClick }) {
  const info = ELEMENT_TYPES[edge.type];
  const label = computeLabelPlacement(from.x, from.y, to.x, to.y);

  return (
    <g onClick={(e) => onClick(edge.id, e)} style={{ cursor: 'pointer' }}>
      {/* Wider invisible hit area so the edge is easy to click */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="transparent"
        strokeWidth={HIT_AREA_WIDTH}
      />
      {isSelected && (
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={info.color}
          strokeWidth={8}
          opacity={0.2}
        />
      )}
      <CircuitSymbol type={edge.type} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      {showLabel && (
        <g transform={`translate(${label.x},${label.y}) rotate(${label.angle})`}>
          <SvgLatex
            text={`${info.symbol} = ${edge.value}\\text{ ${info.unit}}`}
            x={0}
            y={0}
            fontSize={11}
            color="var(--text-primary)"
          />
        </g>
      )}
    </g>
  );
}
