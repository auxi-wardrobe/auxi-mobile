import { anyPreparing } from '../wardrobe-grid';
import { WardrobeItem } from '../../../services/wardrobeService';

const item = (over: Partial<WardrobeItem>): WardrobeItem =>
  ({ id: 'x', category: 'top', ...over } as WardrobeItem);

describe('anyPreparing', () => {
  it('is false for undefined / null / empty', () => {
    expect(anyPreparing(undefined)).toBe(false);
    expect(anyPreparing(null)).toBe(false);
    expect(anyPreparing([])).toBe(false);
  });

  it('is false when no item is preparing', () => {
    expect(anyPreparing([item({ is_preparing: false }), item({})])).toBe(false);
  });

  it('is true when at least one item is preparing', () => {
    expect(
      anyPreparing([item({ is_preparing: false }), item({ is_preparing: true })]),
    ).toBe(true);
  });
});
