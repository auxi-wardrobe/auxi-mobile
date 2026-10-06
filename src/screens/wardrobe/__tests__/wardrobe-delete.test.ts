import {
  deleteItemsSettled,
  isDeletableItem,
  toggleSelectedId,
} from '../wardrobe-delete';
import { WardrobeItem } from '../../../services/wardrobeService';

const item = (overrides: Partial<WardrobeItem> = {}): WardrobeItem =>
  ({ id: 'a', ...overrides } as WardrobeItem);

describe('isDeletableItem', () => {
  it('allows the user’s own items, seeded starter items included', () => {
    expect(isDeletableItem(item())).toBe(true);
    expect(isDeletableItem(item({ is_default_item: true }))).toBe(true);
    expect(isDeletableItem(item({ is_common_item: false }))).toBe(true);
  });

  it('blocks system catalog rows', () => {
    expect(isDeletableItem(item({ is_common_item: true }))).toBe(false);
  });
});

describe('toggleSelectedId', () => {
  it('adds and removes without mutating the input', () => {
    const empty = new Set<string>();
    const one = toggleSelectedId(empty, 'x');
    expect([...one]).toEqual(['x']);
    expect(empty.size).toBe(0);
    expect(toggleSelectedId(one, 'x').size).toBe(0);
  });
});

describe('deleteItemsSettled', () => {
  it('splits successes from failures and never rejects', async () => {
    const deleteOne = jest.fn((id: string) =>
      id === 'bad' ? Promise.reject(new Error('nope')) : Promise.resolve(),
    );
    await expect(
      deleteItemsSettled(['a', 'bad', 'c'], deleteOne),
    ).resolves.toEqual({ deletedIds: ['a', 'c'], failedIds: ['bad'] });
    expect(deleteOne).toHaveBeenCalledTimes(3);
  });

  it('handles an empty selection', async () => {
    await expect(deleteItemsSettled([], jest.fn())).resolves.toEqual({
      deletedIds: [],
      failedIds: [],
    });
  });
});
