import React from 'react';
import { Image, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { clampBadgeAnchorTop, FavouriteOutfitCard } from '../FavouriteOutfitCard';
import { Favourite } from '../../../services/favouriteService';
import { ITEM_HIT_AREA_RATIO } from '../../../components/features/canvas-hit-area';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

const fav: Favourite = {
  id: 'fav1',
  user_id: 'u1',
  outfit_items: [
    {
      id: 'i1',
      image_url: 'https://x/1.jpg',
      image_png: null,
      name: 'a',
      category: 'top',
    },
    {
      id: 'i2',
      image_url: 'https://x/2.jpg',
      image_png: null,
      name: 'b',
      category: 'bottom',
    },
    {
      id: 'i3',
      image_url: 'https://x/3.jpg',
      image_png: null,
      name: 'c',
      category: 'shoes',
    },
  ] as any,
  outfit_context: null,
  outfit_thumbnail_url: null,
  created_at: '2026-06-24T00:00:00Z',
  updated_at: '2026-06-24T00:00:00Z',
  title: 'Easy and ready.',
  mood_tags: ['confident'],
};

const tileIDs = (r: TestRenderer.ReactTestRenderer): string[] => [
  ...new Set(
    r.root
      .findAll(
        n =>
          typeof n.props?.testID === 'string' &&
          n.props.testID.includes('-tile-'),
      )
      .map(n => n.props.testID as string),
  ),
];

test('grid view renders all outfit tiles', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={fav} view="grid" />,
    );
  });
  expect(tileIDs(r)).toHaveLength(3);
});

test('grid view keeps a skeleton visible until tile image load settles', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={fav} view="grid" />,
    );
  });

  const skeletonId = 'favourite-card-fav1-image-skeleton-i1';
  expect(
    r.root.findAll(n => n.props?.testID === skeletonId).length,
  ).toBeGreaterThan(0);

  const image = r.root.findAllByType(Image)[0];
  act(() => {
    image.props.onLoadEnd();
  });

  expect(r.root.findAll(n => n.props?.testID === skeletonId)).toHaveLength(0);
});

test('collage view renders all outfit tiles after layout', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={fav} view="collage" />,
    );
  });

  // Surface mounts but seeds nothing until it knows its width (mirrors RN/web
  // before the first onLayout pass).
  expect(tileIDs(r)).toHaveLength(0);

  const surface = r.root.find(
    n => n.props?.testID === 'favourite-card-fav1-collage',
  );
  act(() => {
    surface.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 457 } },
    });
  });

  expect(tileIDs(r)).toHaveLength(3);
});

// AU-392: grid tiles reuse the shared `resolveTileStatus` 4-state rule
// (`new > less_use > common > none`) via `TileStatusBadge`, replacing the old
// `is_common_item`-only pill. Covers the CEO's literal acceptance example
// (1 untagged user item + 2 catalog items → 0 + 2 "Macgie" pills) plus the
// precedence check between `less_use` and `common`.
const badgeTestID = (
  r: TestRenderer.ReactTestRenderer,
  prefix: string,
): string[] => [
  ...new Set(
    r.root
      .findAll(n => typeof n.props?.testID === 'string')
      .map(n => n.props.testID as string)
      .filter(id => id.startsWith(prefix)),
  ),
];

test('4-state parity: 1 untagged user item + 2 common items → 0 + 2 "Macgie" pills', () => {
  const mixedFav: Favourite = {
    ...fav,
    outfit_items: [
      { id: 'i1', image_url: 'https://x/1.jpg', image_png: null, name: 'a', category: 'top', user_id: 'u1', is_common_item: false },
      { id: 'i2', image_url: 'https://x/2.jpg', image_png: null, name: 'b', category: 'bottom', is_common_item: true },
      { id: 'i3', image_url: 'https://x/3.jpg', image_png: null, name: 'c', category: 'shoes', is_common_item: true },
    ] as any,
  };
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={mixedFav} view="grid" />,
    );
  });

  expect(badgeTestID(r, 'wardrobe-item-common-')).toHaveLength(2);
  expect(badgeTestID(r, 'wardrobe-item-new-')).toHaveLength(0);
  expect(badgeTestID(r, 'wardrobe-item-less-used-')).toHaveLength(0);
});

test('4-state parity: is_new user item renders "New" on that tile only', () => {
  const newFav: Favourite = {
    ...fav,
    outfit_items: [
      { id: 'i1', image_url: 'https://x/1.jpg', image_png: null, name: 'a', category: 'top', user_id: 'u1', is_new: true },
      { id: 'i2', image_url: 'https://x/2.jpg', image_png: null, name: 'b', category: 'bottom', is_common_item: true },
    ] as any,
  };
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={newFav} view="grid" />,
    );
  });

  expect(badgeTestID(r, 'wardrobe-item-new-i1')).toHaveLength(1);
  expect(badgeTestID(r, 'wardrobe-item-common-i2')).toHaveLength(1);
});

