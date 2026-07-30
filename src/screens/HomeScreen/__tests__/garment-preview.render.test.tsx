/* eslint-env jest */
/**
 * GarmentPreview — the Home outfit-grid tile image + status pill.
 *
 * AU-392: this is the defect the CEO screenshotted — the pill used to render
 * "Macgie" unconditionally on every tile. Locks the data-driven contract:
 *   - the pill is `resolveTileStatus(item)` (shared with the wardrobe grid),
 *     not a constant,
 *   - the CEO's literal example (1 seen user item + 2 catalog items → 0 + 2
 *     "Macgie" pills) renders correctly,
 *   - a `usage_frequency: 'LESS_USED'` item shows "less use", not "Macgie",
 *   - a pre-phase-03 backend response (all 4 fields absent) degrades to
 *     today's "everything Macgie" behaviour rather than crashing.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { GarmentPreview } from '../components/GarmentPreview';
import { Item } from '../../../types/item';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const baseItem: Item = {
  id: 'i1',
  image_url: 'https://x/1.jpg',
  category: 'Top',
  color: '',
  isSystem: false,
};

const badgeTestIDs = (r: TestRenderer.ReactTestRenderer): string[] => [
  ...new Set(
    r.root
      .findAll(
        n =>
          typeof n.props?.testID === 'string' &&
          n.props.testID.startsWith('wardrobe-item-'),
      )
      .map(n => n.props.testID as string),
  ),
];

const render = (item: Item) => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<GarmentPreview item={item} />);
  });
  return r;
};

test('catalog item (is_common_item true) renders the "common" (Macgie) pill', () => {
  const r = render({ ...baseItem, is_common_item: true, user_id: null });
  expect(badgeTestIDs(r)).toEqual(['wardrobe-item-common-i1']);
});

test('own item, not new, not demoted → no pill at all', () => {
  const r = render({
    ...baseItem,
    is_common_item: false,
    user_id: 'u1',
    is_new: false,
  });
  expect(badgeTestIDs(r)).toEqual([]);
});

test('own item, still unseen (is_new true) → "new" pill, not "common"', () => {
  const r = render({
    ...baseItem,
    is_common_item: false,
    user_id: 'u1',
    is_new: true,
  });
  expect(badgeTestIDs(r)).toEqual(['wardrobe-item-new-i1']);
});

test('usage_frequency LESS_USED renders "less use", not "Macgie"', () => {
  const r = render({
    ...baseItem,
    is_common_item: true,
    user_id: null,
    usage_frequency: 'LESS_USED',
  });
  expect(badgeTestIDs(r)).toEqual(['wardrobe-item-less-used-i1']);
});

test('fields-absent (pre-phase-03 backend) degrades to "common" on every tile — no crash', () => {
  const r = render({ ...baseItem });
  expect(badgeTestIDs(r)).toEqual(['wardrobe-item-common-i1']);
});

test("CEO's literal example: 1 seen user item + 2 catalog items → 0 + 2 Macgie pills", () => {
  const items: Item[] = [
    { ...baseItem, id: 'own', is_common_item: false, user_id: 'u1', is_new: false },
    { ...baseItem, id: 'cat1', is_common_item: true, user_id: null },
    { ...baseItem, id: 'cat2', is_common_item: true, user_id: null },
  ];

  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <>
        {items.map(item => (
          <GarmentPreview key={item.id} item={item} />
        ))}
      </>,
    );
  });

  const ids = badgeTestIDs(r);
  expect(ids).toHaveLength(2);
  expect(ids).toEqual(['wardrobe-item-common-cat1', 'wardrobe-item-common-cat2']);
});

test('pinned item resolved from the wardrobe (R5 path) still resolves its status via the same fields', () => {
  // Mirrors the shape HomeScreen/index.tsx's `pinnedItem` fallback mapping
  // now produces for a "Build around this" pin: a user-owned item that has
  // already been seen.
  const r = render({
    ...baseItem,
    id: 'pinned-1',
    isSystem: false,
    isExploration: false,
    user_id: 'u1',
    is_common_item: false,
    is_new: false,
    usage_frequency: 'NORMAL',
  });
  expect(badgeTestIDs(r)).toEqual([]);
});
