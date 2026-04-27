/**
 * Autosave the in-progress circuit to localStorage so a refresh,
 * accidental tab close, or browser restart doesn't lose work.
 *
 * The stored shape mirrors the live state slices (mode + both modes'
 * documents), so reload is a straight assignment — no schema mapping
 * needed. A `version` field guards against future shape changes.
 *
 * All operations are best-effort: localStorage may be unavailable
 * (private mode, quota exceeded, disabled by the user). We never
 * throw; failed reads return null and failed writes are silently
 * dropped.
 */

const STORAGE_KEY = 'quantum-circuit-builder:autosave:v1';
const SCHEMA_VERSION = 1;

export function saveAutosave(state) {
  try {
    const payload = {
      version: SCHEMA_VERSION,
      timestamp: Date.now(),
      mode: state.mode,
      nodes: state.nodes,
      edges: state.edges,
      wire: state.wire,
      wireNodes: state.wireNodes,
      wireEdges: state.wireEdges,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable; nothing actionable here.
  }
}

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || payload.version !== SCHEMA_VERSION) return null;
    return payload;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Detect whether the loaded payload actually has any user content,
 *  so we don't bother rehydrating a circuit that's effectively empty. */
export function hasContent(payload) {
  if (!payload) return false;
  const wireHasContent =
    payload.wire &&
    ((payload.wire.vertices && payload.wire.vertices.length > 0) ||
      (payload.wire.components && payload.wire.components.length > 0));
  const schematicHasContent =
    (payload.nodes && payload.nodes.length > 0) ||
    (payload.edges && payload.edges.length > 0);
  return !!(wireHasContent || schematicHasContent);
}
