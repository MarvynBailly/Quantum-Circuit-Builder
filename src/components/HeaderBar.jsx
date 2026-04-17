import React from 'react';

const headerStyle = {
  padding: '14px 24px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
};

const titleStyle = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 1,
  color: 'var(--accent-amber)',
};

const ghostBtn = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const primaryBtn = {
  padding: '6px 14px',
  background: 'var(--accent-amber)',
  border: 'none',
  borderRadius: 6,
  color: '#000',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export default function HeaderBar({ theme, onClear, onToggleTheme, onExport }) {
  return (
    <header style={headerStyle}>
      <div style={titleStyle}>FLUXONIUM CIRCUIT BUILDER</div>
      <button onClick={onClear} style={{ ...ghostBtn, marginLeft: 'auto' }}>
        Clear
      </button>
      <button onClick={onToggleTheme} style={ghostBtn}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button onClick={onExport} style={primaryBtn}>
        Export JSON
      </button>
    </header>
  );
}
