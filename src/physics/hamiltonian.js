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
  const idx = {};
  nodes.forEach((n, i) => (idx[n.id] = i));
  const N = nodes.length;
  const A = Array.from({ length: N }, () => Array(N).fill(0));

  for (const edge of edges) {
    const i = idx[edge.from];
    const j = idx[edge.to];
    if (i === undefined || j === undefined) continue;
    A[i][j]++;
    A[j][i]++;
  }

  return { matrix: A, nodeList: nodes };
}

/**
 * Build the (symbolic) dynamical capacitance matrix C_dyn from
 * capacitor edges, with grounded nodes eliminated.
 *
 * Construction:
 *   C_ii = Σ_k  c_k   (sum of all capacitors touching node i)
 *   C_ij = − Σ_k c_k  (sum of all capacitors directly between i and j)
 *
 * Then every row/column belonging to a grounded node (`isGround`) is
 * dropped, since φ̇ = 0 there and those degrees of freedom carry no
 * kinetic Lagrangian. Capacitors between a live node and ground stay
 * in the live diagonal (capacitance-to-ground), the cross-coupling
 * disappears with the dropped column. This is the standard MNA
 * ground-elimination — the result is the matrix that enters
 *   T = ½ φ̇^T C_dyn φ̇  →  H = 2 e² Σ (C_dyn^{-1})_ij n_i n_j.
 *
 * Each capacitor's `value` is treated as an opaque LaTeX-renderable
 * string (e.g. "C_{0}") so the displayed matrix uses whatever symbolic
 * names the user has assigned. Each cell is an array of
 * `{ sign, term }` so the renderer can format them however it wants.
 *
 * @returns {{ cells: {sign:'+'|'-', term:string}[][][], nodeList: any[] }}
 */
export function capacitanceMatrix(nodes, edges) {
  return laplacianMatrix(nodes, edges, 'C', (e) => String(e.value));
}

/**
 * Build a symbolic graph-Laplacian matrix over the live (non-grounded)
 * nodes for one element type. This is the quadratic-form stamping
 * shared by the capacitance matrix (kinetic) and the inverse-inductance
 * matrix (potential):
 *
 *   M_ii = Σ_k  g_k   (sum over elements touching node i)
 *   M_ij = − Σ_k g_k  (sum over elements directly between i and j)
 *
 * where g_k is the per-element symbolic term produced by `termFn`
 * (e.g. "C_{0}" for capacitors, "\frac{1}{L_{0}}" for inductors).
 * Grounded nodes (φ = 0, φ̇ = 0) are eliminated by dropping their rows
 * and columns, leaving the matrix that enters the corresponding energy
 * quadratic form. Each cell is an array of `{ sign, term }` so the
 * renderer can format it freely.
 *
 * @returns {{ cells: {sign:'+'|'-', term:string}[][][], nodeList: any[] }}
 */
function laplacianMatrix(nodes, edges, typeKey, termFn) {
  const idx = {};
  nodes.forEach((n, i) => (idx[n.id] = i));
  const N = nodes.length;
  const full = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => []),
  );

  for (const e of edges) {
    if (e.type !== typeKey) continue;
    const i = idx[e.from];
    const j = idx[e.to];
    if (i === undefined || j === undefined || i === j) continue;
    const term = termFn(e);
    full[i][i].push({ sign: '+', term });
    full[j][j].push({ sign: '+', term });
    full[i][j].push({ sign: '-', term });
    full[j][i].push({ sign: '-', term });
  }

  const liveIndices = [];
  nodes.forEach((n, i) => { if (!n.isGround) liveIndices.push(i); });
  const cells = liveIndices.map((i) => liveIndices.map((j) => full[i][j]));
  const nodeList = liveIndices.map((i) => nodes[i]);

  return { cells, nodeList };
}

/**
 * Build the (symbolic) inductive-energy matrix from inductor edges.
 * Same Laplacian stamping as the capacitance matrix, with each inductor
 * contributing its inductive energy E_L = φ_0²/L (displayed as the
 * symbol E_{L_k}), and grounded nodes eliminated. The inductive
 * potential energy is the quadratic form (Lin et al. Eq. (1))
 *
 *   U_inductors = ½ Σ_ij (E_L)_ij φ_i φ_j
 *
 * which reproduces the per-inductor rule ½ E_L (φ_i − φ_j)², with
 * E_L = φ_0²/L and φ_0 = ℏ/2e the reduced flux quantum.
 */
export function inductanceMatrix(nodes, edges) {
  return laplacianMatrix(nodes, edges, 'L', (e) => `E_{${e.value}}`);
}

/**
 * Build the (symbolic) Josephson coupling matrix from junction edges.
 * Unlike the inductance matrix, the Josephson energy is a cosine, not a
 * quadratic form, so this is a symbolic adjacency-style matrix (like
 * `adjacencyMatrix`): grounded nodes are kept (φ = 0 there), and entry
 * (i,j) holds the E_J symbol(s) of the junction(s) bridging nodes i and
 * j. The potential energy is read off as
 *
 *   U_Josephson = − Σ_{i<j} [E_J]_ij cos(φ_i − φ_j)
 *
 * (sign per Lin et al. Eq. (1); a grounded node simply has φ = 0, so a
 * junction to ground reads as
 * cos(φ_i)). The diagonal is always empty — a junction never connects a
 * node to itself.
 *
 * @returns {{ cells: {sign:'+'|'-', term:string}[][][], nodeList: any[] }}
 */
export function josephsonMatrix(nodes, edges) {
  const idx = {};
  nodes.forEach((n, i) => (idx[n.id] = i));
  const N = nodes.length;
  const cells = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => []),
  );

  for (const e of edges) {
    if (e.type !== 'JJ') continue;
    const i = idx[e.from];
    const j = idx[e.to];
    if (i === undefined || j === undefined || i === j) continue;
    const term = String(e.value);
    cells[i][j].push({ sign: '+', term });
    cells[j][i].push({ sign: '+', term });
  }

  return { cells, nodeList: nodes };
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
