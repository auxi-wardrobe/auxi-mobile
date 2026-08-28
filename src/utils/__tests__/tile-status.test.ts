import { isCommonItem, resolveTileStatus, TileStatusInput } from '../tile-status';
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

// Macgie's seeded starter items — `is_common_item: false` + a real `user_id`
// + `is_default_item: true`. These used to be recognized by the `USR_` hrid
// prefix; they no longer are, because a catalog item the USER picked carries
// the same prefix and must NOT be badged (see the sibling describe below).
// Mirrors `ItemDetailScreen.tsx`'s `isCatalogItem` so both surfaces agree.
describe('resolveTileStatus — Macgie seeded default item', () => {
  it('resolves "common" for a seeded default with no other signal', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_default_item: true,
        }),
      ),
    ).toBe('common');
  });

  it('does not fall back to null for a plain user upload (regression guard)', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_default_item: false,
        }),
      ),
    ).toBeNull();
  });

  it('"less use" still wins over "common" for a demoted default', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_default_item: true,
          usage_frequency: 'LESS_USED',
        }),
      ),
    ).toBe('less_use');
  });

  it('a seeded default never shows "new" even if is_new is true — catalog wins precedence', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_default_item: true,
          is_new: true,
        }),
      ),
    ).toBe('common');
  });

  it('is_common_item: true still wins independent of is_default_item', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: true,
          is_default_item: false,
        }),
      ),
    ).toBe('common');
  });
});

// The change this describe exists for: a catalog item the user PICKED
// (Database screen, trending drop) is theirs. It has the same `USR_` hrid and
// the same catalog lineage as a seeded default — only `is_default_item`
// separates them, and it must not wear the Macgie badge.
describe('resolveTileStatus — user-picked catalog item', () => {
  it('shows NO badge for a Database pick', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_default_item: false,
          human_readable_id: 'USR_BT_SHO_NVY_REG_01',
        }),
      ),
    ).toBeNull();
  });

  it('a USR_ hrid alone never implies "common" — the prefix is shared', () => {
    expect(
      isCommonItem({
        user_id: 'u1',
        is_common_item: false,
        human_readable_id: 'USR_BT_SHO_NVY_REG_01',
      } as TileStatusInput),
    ).toBe(false);
  });

  it('a freshly picked Database item can still show "new"', () => {
    expect(
      resolveTileStatus(
        wardrobeItem({
          user_id: 'u1',
          is_common_item: false,
          is_default_item: false,
          is_new: true,
        }),
      ),
    ).toBe('new');
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

  // Same seeded-default recognition, threaded onto `FavouriteItem` (see
  // `favouriteService.ts`) so favourite cards agree with Item Detail.
  it('resolves "common" for a favourited seeded default', () => {
    expect(
      resolveTileStatus(
        favouriteItem({
          is_common_item: false,
          user_id: 'u1',
          is_default_item: true,
        }),
      ),
    ).toBe('common');
  });

  it('shows no badge for a favourited item the user picked from the catalog', () => {
    expect(
      resolveTileStatus(
        favouriteItem({
          is_common_item: false,
          user_id: 'u1',
          is_default_item: false,
          human_readable_id: 'USR_TOP_TEE_WHT_REG_01',
        }),
      ),
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

  // Same seeded-default recognition, threaded onto the mapped `Item`
  // (`outfit-normalize.ts`'s `mapV05Item`) so Home outfit tiles agree with
  // Item Detail.
  it('resolves "common" for a mapped Home outfit item that is a seeded default', () => {
    const mappedDefault: TileStatusInput = {
      is_common_item: false,
      user_id: 'u1',
      is_default_item: true,
    };
    expect(resolveTileStatus(mappedDefault)).toBe('common');
  });

  it('shows no badge for a mapped Home outfit item the user picked', () => {
    const mappedPick: TileStatusInput = {
      is_common_item: false,
      user_id: 'u1',
      is_default_item: false,
    };
    expect(resolveTileStatus(mappedPick)).toBeNull();
  });
});
