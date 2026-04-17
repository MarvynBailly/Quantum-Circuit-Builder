import { useEffect } from 'react';

/**
 * Global keyboard shortcuts for the circuit editor:
 *   Ctrl/Cmd+Z            → undo
 *   Ctrl/Cmd+Shift+Z / +Y → redo
 *   Escape                → onEscape()
 *   Delete / Backspace    → onDelete()  (ignored while typing in inputs)
 */
export function useKeyboardShortcuts({ undo, redo, onEscape, onDelete }) {
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'z') {
        e.preventDefault();
        (e.shiftKey ? redo : undo)();
        return;
      }
      if (mod && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        onEscape();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT') return;
        onDelete();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, onEscape, onDelete]);
}
