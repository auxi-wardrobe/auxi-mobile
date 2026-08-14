/* eslint-env jest */
/**
 * usageLimit — AU-442 soft-paywall MVP gate orchestration.
 *
 * Locks the guard order (kill-switch → free-user → session-shown) + the
 * fail-open contract: any `getUsage()` rejection (network/timeout/whatever)
 * must resolve to `null`, never throw, never retry. Per-feature session
 * memory is exercised end-to-end via the real module (not mocked), matching
 * `aiLimitStore.test.ts`'s pattern of testing the real in-memory store.
 *
 * `PAYWALL_MVP_ENABLED` is a hardcoded kill-switch const (same pattern as
 * `SHOW_UPGRADE_PAYWALL`, SettingsScreen.tsx) — flipped by editing source,
 * not by runtime config, so its `false` branch isn't unit-tested here
 * (no existing precedent tests `SHOW_UPGRADE_PAYWALL`'s off-state either).
 */
import {
  maybeShowUsageLimit,
  clearUsageLimitSession,
  PAYWALL_MVP_ENABLED,
} from '../usageLimit';
import { usageService } from '../usageService';
import { track } from '../analytics';
import type { User } from '../../types/auth';

jest.mock('../usageService', () => ({
  usageService: { getUsage: jest.fn() },
}));
jest.mock('../analytics', () => ({ track: jest.fn() }));

const mockGetUsage = usageService.getUsage as jest.Mock;
const mockTrack = track as jest.Mock;

const freeUser = { id: 'u1', is_premium: false } as unknown as User;
const premiumUser = { id: 'u2', is_premium: true } as unknown as User;

