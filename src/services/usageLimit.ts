// usageLimit — soft-paywall MVP (AU-442) usage-limit gate orchestration.
//
// The three real trigger sites (See on Me, Enhance photo, Wardrobe upload)
// call `maybeShowUsageLimit(feature, user)` fire-and-forget, immediately
// AFTER their existing success `track()` call — never blocking the success
// UI. This module owns every guard so no trigger site re-derives them:
//
//   1. PAYWALL_MVP_ENABLED kill-switch (same pattern as SHOW_UPGRADE_PAYWALL,
//      SettingsScreen.tsx:69) — flip locally without an app release gate.
//   2. isFreeUser(user) — premium users never see the sheet, never fetch.
//
// No per-session suppression: the sheet shows every time a trigger fires
// while `limit_reached` is true for that feature (product decision reversed
// 2026-08-14 — was "once per feature per app session").
//
// Fail-open: ANY error/timeout on GET /api/me/usage (network, 401 during a
// token refresh race, 404 against an old backend, etc.) resolves to `null` —
// no sheet, no toast, no retry storm. A soft-paywall demand signal must never
// cost a real user a broken success flow.
//
// Re-exports `UsageLimitFeature` from useUsageLimitGate.ts rather than
// redeclaring it — ONE vocabulary, shared with the backend's `GET
// /api/me/usage` response keys (see wardrobe-backend/API_DOCUMENTATION.md
// §Usage).

import { track } from './analytics';
import { usageService } from './usageService';
import { isFreeUser } from './subscription';
import type { UsageLimitFeature } from '../hooks/useUsageLimitGate';
import type { User } from '../types/auth';

export type { UsageLimitFeature };

/** Kill-switch — same pattern as `SHOW_UPGRADE_PAYWALL` (SettingsScreen.tsx). */
export const PAYWALL_MVP_ENABLED = true;

/** Result of a limit-reached gate check — the numbers the sheet + analytics need. */
export interface UsageLimitResult {
  used: number;
  limit: number;
}

/**
 * Fetches usage and returns `{ used, limit }` iff the sheet should show for
 * `feature` right now, else `null`. Fires `usage_limit_gate_shown` itself
 * (single call site for that event, so every trigger site can't drift on
 * props) — the caller is only responsible for calling `gate.open(feature)`
 * when this resolves non-null.
 *
 * Never throws — every guard and the fetch itself are wrapped so a caller can
 * always safely `await` this without a try/catch of its own.
 */
export const maybeShowUsageLimit = async (
  feature: UsageLimitFeature,
  user: User | null | undefined,
): Promise<UsageLimitResult | null> => {
  if (!PAYWALL_MVP_ENABLED) {
    return null;
  }
  if (!isFreeUser(user)) {
    return null;
  }

  try {
    const usage = await usageService.getUsage();
    const snapshot = usage.features[feature];
    if (!snapshot?.limit_reached) {
      return null;
    }
    const result: UsageLimitResult = {
      used: snapshot.used,
      limit: snapshot.limit,
    };
    track('usage_limit_gate_shown', { feature, ...result });
    return result;
  } catch {
    // Fail-open: network error, timeout, 404 (old backend), whatever — never
    // block or retry. The user just doesn't see the soft-paywall this time.
    return null;
  }
};
