import type { WardrobeItem } from '../../services/wardrobeService';

export const BEAUTIFY_POLL_MS = 10000;

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
