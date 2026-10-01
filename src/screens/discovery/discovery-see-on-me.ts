import type { DiscoveryOutfitDetail } from '../../services/discoveryService';

/**
 * Stable identity for a Discovery outfit in the See-on-me handoff
 * (`discovery_<id>`, 46 chars — under the backend's 64-char hash cap).
 */
export const discoveryOutfitHash = (outfitId: string) => `discovery_${outfitId}`;

/** Try-on is capped at 1–4 garments by `POST /api/tryon/highres`. */
export const canSeeOutfitOnMe = (outfit: DiscoveryOutfitDetail | null | undefined) => {
  const count = outfit?.items.length ?? 0;
  return count >= 1 && count <= 4;
};

/** `SeeThisOnMeConfirm` params for a Discovery outfit (reuse-confirm gate). */
export const discoverySeeOnMeParams = (outfit: DiscoveryOutfitDetail) => ({
  outfit: {
    outfitHash: discoveryOutfitHash(outfit.id),
    itemIds: outfit.items.map(item => item.id),
    itemImageUrls: outfit.items
      .map(item => item.image_png ?? item.image_url)
      .filter((url): url is string => !!url),
    stylingNote: outfit.description,
  },
});
