/** Default schematic-mode circuit shown when the user first switches modes. */

export const SCHEMATIC_DEFAULT = {
  nodes: [
    { id: 0, x: 200, y: 200, label: '\\phi_{0}', isGround: true },
    { id: 1, x: 400, y: 120, label: '\\phi_{1}', isGround: false },
    { id: 2, x: 400, y: 280, label: '\\phi_{2}', isGround: false },
  ],
  edges: [
    { id: 'e0', from: 0, to: 1, type: 'JJ', value: 'E_J^{0}' },
    { id: 'e1', from: 1, to: 2, type: 'L', value: 'L_{0}' },
    { id: 'e2', from: 0, to: 2, type: 'C', value: 'C_{0}' },
  ],
  nextNodeId: 3,
  nextEdgeId: 3,
};
