/* eslint-env jest */
/**
 * The "you can now remove Macgie's default items" milestone gate.
 *
 * Pins the three guarantees the trigger sites depend on: the server owns
 * `unlocked`, the celebration fires at most once per user, and ANY failure
 * resolves to `null` rather than costing a real user a working upload.
 */

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...a: any[]) => mockGetItem(...a),
    setItem: (...a: any[]) => mockSetItem(...a),
    removeItem: (...a: any[]) => mockRemoveItem(...a),
  },
}));

const mockTrack = jest.fn();
jest.mock('../analytics', () => ({ track: (...a: any[]) => mockTrack(...a) }));

const mockGetStatus = jest.fn();
jest.mock('../wardrobeService', () => ({
  wardrobeService: {
    getDefaultItemRemovalStatus: (...a: any[]) => mockGetStatus(...a),
  },
}));

import {
  maybeCelebrateDefaultItemsUnlocked,
  resetDefaultItemsUnlockCelebration,
} from '../defaultItemsMilestone';

const USER = { id: 'user-1' } as any;

const status = (overrides: Record<string, unknown> = {}) => ({
  own_item_count: 12,
  threshold: 12,
  remaining: 0,
  unlocked: true,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

describe('maybeCelebrateDefaultItemsUnlocked', () => {
  it('returns the milestone and marks it celebrated once unlocked', async () => {
    mockGetStatus.mockResolvedValue(status());

    const result = await maybeCelebrateDefaultItemsUnlocked(USER);

    expect(result).toEqual({ own_item_count: 12, threshold: 12 });
    expect(mockSetItem).toHaveBeenCalledWith(
      'default_items_unlock_celebrated_user-1',
      'true',
    );
    expect(mockTrack).toHaveBeenCalledWith('default_items_unlock_celebrated', {
      own_item_count: 12,
      threshold: 12,
    });
  });

  it('stays silent while still locked, and does not burn the once-flag', async () => {
    mockGetStatus.mockResolvedValue(
      status({ own_item_count: 11, remaining: 1, unlocked: false }),
    );

    expect(await maybeCelebrateDefaultItemsUnlocked(USER)).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('never re-celebrates a user who was already told', async () => {
    mockGetItem.mockResolvedValue('true');

    expect(await maybeCelebrateDefaultItemsUnlocked(USER)).toBeNull();
    // The already-celebrated check is local — it must not cost a request.
    expect(mockGetStatus).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('trusts the server flag rather than re-deriving it from the count', async () => {
    // Count is past the threshold but the server says locked — the client
    // must not second-guess it.
    mockGetStatus.mockResolvedValue(
      status({ own_item_count: 99, remaining: 0, unlocked: false }),
    );

    expect(await maybeCelebrateDefaultItemsUnlocked(USER)).toBeNull();
  });

  it('is scoped per user so a shared device celebrates each account', async () => {
    mockGetStatus.mockResolvedValue(status());

    await maybeCelebrateDefaultItemsUnlocked({ id: 'user-2' } as any);

    expect(mockGetItem).toHaveBeenCalledWith(
      'default_items_unlock_celebrated_user-2',
    );
  });

  it('fails open when the status request throws', async () => {
    mockGetStatus.mockRejectedValue(new Error('network down'));

    expect(await maybeCelebrateDefaultItemsUnlocked(USER)).toBeNull();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('fails open when storage throws', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable'));

    expect(await maybeCelebrateDefaultItemsUnlocked(USER)).toBeNull();
  });

  it('does nothing without a signed-in user', async () => {
    expect(await maybeCelebrateDefaultItemsUnlocked(null)).toBeNull();
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockGetStatus).not.toHaveBeenCalled();
  });
});

describe('resetDefaultItemsUnlockCelebration', () => {
  it('clears the per-user flag', async () => {
    await resetDefaultItemsUnlockCelebration('user-1');

    expect(mockRemoveItem).toHaveBeenCalledWith(
      'default_items_unlock_celebrated_user-1',
    );
  });

  it('swallows storage errors', async () => {
    mockRemoveItem.mockRejectedValue(new Error('nope'));

    await expect(
      resetDefaultItemsUnlockCelebration('user-1'),
    ).resolves.toBeUndefined();
  });
});
