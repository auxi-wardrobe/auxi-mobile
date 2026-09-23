/* eslint-env jest */
/**
 * v05Api façade — plan 260923 (owned-only + exhaustive recommendations).
 *
 * apiClient is fully mocked (no network). Covers the client half of the new
 * contract:
 *  - `exhausted` from the build and try_another endpoints surfaces as
 *    `RecommendV05Result.exhausted` (+ `seenCount`), never as outfits;
 *  - a transient try_another `fallback` (no outfit, no terminal flag)
 *    triggers exactly one silent rebuild;
 *  - `reset_seen` forces a fresh build even with a live session, and is sent
 *    on the wire;
 *  - the client no longer sends a wardrobe gender.
 */
import { apiClient } from '../apiClient';
import { recommendV05, resetV05Session } from '../v05Api';

jest.mock('../apiClient', () => ({
  apiClient: { post: jest.fn(), get: jest.fn(), put: jest.fn() },
}));
jest.mock('../recommendationMemory', () => ({
  getBuildMemory: () => undefined,
  recordServedOutfit: jest.fn(),
}));

const mockedPost = apiClient.post as jest.Mock;

const BUILD = '/v05/recommendation/build';
const TRY = '/v05/recommendation/try_another';

const outfit = (hash: string) => ({
  outfit_hash: hash,
  items: [],
  vibe_signature: {},
  reasoning_human: 'r',
  score: 0.5,
});

const buildResponse = (over: Record<string, unknown> = {}) => ({
  data: {
    outfits: [outfit('b1')],
    suggested_default: 0,
    trace: {},
    session_id: 'sid-1',
    ...over,
  },
});

const params = { weather: { temp_c: 28 }, user: { occasion: 'safe' } };

beforeEach(() => {
  mockedPost.mockReset();
  resetV05Session();
});

describe('recommendV05 — exhausted', () => {
  it('maps a build `exhausted` to an empty, flagged result', async () => {
    mockedPost.mockResolvedValueOnce(
      buildResponse({
        outfits: [],
        session_id: null,
        exhausted: true,
        outfits_seen_count: 12,
      }),
    );
    const res = await recommendV05(params);
    expect(res.outfits).toEqual([]);
    expect(res.exhausted).toBe(true);
    expect(res.seenCount).toBe(12);
  });

  it('maps a try_another `exhausted` without rebuilding', async () => {
    mockedPost.mockResolvedValueOnce(buildResponse());
    await recommendV05(params);
    mockedPost.mockResolvedValueOnce({
      data: {
        outfit: null,
        session_id: 'sid-1',
        fallback: false,
        fallback_flags: ['outfits_exhausted'],
        message: 'seen all',
        exhausted: true,
        outfits_seen_count: 4,
      },
    });
    const res = await recommendV05({ ...params, current_outfit_hash: 'b1' });
    expect(res.exhausted).toBe(true);
    expect(res.outfits).toEqual([]);
    expect(mockedPost).toHaveBeenCalledTimes(2);
    expect(mockedPost.mock.calls[1][0]).toBe(TRY);
  });
});

describe('recommendV05 — transient fallback', () => {
  it('rebuilds once when try_another falls back with no outfit', async () => {
    mockedPost.mockResolvedValueOnce(buildResponse());
    await recommendV05(params);
    mockedPost
      .mockResolvedValueOnce({
        data: {
          outfit: null,
          session_id: 'sid-1',
          fallback: true,
          fallback_flags: ['recompose_timeout'],
          message: null,
        },
      })
      .mockResolvedValueOnce(buildResponse({ outfits: [outfit('b2')] }));
    const res = await recommendV05({ ...params, current_outfit_hash: 'b1' });
    expect(mockedPost.mock.calls.map(c => c[0])).toEqual([BUILD, TRY, BUILD]);
    expect(res.outfits.map(o => o.outfit_hash)).toEqual(['b2']);
  });
});

describe('recommendV05 — reset_seen + gender', () => {
  it('reset_seen forces a build (even with a session) and is sent', async () => {
    mockedPost.mockResolvedValueOnce(buildResponse());
    await recommendV05(params);
    mockedPost.mockResolvedValueOnce(buildResponse({ outfits: [outfit('b9')] }));
    await recommendV05({ ...params, reset_seen: true });
    const [path, body] = mockedPost.mock.calls[1];
    expect(path).toBe(BUILD);
    expect(body.reset_seen).toBe(true);
  });

  it('does not send a wardrobe gender (server resolves it)', async () => {
    mockedPost.mockResolvedValueOnce(buildResponse());
    await recommendV05(params);
    const [, body] = mockedPost.mock.calls[0];
    expect(body.user?.gender).toBeUndefined();
  });
});
