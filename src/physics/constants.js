// SI physical constants relevant to superconducting circuit QED.
//

/** Planck's constant (J·s) */
export const h = 6.62607015e-34;

/** Reduced Planck's constant ℏ = h/(2π) (J·s) */
export const hbar = h / (2 * Math.PI);

/** Electron charge (C) */
export const e = 1.602176634e-19;

/**
 * Reduced flux quantum φ_0 = ℏ/(2e) (Wb).
 */
export const phi0 = hbar / (2 * e);

/** Boltzmann constant (J/K) — used for β = 1/(k_B T) */
export const kB = 1.380649e-23;
