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

// AU-392 fix: `USR_*` per-user catalog clones — `is_common_item: false` +
// a real `user_id`, the actual shape of most of a real account's wardrobe
// (see qa-mobile's investigation report). Mirrors
// `ItemDetailScreen.tsx:281-288`'s `isCatalogItem` so both surfaces agree.
describe('resolveTileStatus — USR_* per-user catalog clone (fix)', () => {
  it('resolves "common" for a USR_*-prefixed clone with no other signal', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          human_readable_id: 'USR_BT_SHO_NVY_REG_01',
        }),
      ),
    ).toBe('common');
  });

  it('does not fall back to null for a non-USR_, non-common, real-user_id item (regression guard)', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          human_readable_id: 'a1b2c3d4-user-uploaded-uuid',
        }),
      ),
    ).toBeNull();
  });

  it('"less use" still wins over "common" for a demoted USR_* clone', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          human_readable_id: 'USR_BT_SHO_NVY_REG_01',
          usage_frequency: 'LESS_USED',
        }),
      ),
    ).toBe('less_use');
  });

  it('a USR_* clone never shows "new" even if is_new is true — catalog wins precedence', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          human_readable_id: 'USR_BT_SHO_NVY_REG_01',
          is_new: true,
        }),
      ),
    ).toBe('common');
  });

  it('is_common_item: true still wins independent of human_readable_id', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: true,
          human_readable_id: 'SYS_BT_SHO_NVY_REG_01',
        }),
      ),
    ).toBe('common');
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

  // AU-392 fix: same USR_* clone recognition, threaded onto `FavouriteItem`
  // (see `favouriteService.ts`) so favourite cards agree with Item Detail.
  it('resolves "common" for a USR_*-prefixed favourite item clone', () => {
    expect(
      resolveTileStatus(
        favouriteItem({
          is_common_item: false,
          user_id: 'u1',
          human_readable_id: 'USR_TOP_TEE_WHT_REG_01',
        }),
      ),
    ).toBe('common');
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

  // AU-392 fix: same USR_* clone recognition, threaded onto the mapped
  // `Item` (`outfit-normalize.ts`'s `mapV05Item`) so Home outfit tiles agree
  // with Item Detail.
  it('resolves "common" for a USR_*-prefixed mapped Home outfit item', () => {
    const mappedUsrClone: TileStatusInput = {
      is_common_item: false,
      user_id: 'u1',
      human_readable_id: 'USR_OUT_JKT_BLK_REG_01',
    };
    expect(resolveTileStatus(mappedUsrClone)).toBe('common');
  });
});
