import { ROOT_URL } from '../services/apiClient';

export const getImageUrl = (url: string | undefined | null): string | undefined => {
    if (!url) return undefined;

    // Fix for S3 SSL issue with dotted bucket names
    // AWS S3 wildcard certificates do not support buckets with dots in virtual-hosted-style URLs over HTTPS.
    // Solution: Convert to path-style access.
    
    // Pattern 1: Regional (https://bucket.s3.region.amazonaws.com/key)
    const s3RegionRegex = /^https:\/\/([^/]+)\.s3\.([a-zA-Z0-9-]+)\.amazonaws\.com\/(.+)$/;
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
