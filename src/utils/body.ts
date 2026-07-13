import { getImageUrl } from './url';
import type { BodyItem } from '../services/bodyService';

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

// Human label distinguishing a body photo's origin in the manage-photo grid
// (uploaded photo vs AI-generated body shape vs selfie). Returns an i18n key —
// the caller localises it via `t()`. `body_shape` wins when present (those are
// the AI-generated slim/average/fuller builds); otherwise we key off
// `photo_type`, falling back to "uploaded" for legacy records that carry
// neither field.
export const bodyPhotoLabelKey = (item: BodyItem): string => {
  if (item.body_shape) {
    return `body.type_shape_${item.body_shape}`;
  }
  switch (item.photo_type) {
    case 'selfie':
      return 'body.type_selfie';
    case 'ai_result':
    case 'ai':
    case 'try_on':
      return 'body.type_ai_result';
    case 'full_body':
    default:
      return 'body.type_uploaded';
  }
};

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
