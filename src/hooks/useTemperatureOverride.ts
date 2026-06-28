/**
 * AU-362 — Outfit Temperature override state.
 *
 * Single source of truth for the active temperature bucket. The Home header
 * (weather vs override indicator) AND the recommendation request layer both
 * read from this hook, so they can NEVER disagree about the current mode
 * (named high-risk: "header/recommendation mismatch", "override not cleared").
 *
 * Session-only (AU-391): the override lives purely in memory and is NOT
 * persisted. A real app terminate → cold reopen recreates the JS context, so
 * the hook re-initializes to `weather` (live weather) on its own — i.e. the
 * override always resets to Live Weather on app restart, which is the point of
 * AU-391. Backgrounding / foregrounding within a session keeps the override
 * (React state survives, only a full restart drops it).
 *
 * `overrideTempC` is `null` while on `weather` (live temp) and the bucket's
 * representative midpoint while an override is active. Callers substitute it as
 * `overrideTempC ?? weather.tempC`. The mirrored `overrideTempCRef` lets the
 * prefetch/"Show another" closures (which read refs, not state) use the
 * override without re-creating their callbacks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TEMPERATURE_BUCKET_KEY,
  isOverrideBucket,
  repTempCFor,
  type TemperatureBucketKey,
} from '../config/temperature-buckets';

export interface UseTemperatureOverride {
  activeBucketKey: TemperatureBucketKey;
  /** Mirrors `activeBucketKey` for ref-reading closures (prefetch / show-another). */
  activeBucketKeyRef: React.MutableRefObject<TemperatureBucketKey>;
  /** Rep temp_c for the active bucket, or `null` while on live weather. */
  overrideTempC: number | null;
  /** Ref mirror of `overrideTempC` for closures that read refs, not state. */
  overrideTempCRef: React.MutableRefObject<number | null>;
  /** True when a non-default bucket is active. */
  isOverrideActive: boolean;
  /** Activate a bucket in-memory (any key, incl. `weather` to clear). */
  apply: (key: TemperatureBucketKey) => void;
  /** Reset to live weather. */
  clear: () => void;
}

export const useTemperatureOverride = (): UseTemperatureOverride => {
  const [activeBucketKey, setActiveBucketKey] = useState<TemperatureBucketKey>(
    DEFAULT_TEMPERATURE_BUCKET_KEY,
  );

  const activeBucketKeyRef = useRef<TemperatureBucketKey>(activeBucketKey);
  const overrideTempCRef = useRef<number | null>(repTempCFor(activeBucketKey));

  // Keep refs in lock-step with state so ref-reading closures (prefetch,
  // "Show another") always see the current override.
  useEffect(() => {
    activeBucketKeyRef.current = activeBucketKey;
    overrideTempCRef.current = repTempCFor(activeBucketKey);
  }, [activeBucketKey]);

  const apply = useCallback((key: TemperatureBucketKey) => {
    // Sync the refs SYNCHRONOUSLY here, not only via the effect above (which
    // runs post-commit): the Home Apply handler fires the recommendation
    // request immediately after this call, and the build/prefetch closures
    // read these refs — so a ref that lags one render would send the PRE-apply
    // temp while the header already shows the new bucket (the "header/request
    // mismatch" high-risk). Mirrors the refine-submit "set state + ref" pattern.
    activeBucketKeyRef.current = key;
    overrideTempCRef.current = repTempCFor(key);
    setActiveBucketKey(key);
  }, []);

  const clear = useCallback(() => {
    apply(DEFAULT_TEMPERATURE_BUCKET_KEY);
  }, [apply]);

  return {
    activeBucketKey,
    activeBucketKeyRef,
    overrideTempC: repTempCFor(activeBucketKey),
    overrideTempCRef,
    isOverrideActive: isOverrideBucket(activeBucketKey),
    apply,
    clear,
  };
};
