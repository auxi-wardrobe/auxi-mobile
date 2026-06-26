/**
 * AU-362 — Outfit Temperature override state.
 *
 * Single source of truth for the active temperature bucket. The Home header
 * (weather vs override indicator) AND the recommendation request layer both
 * read from this hook, so they can NEVER disagree about the current mode
 * (named high-risk: "header/recommendation mismatch", "override not cleared").
 *
 * Lifetime: the override is **session-only / in-memory**. It is intentionally
 * NOT persisted — quitting the app tears down the JS context and the next
 * launch starts back on `weather` (live location temp). This is the requested
 * behaviour: a manual temperature is a temporary, one-session tweak; closing
 * the app returns the user to their real weather location automatically.
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
  /** Activate a bucket for this session (any key, incl. `weather` to clear). */
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
    // No persistence: the override is session-only. On the next app launch the
    // hook re-mounts at DEFAULT_TEMPERATURE_BUCKET_KEY ('weather'), so the user
    // is returned to their live weather location automatically.
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
