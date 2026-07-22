import AsyncStorage from '@react-native-async-storage/async-storage';
import { readWearLog, recordWear } from '../wear-log';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

describe('wear-log', () => {
  beforeEach(() => {
    mockedGetItem.mockReset();
    mockedSetItem.mockReset();
    mockedSetItem.mockResolvedValue(undefined);
    mockedGetItem.mockResolvedValue(null);
  });

  describe('readWearLog', () => {
    it('round-trips a persisted hash → ISO map', async () => {
      const stored = { h1: '2026-07-01T10:00:00Z', h2: '2026-07-05T10:00:00Z' };
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(stored));
      expect(await readWearLog('u1')).toEqual(stored);
      expect(mockedGetItem).toHaveBeenCalledWith('@auxi/home-wear-log/u1');
    });

    it('returns {} for no user, missing blob, corrupt JSON, or wrong shape', async () => {
      expect(await readWearLog(undefined)).toEqual({});

      mockedGetItem.mockResolvedValueOnce(null);
      expect(await readWearLog('u1')).toEqual({});

      mockedGetItem.mockResolvedValueOnce('{not json');
      expect(await readWearLog('u1')).toEqual({});

      // An array or non-string values are not a valid wear log.
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(['h1']));
      expect(await readWearLog('u1')).toEqual({});

      mockedGetItem.mockResolvedValueOnce(JSON.stringify({ h1: 123 }));
      expect(await readWearLog('u1')).toEqual({});
    });
  });

  describe('recordWear', () => {
    it('writes a new entry under a per-user key', async () => {
      const next = await recordWear('u1', 'h1', '2026-07-20T09:00:00Z');
      expect(mockedSetItem).toHaveBeenCalledTimes(1);
      const [key, value] = mockedSetItem.mock.calls[0];
      expect(key).toBe('@auxi/home-wear-log/u1');
      expect(JSON.parse(value)).toEqual({ h1: '2026-07-20T09:00:00Z' });
      expect(next).toEqual({ h1: '2026-07-20T09:00:00Z' });
    });

    it('merges into an existing blob, keeping the newer timestamp', async () => {
      mockedGetItem.mockResolvedValueOnce(
        JSON.stringify({ h1: '2026-07-01T10:00:00Z' }),
      );
      const next = await recordWear('u1', 'h2', '2026-07-20T09:00:00Z');
      expect(JSON.parse(mockedSetItem.mock.calls[0][1])).toEqual({
        h1: '2026-07-01T10:00:00Z',
        h2: '2026-07-20T09:00:00Z',
      });
      expect(next.h1).toBe('2026-07-01T10:00:00Z');
    });

    it('advances an existing hash to the newer wear', async () => {
      mockedGetItem.mockResolvedValueOnce(
        JSON.stringify({ h1: '2026-07-01T10:00:00Z' }),
      );
      await recordWear('u1', 'h1', '2026-07-20T09:00:00Z');
      expect(JSON.parse(mockedSetItem.mock.calls[0][1])).toEqual({
        h1: '2026-07-20T09:00:00Z',
      });
    });

    it('does not regress an existing hash to an older wear', async () => {
      mockedGetItem.mockResolvedValueOnce(
        JSON.stringify({ h1: '2026-07-20T09:00:00Z' }),
      );
      const next = await recordWear('u1', 'h1', '2026-07-01T10:00:00Z');
      expect(mockedSetItem).not.toHaveBeenCalled();
      expect(next.h1).toBe('2026-07-20T09:00:00Z');
    });

    it('is a no-op for a missing user, non-wearable hash, or bad timestamp', async () => {
      await recordWear(undefined, 'h1', '2026-07-20T09:00:00Z');
      await recordWear('u1', 'outfit-3', '2026-07-20T09:00:00Z');
      await recordWear('u1', 'scheduled-abc', '2026-07-20T09:00:00Z');
      await recordWear('u1', 'h1', 'not-a-date');
      await recordWear('u1', '', '2026-07-20T09:00:00Z');
      expect(mockedSetItem).not.toHaveBeenCalled();
    });
  });
});
