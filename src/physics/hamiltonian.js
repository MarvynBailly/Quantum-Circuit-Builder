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

/**
 * Build the (symbolic) capacitance matrix C from capacitor edges.
 *
 *   C_ii = Σ_k  c_k   (sum of all capacitors touching node i)
 *   C_ij = − Σ_k c_k  (sum of all capacitors directly between i and j)
 *
 * Each capacitor's `value` is treated as an opaque LaTeX-renderable
 * string (e.g. "C_{0}") so the displayed matrix uses whatever symbolic
 * names the user has assigned. Each cell is returned as an array of
 * `{ sign, term }` so the renderer can format them however it wants.
 *
 * @returns {{ cells: {sign:'+'|'-', term:string}[][][], nodeList: any[] }}
 */
export function capacitanceMatrix(nodes, edges) {
  const sorted = [...nodes].sort((a, b) => a.id - b.id);
  const idx = {};
  sorted.forEach((n, i) => (idx[n.id] = i));
  const N = sorted.length;
  const cells = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => []),
  );

  for (const e of edges) {
    if (e.type !== 'C') continue;
    const i = idx[e.from];
    const j = idx[e.to];
    if (i === undefined || j === undefined || i === j) continue;
    const term = String(e.value);
    cells[i][i].push({ sign: '+', term });
    cells[j][j].push({ sign: '+', term });
    cells[i][j].push({ sign: '-', term });
    cells[j][i].push({ sign: '-', term });
  }

  return { cells, nodeList: sorted };
}

/** Format a list of {sign, term} as a LaTeX expression like "C_{0} - C_{1}". */
export function formatSymbolicSum(parts) {
  if (parts.length === 0) return '0';
  return parts
    .map((p, i) => {
      if (i === 0) return p.sign === '-' ? `-${p.term}` : p.term;
      return p.sign === '-' ? ` - ${p.term}` : ` + ${p.term}`;
    })
    .join('');
}
