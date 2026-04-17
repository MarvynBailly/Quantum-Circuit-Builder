import { useCallback, useEffect, useRef, useState } from 'react';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;
const ZOOM_STEP = 1.04;
const PAN_THRESHOLD = 3;

/**
 * Pan and zoom state for an SVG canvas.
 *
 * Left-click on the SVG background (or rect) starts a pan, unless `disabled`
 * is truthy (e.g. while a tool is selected). Middle-click always starts a pan.
 * Wheel zooms around the cursor.
 *
 * Exposes a `processMove` / `endPan` pair so the parent can interleave
 * pan updates with its own node-drag logic in a single mousemove handler.
 */
export function usePanZoom(svgRef, { disabled = false } = {}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panInfoRef = useRef(null);
  const didPanRef = useRef(false);

  const svgPoint = useCallback(
    (e) => {
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom, svgRef],
  );

  const onCanvasMouseDown = useCallback(
    (e) => {
      const isBackground = e.target === svgRef.current || e.target.tagName === 'rect';
      const isMiddleClick = e.button === 1;
      const isLeftOnBackground = e.button === 0 && isBackground && !disabled;
      if (!isMiddleClick && !isLeftOnBackground) return;
      e.preventDefault();
      didPanRef.current = false;
      panInfoRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
    },
    [pan, disabled, svgRef],
  );

  const processMove = useCallback((e) => {
    if (!panInfoRef.current) return false;
    const dx = e.clientX - panInfoRef.current.startX;
    const dy = e.clientY - panInfoRef.current.startY;
    if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
      didPanRef.current = true;
    }
    setPan({
      x: panInfoRef.current.startPanX + dx,
      y: panInfoRef.current.startPanY + dy,
    });
    return true;
  }, []);

  const endPan = useCallback(() => {
    panInfoRef.current = null;
  }, []);

  // Wheel zoom (attached imperatively so we can call preventDefault).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const wx = (sx - pan.x) / zoom;
      const wy = (sy - pan.y) / zoom;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newZoom = Math.min(Math.max(zoom * factor, ZOOM_MIN), ZOOM_MAX);
      setPan({ x: sx - wx * newZoom, y: sy - wy * newZoom });
      setZoom(newZoom);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [pan, zoom, svgRef]);

  const fitToNodes = useCallback(
    (nodes) => {
      if (nodes.length === 0) {
        setPan({ x: 0, y: 0 });
        setZoom(1);
        return;
      }
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const xs = nodes.map((n) => n.x);
      const ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const pad = 80;
      const contentW = maxX - minX + pad * 2 || 1;
      const contentH = maxY - minY + pad * 2 || 1;
      const newZoom = Math.min(rect.width / contentW, rect.height / contentH, 2);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setPan({
        x: rect.width / 2 - cx * newZoom,
        y: rect.height / 2 - cy * newZoom,
      });
      setZoom(newZoom);
    },
    [svgRef],
  );

  const reset = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  return {
    pan,
    zoom,
    svgPoint,
    onCanvasMouseDown,
    processMove,
    endPan,
    didPanRef,
    fitToNodes,
    reset,
  };
}
