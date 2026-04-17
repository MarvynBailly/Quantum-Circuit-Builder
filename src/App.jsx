import React, { useCallback, useEffect, useRef, useState } from 'react';

import HeaderBar from './components/HeaderBar.jsx';
import Toolbar from './components/Toolbar.jsx';
import CircuitEdge from './components/CircuitEdge.jsx';
import CircuitNode from './components/CircuitNode.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import HamiltonianPanel from './components/HamiltonianPanel.jsx';

import { ELEMENT_TYPES, downloadJSON } from './circuit/index.js';

import { useHistory } from './hooks/useHistory.js';
import { usePanZoom } from './hooks/usePanZoom.js';
import { useResizablePanel } from './hooks/useResizablePanel.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';

const DEFAULT_CIRCUIT = {
  nodes: [
    { id: 0, x: 200, y: 200, label: '\\phi_{0}', isGround: true },
    { id: 1, x: 400, y: 120, label: '\\phi_{1}', isGround: false },
    { id: 2, x: 400, y: 280, label: '\\phi_{2}', isGround: false },
  ],
  edges: [
    { id: 'e0', from: 0, to: 1, type: 'JJ', value: 8.0 },
    { id: 'e1', from: 1, to: 2, type: 'L', value: 300 },
    { id: 'e2', from: 0, to: 2, type: 'C', value: 5.0 },
  ],
  nextNodeId: 3,
  nextEdgeId: 3,
};

