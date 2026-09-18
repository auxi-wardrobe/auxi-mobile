import { useCallback, useState } from 'react';

interface ImageFallback {
  /** Best candidate not yet known to have failed; `undefined` once all failed. */
  uri: string | undefined;
  /** Every candidate errored — callers should render their no-image state. */
  allFailed: boolean;
  /** Pass to `<Image onError>`; retires the current candidate. */
  onError: () => void;
}

/**
 * Walk an ordered list of image URLs, dropping each one that fails to load.
 *
 * A wardrobe item's higher-precedence URL (`image_studio` / `image_png`) can
 * be non-empty but dead — an onboarding clone copies the SYSTEM catalog
 * item's `processed/` blob URLs, and those blobs could be deleted while the
 * clone row kept pointing at them. Without this, such a tile renders blank
 * even though the `common_items/` original underneath is still alive.
 *
 * Failures are tracked BY URL, not by index, so the state stays correct when
 * `sources` changes identity between renders (a fresh URL is simply not in
 * the failed set) without needing a reset effect.
 */
export const useImageFallback = (sources: string[]): ImageFallback => {
  const [failed, setFailed] = useState<Record<string, true>>({});

  const uri = sources.find(source => !failed[source]);

  const onError = useCallback(() => {
    if (!uri) return;
    setFailed(prev => (prev[uri] ? prev : { ...prev, [uri]: true }));
  }, [uri]);

  return { uri, allFailed: sources.length > 0 && uri === undefined, onError };
};
