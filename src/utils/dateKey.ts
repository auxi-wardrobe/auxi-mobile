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
