import { ROOT_URL } from '../services/apiClient';
import type { Item } from '../types/item';

export const getImageUrl = (
  url: string | undefined | null,
): string | undefined => {
  if (!url) return undefined;

  // Fix for S3 SSL issue with dotted bucket names
  // AWS S3 wildcard certificates do not support buckets with dots in virtual-hosted-style URLs over HTTPS.
  // Solution: Convert to path-style access.

  // Pattern 1: Regional (https://bucket.s3.region.amazonaws.com/key)
  const s3RegionRegex =
    /^https:\/\/([^/]+)\.s3\.([a-zA-Z0-9-]+)\.amazonaws\.com\/(.+)$/;
  const regionMatch = url.match(s3RegionRegex);
  if (regionMatch) {
    const [, bucket, region, key] = regionMatch;
    if (bucket.includes('.')) {
      return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    }
  }

  // Pattern 2: Legacy (https://bucket.s3.amazonaws.com/key)
  const s3LegacyRegex = /^https:\/\/([^/]+)\.s3\.amazonaws\.com\/(.+)$/;
  const legacyMatch = url.match(s3LegacyRegex);
  if (legacyMatch) {
    const [, bucket, key] = legacyMatch;
    if (bucket.includes('.')) {
      return `https://s3.amazonaws.com/${bucket}/${key}`;
    }
  }

  if (url.startsWith('http') || url.startsWith('https')) return url;

  // Remove leading slash if present to avoid double slash
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${ROOT_URL}/${cleanUrl}`;
};

/**
 * Pick the display image for a garment item. Precedence (beautify spec §5):
 * accepted AI studio shot (`image_studio`) → background-removed cutout
 * (`image_png`) → original photo (`image_url`). Runs the winner through
 * `getImageUrl` for S3 path-style normalisation. Returns `undefined` only
 * when no source resolves.
 */
export const resolveItemImage = (
  item: Pick<Item, 'image_png' | 'image_url'> & {
    image_studio?: string | null;
  },
): string | undefined => {
  const studio = item.image_studio?.trim() ? item.image_studio : undefined;
  const png = item.image_png?.trim() ? item.image_png : undefined;
  const source = studio ?? png ?? item.image_url;
  return getImageUrl(source) || source || undefined;
};
