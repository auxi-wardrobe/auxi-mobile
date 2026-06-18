/**
 * AU-362 — Outfit Temperature buckets.
 *
 * Single source of truth for the temperature-override feature: the radio
 * options in `TemperatureOverrideSheet`, the bucket→temp_c mapping used to
 * substitute `weather.temp_c` on the V05 `/build` request, and the analytics
 * bucket keys. Keep this the ONLY place that knows the ranges/midpoints so the
 * sheet, the header indicator, the request layer, and Mixpanel never drift.
 *
 * Decision D1 (plan): send the bucket MIDPOINT as the representative temp_c.
 * Backend `engine_v05._climate_bucket(temp_c)`: >28 HOT · ≥20 WARM · ≥15 MILD
 * · <15 COOL. D2: `cold_0_7` and `freezing_-10_0` both fall under COOL (<15) →
 * identical outfits for MVP (accepted "same outfit" edge case).
 *
 * `weather` (rep `null`) = no override → caller sends the live `weather.tempC`.
 */
import type { TFunction } from 'i18next';

export type TemperatureBucketKey =
  | 'weather'
  | 'hot_28_40'
  | 'mild_10_25'
  | 'cold_0_7'
  | 'freezing_-10_0';

export interface TemperatureBucket {
  key: TemperatureBucketKey;
  /** i18n key under `home.*`. `weather` interpolates `{{temp}}`. */
  labelI18nKey: string;
  /** Representative temp_c sent to the backend. `null` = use live weather. */
  repTempC: number | null;
}

export const TEMPERATURE_BUCKETS: readonly TemperatureBucket[] = [
  { key: 'weather', labelI18nKey: 'home.temp_use_current', repTempC: null },
  { key: 'hot_28_40', labelI18nKey: 'home.temp_28_40', repTempC: 33 },
  { key: 'mild_10_25', labelI18nKey: 'home.temp_10_25', repTempC: 18 },
  { key: 'cold_0_7', labelI18nKey: 'home.temp_0_7', repTempC: 4 },
  { key: 'freezing_-10_0', labelI18nKey: 'home.temp_-10_0', repTempC: -5 },
] as const;

export const DEFAULT_TEMPERATURE_BUCKET_KEY: TemperatureBucketKey = 'weather';

const BUCKET_BY_KEY: Record<TemperatureBucketKey, TemperatureBucket> =
  TEMPERATURE_BUCKETS.reduce((acc, bucket) => {
    acc[bucket.key] = bucket;
    return acc;
  }, {} as Record<TemperatureBucketKey, TemperatureBucket>);

/** True for any non-default bucket — i.e. an active temperature override. */
export const isOverrideBucket = (key: TemperatureBucketKey): boolean =>
  key !== DEFAULT_TEMPERATURE_BUCKET_KEY;

/** Type guard for persisted/untrusted values (AsyncStorage, etc.). */
export const isTemperatureBucketKey = (
  value: unknown,
): value is TemperatureBucketKey =>
  typeof value === 'string' && value in BUCKET_BY_KEY;

/**
 * Representative temp_c for a bucket. Returns `null` for `weather` (caller
 * substitutes the live temp via `overrideTempC ?? weather.tempC`).
 */
export const repTempCFor = (key: TemperatureBucketKey): number | null =>
  BUCKET_BY_KEY[key]?.repTempC ?? null;

/**
 * Display label for a bucket. The `weather` row interpolates the live
 * temperature as a rounded integer; the override buckets are static ranges.
 */
export const bucketLabel = (
  t: TFunction,
  key: TemperatureBucketKey,
  liveTempC: number,
): string => {
  const bucket =
    BUCKET_BY_KEY[key] ?? BUCKET_BY_KEY[DEFAULT_TEMPERATURE_BUCKET_KEY];
  if (bucket.key === 'weather') {
    return t(bucket.labelI18nKey, { temp: Math.round(liveTempC) });
  }
  return t(bucket.labelI18nKey);
};
