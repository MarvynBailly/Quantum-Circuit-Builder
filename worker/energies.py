"""
Numeric Hamiltonian-parameter extraction (energies only), in GHz.

Conventions mirror the JS app (src/physics/constants.js + hamiltonian.js)
and Lin et al. (arXiv:2512.05851):

  - Capacitance matrix: MNA Laplacian over capacitor edges, grounded
    nodes eliminated. H_charge = 2 e^2 sum_ij (C^-1)_ij n_i n_j.
  - Charging energy matrix (GHz) = 2 e^2 * C^-1 / h / 1e9.
    Per-node E_C_i = (e^2 / 2) * (C^-1)_ii / h / 1e9  (so 4 E_C = 2 e^2 C^-1).
  - Inductive energy E_L = phi0^2 / L (per inductor), phi0 = hbar / 2e.
  - Josephson energy E_J is entered directly in GHz.

Inputs:
  circuit  -- buildExportPayload() dict: {nodes:[{id,label,is_ground}],
              edges:[{id,from,to,type,value,unit}], ...}
  values   -- {edge_id: {"magnitude": float, "unit": "fF"|"nH"|"GHz"}}

Units: capacitors fF, inductors nH, junctions GHz (as collected by the
submit form).
"""

import numpy as np

# SI constants (match src/physics/constants.js)
H = 6.62607015e-34            # Planck constant (J*s)
HBAR = H / (2 * np.pi)        # reduced Planck constant
E = 1.602176634e-19           # electron charge (C)
PHI0 = HBAR / (2 * E)         # reduced flux quantum phi0 = hbar/2e (Wb)

GHZ = 1e9


def _magnitude(values, edge):
    v = values.get(edge["id"])
    if isinstance(v, dict) and "magnitude" in v:
        try:
            return float(v["magnitude"])
        except (TypeError, ValueError):
            return None
    return None


def compute_energies(circuit, values):
    """Return a JSON-serializable dict of energies (all in GHz)."""
    nodes = circuit.get("nodes", [])
    edges = circuit.get("edges", [])
    values = values or {}
    idx = {n["id"]: k for k, n in enumerate(nodes)}
    n_nodes = len(nodes)

    # --- capacitance matrix (SI), Laplacian stamping ---
    cap = np.zeros((n_nodes, n_nodes))
    has_cap = False
    for e in edges:
        if e.get("type") != "C":
            continue
        m = _magnitude(values, e)
        if m is None or e["from"] not in idx or e["to"] not in idx:
            continue
        i, j = idx[e["from"]], idx[e["to"]]
        if i == j:
            continue
        c_si = m * 1e-15  # fF -> F
        cap[i, i] += c_si
        cap[j, j] += c_si
        cap[i, j] -= c_si
        cap[j, i] -= c_si
        has_cap = True

    live = [k for k, n in enumerate(nodes) if not n.get("is_ground")]

    if not has_cap:
        charging = {"note": "No capacitors — no charging (kinetic) term."}
    elif not live:
        charging = {"note": "Every node is grounded — no dynamical modes."}
    else:
        c_red = cap[np.ix_(live, live)]
        try:
            c_inv = np.linalg.inv(c_red)
            ec_matrix = (2 * E**2) * c_inv / H / GHZ
            per_node = [
                {
                    "node_id": nodes[k]["id"],
                    "label": nodes[k].get("label"),
                    "EC_GHz": (E**2 / 2) * c_inv[li, li] / H / GHZ,
                }
                for li, k in enumerate(live)
            ]
            charging = {
                "live_node_ids": [nodes[k]["id"] for k in live],
                "inverse_capacitance_matrix_inv_farad": c_inv.tolist(),
                "charging_energy_matrix_GHz": ec_matrix.tolist(),
                "per_node_EC_GHz": per_node,
            }
        except np.linalg.LinAlgError:
            charging = {"note": "Capacitance matrix is singular — no charging term."}

    # --- inductive energies ---
    inductive = []
    for e in edges:
        if e.get("type") != "L":
            continue
        m = _magnitude(values, e)
        if m is None:
            continue
        l_si = m * 1e-9  # nH -> H
        e_l = PHI0**2 / l_si / H / GHZ
        inductive.append(
            {"edge_id": e["id"], "symbol": e.get("value"), "L_nH": m, "E_L_GHz": e_l}
        )

    # --- Josephson energies (entered directly in GHz) ---
    josephson = []
    for e in edges:
        if e.get("type") != "JJ":
            continue
        m = _magnitude(values, e)
        if m is None:
            continue
        josephson.append({"edge_id": e["id"], "symbol": e.get("value"), "E_J_GHz": m})

    return {
        "units": "GHz",
        "charging": charging,
        "inductive": inductive,
        "josephson": josephson,
    }


if __name__ == "__main__":
    # Quick self-check: 5 fF cap to ground -> E_C = e^2/2C ~ 3.2 GHz;
    # 300 nH inductor -> E_L = phi0^2 / L / h.
    demo_circuit = {
        "nodes": [
            {"id": 0, "label": "\\phi_{0}", "is_ground": False},
            {"id": 1, "label": "\\phi_{1}", "is_ground": True},
        ],
        "edges": [
            {"id": "e0", "from": 0, "to": 1, "type": "C", "value": "C_{0}"},
            {"id": "e1", "from": 0, "to": 1, "type": "L", "value": "L_{0}"},
        ],
    }
    demo_values = {
        "e0": {"magnitude": 5.0, "unit": "fF"},
        "e1": {"magnitude": 300.0, "unit": "nH"},
    }
    import json

    print(json.dumps(compute_energies(demo_circuit, demo_values), indent=2))
