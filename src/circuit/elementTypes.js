/**
 * Definitions for the three circuit element types supported by the builder.
 */
export const ELEMENT_TYPES = {
  C: {
    id: 'C',
    label: 'Capacitor',
    color: '#c4b5fd',
    unit: 'fF',
    defaultValue: 5.0,
    symbol: 'C',
  },
  L: {
    id: 'L',
    label: 'Inductor',
    color: '#4ade80',
    unit: 'nH',
    defaultValue: 300,
    symbol: 'L',
  },
  JJ: {
    id: 'JJ',
    label: 'Josephson Junction',
    color: '#fbbf24',
    unit: 'GHz',
    defaultValue: 8.0,
    symbol: 'E_J',
  },
};
