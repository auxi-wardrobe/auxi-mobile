import { getImageUrl } from './url';

// Coerce an image reference to a usable URI, falling back to the raw value.
export const resolveImageUrl = (url: string) => getImageUrl(url) || url;

// Pull the HTTP status off an axios-like error (mirrors SettingsScreen.getErrorStatus).
export const getErrorStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | undefined)?.response?.status;

// Month labels for the body-photo timestamp caption.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Format BodyItem.created_at → "HH:MM - DD MMM, YYYY" (e.g. "12:23 - 12 Feb, 2026").
export const formatPhotoTimestamp = (createdAt?: string): string | null => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )} - ${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
};
