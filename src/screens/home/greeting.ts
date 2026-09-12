// Pure greeting helpers for the landing header — deliberately free of React
// and of any context import, so they are unit-testable on their own (the hook
// that uses them pulls in AuthContext, and with it the whole service tree).

export const MORNING_UNTIL_HOUR = 12;
export const AFTERNOON_UNTIL_HOUR = 18;

export type GreetingSlot = 'morning' | 'afternoon' | 'evening';

export const greetingSlotFor = (hour: number): GreetingSlot => {
  if (hour < MORNING_UNTIL_HOUR) {
    return 'morning';
  }
  if (hour < AFTERNOON_UNTIL_HOUR) {
    return 'afternoon';
  }
  return 'evening';
};

/**
 * "linh.nguyen42@gmail.com" → "Linh".
 *
 * The backend `User` has no display name (see `src/types/auth.ts`), so the
 * header derives one from the email local part. When nothing name-like can be
 * derived this returns `null` and the caller greets the user WITHOUT a name —
 * never "Good morning, " with a dangling comma, and never a made-up name.
 */
export const displayNameFromEmail = (
  email: string | undefined | null,
): string | null => {
  const local = (email ?? '').split('@')[0] ?? '';
  // Split on the usual separators and keep the first alphabetic chunk.
  const first = local
    .split(/[._\-+\d]+/)
    .map(part => part.trim())
    .find(part => /^[a-zA-ZÀ-ỹ]{2,}$/.test(part));
  if (!first) {
    return null;
  }
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};
