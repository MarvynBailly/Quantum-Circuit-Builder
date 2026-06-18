"""
Symbolic circuit analysis for the verification worker.

Rebuilds the three symbolic matrices from the submitted topology and
returns their matrix product C * L * J.

  - Capacitance (C): graph Laplacian over capacitor edges.
  - Inductive   (L): graph Laplacian over inductor edges.
  - Josephson   (J): adjacency-style matrix over junction edges.

The three matrices as displayed in the app use different ground
handling (C and L eliminate ground; J keeps it), which would make them
non-conformable. To multiply them we build all three on the SAME basis:
the live (non-grounded) electrical nodes. Entries are kept fully
symbolic via sympy, using each component's label (e.g. "C_{0}",
"L_{1}", "E_J^{0}") as the symbol.

Input: the submitted `circuit` dict (buildExportPayload output) with
`nodes` [{id,label,is_ground}] and `edges` [{id,from,to,type,value}].
"""

import sympy as sp


def _live_basis(nodes):
    """Ordered live (non-grounded) nodes + a node-id -> row index map."""
    live = [n for n in nodes if not n.get("is_ground")]
    idx = {n["id"]: k for k, n in enumerate(live)}
    return live, idx


def _laplacian(edges, type_key, idx, n):
    """Symbolic Laplacian over edges of one type on the live-node basis."""
    M = sp.zeros(n, n)
    for e in edges:
        if e.get("type") != type_key:
            continue
        i = idx.get(e.get("from"))
        j = idx.get(e.get("to"))
        if i is None or j is None or i == j:
            continue
        g = sp.Symbol(str(e.get("value")))
        M[i, i] += g
        M[j, j] += g
        M[i, j] -= g
        M[j, i] -= g
    return M


def _josephson(edges, idx, n):
    """Symbolic adjacency matrix over junction edges (live-node basis)."""
    M = sp.zeros(n, n)
    for e in edges:
        if e.get("type") != "JJ":
            continue
        i = idx.get(e.get("from"))
        j = idx.get(e.get("to"))
        if i is None or j is None or i == j:
            continue
        g = sp.Symbol(str(e.get("value")))
        M[i, j] += g
        M[j, i] += g
    return M


def _to_cells(M, n):
    return [[sp.latex(M[i, j]) for j in range(n)] for i in range(n)]


def compute_symbolic(circuit):
    """Return the three symbolic matrices and their product C*L*J.

    All matrices are on the live-node basis (grounded nodes dropped), so
    junction-to-ground terms do not appear in the product.
    """
    nodes = circuit.get("nodes", [])
    edges = circuit.get("edges", [])
    live, idx = _live_basis(nodes)
    n = len(live)

    C = _laplacian(edges, "C", idx, n)
    L = _laplacian(edges, "L", idx, n)
    J = _josephson(edges, idx, n)
    product = sp.expand(C * L * J) if n else sp.zeros(0, 0)

    return {
        "mode": "symbolic",
        "basis": "live nodes (grounded nodes eliminated)",
        "node_order": [nd.get("label") for nd in live],
        "capacitance_latex": sp.latex(C),
        "inductive_latex": sp.latex(L),
        "josephson_latex": sp.latex(J),
        "product_latex": sp.latex(product),
        "product_cells": _to_cells(product, n),
    }


if __name__ == "__main__":
    # Self-test: C, L, JJ all between two live nodes -> product should be
    # 2*C_0*L_0*E_J^0 * [[-1, 1], [1, -1]].
    demo = {
        "nodes": [
            {"id": 0, "label": "\\phi_{0}", "is_ground": False},
            {"id": 1, "label": "\\phi_{1}", "is_ground": False},
        ],
        "edges": [
            {"id": "e0", "from": 0, "to": 1, "type": "C", "value": "C_{0}"},
            {"id": "e1", "from": 0, "to": 1, "type": "L", "value": "L_{0}"},
            {"id": "e2", "from": 0, "to": 1, "type": "JJ", "value": "E_J^{0}"},
        ],
    }
    import json

    r = compute_symbolic(demo)
    print("node order:", r["node_order"])
    print("product (LaTeX):", r["product_latex"])
    print(json.dumps(r["product_cells"], indent=2))
