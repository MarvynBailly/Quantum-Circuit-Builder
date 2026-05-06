/**
 * Definitions for the three circuit element types supported by the builder.
 *
 * `color` is the default render color for a freshly-placed component of this
 * type. Every type defaults to the same neutral white as the electrical nodes
 * (see `DEFAULT_NODE_COLOR` in `wire/constants.js`) — users can override per
 * component or per group from the labels panel.
 */
const DEFAULT_COMPONENT_COLOR = '#ffffff';

export const ELEMENT_TYPES = {
  C: {
    id: 'C',
    label: 'Capacitor',
    color: DEFAULT_COMPONENT_COLOR,
    unit: 'fF',
    defaultValue: 5.0,
    symbol: 'C',
  },
  L: {
    id: 'L',
    label: 'Inductor',
    color: DEFAULT_COMPONENT_COLOR,
    unit: 'nH',
    defaultValue: 300,
    symbol: 'L',
  },
  JJ: {
    id: 'JJ',
    label: 'Josephson Junction',
    color: DEFAULT_COMPONENT_COLOR,
    unit: 'GHz',
    defaultValue: 8.0,
    symbol: 'E_J',
  },
};
