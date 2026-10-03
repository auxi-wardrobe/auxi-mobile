/**
 * Colour families the Wardrobe Analysis "Color distribution" card groups items
 * into. The AI tagger writes free-text colour names (`dominant_color`:
 * "light blue", "olive green", "off-white"…), so items are bucketed by keyword
 * into a small set of families a user recognises.
 *
 * ORDER MATTERS: the first family whose keyword appears in the colour name
 * wins, so the more specific families sit above the generic ones
 * ("dark blue" → navy before blue, "olive green" → olive before green,
 * "off-white" → beige before white).
 *
 * `hex` is the swatch shown for the family — content, not a theme token.
 */
export interface ColorFamily {
  /** Stable id; also the i18n key suffix under `wardrobe.analysis.colors.*`. */
  id: string;
  keywords: string[];
  hex: string;
}

export const COLOR_FAMILIES: ColorFamily[] = [
  { id: 'navy', keywords: ['navy', 'dark blue', 'midnight'], hex: '#193579' },
  { id: 'olive', keywords: ['olive', 'army', 'khaki green'], hex: '#608c3a' },
  {
    id: 'burgundy',
    keywords: ['burgundy', 'maroon', 'wine', 'oxblood'],
    hex: '#6c0111',
  },
  {
    id: 'beige',
    keywords: [
      'beige',
      'cream',
      'ivory',
      'off-white',
      'off white',
      'tan',
      'camel',
      'sand',
      'nude',
      'khaki',
    ],
    hex: '#e6d3b3',
  },
  {
    id: 'grey',
    keywords: ['grey', 'gray', 'charcoal', 'silver'],
    hex: '#b2b2b2',
  },
  { id: 'black', keywords: ['black'], hex: '#17181c' },
  { id: 'white', keywords: ['white'], hex: '#ffffff' },
  {
    id: 'brown',
    keywords: ['brown', 'chocolate', 'coffee', 'mocha'],
    hex: '#723913',
  },
  { id: 'blue', keywords: ['blue', 'denim', 'indigo'], hex: '#5b8fd1' },
  { id: 'green', keywords: ['green', 'teal', 'mint'], hex: '#2f8f5b' },
  { id: 'red', keywords: ['red', 'crimson', 'scarlet'], hex: '#c62828' },
  {
    id: 'pink',
    keywords: ['pink', 'rose', 'blush', 'fuchsia'],
    hex: '#e58fae',
  },
  {
    id: 'purple',
    keywords: ['purple', 'lavender', 'lilac', 'violet', 'plum'],
    hex: '#8e6bbf',
  },
  { id: 'yellow', keywords: ['yellow', 'mustard', 'gold'], hex: '#f1c232' },
  {
    id: 'orange',
    keywords: ['orange', 'coral', 'rust', 'peach'],
    hex: '#e67e3a',
  },
];

/** Swatch for colours that match no family (multi-colour, prints, unknown). */
export const OTHER_COLOR_HEX = '#d0d5dd';
