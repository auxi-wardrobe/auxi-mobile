import { getImageUrl } from './url';
import { BodyItem } from '../services/bodyService';

// Coerce an image reference to a usable URI, falling back to the raw value.
export const resolveImageUrl = (url: string) => getImageUrl(url) || url;

// Manage-body-photo gallery: map a body record to a short type badge shown on
// its grid tile so the user can tell uploads / selfies / AI results / body
// shapes apart. Returns an i18n key (under `body.`) or null when the record's
// type is unknown — an unknown type simply shows no badge rather than a wrong
// label. `body_shape` wins: an AI-generated build carries a shape AND a
// photo_type, and "Body shape" is the more meaningful label.
export const bodyPhotoTypeLabelKey = (item: BodyItem): string | null => {
  if (item.body_shape) {
    return 'body.gallery_type_body_shape';
  }
  switch (item.photo_type) {
    case 'full_body':
    case 'upload':
    case 'uploaded':
      return 'body.gallery_type_uploaded';
    case 'selfie':
      return 'body.gallery_type_selfie';
    case 'tryon':
    case 'try_on':
    case 'ai_result':
    case 'ai_generated':
      return 'body.gallery_type_ai_result';
    default:
      return null;
  }
};

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
