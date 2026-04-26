import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 100;

/**
 * Tracks both modes of state for undo / redo:
 *   schematic side : nodes + edges
 *   wire side      : wire (vertices + segments) + wireNodes + wireEdges
 *
 * Pauses recording while `dragging` is non-null so a drag produces one
 * history entry, not many. Pass null/undefined for any state pair that
 * is not in use. `onRestore` is invoked after an undo or redo with the
 * restored snapshot.
 */
export function useHistory({
  nodes,
  edges,
  wire,
  wireNodes,
  wireEdges,
  dragging,
  setNodes,
  setEdges,
  setWire,
  setWireNodes,
  setWireEdges,
  onRestore,
}) {
  const historyRef = useRef({
    stack: [snapshot(nodes, edges, wire, wireNodes, wireEdges)],
    index: 0,
  });
  const skipRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = useCallback(() => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      sync();
      return;
    }
    if (dragging !== null) return;

    const h = historyRef.current;
    const cur = h.stack[h.index];
    if (cur && sameSnapshot(cur, nodes, edges, wire, wireNodes, wireEdges)) return;

    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snapshot(nodes, edges, wire, wireNodes, wireEdges));
    h.index = h.stack.length - 1;

    if (h.stack.length > MAX_HISTORY) {
      h.stack.shift();
      h.index--;
    }
    sync();
  }, [nodes, edges, wire, wireNodes, wireEdges, dragging, sync]);

  const restore = useCallback(
    (s) => {
      skipRef.current = true;
      setNodes(s.nodes.map((n) => ({ ...n })));
      setEdges(s.edges.map((e) => ({ ...e })));
      if (setWire && s.wire) {
        setWire({
          ...s.wire,
          vertices: s.wire.vertices.map((v) => ({ ...v })),
          segments: s.wire.segments.map((seg) => ({ ...seg })),
        });
      }
      if (setWireNodes && s.wireNodes) setWireNodes(s.wireNodes.map((n) => ({ ...n })));
      if (setWireEdges && s.wireEdges) setWireEdges(s.wireEdges.map((e) => ({ ...e })));
      onRestore?.(s);
      sync();
    },
    [setNodes, setEdges, setWire, setWireNodes, setWireEdges, onRestore, sync],
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index--;
    restore(h.stack[h.index]);
  }, [restore]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    restore(h.stack[h.index]);
  }, [restore]);

  return { undo, redo, canUndo, canRedo };
}

function snapshot(nodes, edges, wire, wireNodes, wireEdges) {
  return {
    nodes: (nodes ?? []).map((n) => ({ ...n })),
    edges: (edges ?? []).map((e) => ({ ...e })),
    wire: wire
      ? {
          ...wire,
          vertices: wire.vertices.map((v) => ({ ...v })),
          segments: wire.segments.map((s) => ({ ...s })),
        }
      : null,
    wireNodes: (wireNodes ?? []).map((n) => ({ ...n })),
    wireEdges: (wireEdges ?? []).map((e) => ({ ...e })),
  };
}

function sameSnapshot(snap, nodes, edges, wire, wireNodes, wireEdges) {
  return (
    JSON.stringify(snap.nodes) === JSON.stringify(nodes ?? []) &&
    JSON.stringify(snap.edges) === JSON.stringify(edges ?? []) &&
    JSON.stringify(snap.wire) === JSON.stringify(wire ?? null) &&
    JSON.stringify(snap.wireNodes) === JSON.stringify(wireNodes ?? []) &&
    JSON.stringify(snap.wireEdges) === JSON.stringify(wireEdges ?? [])
  );
}
