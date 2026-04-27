import React, { useCallback, useEffect, useRef, useState } from 'react';

import HeaderBar from './components/HeaderBar.jsx';
import Toolbar from './components/Toolbar.jsx';
import CircuitEdge from './components/CircuitEdge.jsx';
import CircuitNode from './components/CircuitNode.jsx';
import WireLayer from './components/WireLayer.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';
import WirePropertiesPanel from './components/WirePropertiesPanel.jsx';
import HamiltonianPanel from './components/HamiltonianPanel.jsx';
import NodeLabelsPanel from './components/NodeLabelsPanel.jsx';

import {
  downloadJSON,
  nextSchematicSymbol,
  parseImportPayload,
  SCHEMATIC_DEFAULT,
} from './circuit/index.js';
import {
  EMPTY_WIRE,
  SNAP_RADIUS,
  WIRE_DEFAULT,
  WIRE_DEFAULT_ANALYSIS,
  addVertex as addWireVertex,
  addWire as addWireEdge,
  autoDetectNodes,
  canMergeVertexIntoWire,
  computeHover,
  deleteVertex as deleteWireVertex,
  deleteWire as deleteWireEdge,
  gluCoincidentVertices,
  mergeVertexIntoWire,
  moveComponentCenter,
  placeStandaloneComponent,
  removeComponent,
  setComponentColor,
  setComponentType,
  setComponentValue,
  snapFraction,
  snapToGrid,
  snapToVertex,
  snapToWire,
  splitWireAt,
  splitWireWithComponent,
} from './wire/index.js';

import { useHistory } from './hooks/useHistory.js';
import { usePanZoom } from './hooks/usePanZoom.js';
import { useResizablePanel } from './hooks/useResizablePanel.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';

