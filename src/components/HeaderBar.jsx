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

export default function HeaderBar({ onClear, onExport, onImport }) {
  const fileRef = React.useRef(null);
  return (
    <header style={headerStyle}>
      <div style={titleStyle}>QUANTUM CIRCUIT BUILDER</div>
      <button onClick={onClear} style={{ ...ghostBtn, marginLeft: 'auto' }}>
        Clear
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport?.(f);
          e.target.value = '';
        }}
      />
      <button onClick={() => fileRef.current?.click()} style={ghostBtn}>
        Import JSON
      </button>
      <button onClick={onExport} style={primaryBtn}>
        Export JSON
      </button>
    </header>
  );
}
