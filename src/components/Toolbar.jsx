import React from 'react';
import { ELEMENT_TYPES } from '../circuit/index.js';

const barStyle = {
  padding: '10px 24px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const labelStyle = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginRight: 8,
};

function toolButtonStyle(active, color) {
  return {
    padding: '8px 14px',
    border: active ? `2px solid ${color || 'var(--text-primary)'}` : '2px solid transparent',
    borderRadius: 8,
    background: active ? 'var(--tool-active-bg)' : 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.15s',
  };
}

export default function Toolbar({
  selectedTool,
  onSelectTool,
  connectFrom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showEdgeLabels,
  onToggleLabels,
  onResetView,
}) {
  return (
    <div style={barStyle}>
      <span style={labelStyle}>TOOLS:</span>

      <button
        style={toolButtonStyle(selectedTool === 'node')}
        onClick={() => onSelectTool('node')}
      >
        Node
      </button>

      {Object.values(ELEMENT_TYPES).map((t) => (
        <button
          key={t.id}
          style={toolButtonStyle(selectedTool === t.id, t.color)}
          onClick={() => onSelectTool(t.id)}
        >
          <span style={{ color: t.color, marginRight: 4 }}>■</span> {t.label}
        </button>
      ))}

      <span style={{ color: 'var(--border)', margin: '0 4px' }}>|</span>

      <button
        style={{ ...toolButtonStyle(false), opacity: canUndo ? 1 : 0.3 }}
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
      <button
        style={{ ...toolButtonStyle(false), opacity: canRedo ? 1 : 0.3 }}
        onClick={onRedo}
        disabled={!canRedo}
      >
        Redo
      </button>

      {connectFrom !== null && (
        <span style={{ fontSize: 12, color: 'var(--accent-amber)' }}>Click target node…</span>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <button style={toolButtonStyle(false)} onClick={onToggleLabels}>
          {showEdgeLabels ? 'Hide labels' : 'Show labels'}
        </button>
        <button style={toolButtonStyle(false)} onClick={onResetView}>
          Fit view
        </button>
      </div>
    </div>
  );
}
