import React, { useEffect } from 'react';

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 24,
};

const cardStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  width: 'min(820px, 100%)',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
  borderBottom: '1px solid var(--border)',
};

const titleStyle = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: 1,
  color: 'var(--accent-amber)',
};

const closeBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  width: 28,
  height: 28,
  fontSize: 14,
  fontFamily: 'inherit',
  lineHeight: 1,
};

const bodyStyle = {
  padding: '16px 20px',
  overflowY: 'auto',
  fontSize: 12.5,
  color: 'var(--text-secondary)',
  lineHeight: 1.55,
};

const sectionTitle = {
  color: 'var(--accent-amber)',
  fontSize: 11,
  letterSpacing: 0.6,
  fontWeight: 700,
  margin: '14px 0 6px',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: 6,
};

const tdLeft = {
  padding: '4px 10px 4px 0',
  width: '38%',
  verticalAlign: 'top',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
};

const tdRight = {
  padding: '4px 0',
  verticalAlign: 'top',
  color: 'var(--text-secondary)',
};

const kbdStyle = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 11,
  fontFamily: 'inherit',
  margin: '0 2px',
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  padding: '12px 20px',
  borderTop: '1px solid var(--border)',
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

const Kbd = ({ children }) => <span style={kbdStyle}>{children}</span>;

function Row({ keys, children }) {
  return (
    <tr>
      <td style={tdLeft}>{keys}</td>
      <td style={tdRight}>{children}</td>
    </tr>
  );
}

export default function HelpModal({ open, onClose, onRunTutorial }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>HELP &amp; SHORTCUTS</div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close help">
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          <div style={{ marginBottom: 10 }}>
            Build a superconducting circuit visually and the app extracts the
            Hamiltonian, capacitance/inductance matrices, and energies in real time.
            Start in <b>Wire</b> mode: lay down wires, then drop capacitors,
            inductors, or Josephson junctions on top.
          </div>

          <div style={sectionTitle}>MOUSE</div>
          <table style={tableStyle}>
            <tbody>
              <Row keys="Click (with Wire tool)">
                Drop a vertex / extend the wire you are drawing. Snaps to grid.
              </Row>
              <Row keys="Click (with C / L / JJ tool)">
                Place a component on the wire under the cursor.
                Off a wire it places a standalone component.
              </Row>
              <Row keys="Click (no tool)">Select the item under the cursor.</Row>
              <Row keys="Drag a vertex / component">
                Move it. Drop on another vertex to merge.
              </Row>
              <Row keys="Double-click a wire">Insert a vertex at that point.</Row>
              <Row keys="Right-click">Cancel the active tool / drawing.</Row>
              <Row keys="Mouse wheel">Zoom in / out.</Row>
              <Row keys="Middle-drag (or Space + drag)">Pan the canvas.</Row>
            </tbody>
          </table>

          <div style={sectionTitle}>SELECTION</div>
          <table style={tableStyle}>
            <tbody>
              <Row keys={<><Kbd>Shift</Kbd>+Click</>}>
                Toggle item in/out of a multi-selection.
              </Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+Drag canvas</>}>
                Box-select every vertex / wire / component inside the rectangle.
              </Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+Drag</>}>
                Box-select and add to the existing selection.
              </Row>
              <Row keys="Drag a multi-selected item">
                Move the whole group together. Snaps to grid; coincident vertices fuse on release.
              </Row>
            </tbody>
          </table>

          <div style={sectionTitle}>KEYBOARD</div>
          <table style={tableStyle}>
            <tbody>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd></>}>Undo.</Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>Z</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>Y</Kbd></>}>
                Redo.
              </Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>C</Kbd></>}>Copy the current selection.</Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>V</Kbd></>}>
                Paste — successive pastes spread diagonally so they don't stack.
              </Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>Q</Kbd></>}>
                Rotate selection 90° clockwise (hold <Kbd>Shift</Kbd> for counter-clockwise).
              </Row>
              <Row keys={<><Kbd>Ctrl</Kbd>+<Kbd>M</Kbd></>}>
                Mirror selection horizontally (hold <Kbd>Shift</Kbd> for vertical).
              </Row>
              <Row keys={<><Kbd>Delete</Kbd> / <Kbd>Backspace</Kbd></>}>
                Delete the selection.
              </Row>
              <Row keys={<Kbd>Esc</Kbd>}>
                Cancel the active tool, drawing, or selection.
              </Row>
              <Row keys={<><Kbd>Shift</Kbd> while placing/dragging</>}>
                Bypass grid + wire snapping for free placement.
              </Row>
            </tbody>
          </table>

          <div style={sectionTitle}>MERGING &amp; CLEANUP</div>
          <table style={tableStyle}>
            <tbody>
              <Row keys="Drag a vertex onto another">
                Releases as a single fused vertex; nearby selected vertices merge on multi-drag too.
              </Row>
              <Row keys="Wire vertex on top of a wire">
                Select it and use the “Merge into wire” button to splice it in.
              </Row>
              <Row keys="Tile cells side-by-side">
                Box-select a unit cell, copy/paste/translate, then drop — coincident
                vertices auto-glue and duplicate components are removed.
              </Row>
            </tbody>
          </table>

          <div style={sectionTitle}>MODES</div>
          <div style={{ marginBottom: 8 }}>
            <b>Wire</b> (default): the modern unified model — wires and components
            share an edge graph, electrical nodes are auto-detected.
            <br />
            <b>Legacy</b>: the original schematic mode — place nodes, then connect them.
          </div>

          <div style={sectionTitle}>PANELS</div>
          <div>
            The left panel lists electrical nodes and components — click a row to
            highlight it on the canvas, edit its label or color. The right panel
            shows the live capacitance matrix, energies, and the symbolic Hamiltonian.
            Both panels can be resized or collapsed using the small handle at their edge.
          </div>
        </div>

        <div style={footerStyle}>
          {onRunTutorial && (
            <button style={ghostBtn} onClick={onRunTutorial}>
              Run tutorial
            </button>
          )}
          <button style={primaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