test('4-state parity: demoted common item renders "less use", not "Macgie" (precedence)', () => {
  const demotedFav: Favourite = {
    ...fav,
    outfit_items: [
      {
        id: 'i1',
        image_url: 'https://x/1.jpg',
        image_png: null,
        name: 'a',
        category: 'top',
        is_common_item: true,
        usage_frequency: 'LESS_USED',
      },
    ] as any,
  };
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={demotedFav} view="grid" />,
    );
  });

  expect(badgeTestID(r, 'wardrobe-item-less-used-i1')).toHaveLength(1);
  expect(badgeTestID(r, 'wardrobe-item-common-i1')).toHaveLength(0);
});

test('4-state parity: user item with no status fields renders no badge', () => {
  const noneFav: Favourite = {
    ...fav,
    outfit_items: [
      {
        id: 'i1',
        image_url: 'https://x/1.jpg',
        image_png: null,
        name: 'a',
        category: 'top',
        user_id: 'u1',
        is_common_item: false,
      },
    ] as any,
  };
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={noneFav} view="grid" />,
    );
  });

  expect(badgeTestID(r, 'wardrobe-item-')).toHaveLength(0);
});

// AU-392 D1 (2026-07-30, CEO/user): the collage view now renders the SAME
// status badge as the grid — this reverses the earlier "omitted, mirrors
// Home collage" decision, since the Home collage shows it now too.
test('collage view renders the status badge (AU-392 D1, 2026-07-30)', () => {
  const mixedFav: Favourite = {
    ...fav,
    outfit_items: [
      { id: 'i1', image_url: 'https://x/1.jpg', image_png: null, name: 'a', category: 'top', is_common_item: true },
    ] as any,
  };
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={mixedFav} view="collage" />,
    );
  });

  const surface = r.root.find(
    n => n.props?.testID === 'favourite-card-fav1-collage',
  );
  act(() => {
    surface.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 457 } },
    });
  });

  expect(badgeTestID(r, 'wardrobe-item-common-i1')).toHaveLength(1);
});

// AU-392 sweep fix (2026-07-30, qa-ui HIGH finding): a badge anchored inside an
// item's own frame box inherited the collage canvas's intentional edge-bleed
// clip (`collageSurface`'s `overflow: 'hidden'`) whenever the item was seeded
// near the bottom edge — the pill rendered cut off / illegible. Regression-
// covers the clamp math directly (structural fix: the badge anchor's position
// is clamped to the visible canvas bounds, independent of the item's own,
// possibly-bleeding, frame box).
describe('clampBadgeAnchorTop (badge stays on-canvas regardless of item bleed)', () => {
  test('item well within the canvas: unaffected by clamping (linear in itemY)', () => {
    const canvasHeight = 1000;
    const top100 = clampBadgeAnchorTop(100, 100, canvasHeight);
    const top150 = clampBadgeAnchorTop(150, 100, canvasHeight);
    // Neither position is anywhere near the clamp ceiling, so shifting the
    // item down by 50 shifts the (unclamped) badge anchor by exactly 50.
    expect(top150 - top100).toBeCloseTo(50);
  });

  test('item seeded to bleed past the canvas bottom: badge clamps fully on-canvas', () => {
    const canvasHeight = 200;
    const top = clampBadgeAnchorTop(420, 120, canvasHeight);
    // Never renders past the visible canvas, regardless of how far the item
    // itself bled past the edge.
    expect(top).toBeLessThanOrEqual(canvasHeight);
    expect(top).toBeGreaterThanOrEqual(0);
    // Once clamped, pushing the item further off-canvas doesn't move the
    // badge any further — it's pinned at the ceiling, not merely reduced.
    expect(clampBadgeAnchorTop(1000, 120, canvasHeight)).toBe(top);
  });

  test('item seeded above the canvas top: badge never gets a negative position', () => {
    expect(clampBadgeAnchorTop(-50, 10, 500)).toBe(0);
  });
});

