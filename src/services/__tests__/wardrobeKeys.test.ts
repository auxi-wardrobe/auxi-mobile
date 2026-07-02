import { wardrobeKeys } from '../wardrobeService';

describe('wardrobeKeys', () => {
  it('exposes a stable base key', () => {
    expect(wardrobeKeys.all).toEqual(['wardrobe-items']);
  });

  it('builds a per-filter list key', () => {
    expect(wardrobeKeys.list('Top')).toEqual(['wardrobe-items', 'Top']);
  });

  it("defaults to the 'All' filter so Home and Wardrobe share one cache entry", () => {
    expect(wardrobeKeys.list()).toEqual(['wardrobe-items', 'All']);
    expect(wardrobeKeys.list()).toEqual(wardrobeKeys.list('All'));
  });
});
