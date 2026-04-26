import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A right-hand panel that resizes by dragging its left edge leftwards.
 *
 * The parent attaches `onResizeStart` to a handle (e.g. a narrow div on
 * the panel's left edge) and reads `width` to size the panel. `isResizing`
 * lets other mouse handlers bail out while a resize drag is active.
 */
export function useResizablePanel({
  initialWidth = 380,
  min = 240,
  max = 900,
  side = 'right',
} = {}) {
  const [width, setWidth] = useState(initialWidth);
  const resizeRef = useRef(null);

  const onResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { startX: e.clientX, startWidth: width };
    },
    [width],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const next =
        side === 'left' ? resizeRef.current.startWidth + dx : resizeRef.current.startWidth - dx;
      setWidth(Math.min(Math.max(next, min), max));
    };
    const onUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [min, max, side]);

  const isResizing = useCallback(() => resizeRef.current !== null, []);

  return { width, onResizeStart, isResizing };
}
