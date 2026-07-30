/* eslint-env jest */
/**
 * AU-392 gap fix: the "Add to canvas" picker grid (`ItemPickerPanel`) — the
 * browsing UI shown BEFORE an item is confirmed onto the canvas — never ran
 * items through `resolveTileStatus`, so tiles here showed no status pill even
 * though the same item gets one on the wardrobe grid (`WardrobeGridTile`) and
 * once placed on the canvas (`useCanvasAddItems`). Locks the fix: an item
 * with a resolvable status shows its badge in the picker grid; an item with
 * none shows no badge.
 *
 * No testing-library in this repo — render via react-test-renderer + a tiny
 * harness (same pattern as garment-preview.render.test.tsx /
 * useCanvasAddItems.test.ts).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ItemPickerPanel } from '../ItemPickerPanel';
import { WardrobeItem } from '../../../services/wardrobeService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../../services/wardrobeService', () => {
  const actual = jest.requireActual('../../../services/wardrobeService');
  return {
    ...actual,
    wardrobeService: {
      ...actual.wardrobeService,
      filterWardrobeItems: jest.fn(),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { wardrobeService } = require('../../../services/wardrobeService');

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

const catalogItem: WardrobeItem = {
  id: 'cat-1',
  image_url: 'https://cdn.example/cat-1.jpg',
  category: 'top',
  is_common_item: true,
  user_id: null,
} as WardrobeItem;

const plainOwnItem: WardrobeItem = {
  id: 'own-1',
  image_url: 'https://cdn.example/own-1.jpg',
  category: 'bottom',
  is_common_item: false,
  user_id: 'user-1',
  is_new: false,
} as WardrobeItem;

const renderPanel = async (items: WardrobeItem[]) => {
  (wardrobeService.filterWardrobeItems as jest.Mock).mockResolvedValue(items);
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <ItemPickerPanel
        visible
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    // let the panel's fetch effect (filterWardrobeItems) resolve.
    await Promise.resolve();
    await Promise.resolve();
  });
  return r;
};

describe('ItemPickerPanel — status badge (AU-392 gap fix)', () => {
  it('shows the "common" (Macgie) pill for a catalog item in the picker grid', async () => {
    const r = await renderPanel([catalogItem]);
    expect(badgeTestIDs(r)).toEqual(['wardrobe-item-common-cat-1']);
  });

  it('shows no pill for a plain, already-seen own item', async () => {
    const r = await renderPanel([plainOwnItem]);
    expect(badgeTestIDs(r)).toEqual([]);
  });
});