export default function App() {
  const [mode, setMode] = useState('wire');

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [wire, setWire] = useState(WIRE_DEFAULT);
  const [wireNodes, setWireNodes] = useState(WIRE_DEFAULT_ANALYSIS.nodes);
  const [wireEdges, setWireEdges] = useState(WIRE_DEFAULT_ANALYSIS.edges);
  const [drawingFromVertexId, setDrawingFromVertexId] = useState(null);
  const [hover, setHover] = useState(null);

  const [selected, setSelected] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [draggingComponentId, setDraggingComponentId] = useState(null);
  // Offset from cursor to component center at drag start (so the
  // component stays under the cursor at the same relative position).
  const componentDragOffset = useRef({ x: 0, y: 0 });
  const [theme, setTheme] = useState('dark');
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [highlightedComponentId, setHighlightedComponentId] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);

  const handleHighlightNode = useCallback((id) => {
    setHighlightedNodeId(id);
    setHighlightedComponentId(null);
  }, []);

  const handleHighlightComponent = useCallback((id) => {
    setHighlightedComponentId(id);
    setHighlightedNodeId(null);
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedNodeId(null);
    setHighlightedComponentId(null);
  }, []);

  const handleFocusItem = useCallback((kind, id) => {
    setFocusedItem({ kind, id });
  }, []);

  const handleBlurItem = useCallback(() => {
    setFocusedItem(null);
  }, []);

  const effectiveHighlightedNodeId =
    focusedItem?.kind === 'node' ? focusedItem.id : highlightedNodeId;
  const effectiveHighlightedComponentId =
    focusedItem?.kind === 'component' ? focusedItem.id : highlightedComponentId;

  const svgRef = useRef(null);
  const didDragRef = useRef(false);
  const nextNodeId = useRef(0);
  const nextEdgeId = useRef(0);

  const panZoom = usePanZoom(svgRef, { disabled: !!selectedTool });
  const panel = useResizablePanel();
  const leftPanel = useResizablePanel({ side: 'left' });

  const { undo, redo, canUndo, canRedo } = useHistory({
    nodes,
    edges,
    wire,
    wireNodes,
    wireEdges,
    dragging: dragging ?? draggingComponentId,
    setNodes,
    setEdges,
    setWire,
    setWireNodes,
    setWireEdges,
    onRestore: (s) => {
      setSelected(null);
      setDrawingFromVertexId(null);
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

  // ---- mode switch ----

  const handleSetMode = useCallback(
    (next) => {
      if (next === mode) return;
      setMode(next);
      setSelected(null);
      setConnectFrom(null);
      setDrawingFromVertexId(null);
      setHover(null);
      setSelectedTool(next === 'wire' ? 'wire' : null);
      if (next === 'schematic' && nodes.length === 0 && edges.length === 0) {
        setNodes(SCHEMATIC_DEFAULT.nodes);
        setEdges(SCHEMATIC_DEFAULT.edges);
        nextNodeId.current = SCHEMATIC_DEFAULT.nextNodeId;
        nextEdgeId.current = SCHEMATIC_DEFAULT.nextEdgeId;
      }
    },
    [mode, nodes.length, edges.length],
  );

  // ---- shared actions ----

  const clearCircuit = useCallback(() => {
    if (mode === 'wire') {
      setWire(EMPTY_WIRE);
      setWireNodes([]);
      setWireEdges([]);
      setDrawingFromVertexId(null);
      setSelectedTool('wire');
    } else {
      setNodes([]);
      setEdges([]);
      setConnectFrom(null);
      setSelectedTool(null);
      nextNodeId.current = 0;
      nextEdgeId.current = 0;
    }
    setSelected(null);
    setHover(null);
    panZoom.reset();
  }, [panZoom, mode]);

  const updateNode = useCallback((id, patch) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const updateEdge = useCallback((id, patch) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const updateWireNode = useCallback((id, patch) => {
    const augmented = { ...patch };
    if (patch.label !== undefined) {
      augmented.userLabel = patch.label.length > 0;
    }
    if (patch.color !== undefined) {
      augmented.userColor = true;
    }
    setWireNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...augmented } : n)));
  }, []);

  const setAllNodeColors = useCallback((color) => {
    setWireNodes((prev) => prev.map((n) => ({ ...n, color, userColor: true })));
  }, []);

  const setAllComponentColorsOfType = useCallback((typeKey, color) => {
    setWire((w) => ({
      ...w,
      components: w.components.map((c) => (c.type === typeKey ? { ...c, color } : c)),
    }));
  }, []);

  const mergeSelectedVertex = useCallback(() => {
    if (!selected || selected.kind !== 'wireVertex') return;
    setWire((w) => mergeVertexIntoWire(w, selected.id));
    setSelected(null);
  }, [selected]);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    if (selected.type === 'edge') {
      setEdges((prev) => prev.filter((e) => e.id !== selected.id));
    } else if (selected.type === 'node') {
      setEdges((prev) => prev.filter((e) => e.from !== selected.id && e.to !== selected.id));
      setNodes((prev) => prev.filter((n) => n.id !== selected.id));
    } else if (selected.kind === 'wireComponent') {
      setWire((w) => removeComponent(w, selected.id));
    } else if (selected.kind === 'wire') {
      setWire((w) => deleteWireEdge(w, selected.id));
    } else if (selected.kind === 'wireVertex') {
      setWire((w) => deleteWireVertex(w, selected.id));
    }
    setSelected(null);
  }, [selected]);

  const handleSelectTool = useCallback((toolId) => {
    setSelectedTool((prev) => (prev === toolId ? null : toolId));
    setConnectFrom(null);
    setDrawingFromVertexId(null);
    setHover(null);
  }, []);

  const handleEscape = useCallback(() => {
    if (drawingFromVertexId !== null) {
      setDrawingFromVertexId(null);
    } else if (selectedTool) {
      setSelectedTool(null);
      setConnectFrom(null);
    } else if (selected) {
      setSelected(null);
    }
  }, [selectedTool, selected, drawingFromVertexId]);

  useKeyboardShortcuts({
    undo,
    redo,
    onEscape: handleEscape,
    onDelete: deleteSelected,
  });

  // ---- wire-mode hover dispatch ----

  const hoverFor = useCallback(
    (pt, shiftKey) => (mode === 'wire' ? computeHover(wire, selectedTool, pt, shiftKey) : null),
    [mode, selectedTool, wire],
  );

  const handleWireClick = useCallback(
    (pt, shiftKey) => {
      const h = hoverFor(pt, shiftKey);

      if (selectedTool === 'wire') {
        let nextWire = wire;
        let targetVertexId = null;
        let snappedToExistingVertex = false;

        if (h?.kind === 'vertex') {
          targetVertexId = h.id;
          snappedToExistingVertex = true;
        } else if (h?.kind === 'wire') {
          const r = splitWireAt(nextWire, h.wireId, h.t);
          nextWire = r.wire;
          targetVertexId = r.vertexId;
        } else {
          const x = h?.x ?? pt.x;
          const y = h?.y ?? pt.y;
          const r = addWireVertex(nextWire, x, y);
          nextWire = r.wire;
          targetVertexId = r.vertexId;
        }

        if (drawingFromVertexId === null) {
          setWire(nextWire);
          setDrawingFromVertexId(targetVertexId);
        } else if (targetVertexId === drawingFromVertexId) {
          setWire(nextWire);
          setDrawingFromVertexId(null);
        } else {
          nextWire = addWireEdge(nextWire, drawingFromVertexId, targetVertexId);
          setWire(nextWire);
          // Snap to an existing vertex closes the chain; everything else
          // continues from the new vertex so the user can keep drawing.
          setDrawingFromVertexId(snappedToExistingVertex ? null : targetVertexId);
        }
        return;
      }

      if (selectedTool === 'C' || selectedTool === 'L' || selectedTool === 'JJ') {
        if (h?.kind === 'componentOnWire') {
          // Split the wire and insert the component edge in between.
          setWire((w) => splitWireWithComponent(w, h.wireId, h.t, selectedTool).wire);
        } else {
          // No wire under the cursor — drop a standalone component
          // with two free terminal vertices.
          const base = shiftKey ? pt : snapToGrid(pt.x, pt.y);
          setWire((w) => placeStandaloneComponent(w, base.x, base.y, selectedTool).wire);
        }
        return;
      }

      // No tool — selection / deselection.
      if (h?.kind === 'vertex') {
        setSelected({ kind: 'wireVertex', id: h.id });
        const owner = wireNodes.find((n) => n.vertexIds?.includes(h.id));
        if (owner) handleHighlightNode(owner.id);
        else clearHighlights();
      } else if (h?.kind === 'component') {
        setSelected({ kind: 'wireComponent', id: h.id });
        handleHighlightComponent(h.id);
      } else if (h?.kind === 'wire') {
        setSelected({ kind: 'wire', id: h.wireId });
        const w = wire.wires.find((e) => e.id === h.wireId);
        const owner = w
          ? wireNodes.find((n) => n.vertexIds?.includes(w.from))
          : null;
        if (owner) handleHighlightNode(owner.id);
        else clearHighlights();
      } else {
        setSelected(null);
        clearHighlights();
      }
    },
    [
      hoverFor,
      selectedTool,
      wire,
      wireNodes,
      drawingFromVertexId,
      handleHighlightNode,
      handleHighlightComponent,
      clearHighlights,
    ],
  );

  // Auto-rerun electrical-node detection on every wire change. Uses a
  // ref for the previous result so the effect doesn't depend on
  // wireNodes/wireEdges (which would loop).
  const prevAnalysisRef = useRef({ nodes: [], edges: [] });
  useEffect(() => {
    prevAnalysisRef.current = { nodes: wireNodes, edges: wireEdges };
  }, [wireNodes, wireEdges]);

  useEffect(() => {
    const result = autoDetectNodes(wire, prevAnalysisRef.current);
    setWireNodes(result.nodes);
    setWireEdges(result.edges);
  }, [wire]);

  const handleImportFile = useCallback(
    async (file) => {
      let payload;
      try {
        const text = await file.text();
        payload = JSON.parse(text);
      } catch (err) {
        alert(`Could not parse JSON: ${err.message}`);
        return;
      }
      let parsed;
      try {
        parsed = parseImportPayload(payload);
      } catch (err) {
        alert(`Could not import circuit: ${err.message}`);
        return;
      }

      setSelected(null);
      setConnectFrom(null);
      setDrawingFromVertexId(null);
      setHover(null);

      if (parsed.kind === 'wire') {
        setMode('wire');
        setSelectedTool('wire');
        setWire(parsed.wire);
        const previousNodes = parsed.nodeOverrides.map((o) => ({
          label: o.label,
          color: o.color,
          userLabel: !!o.label,
          userColor: !!o.color,
          isGround: !!o.is_ground,
          vertexIds: o.anchor != null ? [o.anchor] : [],
        }));
        const result = autoDetectNodes(parsed.wire, { nodes: previousNodes, edges: [] });
        setWireNodes(result.nodes);
        setWireEdges(result.edges);
      } else {
        setMode('schematic');
        setSelectedTool(null);
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        nextNodeId.current = parsed.nextNodeId;
        nextEdgeId.current = parsed.nextEdgeId;
      }
    },
    [],
  );

  const onSetComponentType = useCallback((componentId, type) => {
    setWire((w) => setComponentType(w, componentId, type));
  }, []);

  const onSetComponentValue = useCallback((componentId, value) => {
    setWire((w) => setComponentValue(w, componentId, value));
  }, []);

  const onUpdateComponent = useCallback((componentId, patch) => {
    setWire((w) => {
      let next = w;
      if (patch.value !== undefined) next = setComponentValue(next, componentId, patch.value);
      if (patch.color !== undefined) next = setComponentColor(next, componentId, patch.color);
      if (patch.type !== undefined) next = setComponentType(next, componentId, patch.type);
      return next;
    });
  }, []);

  // ---- schematic-mode handlers ----

  const onSchematicCanvasClick = useCallback(
    (pt) => {
      if (selectedTool === 'node') {
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
    [selectedTool],
  );

  const onSchematicNodeClick = useCallback(
    (nodeId, e) => {
      e.stopPropagation();
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      if (selectedTool && selectedTool !== 'node') {
        if (connectFrom === null) {
          setConnectFrom(nodeId);
        } else if (connectFrom !== nodeId) {
          const id = `e${nextEdgeId.current++}`;
          setEdges((prev) => [
            ...prev,
            {
              id,
              from: connectFrom,
              to: nodeId,
              type: selectedTool,
              value: nextSchematicSymbol(prev, selectedTool),
            },
          ]);
          setConnectFrom(null);
        }
        return;
      }
      setSelected({ type: 'node', id: nodeId });
    },
    [selectedTool, connectFrom],
  );

  const onSchematicNodeMouseDown = useCallback((nodeId, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(nodeId);
  }, []);

  const onSchematicEdgeClick = useCallback((edgeId, e) => {
    e.stopPropagation();
    setSelected({ type: 'edge', id: edgeId });
  }, []);

  // ---- canvas-level events ----

  const onCanvasClick = useCallback(
    (e) => {
      if (panZoom.didPanRef.current) {
        panZoom.didPanRef.current = false;
        return;
      }
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      const pt = panZoom.svgPoint(e);
      if (mode === 'wire') {
        handleWireClick(pt, e.shiftKey);
        return;
      }
      // Schematic: only handle background hits; nodes/edges have their own onClick.
      if (e.target !== svgRef.current && e.target.tagName !== 'rect') return;
      onSchematicCanvasClick(pt);
    },
    [mode, panZoom, handleWireClick, onSchematicCanvasClick],
  );

  const onMouseMove = useCallback(
    (e) => {
      if (panel.isResizing() || leftPanel.isResizing()) return;
      if (panZoom.processMove(e)) return;

      const pt = panZoom.svgPoint(e);

      if (dragging !== null) {
        didDragRef.current = true;
        if (mode === 'wire') {
          const base = e.shiftKey ? pt : snapToGrid(pt.x, pt.y);
          setWire((w) => {
            // Snap visually onto another vertex when within radius.
            const others = w.vertices.filter((v) => v.id !== dragging);
            const overId = snapToVertex(others, base.x, base.y);
            const target = overId !== null ? others.find((v) => v.id === overId) : base;
            return {
              ...w,
              vertices: w.vertices.map((v) =>
                v.id === dragging ? { ...v, x: target.x, y: target.y } : v,
              ),
            };
          });
        } else {
          setNodes((prev) =>
            prev.map((n) => (n.id === dragging ? { ...n, x: pt.x, y: pt.y } : n)),
          );
        }
        return;
      }

      if (draggingComponentId !== null) {
        didDragRef.current = true;
        // Where the user wants the component center to be.
        const off = componentDragOffset.current;
        const rawX = pt.x - off.x;
        const rawY = pt.y - off.y;

        setWire((w) => {
          const c = w.components.find((cc) => cc.id === draggingComponentId);
          if (!c) return w;
          // Exclude wires touching this component's endpoints — those
          // wires move with it and would always project to distance 0.
          const exclude = new Set(
            w.wires
              .filter(
                (ww) =>
                  ww.from === c.from || ww.to === c.from || ww.from === c.to || ww.to === c.to,
              )
              .map((ww) => ww.id),
          );
          // Snap precedence: wire (slide-along) > grid (off the wire).
          // Shift suppresses both for free-form placement.
          let snap = null;
          let centerX = rawX;
          let centerY = rawY;
          if (!e.shiftKey) {
            const hit = snapToWire(w, rawX, rawY, SNAP_RADIUS, exclude);
            if (hit) {
              const snapWire = w.wires.find((ww) => ww.id === hit.id);
              const a = w.vertices.find((v) => v.id === snapWire.from);
              const b = w.vertices.find((v) => v.id === snapWire.to);
              if (a && b) {
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const L = Math.hypot(dx, dy);
                if (L > 1e-6) {
                  // Magnetic 1/4 / 1/3 / 1/2 / 2/3 / 3/4 snap along the wire.
                  const tSnap = snapFraction(hit.t);
                  snap = {
                    x: a.x + tSnap * dx,
                    y: a.y + tSnap * dy,
                    dirX: dx / L,
                    dirY: dy / L,
                    maxHalf: (L * 0.9) / 2,
                  };
                }
              }
            }
            if (!snap) {
              const g = snapToGrid(rawX, rawY);
              centerX = g.x;
              centerY = g.y;
            }
          }
          return moveComponentCenter(w, draggingComponentId, centerX, centerY, snap);
        });
        return;
      }

      if (mode === 'wire') {
        setHover(hoverFor(pt, e.shiftKey));
      }
    },
    [dragging, draggingComponentId, panZoom, panel, leftPanel, mode, hoverFor],
  );

  const onMouseUp = useCallback(() => {
    panZoom.endPan();
    if (dragging !== null && mode === 'wire') {
      const draggedId = dragging;
      setWire((w) => {
        const dv = w.vertices.find((v) => v.id === draggedId);
        if (!dv) return w;
        const overlap = w.vertices.find(
          (v) => v.id !== draggedId && Math.hypot(v.x - dv.x, v.y - dv.y) < 0.5,
        );
        if (!overlap) return w;
        setSelected({ kind: 'wireVertex', id: overlap.id });
        return gluCoincidentVertices(w, draggedId, overlap.id);
      });
    }
    setDragging(null);
    setDraggingComponentId(null);
  }, [panZoom, dragging, mode]);

  const onMouseLeave = useCallback(() => {
    panZoom.endPan();
    setDragging(null);
    setDraggingComponentId(null);
    setHover(null);
  }, [panZoom]);

  const onCanvasDoubleClick = useCallback(
    (e) => {
      if (mode !== 'wire') return;
      const pt = panZoom.svgPoint(e);
      const wireHit = snapToWire(wire, pt.x, pt.y);
      if (!wireHit) return;
      // Avoid double-clicking right on top of an existing vertex.
      if (snapToVertex(wire.vertices, pt.x, pt.y) !== null) return;
      e.stopPropagation();
      const r = splitWireAt(wire, wireHit.id, wireHit.t);
      setWire(r.wire);
      if (r.vertexId !== null) {
        setSelected({ kind: 'wireVertex', id: r.vertexId });
      }
    },
    [mode, panZoom, wire],
  );

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    setSelectedTool(null);
    setConnectFrom(null);
    setDrawingFromVertexId(null);
    setHover(null);
  }, []);

  const onWireVertexMouseDown = useCallback(
    (vertexId, e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(vertexId);
      setSelected({ kind: 'wireVertex', id: vertexId });
      setHover(null);
      const owner = wireNodes.find((n) => n.vertexIds?.includes(vertexId));
      if (owner) handleHighlightNode(owner.id);
      else clearHighlights();
    },
    [wireNodes, handleHighlightNode, clearHighlights],
  );

  const onWireComponentMouseDown = useCallback(
    (componentId, e) => {
      if (e.button !== 0) return;
      if (selectedTool) return;
      e.preventDefault();
      e.stopPropagation();
      const c = wire.components.find((cc) => cc.id === componentId);
      if (c) {
        const a = wire.vertices.find((v) => v.id === c.from);
        const b = wire.vertices.find((v) => v.id === c.to);
        if (a && b) {
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;
          const pt = panZoom.svgPoint(e);
          componentDragOffset.current = { x: pt.x - cx, y: pt.y - cy };
        }
      }
      setDraggingComponentId(componentId);
      setSelected({ kind: 'wireComponent', id: componentId });
      setHover(null);
      handleHighlightComponent(componentId);
    },
    [selectedTool, wire, panZoom, handleHighlightComponent],
  );

  // ---- render ----

  const isWireMode = mode === 'wire';
  const analysisNodes = isWireMode ? wireNodes : nodes;
  const analysisEdges = isWireMode ? wireEdges : edges;
  const analysisUpdater = isWireMode ? updateWireNode : updateNode;

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar
        onClear={clearCircuit}
        onExport={() =>
          downloadJSON(
            analysisNodes,
            analysisEdges,
            isWireMode ? { wire, wireNodes } : { schematicNodes: nodes },
          )
        }
        onImport={handleImportFile}
      />

      <Toolbar
        mode={mode}
        onSetMode={handleSetMode}
        selectedTool={selectedTool}
        onSelectTool={handleSelectTool}
        connectFrom={connectFrom}
        drawingFromVertexId={drawingFromVertexId}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        showEdgeLabels={showEdgeLabels}
        onToggleLabels={() => setShowEdgeLabels((v) => !v)}
        onResetView={() => panZoom.fitToNodes(isWireMode ? wire.vertices : nodes)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <NodeLabelsPanel
          nodes={analysisNodes}
          onUpdateNode={analysisUpdater}
          components={isWireMode ? wire.components : undefined}
          onUpdateComponent={isWireMode ? onUpdateComponent : undefined}
          width={leftPanel.width}
          onResizeStart={leftPanel.onResizeStart}
          highlightedNodeId={isWireMode ? effectiveHighlightedNodeId : null}
          highlightedComponentId={isWireMode ? effectiveHighlightedComponentId : null}
          onHighlightNode={isWireMode ? handleHighlightNode : undefined}
          onFocusItem={isWireMode ? handleFocusItem : undefined}
          onBlurItem={isWireMode ? handleBlurItem : undefined}
          onSetAllNodeColors={isWireMode ? setAllNodeColors : undefined}
          onSetAllComponentColorsOfType={isWireMode ? setAllComponentColorsOfType : undefined}
        />

        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{
              background: 'var(--bg-secondary)',
              cursor: selectedTool ? 'crosshair' : 'default',
            }}
            onMouseDown={(e) => {
              if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
              }
              panZoom.onCanvasMouseDown(e);
            }}
            onClick={onCanvasClick}
            onDoubleClick={onCanvasDoubleClick}
            onContextMenu={onContextMenu}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
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
              {isWireMode ? (
                <WireLayer
                  wire={wire}
                  wireNodes={wireNodes}
                  drawingFromVertexId={drawingFromVertexId}
                  hover={hover}
                  selectedTool={selectedTool}
                  selected={selected}
                  onVertexMouseDown={onWireVertexMouseDown}
                  onComponentMouseDown={onWireComponentMouseDown}
                  showLabels={showEdgeLabels}
                  zoom={panZoom.zoom}
                  highlightedNodeId={effectiveHighlightedNodeId}
                  highlightedComponentId={effectiveHighlightedComponentId}
                  onHighlightNode={handleHighlightNode}
                  onHighlightComponent={handleHighlightComponent}
                />
              ) : (
                <>
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
                        onClick={onSchematicEdgeClick}
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
                      onClick={onSchematicNodeClick}
                      onMouseDown={onSchematicNodeMouseDown}
                    />
                  ))}
                </>
              )}
            </g>
          </svg>

          {isWireMode ? (
            <WirePropertiesPanel
              selected={selected}
              wire={wire}
              onSetComponentType={onSetComponentType}
              onSetComponentValue={onSetComponentValue}
              onDelete={deleteSelected}
              onMergeVertex={mergeSelectedVertex}
              canMergeVertex={
                selected?.kind === 'wireVertex'
                  ? canMergeVertexIntoWire(wire, selected.id)
                  : false
              }
            />
          ) : (
            <PropertiesPanel
              selected={selected}
              nodes={nodes}
              edges={edges}
              onUpdateNode={updateNode}
              onUpdateEdge={updateEdge}
              onDelete={deleteSelected}
            />
          )}
        </div>

        <HamiltonianPanel
          nodes={analysisNodes}
          edges={analysisEdges}
          width={panel.width}
          onResizeStart={panel.onResizeStart}
        />
      </div>
    </div>
  );
}
