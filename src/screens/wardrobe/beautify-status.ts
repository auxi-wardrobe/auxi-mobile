import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { WardrobeItem } from '../../services/wardrobeService';
import type { AppStackParamList } from '../../types/navigation';

export const BEAUTIFY_POLL_MS = 10000;

/**
 * Clears the whole stack down to a single fresh Wardrobe root. A plain
 * `navigate('Wardrobe')` only pops to an existing Wardrobe route if one is
 * already in history — from some entry points it instead pushes a new
 * instance on top, leaving the screen being left (BeautifyPending,
 * BeautifyReview) mounted underneath with its poll/effects never cleaned
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

export function anyBeautifying(items: Pick<WardrobeItem, 'beautify_status'>[]): boolean {
  return items.some((i) => i.beautify_status === 'pending');
}
