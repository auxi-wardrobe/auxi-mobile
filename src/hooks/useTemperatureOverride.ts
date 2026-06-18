/**
 * AU-362 — Outfit Temperature override state.
 *
 * Single source of truth for the active temperature bucket. The Home header
 * (weather vs override indicator) AND the recommendation request layer both
 * read from this hook, so they can NEVER disagree about the current mode
 * (named high-risk: "header/recommendation mismatch", "override not cleared").
 *
 * Persistence (D3): the active override survives same-day reloads via
 * AsyncStorage, keyed by `@auxi/temp_override` with the value
 * `{ bucketKey, dateISO }`. On mount we load it; if `dateISO` is not today the
 * override is expired and we fall back to `weather`.
 *
 * `overrideTempC` is `null` while on `weather` (live temp) and the bucket's
 * representative midpoint while an override is active. Callers substitute it as
 * `overrideTempC ?? weather.tempC`. The mirrored `overrideTempCRef` lets the
 * prefetch/"Show another" closures (which read refs, not state) use the
 * override without re-creating their callbacks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_TEMPERATURE_BUCKET_KEY,
  isOverrideBucket,
  isTemperatureBucketKey,
  repTempCFor,
  type TemperatureBucketKey,
} from '../config/temperature-buckets';

const STORAGE_KEY = '@auxi/temp_override';

interface PersistedOverride {
  bucketKey: TemperatureBucketKey;
  dateISO: string;
}

/** Local calendar day stamp (YYYY-MM-DD) — used to expire the override. */
const todayISO = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

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
  /** Persist + activate a bucket (any key, incl. `weather` to clear). */
  apply: (key: TemperatureBucketKey) => void;
  /** Reset to live weather and drop the persisted override. */
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

  // Load persisted override on mount; expire if not from today (D3).
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!mounted || !raw) {
          return;
        }
        const parsed = JSON.parse(raw) as Partial<PersistedOverride>;
        if (
          isTemperatureBucketKey(parsed.bucketKey) &&
          isOverrideBucket(parsed.bucketKey) &&
          parsed.dateISO === todayISO()
        ) {
          setActiveBucketKey(parsed.bucketKey);
        } else {
          // Stale (yesterday) or malformed → clean up.
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
    if (isOverrideBucket(key)) {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ bucketKey: key, dateISO: todayISO() }),
      ).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
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
