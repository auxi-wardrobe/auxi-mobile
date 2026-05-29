import { Item } from '../../types/item';
import { getImageUrl } from '../../utils/url';
import type { CanvasItemData } from './OutfitCanvasSurface';

// Seed positions for the Home collage-play view, lifted from Figma section
// 2850:13589 ("Home | Collage View"). Each variant's items are hand-placed in
// an overlapping arrangement inside the 382w × 509.33h "Image 3:4" container.
// Items intentionally bleed past the tile edge (negative x / x+w > 382) and are
// clipped by the surface's overflow:hidden — matching the design.

const FIGMA_REF_WIDTH = 382;
const FIGMA_REF_HEIGHT = 509.3333; // 382 × 4/3 (Image 3:4)

// [x, y, w, h] in Figma reference coords, ordered bottom→top layer (zIndex i+1).
type Slot = [number, number, number, number];

const SEED_TABLE: Record<number, Slot[]> = {
  3: [
    [17, -25, 240, 320],
    [137, 156, 276, 368],
    [36, 248, 163, 217],
  ],
  4: [
    [5, -19, 230, 306],
    [157, -33, 240, 320],
    [137, 156, 276, 368],
    [36, 248, 163, 217],
  ],
  5: [
    [5, -19, 230, 306],
    [157, -33, 240, 320],
    [137, 156, 276, 368],
    [38, 201, 156, 208],
    [48, 324, 146, 194],
  ],
  6: [
    [-71, 1, 300, 399],
    [79, -19, 230, 306],
    [177, -6, 220, 293],
    [137, 156, 276, 368],
    [79, 236, 123, 164],
    [31, 330, 146, 194],
  ],
};

export const COLLAGE_ASPECT = FIGMA_REF_HEIGHT / FIGMA_REF_WIDTH; // 4/3

const resolveUri = (item: Item): string =>
  getImageUrl(item.image_url) || item.image_url || '';

// Fallback for counts outside the 3–6 Figma tables: stagger items diagonally so
// they overlap pleasantly without a hand-tuned table. Never crashes.
const scatterFallback = (
  items: Item[],
  scale: number,
  startIndex: number,
): CanvasItemData[] => {
  const baseW = 200 * scale;
  const baseH = baseW * COLLAGE_ASPECT;
  return items.map((item, i) => ({
    id: item.id,
    imageSource: { uri: resolveUri(item) },
    x: (20 + i * 28) * scale,
    y: (10 + i * 36) * scale,
    width: baseW,
    height: baseH,
    zIndex: startIndex + i + 1,
  }));
};

/**
 * Map an outfit's items to seeded canvas positions for the collage-play view.
 * Positions are scaled uniformly from the Figma 382w reference to the device
 * surface width, preserving the overlapping collage arrangement and 3:4 aspect.
 */
export const seedFromOutfit = (
  items: Array<Item | null>,
  surfaceWidth: number,
): CanvasItemData[] => {
  const filled = items.filter((it): it is Item => !!it);
  const count = filled.length;
  if (count === 0) {
    return [];
  }

  const scale = surfaceWidth / FIGMA_REF_WIDTH;
  const table = SEED_TABLE[count];

  if (!table) {
    return scatterFallback(filled, scale, 0);
  }

  const seeded: CanvasItemData[] = filled
    .slice(0, table.length)
    .map((item, i) => {
      const [x, y, w, h] = table[i];
      return {
        id: item.id,
        imageSource: { uri: resolveUri(item) },
        x: x * scale,
        y: y * scale,
        width: w * scale,
        height: h * scale,
        zIndex: i + 1,
      };
    });

  // Defensive: if somehow more items than slots (shouldn't happen for a matched
  // count), scatter the overflow on top so nothing is dropped.
  if (filled.length > table.length) {
    seeded.push(
      ...scatterFallback(filled.slice(table.length), scale, table.length),
    );
  }

  return seeded;
};