export default function App() {
  const [nodes, setNodes] = useState(DEFAULT_CIRCUIT.nodes);
  const [edges, setEdges] = useState(DEFAULT_CIRCUIT.edges);
  const [selected, setSelected] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);

  const svgRef = useRef(null);
  const nextNodeId = useRef(DEFAULT_CIRCUIT.nextNodeId);
  const nextEdgeId = useRef(DEFAULT_CIRCUIT.nextEdgeId);

  const panZoom = usePanZoom(svgRef, { disabled: !!selectedTool });
  const panel = useResizablePanel();

  const { undo, redo, canUndo, canRedo } = useHistory({
    nodes,
    edges,
    dragging,
    setNodes,
    setEdges,
    onRestore: (s) => {
      setSelected(null);
      nextNodeId.current = s.nodes.length > 0 ? Math.max(...s.nodes.map((n) => n.id)) + 1 : 0;
      nextEdgeId.current =
        s.edges.length > 0
          ? Math.max(...s.edges.map((e) => parseInt(e.id.slice(1), 10))) + 1
          : 0;
    },
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // ---- actions ----

  const clearCircuit = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelected(null);
    setConnectFrom(null);
    setSelectedTool(null);
    nextNodeId.current = 0;
    nextEdgeId.current = 0;
    panZoom.reset();
  }, [panZoom]);

  const updateNode = useCallback((id, patch) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const updateEdge = useCallback((id, patch) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    if (selected.type === 'edge') {
      setEdges((prev) => prev.filter((e) => e.id !== selected.id));
    } else {
      setEdges((prev) => prev.filter((e) => e.from !== selected.id && e.to !== selected.id));
      setNodes((prev) => prev.filter((n) => n.id !== selected.id));
    }
    setSelected(null);
  }, [selected]);

  const handleSelectTool = useCallback((toolId) => {
    setSelectedTool((prev) => (prev === toolId ? null : toolId));
    if (toolId !== 'node') setConnectFrom(null);
  }, []);

  const handleEscape = useCallback(() => {
    if (selectedTool) {
      setSelectedTool(null);
      setConnectFrom(null);
    } else if (selected) {
      setSelected(null);
    }
  }, [selectedTool, selected]);

  useKeyboardShortcuts({
    undo,
    redo,
    onEscape: handleEscape,
    onDelete: deleteSelected,
  });

  // ---- canvas / node / edge interaction ----

  const onCanvasClick = useCallback(
    (e) => {
      if (panZoom.didPanRef.current) {
        panZoom.didPanRef.current = false;
        return;
      }
      if (e.target !== svgRef.current && e.target.tagName !== 'rect') return;

      if (selectedTool === 'node') {
        const pt = panZoom.svgPoint(e);
        const id = nextNodeId.current++;
        setNodes((prev) => [
          ...prev,
          { id, x: pt.x, y: pt.y, label: `\\phi_{${id}}`, isGround: false },
        ]);
        return;
      }

      setSelected(null);
      setConnectFrom(null);
    },
    [selectedTool, panZoom],
  );

  const onNodeClick = useCallback(
    (nodeId, e) => {
      e.stopPropagation();
      if (selectedTool && selectedTool !== 'node') {
        if (connectFrom === null) {
          setConnectFrom(nodeId);
        } else if (connectFrom !== nodeId) {
          const def = ELEMENT_TYPES[selectedTool];
          const id = `e${nextEdgeId.current++}`;
          setEdges((prev) => [
            ...prev,
            { id, from: connectFrom, to: nodeId, type: selectedTool, value: def.defaultValue },
          ]);
          setConnectFrom(null);
        }
        return;
      }
      setSelected({ type: 'node', id: nodeId });
    },
    [selectedTool, connectFrom],
  );

  const onNodeMouseDown = useCallback(
    (nodeId, e) => {
      if (selectedTool) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(nodeId);
    },
    [selectedTool],
  );

  const onEdgeClick = useCallback((edgeId, e) => {
    e.stopPropagation();
    setSelected({ type: 'edge', id: edgeId });
  }, []);

  // Mouse move priority: panel resize → pan → node drag.
  const onMouseMove = useCallback(
    (e) => {
      if (panel.isResizing()) return;
      if (panZoom.processMove(e)) return;
      if (dragging === null) return;
      const pt = panZoom.svgPoint(e);
      setNodes((prev) => prev.map((n) => (n.id === dragging ? { ...n, x: pt.x, y: pt.y } : n)));
    },
    [dragging, panZoom, panel],
  );

  const onMouseUp = useCallback(() => {
    panZoom.endPan();
    setDragging(null);
  }, [panZoom]);

  // ---- render ----

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar
        theme={theme}
        onClear={clearCircuit}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onExport={() => downloadJSON(nodes, edges)}
      />

      <Toolbar
        selectedTool={selectedTool}
        onSelectTool={handleSelectTool}
        connectFrom={connectFrom}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        showEdgeLabels={showEdgeLabels}
        onToggleLabels={() => setShowEdgeLabels((v) => !v)}
        onResetView={() => panZoom.fitToNodes(nodes)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{
              background: 'var(--bg-secondary)',
              cursor: selectedTool ? 'crosshair' : 'default',
            }}
            onMouseDown={panZoom.onCanvasMouseDown}
            onClick={onCanvasClick}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <pattern
                id="grid"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${panZoom.pan.x},${panZoom.pan.y}) scale(${panZoom.zoom})`}
              >
                <path
                  d="M 30 0 L 0 0 0 30"
                  fill="none"
                  stroke="var(--grid-line)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${panZoom.pan.x},${panZoom.pan.y}) scale(${panZoom.zoom})`}>
              {edges.map((edge) => {
                const from = nodes.find((n) => n.id === edge.from);
                const to = nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <CircuitEdge
                    key={edge.id}
                    edge={edge}
                    from={from}
                    to={to}
                    isSelected={selected?.type === 'edge' && selected.id === edge.id}
                    showLabel={showEdgeLabels}
                    onClick={onEdgeClick}
                  />
                );
              })}

              {nodes.map((node) => (
                <CircuitNode
                  key={node.id}
                  node={node}
                  isSelected={selected?.type === 'node' && selected.id === node.id}
                  isSource={connectFrom === node.id}
                  hasToolActive={!!selectedTool}
                  onClick={onNodeClick}
                  onMouseDown={onNodeMouseDown}
                />
              ))}
            </g>
          </svg>

          <PropertiesPanel
            selected={selected}
            nodes={nodes}
            edges={edges}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onDelete={deleteSelected}
          />
        </div>

        <HamiltonianPanel
          nodes={nodes}
          edges={edges}
          width={panel.width}
          onResizeStart={panel.onResizeStart}
        />
      </div>
    </div>
  );
}
