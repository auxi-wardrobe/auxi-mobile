import { resolveTileStatus, TileStatusInput } from '../tile-status';
import { WardrobeItem } from '../../services/wardrobeService';
import { FavouriteItem } from '../../services/favouriteService';

const wardrobeItem = (over: Partial<WardrobeItem>): WardrobeItem =>
  ({ id: 'x', category: 'top', ...over } as WardrobeItem);

describe('resolveTileStatus — WardrobeItem input (moved from wardrobe-grid.test.ts)', () => {
  it('renders New only when the backend marks a personal item as new', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({ user_id: 'u1', is_common_item: false, is_new: true }),
      ),
    ).toBe('new');
  });

  it('does not infer New from missing local viewed state', () => {
    expect(
      resolveTileStatus(wardrobeItem({ user_id: 'u1', is_common_item: false })),
    ).toBeNull();
  });

  it('keeps less use and common precedence when is_new is false', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_new: false,
          usage_frequency: 'LESS_USED',
        }),
      ),
    ).toBe('less_use');
    expect(
      resolveTileStatus(
        wardrobeItem({ user_id: null, is_common_item: true, is_new: true }),
      ),
    ).toBe('common');
  });

  it('falls back to the legacy less-used style tag when usage_frequency is absent', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          style_tags: ['less-used'],
        }),
      ),
    ).toBe('less_use');
  });
});

// AU-392: proves the resolver accepts the favourites payload shape with NO
// `as` cast — the whole point of widening the input to a structural type.
describe('resolveTileStatus — FavouriteItem input (no cast)', () => {
  const favouriteItem = (over: Partial<FavouriteItem>): FavouriteItem => ({
    id: 'f1',
    image_url: 'https://example.com/f1.png',
    image_png: null,
    name: 'Fav Item',
    category: 'top',
    ...over,
  });

  it('resolves "common" for a catalog favourite item', () => {
    expect(resolveTileStatus(favouriteItem({ is_common_item: true }))).toBe(
      'common',
    );
  });

  it('resolves null for a non-catalog favourite item with no other signal', () => {
    expect(
      resolveTileStatus(favouriteItem({ is_common_item: false, user_id: 'u1' })),
    ).toBeNull();
  });
});

// AU-392: a "mapped Item" (Home/recommendation payload, once phase 03/04
// project the four backend fields onto it) is just an object literal
// satisfying `TileStatusInput` directly — no cast needed either.
describe('resolveTileStatus — mapped Item-like input (no cast)', () => {
  it('resolves "new" for a fresh personal item', () => {
    const mappedItem: TileStatusInput = {
      is_common_item: false,
      user_id: 'u1',
      is_new: true,
    };
    expect(resolveTileStatus(mappedItem)).toBe('new');
  });

  it('resolves "common" when user_id is absent (existing catalog-item rule)', () => {
    expect(resolveTileStatus({})).toBe('common');
  });

  it('resolves null for a seen, non-catalog, non-demoted personal item', () => {
    const mappedItem: TileStatusInput = {
      is_common_item: false,
      user_id: 'u1',
      is_new: false,
    };
    expect(resolveTileStatus(mappedItem)).toBeNull();
  });
});
