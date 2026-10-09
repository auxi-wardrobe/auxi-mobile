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
 * Catalog items (Macgie starter items + anything added from the database)
 * carry no free-text colour — only the backend palette code (`color_code`:
 * BLK, WHT, NVY… — same palette as Discovery's `discovery.colors.*`), which
 * `codes` maps onto the same families.
 *
 * `hex` is the swatch shown for the family — content, not a theme token.
 */
export interface ColorFamily {
  /** Stable id; also the i18n key suffix under `wardrobe.analysis.colors.*`. */
  id: string;
  keywords: string[];
  /** Backend palette codes (`color_code`) that belong to this family. */
  codes: string[];
  hex: string;
}

export const COLOR_FAMILIES: ColorFamily[] = [
  {
    id: 'navy',
    keywords: ['navy', 'dark blue', 'midnight'],
    codes: ['NVY'],
    hex: '#193579',
  },
  {
    id: 'olive',
    keywords: ['olive', 'army', 'khaki green'],
    codes: ['OLV'],
    hex: '#608c3a',
  },
  {
    id: 'burgundy',
    keywords: ['burgundy', 'maroon', 'wine', 'oxblood'],
    codes: ['BUR'],
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
    codes: ['BEG', 'CRM', 'TAN', 'CAM'],
    hex: '#e6d3b3',
  },
  {
    id: 'grey',
    keywords: ['grey', 'gray', 'charcoal', 'silver'],
    codes: ['GRY', 'MTL'],
    hex: '#b2b2b2',
  },
  { id: 'black', keywords: ['black'], codes: ['BLK'], hex: '#17181c' },
  { id: 'white', keywords: ['white'], codes: ['WHT'], hex: '#ffffff' },
  {
    id: 'brown',
    keywords: ['brown', 'chocolate', 'coffee', 'mocha'],
    codes: ['BRN'],
    hex: '#723913',
  },
  {
    id: 'blue',
    keywords: ['blue', 'denim', 'indigo'],
    codes: ['BLU', 'LBL', 'IND'],
    hex: '#5b8fd1',
  },
  {
    id: 'green',
    keywords: ['green', 'teal', 'mint'],
    codes: ['GRN'],
    hex: '#2f8f5b',
  },
  {
    id: 'red',
    keywords: ['red', 'crimson', 'scarlet'],
    codes: ['RED'],
    hex: '#c62828',
  },
  {
    // Above pink so "blush pink" / "dusty rose" land here, not in pink.
    id: 'blush',
    keywords: ['blush', 'dusty rose', 'dusty pink', 'nude pink', 'pale pink'],
    codes: ['BSH'],
    hex: '#e8b4ac',
  },
  {
    id: 'pink',
    keywords: ['pink', 'rose', 'fuchsia'],
    codes: ['PNK'],
    hex: '#e58fae',
  },
  {
    id: 'purple',
    keywords: ['purple', 'lavender', 'lilac', 'violet', 'plum'],
    codes: ['LAV'],
    hex: '#8e6bbf',
  },
  {
    id: 'yellow',
    keywords: ['yellow', 'mustard', 'gold'],
    codes: ['YEL'],
    hex: '#f1c232',
  },
  {
    id: 'orange',
    keywords: ['orange', 'coral', 'rust', 'peach'],
    codes: [],
    hex: '#e67e3a',
  },
];

/** Swatch for colours that match no family (multi-colour, prints, unknown). */
export const OTHER_COLOR_HEX = '#d0d5dd';

/**
 * Representative swatch per backend palette code, for comparing a catalog
 * item's colour against the skin-tone best colours (a family swatch would be
 * too coarse: LBL light blue and IND indigo are both "blue"). MUL (multi) has
 * no single colour and is deliberately absent.
 */
export const COLOR_CODE_HEX: Record<string, string> = {
  BLK: '#17181c',
  WHT: '#ffffff',
  GRY: '#9e9e9e',
  CRM: '#f3ead8',
  BEG: '#e6d3b3',
  TAN: '#c8a77e',
  CAM: '#b9864f',
  BRN: '#723913',
  MTL: '#c0c0c0',
  RED: '#c62828',
  BUR: '#6c0111',
  PNK: '#e58fae',
  BSH: '#e8b4ac',
  YEL: '#f1c232',
  OLV: '#608c3a',
  GRN: '#2f8f5b',
  LBL: '#a0c2f1',
  BLU: '#5b8fd1',
  IND: '#3f3d8f',
  NVY: '#193579',
  LAV: '#c5a5d3',
};
