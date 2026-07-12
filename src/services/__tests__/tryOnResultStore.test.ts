/**
 * Unit tests for the persistent See-this-on-me result cache.
 *
 * Contract verified:
 * - getTryOnResult() is null until a result is recorded for that outfit.
 * - recordTryOnResult() persists the URL and is read back synchronously.
 * - The map is bounded (MAX_REMEMBERED = 40): the oldest entry is evicted.
 * - Re-recording an outfit refreshes it (keeps it from being evicted).
 * - The cache is keyed per user: switching users hydrates that user's blob
 *   and never leaks the previous user's results.
 * - Signing out (setTryOnResultUser(null)) drops the in-memory map but does
 *   NOT delete the persisted per-user blob (re-login continuity).
 * - clearTryOnResult() forgets a single outfit.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearTryOnResult,
  getTryOnResult,
  recordTryOnResult,
  setTryOnResultUser,
} from '../tryOnResultStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetItem.mockResolvedValue(null);
  mockedSetItem.mockResolvedValue(undefined);
});

test('getTryOnResult is null until a result is recorded', async () => {
  await setTryOnResultUser('user-1');
  expect(getTryOnResult('outfit-a')).toBeNull();
  recordTryOnResult('outfit-a', 'https://cdn.example/a.jpg');
  expect(getTryOnResult('outfit-a')).toBe('https://cdn.example/a.jpg');
});

test('recordTryOnResult ignores empty hash or url', async () => {
  await setTryOnResultUser('user-1');
  recordTryOnResult('', 'https://cdn.example/x.jpg');
  recordTryOnResult('outfit-x', '');
  expect(getTryOnResult('outfit-x')).toBeNull();
});

test('the cache is bounded to 40 entries, evicting the oldest first', async () => {
  await setTryOnResultUser('user-1');
  for (let i = 0; i < 41; i++) {
    recordTryOnResult(`outfit-${i}`, `https://cdn.example/${i}.jpg`);
  }
  // outfit-0 was the oldest of 41 → evicted; the newest 40 remain.
  expect(getTryOnResult('outfit-0')).toBeNull();
  expect(getTryOnResult('outfit-1')).toBe('https://cdn.example/1.jpg');
  expect(getTryOnResult('outfit-40')).toBe('https://cdn.example/40.jpg');
});

test('re-recording an outfit refreshes it so it is not evicted', async () => {
  await setTryOnResultUser('user-1');
  recordTryOnResult('keep-me', 'https://cdn.example/keep-1.jpg');
  // Fill the rest of the cache with fresh outfits AFTER touching keep-me...
  for (let i = 0; i < 39; i++) {
    recordTryOnResult(`filler-${i}`, `https://cdn.example/f${i}.jpg`);
  }
  // Touch keep-me again to move it to the most-recent position.
  recordTryOnResult('keep-me', 'https://cdn.example/keep-2.jpg');
  // One more distinct outfit pushes the count over 40 → oldest filler evicted,
  // keep-me survives (and holds the refreshed url).
  recordTryOnResult('overflow', 'https://cdn.example/of.jpg');
  expect(getTryOnResult('keep-me')).toBe('https://cdn.example/keep-2.jpg');
  expect(getTryOnResult('filler-0')).toBeNull();
});

test('results are keyed per user and never leak across users', async () => {
  const store: Record<string, string> = {};
  mockedSetItem.mockImplementation((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  });
  mockedGetItem.mockImplementation((k: string) =>
    Promise.resolve(store[k] ?? null),
  );

  await setTryOnResultUser('user-1');
  recordTryOnResult('shared-hash', 'https://cdn.example/u1.jpg');

  // Switch to a different user — must not see user-1's result.
  await setTryOnResultUser('user-2');
  expect(getTryOnResult('shared-hash')).toBeNull();
  recordTryOnResult('shared-hash', 'https://cdn.example/u2.jpg');

  // Back to user-1 — hydrates their own blob from disk.
  await setTryOnResultUser('user-1');
  expect(getTryOnResult('shared-hash')).toBe('https://cdn.example/u1.jpg');
});

test('signing out drops the in-memory map but keeps the persisted blob', async () => {
  const store: Record<string, string> = {};
  mockedSetItem.mockImplementation((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  });
  mockedGetItem.mockImplementation((k: string) =>
    Promise.resolve(store[k] ?? null),
  );

  await setTryOnResultUser('user-1');
  recordTryOnResult('outfit-a', 'https://cdn.example/a.jpg');

  await setTryOnResultUser(null);
  expect(getTryOnResult('outfit-a')).toBeNull();
  expect(mockedGetItem).not.toHaveBeenCalledWith(
    expect.stringContaining('user-1'),
  );

  // Re-login re-hydrates from the untouched persisted blob.
  await setTryOnResultUser('user-1');
  expect(getTryOnResult('outfit-a')).toBe('https://cdn.example/a.jpg');
});

test('clearTryOnResult forgets a single outfit', async () => {
  await setTryOnResultUser('user-1');
  recordTryOnResult('outfit-a', 'https://cdn.example/a.jpg');
  recordTryOnResult('outfit-b', 'https://cdn.example/b.jpg');
  clearTryOnResult('outfit-a');
  expect(getTryOnResult('outfit-a')).toBeNull();
  expect(getTryOnResult('outfit-b')).toBe('https://cdn.example/b.jpg');
});
