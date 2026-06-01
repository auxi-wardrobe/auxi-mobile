// AU-310 — Outfit card layout descriptors.
//
// Pure (no JSX, no RN imports) count→layout mapping so it is unit-testable and
// shared verbatim by BOTH the loaded grid (OutfitCardGrid) and the loading
// skeleton (OutfitCardSkeleton). Identical descriptors → identical slots →
// zero layout shift when the real images replace the skeleton.
//
// Geometry is expressed as a tree of ROWS / SECTIONS of CELLS. Concrete pixel
// sizes are NOT baked in here — the renderer derives them from screen width
// (see computeOutfitCardGeometry below) so the layout breathes across devices.
// Source spec: plans/.../figma-extraction-outfit-cards.md + au310-count-*.png.

// Reveal grouping drives the staggered content-reveal order:
//   0 = hero (revealed first) · 1 = supporting · 2 = accessory (last).
export type RevealGroup = 0 | 1 | 2;

// A single card slot in a flat (non-hero) row. `kind` is descriptive only —
// the renderer sizes every flat cell from the row's column width.
export type GridCell = {
  // Index into the outfit's item array. `null` = intentionally-empty slot
  // (e.g. the 3-item bottom-right gap, or a trailing >6 padding cell).
  itemIndex: number | null;
  revealGroup: RevealGroup;
};

// A flat row of cells laid out horizontally with GAP between them. `align`
// controls how a partially-filled row distributes its cells.
export type GridRow = {
  type: 'row';
  cells: GridCell[];
  // 'center' = centre the row (used for the 2-item small + the 3-item is left).
  // 'start'  = pack from the left (3-item bottom row, >6 trailing rows).
  // 'fill'   = each cell flexes to fill the row (4-item 2×2, 5/6 bottom rows).
  align: 'start' | 'center' | 'fill';
};

// The hero section: a large hero card on the left + a right column of two
// stacked small cards whose combined height equals the hero height.
export type HeroSection = {
  type: 'hero';
  hero: GridCell;
  stack: [GridCell, GridCell];
};

export type LayoutNode = GridRow | HeroSection;

// 'two-col'  = 1–4 item family (two-column geometry: colW = (contentW-gap)/2).
// 'hero-col' = 5+ item family (three-column geometry: colW = (contentW-2gap)/3).
export type LayoutFamily = 'two-col' | 'hero-col';

export type OutfitCardLayout = {
  count: number;
  family: LayoutFamily;
  nodes: LayoutNode[];
  // True when the layout can exceed the visible grid area (>6 items) and the
  // grid should live inside a scroll container.
  scrolls: boolean;
};

const cell = (itemIndex: number | null, revealGroup: RevealGroup): GridCell => ({
  itemIndex,
  revealGroup,
});

// Build the >6 (7+) layout: hero section (items 0,1,2) + N rows of 3 small
// accessory cards (items 3…). Trailing partial row left-aligned.
const buildOverflowLayout = (count: number): OutfitCardLayout => {
  const nodes: LayoutNode[] = [
    {
      type: 'hero',
      hero: cell(0, 0),
      stack: [cell(1, 1), cell(2, 1)],
    },
  ];
  for (let start = 3; start < count; start += 3) {
    const cells: GridCell[] = [];
    for (let i = start; i < Math.min(start + 3, count); i += 1) {
      cells.push(cell(i, 2));
    }
    nodes.push({ type: 'row', cells, align: 'start' });
  }
  return { count, family: 'hero-col', nodes, scrolls: true };
};

/**
 * Map an item count to its layout descriptor.
 *
 * Counts (matches the six AU-310 Figma frames):
 * - 1  → single full-width hero (defensive; not in Figma).
 * - 2  → full-width hero on top + one small centred below.
 * - 3  → two mediums on top + one medium left-aligned below (bottom-right empty).
 * - 4  → 2×2 of four mediums.
 * - 5  → hero + right stack(2) on top + two smalls (left) below.
 * - 6  → hero + right stack(2) on top + three smalls below.
 * - >6 → hero + right stack(2) + N rows of three smalls (scrolls).
 *
 * Returns `null` for count ≤ 0 (nothing to render).
 */
