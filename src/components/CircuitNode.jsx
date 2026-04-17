import React from 'react';
import SvgLatex from './SvgLatex.jsx';

const NODE_RADIUS = 16;
const SELECTION_RADIUS = 22;
const SOURCE_RADIUS = 24;

export default function CircuitNode({
  node,
  isSelected,
  isSource,
  hasToolActive,
  onClick,
  onMouseDown,
}) {
  return (
    <g
      onClick={(e) => onClick(node.id, e)}
      onMouseDown={(e) => onMouseDown(node.id, e)}
      style={{ cursor: hasToolActive ? 'pointer' : 'grab' }}
    >
      {isSelected && (
        <circle
          cx={node.x}
          cy={node.y}
          r={SELECTION_RADIUS}
          fill="none"
          stroke="var(--accent-blue)"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
      {isSource && (
        <circle
          cx={node.x}
          cy={node.y}
          r={SOURCE_RADIUS}
          fill="none"
          stroke="var(--accent-amber)"
          strokeWidth={2}
          opacity={0.7}
        >
          <animate attributeName="r" values="20;26;20" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_RADIUS}
        fill={node.isGround ? 'var(--node-ground-fill)' : 'var(--node-fill)'}
        stroke={node.isGround ? 'var(--text-primary)' : 'var(--text-secondary)'}
        strokeWidth={node.isGround ? 2.5 : 2}
      />
      {node.isGround && (
        <>
          <line
            x1={node.x - 11}
            y1={node.y + 18}
            x2={node.x + 11}
            y2={node.y + 18}
            stroke="var(--text-primary)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1={node.x - 7}
            y1={node.y + 23}
            x2={node.x + 7}
            y2={node.y + 23}
            stroke="var(--text-primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={node.x - 3}
            y1={node.y + 28}
            x2={node.x + 3}
            y2={node.y + 28}
            stroke="var(--text-primary)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      )}
      <SvgLatex
        text={node.label}
        x={node.x}
        y={node.y}
        fontSize={12}
        color="var(--text-primary)"
        fontWeight={600}
      />
    </g>
  );
}
