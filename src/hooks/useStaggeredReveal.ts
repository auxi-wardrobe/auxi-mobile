/**
 * See-on-me redesign (B1) — staggered loading-row reveal + a minimum-wait gate
 * on the "leave / notify me" CTA, shared by both loading screens (3-row
 * body-shape generation + 4-row outfit render, Figma "Loading step 3" /
 * "loading to see result").
 *
 * Rows reveal one at a time every `stepMs` (row 0 at t=0, row 1 at t=stepMs,
 * …) regardless of the real async job's progress — this is a UX timer only,
 * it never gates the actual job. The CTA stays disabled until `minCtaMs` have
 * elapsed, even if every row has already revealed (e.g. 3 rows × 2s = 4s of
 * reveals still waits out the 7s floor).
 *
 * Reduce-motion: rows reveal immediately (no stagger) so a user who disabled
 * animations isn't kept waiting on a purely cosmetic sequence, but the CTA
 * gate is untouched — it's a deliberate minimum-wait, not motion.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export interface UseStaggeredRevealOptions {
  /** Delay between each row reveal, in ms. Default 2000 (spec: "every 2 s"). */
  stepMs?: number;
  /** Minimum elapsed time before the CTA is enabled, in ms. Default 7000. */
  minCtaMs?: number;
}

export interface UseStaggeredRevealResult {
  /** Number of rows currently revealed (0..rowCount). */
  visibleCount: number;
  /** True once `minCtaMs` has elapsed since mount. */
  ctaEnabled: boolean;
}

const DEFAULT_STEP_MS = 2000;
const DEFAULT_MIN_CTA_MS = 7000;

export const useStaggeredReveal = (
  rowCount: number,
  options: UseStaggeredRevealOptions = {},
): UseStaggeredRevealResult => {
  const { stepMs = DEFAULT_STEP_MS, minCtaMs = DEFAULT_MIN_CTA_MS } = options;
  const [visibleCount, setVisibleCount] = useState(
    // Nothing to stagger for a non-positive row count.
    rowCount > 0 ? 1 : 0,
  );
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(enabled => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Row reveal — skipped (all rows shown immediately) under reduce-motion.
  useEffect(() => {
    if (rowCount <= 0) return;
    if (reduceMotion) {
      setVisibleCount(rowCount);
      return;
    }
    setVisibleCount(1);
    if (rowCount <= 1) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let row = 1; row < rowCount; row++) {
      timers.push(
        setTimeout(() => {
          setVisibleCount(v => Math.max(v, row + 1));
        }, stepMs * row),
      );
    }
    return () => timers.forEach(clearTimeout);
    // rowCount/stepMs are stable for the lifetime of a given loading screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowCount, reduceMotion]);

  // CTA min-wait gate — always runs regardless of reduce-motion.
  useEffect(() => {
    const timer = setTimeout(() => setCtaEnabled(true), minCtaMs);
    return () => clearTimeout(timer);
  }, [minCtaMs]);

  return { visibleCount, ctaEnabled };
};
