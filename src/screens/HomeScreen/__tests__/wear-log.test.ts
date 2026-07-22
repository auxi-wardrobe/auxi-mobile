import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetWearLogMemory,
  peekWearLog,
  readWearLog,
  recordWear,
} from '../wear-log';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

describe('wear-log', () => {
  beforeEach(() => {
    __resetWearLogMemory();
    mockedGetItem.mockReset();
    mockedSetItem.mockReset();
    mockedSetItem.mockResolvedValue(undefined);
    mockedGetItem.mockResolvedValue(null);
  });

  describe('readWearLog', () => {
    it('merges the persisted blob with the in-memory cache, newest wins', async () => {
      // Persisted has an old stamp for h1; memory (a fresh wear) is newer.
      mockedGetItem.mockResolvedValueOnce(
        JSON.stringify({ h1: '2026-07-01T10:00:00Z', h3: '2026-07-02Z' }),
      );
      await recordWear('u1', 'h1', '2026-07-20T09:00:00Z'); // seeds memory
      const result = await readWearLog('u1');
      expect(result.h1).toBe('2026-07-20T09:00:00Z');
      expect(result.h3).toBe('2026-07-02Z');
      expect(mockedGetItem).toHaveBeenCalledWith('@auxi/home-wear-log/u1');
    });

    it('returns {} for no user', async () => {
      expect(await readWearLog(undefined)).toEqual({});
    });

    it('falls back to the in-memory cache when storage is unavailable (web)', async () => {
      mockedGetItem.mockRejectedValueOnce(new Error('no native storage'));
      mockedSetItem.mockRejectedValue(new Error('no native storage'));
      await recordWear('u1', 'h1', '2026-07-20T09:00:00Z');
      // Storage is dead, but the wear survives in memory and is returned.
      expect(await readWearLog('u1')).toEqual({ h1: '2026-07-20T09:00:00Z' });
    });

    it('ignores a corrupt or wrong-shaped blob', async () => {
      mockedGetItem.mockResolvedValueOnce('{not json');
      expect(await readWearLog('u1')).toEqual({});
      mockedGetItem.mockResolvedValueOnce(JSON.stringify({ h1: 123 }));
      expect(await readWearLog('u1')).toEqual({});
    });
  });

  describe('recordWear + peekWearLog', () => {
    it('updates the in-memory cache synchronously and persists', async () => {
      const promise = recordWear('u1', 'h1', '2026-07-20T09:00:00Z');
      // peek sees it before the write settles.
      expect(peekWearLog('u1')).toEqual({ h1: '2026-07-20T09:00:00Z' });
      await promise;
      const [key, value] = mockedSetItem.mock.calls[0];
      expect(key).toBe('@auxi/home-wear-log/u1');
      expect(JSON.parse(value)).toEqual({ h1: '2026-07-20T09:00:00Z' });
    });

    it('advances an existing hash and does not regress to an older wear', async () => {
      await recordWear('u1', 'h1', '2026-07-10T09:00:00Z');
      await recordWear('u1', 'h1', '2026-07-20T09:00:00Z');
      expect(peekWearLog('u1')).toEqual({ h1: '2026-07-20T09:00:00Z' });
      await recordWear('u1', 'h1', '2026-07-01T09:00:00Z');
      expect(peekWearLog('u1')).toEqual({ h1: '2026-07-20T09:00:00Z' });
    });

    it('keeps each user in its own cache', async () => {
      await recordWear('u1', 'h1', '2026-07-20T09:00:00Z');
      await recordWear('u2', 'h2', '2026-07-21T09:00:00Z');
      expect(peekWearLog('u1')).toEqual({ h1: '2026-07-20T09:00:00Z' });
      expect(peekWearLog('u2')).toEqual({ h2: '2026-07-21T09:00:00Z' });
      expect(peekWearLog(undefined)).toEqual({});
    });

    it('is a no-op for a missing user, non-wearable hash, or bad timestamp', async () => {
      await recordWear(undefined, 'h1', '2026-07-20T09:00:00Z');
      await recordWear('u1', 'outfit-3', '2026-07-20T09:00:00Z');
      await recordWear('u1', 'scheduled-abc', '2026-07-20T09:00:00Z');
      await recordWear('u1', 'h1', 'not-a-date');
      await recordWear('u1', '', '2026-07-20T09:00:00Z');
      expect(mockedSetItem).not.toHaveBeenCalled();
      expect(peekWearLog('u1')).toEqual({});
    });
  });
});