// AU-392 designer FAIL fix (2026-07-30, Finding 2): the badge anchors to the
// item's VISIBLE content bottom (the same 0.72 content-box heuristic used
// for hit-testing / collision, `ITEM_HIT_AREA_RATIO`), not the raw frame
// bottom — otherwise a square frame that letterboxes a non-square garment
// image leaves the badge floating in the transparent padding below the art.
describe('clampBadgeAnchorTop anchors to visible content, not the raw frame (Finding 2)', () => {
  test('badge sits above the frame bottom by the transparent-padding gap', () => {
    const itemY = 100;
    const itemHeight = 200;
    const canvasHeight = 10_000; // far from the clamp ceiling
    const top = clampBadgeAnchorTop(itemY, itemHeight, canvasHeight);

    // Content-box bottom = itemY + itemHeight * (1 + ratio) / 2.
    const expectedContentBottom =
      itemY + itemHeight * ((1 + ITEM_HIT_AREA_RATIO) / 2);
    const badgeAnchorHeight = 32; // TileStatusBadge's own bottom:8 + 24px pill
    expect(top).toBeCloseTo(expectedContentBottom - badgeAnchorHeight);

    // The old (pre-fix) frame-relative anchor would have been itemY +
    // itemHeight - 32 — strictly below the new content-relative anchor,
    // confirming the badge now sits higher (closer to the visible garment),
    // not at the raw frame edge.
    const oldFrameRelativeTop = itemY + itemHeight - badgeAnchorHeight;
    expect(top).toBeLessThan(oldFrameRelativeTop);
  });

  test('scales linearly with item height (no per-image aspect data needed)', () => {
    const canvasHeight = 10_000;
    const shortItem = clampBadgeAnchorTop(0, 100, canvasHeight);
    const tallItem = clampBadgeAnchorTop(0, 200, canvasHeight);
    // Doubling the frame height doubles the content-box gap proportionally.
    expect(tallItem - shortItem).toBeCloseTo(
      100 * ((1 + ITEM_HIT_AREA_RATIO) / 2),
    );
  });
});

// ── Try-on hero (new Favourite layout, CEO 2026-08-27) ────────────────────
// A saved outfit the user already ran "See on me" on leads with that photo:
// image left, the outfit's own tiles in a rail on the right that SCROLLS
// within the photo's height (tiles keep their 3:4 aspect — they are never
// squashed to fit). Outfits with no generated photo keep the plain grid.

const heroFav: Favourite = { ...fav, outfit_context: { outfit_hash: 'h1' } };

const PHOTO_HEIGHT = 400;

const renderHero = (
  props: Partial<React.ComponentProps<typeof FavouriteOutfitCard>> = {},
): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard
        favourite={heroFav}
        view="grid"
        tryOnImageUrl="https://cdn/try-on.jpg"
        outfitHash="h1"
        {...props}
      />,
    );
  });
  // The rail is bounded by the photo's measured height, so it mounts on the
  // layout pass after the photo (mirrors RN/web before the first onLayout).
  act(() => {
    r.root
      .find(n => n.props?.testID === 'favourite-card-fav1-try-on-photo-frame')
      .props.onLayout({
        nativeEvent: {
          layout: { x: 0, y: 0, width: 225, height: PHOTO_HEIGHT },
        },
      });
  });
  return r;
};

test('a saved try-on photo replaces the tile grid with the photo + item rail', () => {
  const r = renderHero();
  expect(
    r.root.findAll(n => n.props?.testID === 'favourite-card-fav1-try-on-photo')
      .length,
  ).toBeGreaterThan(0);
  // Every garment is still reachable — the rail holds them all.
  expect(tileIDs(r)).toHaveLength(3);
});

test('the item rail is bounded to the photo height so extra items scroll', () => {
  const r = renderHero();
  const photo = r.root.find(
    n => n.props?.testID === 'favourite-card-fav1-try-on-photo-frame',
  );
  const rail = r.root.find(
    n => n.props?.testID === 'favourite-card-fav1-try-on-rail',
  );
  // The photo is the try-on render's native 9:16, sized from the row (so it
  // claims its height on the first pass); the rail is capped at that height.
  expect(StyleSheet.flatten(photo.props.style)?.aspectRatio).toBe(9 / 16);
  expect(StyleSheet.flatten(rail.props.style)?.height).toBe(PHOTO_HEIGHT);

  // Tiles keep the grid's 3:4 aspect at rail width — the rail's content
  // overflows its bounded height and the user scrolls through it.
  const tile = r.root.find(
    n => n.props?.testID === 'favourite-card-fav1-tile-i1',
  );
  expect(StyleSheet.flatten(tile.props.style)?.aspectRatio).toBe(3 / 4);
});

test('the try-on photo carries the shared thumbs feedback row', () => {
  const r = renderHero();
  expect(
    r.root.findAll(
      n => n.props?.testID === 'favourite-card-fav1-feedback-like',
    ).length,
  ).toBeGreaterThan(0);
});

test('the try-on hero also replaces the collage view (rail needs the width)', () => {
  const r = renderHero({ view: 'collage' });
  expect(
    r.root.findAll(n => n.props?.testID === 'favourite-card-fav1-collage'),
  ).toHaveLength(0);
  expect(
    r.root.findAll(n => n.props?.testID === 'favourite-card-fav1-try-on-hero')
      .length,
  ).toBeGreaterThan(0);
});

test('an outfit with no saved try-on photo renders the grid unchanged', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={heroFav} view="grid" />,
    );
  });
  expect(
    r.root.findAll(n => n.props?.testID === 'favourite-card-fav1-try-on-hero'),
  ).toHaveLength(0);
  expect(tileIDs(r)).toHaveLength(3);
});
