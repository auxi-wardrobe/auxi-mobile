import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { OutfitCanvasSurface, CanvasItemData } from '../OutfitCanvasSurface';
import { TileStatusBadge } from '../TileStatusBadge';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// AU-392 designer FAIL fix (2026-07-30, Finding 1): the Remix editor
// (`OutfitCanvasScreen.tsx:498`) is the only surface with both
// `enablePinchZoom` and `showStatusBadge` true. Regression-covers that the
// badge's own transform counter-scales the item's live pinch `scale` value —
// i.e. the badge's effective on-screen size stays constant (1x) regardless
// of how far the user has pinched the item, instead of inheriting the
// parent's raster scale (illegible at the 0.5x clamp floor, blurry/oversized
// at the 3x clamp ceiling).
const baseItem = (overrides: Partial<CanvasItemData>): CanvasItemData => ({
  id: 'i1',
  imageSource: { uri: 'https://x/1.jpg' },
  x: 0,
  y: 0,
  zIndex: 1,
  width: 100,
  height: 100,
  status: 'common',
  ...overrides,
});

const renderPinchedItem = (scale: number) => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <OutfitCanvasSurface
        items={[baseItem({ scale })]}
        width={300}
        height={300}
        onPositionChange={() => {}}
        enablePinchZoom
        showStatusBadge
      />,
    );
  });
  return r;
};

// The counter-scale wrapper is the badge's immediate parent (an Animated.View
// introduced by the fix, distinct from the Image's own scaled subtree). By
// the time it reaches the rendered host View, react-test-renderer's (JS,
// non-native-driver) Animated has already resolved the transform to a plain
// number.
const badgeCounterScale = (r: TestRenderer.ReactTestRenderer): number => {
  const badge = r.root.findByType(TileStatusBadge);
  const wrapperStyle = badge.parent!.props.style;
  return wrapperStyle.transform[0].scale;
};

test('badge counter-scale is 1x when the item has no pinch scale applied', () => {
  const r = renderPinchedItem(1);
  expect(badgeCounterScale(r)).toBeCloseTo(1);
});

test('badge counter-scale inverts a pinched-out item (item 2x -> badge 0.5x)', () => {
  const r = renderPinchedItem(2);
  expect(badgeCounterScale(r)).toBeCloseTo(0.5);
});

test('badge counter-scale inverts a pinched-in item at the clamp floor (item 0.5x -> badge 2x)', () => {
  const r = renderPinchedItem(0.5);
  expect(badgeCounterScale(r)).toBeCloseTo(2);
});

test('badge counter-scale inverts a pinched-out item at the clamp ceiling (item 3x -> badge ~0.333x)', () => {
  const r = renderPinchedItem(3);
  expect(badgeCounterScale(r)).toBeCloseTo(1 / 3);
});