const snapshot = (overrides: {
  see_on_me?: Partial<{ used: number; limit: number; limit_reached: boolean }>;
  wardrobe_items?: Partial<{
    used: number;
    limit: number;
    limit_reached: boolean;
  }>;
  enhance_photo?: Partial<{
    used: number;
    limit: number;
    limit_reached: boolean;
  }>;
} = {}) => ({
  is_premium: false,
  features: {
    see_on_me: { used: 0, limit: 2, limit_reached: false, ...overrides.see_on_me },
    wardrobe_items: {
      used: 0,
      limit: 51,
      limit_reached: false,
      ...overrides.wardrobe_items,
    },
    enhance_photo: {
      used: 0,
      limit: 31,
      limit_reached: false,
      ...overrides.enhance_photo,
    },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  clearUsageLimitSession();
});

it('the kill-switch is ON by default (documents current MVP state)', () => {
  expect(PAYWALL_MVP_ENABLED).toBe(true);
});

it('limit_reached + free user + first time → opens with {used, limit} and fires usage_limit_gate_shown once', async () => {
  mockGetUsage.mockResolvedValue(
    snapshot({ see_on_me: { used: 2, limit: 2, limit_reached: true } }),
  );

  const result = await maybeShowUsageLimit('see_on_me', freeUser);

  expect(result).toEqual({ used: 2, limit: 2 });
  expect(mockTrack).toHaveBeenCalledTimes(1);
  expect(mockTrack).toHaveBeenCalledWith('usage_limit_gate_shown', {
    feature: 'see_on_me',
    used: 2,
    limit: 2,
  });
});

it('the same feature twice in one session shows only once — the 2nd call short-circuits before fetching', async () => {
  mockGetUsage.mockResolvedValue(
    snapshot({ see_on_me: { used: 2, limit: 2, limit_reached: true } }),
  );

  const first = await maybeShowUsageLimit('see_on_me', freeUser);
  const second = await maybeShowUsageLimit('see_on_me', freeUser);

  expect(first).toEqual({ used: 2, limit: 2 });
  expect(second).toBeNull();
  expect(mockGetUsage).toHaveBeenCalledTimes(1);
  expect(mockTrack).toHaveBeenCalledTimes(1);
});

it('a different feature after the first still opens (per-feature memory)', async () => {
  mockGetUsage.mockResolvedValue(
    snapshot({
      see_on_me: { used: 2, limit: 2, limit_reached: true },
      wardrobe_items: { used: 51, limit: 51, limit_reached: true },
    }),
  );

  await maybeShowUsageLimit('see_on_me', freeUser);
  const wardrobeResult = await maybeShowUsageLimit('wardrobe_items', freeUser);

  expect(wardrobeResult).toEqual({ used: 51, limit: 51 });
  expect(mockGetUsage).toHaveBeenCalledTimes(2);
  expect(mockTrack).toHaveBeenCalledTimes(2);
});

it('a premium user never triggers a request or the sheet', async () => {
  const result = await maybeShowUsageLimit('see_on_me', premiumUser);

  expect(result).toBeNull();
  expect(mockGetUsage).not.toHaveBeenCalled();
  expect(mockTrack).not.toHaveBeenCalled();
});

it('limit_reached: false resolves null and fires no event', async () => {
  mockGetUsage.mockResolvedValue(snapshot());

  const result = await maybeShowUsageLimit('see_on_me', freeUser);

  expect(result).toBeNull();
  expect(mockTrack).not.toHaveBeenCalled();
  // Not marked shown — a later real limit-hit this session must still open.
  mockGetUsage.mockResolvedValue(
    snapshot({ see_on_me: { used: 2, limit: 2, limit_reached: true } }),
  );
  const second = await maybeShowUsageLimit('see_on_me', freeUser);
  expect(second).toEqual({ used: 2, limit: 2 });
});

it('getUsage() rejecting (network error) fails open: null, no throw, no toast, not marked shown', async () => {
  mockGetUsage.mockRejectedValue(new Error('Network Error'));

  await expect(maybeShowUsageLimit('see_on_me', freeUser)).resolves.toBeNull();
  expect(mockTrack).not.toHaveBeenCalled();

  // Fail-open doesn't poison the session — a retry (e.g. next action) can
  // still succeed once the network recovers.
  mockGetUsage.mockResolvedValue(
    snapshot({ see_on_me: { used: 2, limit: 2, limit_reached: true } }),
  );
  const retry = await maybeShowUsageLimit('see_on_me', freeUser);
  expect(retry).toEqual({ used: 2, limit: 2 });
});

it('getUsage() timing out (rejected timeout error) fails open the same way', async () => {
  const timeoutError = Object.assign(new Error('timeout of 30000ms exceeded'), {
    code: 'ECONNABORTED',
  });
  mockGetUsage.mockRejectedValue(timeoutError);

  await expect(maybeShowUsageLimit('enhance_photo', freeUser)).resolves.toBeNull();
  expect(mockTrack).not.toHaveBeenCalled();
});

it('event props contain only feature/used/limit — no PII, no ids, no free text', async () => {
  mockGetUsage.mockResolvedValue(
    snapshot({ enhance_photo: { used: 31, limit: 31, limit_reached: true } }),
  );

  await maybeShowUsageLimit('enhance_photo', freeUser);

  const [, props] = mockTrack.mock.calls[0];
  expect(Object.keys(props).sort()).toEqual(['feature', 'limit', 'used']);
  expect(typeof props.used).toBe('number');
  expect(typeof props.limit).toBe('number');
  expect(typeof props.feature).toBe('string');
});

it('clearUsageLimitSession() resets per-feature memory (logout → new sign-in)', async () => {
  mockGetUsage.mockResolvedValue(
    snapshot({ see_on_me: { used: 2, limit: 2, limit_reached: true } }),
  );

  await maybeShowUsageLimit('see_on_me', freeUser);
  expect(await maybeShowUsageLimit('see_on_me', freeUser)).toBeNull();

  clearUsageLimitSession();

  const afterClear = await maybeShowUsageLimit('see_on_me', freeUser);
  expect(afterClear).toEqual({ used: 2, limit: 2 });
  expect(mockGetUsage).toHaveBeenCalledTimes(2);
});
