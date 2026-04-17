/**
 * hamiltonian.js
 *
 * Circuit-graph analysis helpers. Currently exposes only the adjacency
 * matrix; other Hamiltonian-parameter extraction routines will be added
 * here as they are needed.
 */

/**
 * @typedef {Object} Node
 * @property {number} id
 * @property {string} label
 * @property {boolean} isGround
 */

/**
 * @typedef {Object} Edge
 * @property {string} id
 * @property {number} from
 * @property {number} to
 * @property {'C'|'L'|'JJ'} type
 * @property {number} value
 */

/**
 * Build the adjacency matrix (element count) over all nodes, including
 * ground. Edges are counted in both directions (A_ij = A_ji).
 *
 * @param {Node[]} nodes
 * @param {Edge[]} edges
 * @returns {{ matrix: number[][], nodeList: Node[] }}
 */
export function adjacencyMatrix(nodes, edges) {
  const sorted = [...nodes].sort((a, b) => a.id - b.id);
  const idx = {};
  sorted.forEach((n, i) => (idx[n.id] = i));
  const N = sorted.length;
  const A = Array.from({ length: N }, () => Array(N).fill(0));

  for (const edge of edges) {
    const i = idx[edge.from];
    const j = idx[edge.to];
    if (i === undefined || j === undefined) continue;
    A[i][j]++;
    A[j][i]++;
  }

  return { matrix: A, nodeList: sorted };
}
