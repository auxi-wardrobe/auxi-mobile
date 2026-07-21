/* eslint-env jest */
/**
 * creationsService.removeCreation — offline / auth / server-error contract.
 *
 * Mirrors saveCreation's existing three-way split:
 *  - genuine offline (no HTTP response reached) → falls back to a local
 *    removal, same resilience posture as before this fix.
 *  - 401 (session expired) → throws CreationSaveError('auth'); the apiClient
 *    interceptor already redirected to login.
 *  - any other server error → throws CreationSaveError('server') and does
 *    NOT fake a local-only removal (the old bug: a real delete failure used
 *    to silently "succeed" locally, so the item would resurrect on the next
 *    server refetch).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../apiClient';
import { CreationSaveError, creationsService } from '../creationsService';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const mockedDelete = apiClient.delete as jest.Mock;
const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  mockedDelete.mockReset();
  mockedGetItem.mockReset();
  mockedSetItem.mockReset();
});

describe('creationsService.removeCreation', () => {
  it('falls back to a local removal on genuine offline (no HTTP response)', async () => {
    mockedDelete.mockRejectedValueOnce({ isAxiosError: true, response: undefined });
    mockedGetItem.mockResolvedValueOnce(
      JSON.stringify([{ id: 'c-1', created_at: '2026-01-01', tags: [], items: [], canvasWidth: 300 }]),
    );

    await expect(creationsService.removeCreation('c-1')).resolves.toBeUndefined();

    expect(mockedSetItem).toHaveBeenCalledWith(
      '@auxi/creations',
      JSON.stringify([]),
    );
  });

  it('throws CreationSaveError("auth") on a 401 without touching local storage', async () => {
    mockedDelete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });

    await expect(creationsService.removeCreation('c-1')).rejects.toMatchObject(
      new CreationSaveError('auth', 'session expired'),
    );
    expect(mockedGetItem).not.toHaveBeenCalled();
    expect(mockedSetItem).not.toHaveBeenCalled();
  });

  it('throws CreationSaveError("server") on a real server error, without faking a local removal', async () => {
    mockedDelete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });

    await expect(creationsService.removeCreation('c-1')).rejects.toMatchObject(
      new CreationSaveError('server', 'creation remove failed'),
    );
    expect(mockedGetItem).not.toHaveBeenCalled();
    expect(mockedSetItem).not.toHaveBeenCalled();
  });
});
