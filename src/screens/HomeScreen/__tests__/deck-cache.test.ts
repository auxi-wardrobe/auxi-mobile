import {
  clearHomeDeckSnapshot,
  readHomeDeckSnapshot,
  saveHomeDeckSnapshot,
  type HomeDeckSnapshot,
} from '../deck-cache';
import { OutfitSheet } from '../types';

const outfit = (hash: string): OutfitSheet => ({
  items: [],
  outfitHash: hash,
  caption: null,
});

const snap = (over: Partial<HomeDeckSnapshot> = {}): HomeDeckSnapshot => ({
  userId: 'user-1',
  listOutfits: [outfit('a'), outfit('b'), outfit('c')],
  activeIndex: 1,
  saveStateByHash: { a: 'saved' },
  ...over,
});

describe('home deck snapshot cache', () => {
  beforeEach(() => clearHomeDeckSnapshot());

  it('returns null before anything is saved', () => {
    expect(readHomeDeckSnapshot('user-1')).toBeNull();
  });

  it('restores the saved deck for the same user', () => {
    const s = snap();
    saveHomeDeckSnapshot(s);
    const read = readHomeDeckSnapshot('user-1');
    expect(read).not.toBeNull();
    expect(read?.activeIndex).toBe(1);
    expect(read?.listOutfits.map(o => o.outfitHash)).toEqual(['a', 'b', 'c']);
    expect(read?.saveStateByHash).toEqual({ a: 'saved' });
  });

  it('never leaks a deck across users', () => {
    saveHomeDeckSnapshot(snap({ userId: 'user-1' }));
    expect(readHomeDeckSnapshot('user-2')).toBeNull();
  });

  it('ignores an undefined user id', () => {
    saveHomeDeckSnapshot(snap());
    expect(readHomeDeckSnapshot(undefined)).toBeNull();
  });

  it('does not restore an empty deck', () => {
    saveHomeDeckSnapshot(snap({ listOutfits: [] }));
    expect(readHomeDeckSnapshot('user-1')).toBeNull();
  });

  it('clears on demand', () => {
    saveHomeDeckSnapshot(snap());
    clearHomeDeckSnapshot();
    expect(readHomeDeckSnapshot('user-1')).toBeNull();
  });

  it('matches numeric user ids by value', () => {
    saveHomeDeckSnapshot(snap({ userId: 42 }));
    expect(readHomeDeckSnapshot(42)).not.toBeNull();
    expect(readHomeDeckSnapshot('42')).toBeNull();
  });
});
