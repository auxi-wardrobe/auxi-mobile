/**
 * useSlidingIndicator — lib hook for a spring-driven sliding indicator.
 *
 * Measures each slot's x/width via onLayout, then springs an Animated x + width
 * to the active one. Reduce-motion jumps. Two motion characters:
 *   - default (confident): MSegmented / MTabs thumb + underline — no overshoot.
 *   - bounce: the floating-pill signature — low-damping overshoot
 *     (≈ cubic-bezier(.34,1.32,.5,1)), used by MFloatingPill + the Home footer.
 *
 * Exported from the barrel so feature footers can drive their own (themed)
 * sliding cell with the same motion instead of hand-rolling a spring.
 */
import { useRef } from 'react';
import { Animated, LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from '../../../theme/motion';

export interface SlidingIndicatorOptions {
  /** Low-damping overshoot bounce (floating-pill signature). Default: confident. */
  bounce?: boolean;
}

export const useSlidingIndicator = (
  active: number,
  opts: SlidingIndicatorOptions = {},
) => {
  const reduce = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const xs = useRef<number[]>([]);
  const widths = useRef<number[]>([]);

  const settle = (i: number) => {
    const tx = xs.current[i] ?? 0;
    const tw = widths.current[i] ?? 0;
    if (reduce) {
      x.setValue(tx);
      w.setValue(tw);
      return;
    }
    // bounce → low-damping overshoot (floating pill); default → confident settle.
    const cfg = opts.bounce
      ? { stiffness: 320, damping: 16, mass: 1, useNativeDriver: false }
      : { stiffness: 350, damping: 28, mass: 1, useNativeDriver: false };
    Animated.spring(x, { toValue: tx, ...cfg }).start();
    Animated.spring(w, { toValue: tw, ...cfg }).start();
  };

  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    xs.current[i] = lx;
    widths.current[i] = width;
    if (i === active) {
      x.setValue(lx);
      w.setValue(width);
    }
  };

  return { x, w, onLayout, settle };
};
