import { apiClient } from './apiClient';
import type { UsageLimitFeature } from '../hooks/useUsageLimitGate';

/**
 * `GET /api/me/usage` — soft-paywall MVP (AU-442) usage snapshot.
 *
 * Read-only; never mutates. See `wardrobe-backend/API_DOCUMENTATION.md`
 * §Usage for the full contract, including the server-side `limit_reached =
 * used >= limit` computation and the premium/kill-switch bypasses — this
 * client only reads the booleans, it never re-derives them.
 */
export interface UsageFeatureSnapshot {
  used: number;
  limit: number;
  limit_reached: boolean;
}

export interface UsageSnapshot {
  is_premium: boolean;
  features: Record<UsageLimitFeature, UsageFeatureSnapshot>;
}

export const usageService = {
  getUsage: async (): Promise<UsageSnapshot> => {
    const response = await apiClient.get<UsageSnapshot>('/me/usage');
    return response.data;
  },
};
