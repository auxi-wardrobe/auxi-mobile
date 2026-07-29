import type { QueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { wardrobeKeys, type WardrobeItem } from '../../services/wardrobeService';
import type { AppStackParamList } from '../../types/navigation';

export const BEAUTIFY_POLL_MS = 10000;

/**
 * Clears the whole stack down to a single fresh Wardrobe root. A plain
 * `navigate('Wardrobe')` only pops to an existing Wardrobe route if one is
 * already in history — from some entry points it instead pushes a new
 * instance on top, leaving the screen being left (BeautifyPending,
 * EnhanceImage) mounted underneath with its poll/effects never cleaned
 * up. Every "back to Wardrobe" exit in the beautify flow goes through this.
 */
export function goToWardrobe(
  nav: NativeStackNavigationProp<AppStackParamList>,
): void {
  nav.reset({ index: 0, routes: [{ name: 'Wardrobe' }] });
}

const STEPS = [
  'Removing background…',
  'Setting up studio lighting…',
  'Polishing the details…',
  'Almost there…',
];

/** Client-side rotating status copy (gpt-image-1 gives no real progress). */
export function beautifyStep(elapsedMs: number): string {
  const idx = Math.min(STEPS.length - 1, Math.floor(elapsedMs / 7000));
  return STEPS[idx];
}

/**
 * Optimistically patches `beautify_status: 'pending'` onto an already-cached
 * wardrobe item the moment a beautify job is submitted — no need to wait on
 * an invalidate+refetch round trip just to show the "beautifying" badge.
 * No-ops if the item isn't in the cached list yet (a brand-new upload isn't
 * — that path already lands on BeautifyPending directly).
 */
export function markItemBeautifying(
  queryClient: QueryClient,
  itemId: string,
): void {
  queryClient.setQueryData<WardrobeItem[]>(wardrobeKeys.list('All'), items =>
    items?.map(item =>
      item.id === itemId ? { ...item, beautify_status: 'pending' } : item,
    ),
  );
}
