/**
 * useSlidingIndicator — internal lib hook shared by DsSegmented + DsTabs.
 *
 * Measures each segment's x/width via onLayout, then springs an Animated x +
 * width to the active one (spring.confident). Reduce-motion jumps. NOT exported
 * from the barrel — primitives consume it internally.
 */
import { useRef } from 'react';
import { Animated, LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from '../../../theme/motion';

export const useSlidingIndicator = (active: number) => {
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
    const cfg = {
      stiffness: 350,
      damping: 28,
      mass: 1,
      useNativeDriver: false,
    };
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
