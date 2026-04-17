import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 100;

/**
 * Tracks nodes/edges history for undo / redo. Pauses recording while
 * `dragging` is non-null so a drag produces one history entry, not many.
 *
 * `onRestore` is invoked after an undo or redo with the restored snapshot.
 */
export function useHistory({ nodes, edges, dragging, setNodes, setEdges, onRestore }) {
  const historyRef = useRef({
    stack: [snapshot(nodes, edges)],
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
    if (cur && sameSnapshot(cur, nodes, edges)) return;

    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snapshot(nodes, edges));
    h.index = h.stack.length - 1;

    if (h.stack.length > MAX_HISTORY) {
      h.stack.shift();
      h.index--;
    }
    sync();
  }, [nodes, edges, dragging, sync]);

  const restore = useCallback(
    (s) => {
      skipRef.current = true;
      setNodes(s.nodes.map((n) => ({ ...n })));
      setEdges(s.edges.map((e) => ({ ...e })));
      onRestore?.(s);
      sync();
    },
    [setNodes, setEdges, onRestore, sync],
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

function snapshot(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e) => ({ ...e })),
  };
}

function sameSnapshot(snap, nodes, edges) {
  return (
    JSON.stringify(snap.nodes) === JSON.stringify(nodes) &&
    JSON.stringify(snap.edges) === JSON.stringify(edges)
  );
}
