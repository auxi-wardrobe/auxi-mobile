/* eslint-env jest */
/**
 * apiClient 401 → silent-refresh → replay interceptor tests.
 *
 * These cover the production "logged out ~every hour" fix:
 *   (a) cold-start /me 401 → refresh succeeds → request is replayed and
 *       resolves (the user stays logged in), new tokens persisted, session
 *       NOT cleared.
 *   (b) refresh fails with a TRANSIENT error (network / no response) → tokens
 *       are preserved (clearTokens never called) and session-expired never
 *       fires, so a blip / offline moment does not log the user out.
 *   (c) refresh fails with a real 401 (refresh token rejected) → tokens are
 *       cleared and the session-expired listener fires (true expiry).
 *
 * tokenStorage is fully mocked. The bare `axios.post` used for /auth/refresh is
 * spied. apiClient's own adapter is replaced so /me returns 401 first, 200 on
 * replay — no real network.
 */
import axios, { AxiosError } from 'axios';

jest.mock('../tokenStorage');

import { apiClient, registerSessionExpiredListener } from '../apiClient';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../tokenStorage';

const mockedGetAccessToken = getAccessToken as jest.Mock;
const mockedGetRefreshToken = getRefreshToken as jest.Mock;
const mockedSetTokens = setTokens as jest.Mock;
const mockedClearTokens = clearTokens as jest.Mock;

let postSpy: jest.SpyInstance;
let sessionExpired: jest.Mock;
let unregister: () => void;

// Build a 401 AxiosError shaped like a real /me rejection.
const make401 = (config: any): AxiosError =>
  new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
    status: 401,
    data: {},
    statusText: 'Unauthorized',
    headers: {},
    config,
  } as any);

beforeAll(() => {
  // /me → 401 on the first hit, 200 once the interceptor replays it
  // (marked via _au242_retried). Everything else resolves 200.
  apiClient.defaults.adapter = async (config: any) => {
    if (
      typeof config.url === 'string' &&
      config.url.includes('/me') &&
      !config._au242_retried
    ) {
      throw make401(config);
    }
    return {
      data: { id: 'user-1', email: 'a@b.com' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAccessToken.mockResolvedValue('expired-access-token');
  mockedGetRefreshToken.mockResolvedValue('stored-refresh-token');
  mockedSetTokens.mockResolvedValue(undefined);
  mockedClearTokens.mockResolvedValue(undefined);

  postSpy = jest.spyOn(axios, 'post');
  sessionExpired = jest.fn();
  unregister = registerSessionExpiredListener(sessionExpired);
});

afterEach(() => {
  unregister();
  postSpy.mockRestore();
});

describe('apiClient 401 refresh interceptor', () => {
  it('(a) refreshes on /me 401, replays, and keeps the session', async () => {
    postSpy.mockResolvedValueOnce({
      data: {
        access_token: 'fresh-access',
        refresh_token: 'rotated-refresh',
        expires_in: 3600,
        refresh_expires_in: 2592000,
      },
    });

    const response = await apiClient.get('/me');

    expect(response.data).toEqual({ id: 'user-1', email: 'a@b.com' });
    // refresh was attempted against /auth/refresh with the stored refresh token
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain('/auth/refresh');
    expect(postSpy.mock.calls[0][1]).toEqual({
      refresh_token: 'stored-refresh-token',
    });
    // rotated tokens persisted
    expect(mockedSetTokens).toHaveBeenCalledTimes(1);
    expect(mockedSetTokens.mock.calls[0][0]).toMatchObject({
      access_token: 'fresh-access',
      refresh_token: 'rotated-refresh',
    });
    // session preserved
    expect(mockedClearTokens).not.toHaveBeenCalled();
    expect(sessionExpired).not.toHaveBeenCalled();
  });

  it('(b) preserves tokens when refresh fails with a network error', async () => {
    postSpy.mockRejectedValueOnce(
      new AxiosError('Network Error', 'ERR_NETWORK'),
    );

    await expect(apiClient.get('/me')).rejects.toBeDefined();

    expect(postSpy).toHaveBeenCalledTimes(1);
    // transient failure → DO NOT wipe tokens, DO NOT signal expiry
    expect(mockedClearTokens).not.toHaveBeenCalled();
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(mockedSetTokens).not.toHaveBeenCalled();
  });

  it('(b2) preserves tokens when refresh fails with a 5xx', async () => {
    const config: any = { url: `${'/auth/refresh'}` };
    postSpy.mockRejectedValueOnce(
      new AxiosError('Server Error', 'ERR_BAD_RESPONSE', config, {}, {
        status: 503,
        data: {},
        statusText: 'Service Unavailable',
        headers: {},
        config,
      } as any),
    );

    await expect(apiClient.get('/me')).rejects.toBeDefined();

    expect(mockedClearTokens).not.toHaveBeenCalled();
    expect(sessionExpired).not.toHaveBeenCalled();
  });

  it('(c) clears tokens + fires session-expired when refresh is rejected (401)', async () => {
    const config: any = { url: `${'/auth/refresh'}` };
    postSpy.mockRejectedValueOnce(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
        status: 401,
        data: {},
        statusText: 'Unauthorized',
        headers: {},
        config,
      } as any),
    );

    await expect(apiClient.get('/me')).rejects.toBeDefined();

    expect(postSpy).toHaveBeenCalledTimes(1);
    // true expiry → wipe tokens and notify AuthContext
    expect(mockedClearTokens).toHaveBeenCalledTimes(1);
    expect(sessionExpired).toHaveBeenCalledTimes(1);
  });

  it('(c2) clears tokens + fires session-expired when no refresh token is stored', async () => {
    mockedGetRefreshToken.mockResolvedValueOnce(null);

    await expect(apiClient.get('/me')).rejects.toBeDefined();

    // no refresh possible → session is gone
    expect(postSpy).not.toHaveBeenCalled();
    expect(mockedClearTokens).toHaveBeenCalledTimes(1);
    expect(sessionExpired).toHaveBeenCalledTimes(1);
  });
});
