/**
 * aiLimitStore — session memory of the "AI daily limit reached" state.
 *
 * The backend has no quota-status endpoint (limit work is owned separately), so
 * the ONLY signal that the daily budget is spent is an `ai_daily_limit_reached`
 * 429 on an actual AI job. That makes the limit reactive-only: a surface can't
 * know it's over-limit until its own expensive job fails. This store closes that
 * gap by remembering the last 429 so a surface can gate ENTRY on it — e.g.
 * See-on-me shows the "come back tomorrow" sheet the instant the user opens it,
 * instead of walking them through capture + body-shape selection only to 429 at
 * the render (reported 2026-07-20).
 *
 * Deliberately conservative so it can never wrongly block a user who still has
 * budget:
 *   - In-memory only — cleared on app restart; the surface then falls back to
 *     the reactive 429, so a cold start never carries a stale block.
 *   - Same-local-day guard — the mark auto-expires when the calendar day rolls
 *     over (the limit resets daily), independent of any timer.
 *   - Any AI SUCCESS clears it — the moment the user proves they have budget the
 *     block self-heals, so a false mark can't strand them.
 *
 * It is NOT a replacement for the reactive gate; it only lets us show the sheet
 * sooner. Every AI surface still handles its own live 429.
 */

// The local calendar day (year-month-date) the limit was last hit, or null.
let reachedDayKey: string | null = null;

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Record that an `ai_daily_limit_reached` 429 just occurred. */
export const markAiLimitReached = (): void => {
  reachedDayKey = todayKey();
};

/** Clear the mark — call on any AI success (proof the budget isn't spent). */
export const clearAiLimit = (): void => {
  reachedDayKey = null;
};

/** True iff the limit was hit earlier *today* and hasn't been cleared since. */
export const isAiLimitReached = (): boolean => reachedDayKey === todayKey();
