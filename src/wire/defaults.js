/** Default wire-mode circuit, loaded from the bundled example file. */

import example1 from '../../example1.json';
import { parseImportPayload } from '../circuit/exportJSON.js';
import { autoDetectNodes } from './electricalNodes.js';

const parsed = parseImportPayload(example1);

export const WIRE_DEFAULT = parsed.wire;

export const WIRE_DEFAULT_ANALYSIS = autoDetectNodes(WIRE_DEFAULT, {
  nodes: (parsed.nodeOverrides || []).map((o) => ({
    label: o.label,
    color: o.color,
    userLabel: !!o.label,
    userColor: !!o.color,
    isGround: !!o.is_ground,
    vertexIds: o.anchor != null ? [o.anchor] : [],
  })),
  edges: [],
});
