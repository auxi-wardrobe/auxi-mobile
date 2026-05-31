import {
  fromFlatIndex,
  groupOutfitsIntoSets,
  OUTFITS_PER_SET,
  toFlatIndex,
} from '../groupOutfitsIntoSets';

describe('groupOutfitsIntoSets', () => {
  it('returns [] for empty / nullish input', () => {
    expect(groupOutfitsIntoSets([])).toEqual([]);
    // @ts-expect-error — guard against runtime nullish
    expect(groupOutfitsIntoSets(undefined)).toEqual([]);
  });

  it('chunks an exact multiple of 3 into full sets', () => {
    const sets = groupOutfitsIntoSets([1, 2, 3, 4, 5, 6]);
    expect(sets).toHaveLength(2);
    expect(sets[0]).toEqual({ setIndex: 0, outfits: [1, 2, 3] });
    expect(sets[1]).toEqual({ setIndex: 1, outfits: [4, 5, 6] });
  });

  it('preserves a trailing partial set (< 3)', () => {
    const sets = groupOutfitsIntoSets([1, 2, 3, 4]);
    expect(sets).toHaveLength(2);
    expect(sets[1]).toEqual({ setIndex: 1, outfits: [4] });
  });

  it('handles a single partial set (1 or 2 items)', () => {
    expect(groupOutfitsIntoSets([1])).toEqual([{ setIndex: 0, outfits: [1] }]);
    expect(groupOutfitsIntoSets([1, 2])).toEqual([
      { setIndex: 0, outfits: [1, 2] },
    ]);
  });

  it('assigns monotonically increasing setIndex', () => {
    const sets = groupOutfitsIntoSets(Array.from({ length: 10 }, (_, i) => i));
    expect(sets.map(s => s.setIndex)).toEqual([0, 1, 2, 3]);
    expect(sets[3].outfits).toEqual([9]); // trailing partial
  });

  it('defaults to OUTFITS_PER_SET = 3', () => {
    expect(OUTFITS_PER_SET).toBe(3);
    expect(groupOutfitsIntoSets([1, 2, 3, 4])[0].outfits).toHaveLength(3);
  });
});

describe('flat-index round-trip', () => {
  it('toFlatIndex maps (set, outfit) → flat', () => {
    expect(toFlatIndex(0, 0)).toBe(0);
    expect(toFlatIndex(0, 2)).toBe(2);
    expect(toFlatIndex(1, 0)).toBe(3);
    expect(toFlatIndex(2, 1)).toBe(7);
  });

  it('fromFlatIndex inverts toFlatIndex', () => {
    for (let flat = 0; flat < 12; flat += 1) {
      const { setIndex, outfitIndex } = fromFlatIndex(flat);
      expect(toFlatIndex(setIndex, outfitIndex)).toBe(flat);
    }
  });

  it('fromFlatIndex clamps negatives to 0', () => {
    expect(fromFlatIndex(-5)).toEqual({ setIndex: 0, outfitIndex: 0 });
  });
});
