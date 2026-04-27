import React from 'react';
import {
  adjacencyMatrix,
  capacitanceMatrix,
  formatSymbolicSum,
} from '../physics/hamiltonian.js';
import InlineLatex from './InlineLatex.jsx';

const sectionHeader = (color, text) => (
  <div style={{ color, fontWeight: 600, marginBottom: 8, fontSize: 11, letterSpacing: 0.5 }}>
    {text}
  </div>
);

function CapacitanceMatrix({ nodes, edges }) {
  const { cells, nodeList } = capacitanceMatrix(nodes, edges);
  if (nodeList.length === 0) return null;

  return (
    <section style={{ marginTop: 20 }}>
      {sectionHeader('var(--text-secondary)', 'CAPACITANCE MATRIX')}
      <div style={{ marginBottom: 8 }}>
        <InlineLatex
          text={'C_{ij} = \\partial^{2} L / \\partial \\dot{\\phi}_{i}\\, \\partial \\dot{\\phi}_{j}'}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle}></th>
              {nodeList.map((n) => (
                <th key={n.id} style={thStyle}>
                  <InlineLatex text={n.label} />
                  {n.isGround ? '⏚' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodeList.map((ni, i) => (
              <tr key={ni.id}>
                <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                  <InlineLatex text={ni.label} />
                  {ni.isGround ? '⏚' : ''}
                </td>
                {nodeList.map((nj, j) => {
                  const expr = formatSymbolicSum(cells[i][j]);
                  return (
                    <td
                      key={nj.id}
                      style={{
                        ...tdStyle,
                        textAlign: 'center',
                        color: expr === '0' ? 'var(--border)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <InlineLatex text={expr} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HamiltonianPanel({ nodes, edges, width = 380, onResizeStart }) {
  const adj = adjacencyMatrix(nodes, edges);

  return (
    <div
      style={{
        width,
        borderLeft: '1px solid var(--border)',
        padding: 20,
        overflowY: 'auto',
        background: 'var(--bg-panel)',
        fontSize: 12,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div
        onMouseDown={onResizeStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          top: 0,
          left: -3,
          width: 6,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
          background: 'transparent',
        }}
      />
      <div
        style={{
          fontWeight: 600,
          color: 'var(--accent-amber)',
          fontSize: 11,
          letterSpacing: 1,
          marginBottom: 16,
        }}
      >
        CIRCUIT ANALYSIS
      </div>

      {adj.nodeList.length > 0 ? (
        <>
          <section>
            {sectionHeader('var(--text-secondary)', 'ADJACENCY MATRIX (element count)')}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}></th>
                    {adj.nodeList.map((n) => (
                      <th key={n.id} style={thStyle}>
                        <InlineLatex text={n.label} />
                        {n.isGround ? '⏚' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adj.nodeList.map((ni, i) => (
                    <tr key={ni.id}>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                        <InlineLatex text={ni.label} />
                        {ni.isGround ? '⏚' : ''}
                      </td>
                      {adj.nodeList.map((nj, j) => (
                        <td
                          key={nj.id}
                          style={{
                            ...tdStyle,
                            textAlign: 'center',
                            color: adj.matrix[i][j] > 0 ? 'var(--text-primary)' : 'var(--border)',
                          }}
                        >
                          {adj.matrix[i][j]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <CapacitanceMatrix nodes={nodes} edges={edges} />
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          No electrical nodes yet — wires + components are auto-detected as you build.
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '4px 8px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  fontSize: 10,
};

const tdStyle = {
  padding: '4px 8px',
  fontSize: 11,
};

export default React.memo(HamiltonianPanel);
