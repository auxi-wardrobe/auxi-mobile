/**
 * Unit tests for long-term recommendation memory.
 *
 * Contract verified:
 * - getBuildMemory() is undefined until something is served (backend no-ops
 *   empty arrays, so we omit the field entirely).
 * - recordServedOutfit() accumulates the last 5 DISTINCT outfits, dropping the
 *   oldest, and skips a consecutive re-serve of the same hash (try_another
 *   `cycled`).
 * - Memory is keyed per user: switching users hydrates that user's persisted
 *   blob and never leaks the previous user's looks.
 * - Signing out (setRecommendationMemoryUser(null)) drops the in-memory ring
 *   but does NOT delete the persisted per-user blob (re-login continuity).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { V05Outfit, VibeSignature } from '../v05Api';
import {
  getBuildMemory,
  recordServedOutfit,
  setRecommendationMemoryUser,
} from '../recommendationMemory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

const sig = (color: string): VibeSignature => ({
  dominant_color_family: color,
  dominant_silhouette: 'relaxed',
  formality_band: 'smart_casual',
  statement_level_avg: 2,
  aesthetic_tags: ['minimal'],
});

const outfit = (hash: string, color = hash): V05Outfit =>
  ({
    items: [],
    vibe_signature: sig(color),
    reasoning_human: `because ${color}`,
    reasoning_debug: '',
    score: 1,
    outfit_hash: hash,
  } as V05Outfit);

describe('recommendationMemory', () => {
  beforeEach(async () => {
    mockedGetItem.mockReset();
    mockedSetItem.mockReset();
    (AsyncStorage.removeItem as jest.Mock).mockReset();
    mockedSetItem.mockResolvedValue(undefined);
    mockedGetItem.mockResolvedValue(null);
    // Reset the module-scope ring between tests. Selecting the SAME user is a
    // deliberate no-op (re-identify must not wipe memory), so signing out to
    // null is the clean reset.
    await setRecommendationMemoryUser(null);
  });

  it('returns undefined until an outfit is served', async () => {
    await setRecommendationMemoryUser('u1');
    expect(getBuildMemory()).toBeUndefined();
  });

  it('threads served signatures + reasoning into the build memory', async () => {
    await setRecommendationMemoryUser('u1');
    recordServedOutfit(outfit('aaa', 'blue'));

    const memory = getBuildMemory();
    expect(memory?.recent_signatures).toHaveLength(1);
    expect(memory?.recent_signatures?.[0].dominant_color_family).toBe('blue');
    expect(memory?.recent_reasoning_used).toEqual(['because blue']);
  });

  it('keeps only the last 5 distinct outfits, dropping the oldest', async () => {
    await setRecommendationMemoryUser('u1');
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h =>
      recordServedOutfit(outfit(h)),
    );

    const memory = getBuildMemory();
    expect(memory?.recent_signatures).toHaveLength(5);
    // h1 evicted; h2..h6 remain in order.
    expect(memory?.recent_signatures?.map(s => s.dominant_color_family)).toEqual(
      ['h2', 'h3', 'h4', 'h5', 'h6'],
    );
  });

  it('skips a consecutive re-serve of the same outfit (try_another cycled)', async () => {
    await setRecommendationMemoryUser('u1');
    recordServedOutfit(outfit('same'));
    recordServedOutfit(outfit('same'));

    expect(getBuildMemory()?.recent_signatures).toHaveLength(1);
  });

  it('persists the ring to AsyncStorage under a per-user key', async () => {
    await setRecommendationMemoryUser('u1');
    recordServedOutfit(outfit('aaa'));

    expect(mockedSetItem).toHaveBeenCalledWith(
      '@auxi/rec-memory/u1',
      expect.stringContaining('"hash":"aaa"'),
    );
  });

  it('hydrates a user from their persisted blob on switch', async () => {
    mockedGetItem.mockResolvedValueOnce(
      JSON.stringify([
        { hash: 'old', signature: sig('green'), reasoning: 'because green' },
      ]),
    );
    await setRecommendationMemoryUser('u2');

    expect(mockedGetItem).toHaveBeenCalledWith('@auxi/rec-memory/u2');
    expect(getBuildMemory()?.recent_signatures?.[0].dominant_color_family).toBe(
      'green',
    );
  });

  it('does not leak one user’s memory to another', async () => {
    await setRecommendationMemoryUser('u1');
    recordServedOutfit(outfit('u1-only'));

    // u2 has no persisted blob → empty.
    mockedGetItem.mockResolvedValueOnce(null);
    await setRecommendationMemoryUser('u2');
    expect(getBuildMemory()).toBeUndefined();
  });

  it('drops the in-memory ring on sign-out without deleting the blob', async () => {
    await setRecommendationMemoryUser('u1');
    recordServedOutfit(outfit('aaa'));

    const removeItem = AsyncStorage.removeItem as jest.Mock;
    await setRecommendationMemoryUser(null);

    expect(getBuildMemory()).toBeUndefined();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('treats a corrupt persisted blob as empty rather than throwing', async () => {
    mockedGetItem.mockResolvedValueOnce('{not valid json');
    await expect(setRecommendationMemoryUser('u3')).resolves.toBeUndefined();
    expect(getBuildMemory()).toBeUndefined();
  });
});