export const getOutfitCardLayout = (count: number): OutfitCardLayout | null => {
  if (count <= 0) {
    return null;
  }

  if (count === 1) {
    return {
      count,
      family: 'two-col',
      nodes: [{ type: 'row', cells: [cell(0, 0)], align: 'fill' }],
      scrolls: false,
    };
  }

  if (count === 2) {
    // Full-width hero (fill row of one) + one small centred below.
    return {
      count,
      family: 'two-col',
      nodes: [
        { type: 'row', cells: [cell(0, 0)], align: 'fill' },
        { type: 'row', cells: [cell(1, 2)], align: 'center' },
      ],
      scrolls: false,
    };
  }

  if (count === 3) {
    // Two mediums on top, one medium left-aligned below (2×2 minus a slot).
    return {
      count,
      family: 'two-col',
      nodes: [
        { type: 'row', cells: [cell(0, 0), cell(1, 1)], align: 'fill' },
        { type: 'row', cells: [cell(2, 1), cell(null, 1)], align: 'fill' },
      ],
      scrolls: false,
    };
  }

  if (count === 4) {
    // 2×2 of four equal mediums.
    return {
      count,
      family: 'two-col',
      nodes: [
        { type: 'row', cells: [cell(0, 0), cell(1, 1)], align: 'fill' },
        { type: 'row', cells: [cell(2, 1), cell(3, 1)], align: 'fill' },
      ],
      scrolls: false,
    };
  }

  if (count === 5 || count === 6) {
    const bottom: GridCell[] = [];
    for (let i = 3; i < count; i += 1) {
      bottom.push(cell(i, 2));
    }
    return {
      count,
      family: 'hero-col',
      nodes: [
        { type: 'hero', hero: cell(0, 0), stack: [cell(1, 1), cell(2, 1)] },
        // 5 → 2 smalls (start-aligned, mirroring Figma's left pack); 6 → 3 fill.
        { type: 'row', cells: bottom, align: count === 6 ? 'fill' : 'start' },
      ],
      scrolls: false,
    };
  }

  return buildOverflowLayout(count);
};

// ── Geometry ────────────────────────────────────────────────────────────────
// Derive concrete pixel dimensions from the screen width. Driven off width (not
// hardcoded 189) so the layout matches Figma proportions on any device.

export const OUTFIT_CARD_PAGE_PADDING = 16; // Figma Frame 2009 x=16 inset.
export const OUTFIT_CARD_GAP = 4; // Figma 193−189.
export const OUTFIT_CARD_ASPECT = 3 / 4; // width / height (3:4 portrait).

export type OutfitCardGeometry = {
  contentWidth: number;
  gap: number;
  // two-col family
  twoColWidth: number; // (contentW − gap) / 2
  twoColHeight: number; // twoColWidth / aspect
  fullWidth: number; // contentW
  fullHeight: number; // contentW / aspect
  // hero-col family
  smallWidth: number; // (contentW − 2·gap) / 3
  smallHeight: number; // smallWidth / aspect
  heroWidth: number; // 2·smallWidth + gap
  heroHeight: number; // 2·smallHeight + gap
};

export const computeOutfitCardGeometry = (
  screenWidth: number,
  pagePadding: number = OUTFIT_CARD_PAGE_PADDING,
  gap: number = OUTFIT_CARD_GAP,
): OutfitCardGeometry => {
  const contentWidth = screenWidth - pagePadding * 2;

  const twoColWidth = (contentWidth - gap) / 2;
  const twoColHeight = twoColWidth / OUTFIT_CARD_ASPECT;

  const smallWidth = (contentWidth - gap * 2) / 3;
  const smallHeight = smallWidth / OUTFIT_CARD_ASPECT;
  const heroWidth = smallWidth * 2 + gap;
  const heroHeight = smallHeight * 2 + gap;

  return {
    contentWidth,
    gap,
    twoColWidth,
    twoColHeight,
    fullWidth: contentWidth,
    fullHeight: contentWidth / OUTFIT_CARD_ASPECT,
    smallWidth,
    smallHeight,
    heroWidth,
    heroHeight,
  };
};

// Stagger delay (ms) for a reveal group. Within 30–60ms range per the spec.
export const REVEAL_STAGGER_MS = 45;
export const revealDelay = (group: RevealGroup): number =>
  group * REVEAL_STAGGER_MS;
