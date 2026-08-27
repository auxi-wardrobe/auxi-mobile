// useDefaultItemRemovalStatus — reads whether Macgie's default (starter
// catalog) items may now be removed from the user's wardrobe.
//
// Macgie seeds every new wardrobe with defaults so the suggestion engine has
// signal on day one; they stay immutable until the user has uploaded
// `threshold` items of their own. The server owns both the count and the
// threshold — this hook never re-derives `unlocked` from `own_item_count`.
//
// Fails CLOSED, unlike `defaultItemsMilestone` (which fails open): while the
// status is loading or the request errored, `unlocked` reads `false` and the
// delete affordance stays hidden. Showing a Trash button the backend will
// 403 is worse than not showing one — and the user can always come back.
//
// Cached under its own key rather than `wardrobeKeys` because the wardrobe
// list is a different shape with different staleness needs; any mutation that
// changes the own-item count invalidates it explicitly.

import { useQuery } from '@tanstack/react-query';
import {
  defaultItemRemovalKeys,
  wardrobeService,
} from '../services/wardrobeService';
import type { DefaultItemRemovalStatus } from '../services/wardrobeService';

export interface UseDefaultItemRemovalStatus {
  /** True only when the server says so. False while loading or on error. */
  unlocked: boolean;
  /** Own items still needed; `null` until the status has loaded. */
  remaining: number | null;
  /** The full server payload, or `undefined` before it lands. */
  status: DefaultItemRemovalStatus | undefined;
  isLoading: boolean;
}

export const useDefaultItemRemovalStatus = (
  enabled: boolean = true,
): UseDefaultItemRemovalStatus => {
  const { data, isLoading } = useQuery({
    queryKey: defaultItemRemovalKeys.all,
    queryFn: () => wardrobeService.getDefaultItemRemovalStatus(),
    enabled,
    // The count only moves on add/delete, both of which invalidate this key.
    staleTime: 60_000,
    // An older backend without the endpoint 404s — one retry is plenty, and
    // failing closed means a retry storm would buy nothing.
    retry: 1,
  });

  return {
    unlocked: data?.unlocked === true,
    remaining: data ? data.remaining : null,
    status: data,
    isLoading,
  };
};
