import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistLatestOutfits, readLatestOutfits } from '../last-outfits-store';
import { OutfitSheet } from '../types';
import { Item } from '../../../types/item';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

const item = (id: string): Item => ({
  id,
  image_url: `https://img/${id}.png`,
  category: 'Top',
  color: '',
  isSystem: false,
});

const sheet = (hash: string, itemIds: string[]): OutfitSheet => ({
  outfitHash: hash,
  items: itemIds.map(item),
  caption: `look ${hash}`,
});

describe('last-outfits-store', () => {
  beforeEach(() => {
    mockedGetItem.mockReset();
    mockedSetItem.mockReset();
    mockedSetItem.mockResolvedValue(undefined);
    mockedGetItem.mockResolvedValue(null);
  });

  describe('persistLatestOutfits', () => {
    it('writes the last `max` sheets under a per-user key', () => {
      persistLatestOutfits(
        'u1',
        [sheet('a', ['1']), sheet('b', ['2']), sheet('c', ['3']), sheet('d', ['4'])],
        3,
      );
      expect(mockedSetItem).toHaveBeenCalledTimes(1);
      const [key, value] = mockedSetItem.mock.calls[0];
      expect(key).toBe('@auxi/home-latest-outfits/u1');
      expect(JSON.parse(value).map((o: OutfitSheet) => o.outfitHash)).toEqual([
        'b',
        'c',
        'd',
      ]);
    });

    it('is a no-op with no user, no outfits, or a non-positive max', () => {
      persistLatestOutfits(undefined, [sheet('a', ['1'])], 3);
      persistLatestOutfits('u1', [], 3);
      persistLatestOutfits('u1', [sheet('a', ['1'])], 0);
      expect(mockedSetItem).not.toHaveBeenCalled();
    });
  });

  describe('readLatestOutfits', () => {
    it('round-trips persisted sheets', async () => {
      const stored = [sheet('a', ['1', '2']), sheet('b', ['3'])];
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(stored));
      const result = await readLatestOutfits('u1');
      expect(mockedGetItem).toHaveBeenCalledWith('@auxi/home-latest-outfits/u1');
      expect(result.map(o => o.outfitHash)).toEqual(['a', 'b']);
      expect(result[0].items.map(i => i.id)).toEqual(['1', '2']);
    });

    it('returns [] for no user, missing blob, corrupt JSON, or wrong shape', async () => {
      expect(await readLatestOutfits(undefined)).toEqual([]);

      mockedGetItem.mockResolvedValueOnce(null);
      expect(await readLatestOutfits('u1')).toEqual([]);

      mockedGetItem.mockResolvedValueOnce('{not json');
      expect(await readLatestOutfits('u1')).toEqual([]);

      mockedGetItem.mockResolvedValueOnce(JSON.stringify([{ nope: true }]));
      expect(await readLatestOutfits('u1')).toEqual([]);
    });

    it('reads back only what was written for that user', async () => {
      const captured: Record<string, string> = {};
      mockedSetItem.mockImplementation((k: string, v: string) => {
        captured[k] = v;
        return Promise.resolve();
      });
      persistLatestOutfits('u2', [sheet('x', ['9'])], 3);
      mockedGetItem.mockImplementation((k: string) =>
        Promise.resolve(captured[k] ?? null),
      );
      expect((await readLatestOutfits('u2')).map(o => o.outfitHash)).toEqual(['x']);
      expect(await readLatestOutfits('u1')).toEqual([]);
    });
  });
});
