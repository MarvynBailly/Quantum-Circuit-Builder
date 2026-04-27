import { ELEMENT_TYPES } from './elementTypes.js';

/**
 * Pick the next symbolic name "C_{k}" / "L_{k}" / "E_J^{k}" not yet
 * used among `edges`.
 */
export function nextSchematicSymbol(edges, type) {
  const sym = ELEMENT_TYPES[type].symbol;
  const used = new Set(edges.map((e) => e.value));
  let k = 0;
  let candidate;
  do {
    candidate = type === 'JJ' ? `E_J^{${k}}` : `${sym}_{${k}}`;
    k++;
  } while (used.has(candidate));
  return candidate;
}
