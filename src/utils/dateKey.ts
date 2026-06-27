/**
 * Local-time calendar-day key, "YYYY-MM-DD".
 *
 * Shared by the Schedule strip and the "add to schedule" action so a day is
 * keyed identically wherever it is read or written. Uses local date parts (not
 * `toISOString`, which is UTC and would shift the day across timezones).
 */
export const toDayKey = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/**
 * Parse a "YYYY-MM-DD" day key back to a local-midnight Date. Returns null for
 * malformed input. Local (not UTC) so it round-trips with `toDayKey`.
 */
export const dateFromKey = (key: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) {
    return null;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
