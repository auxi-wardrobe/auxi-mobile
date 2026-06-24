/**
 * useOverlayProgress — internal lib hook for overlay enter/exit motion.
 *
 * Drives a 0↔1 progress value with motion-rules asymmetry: ENTER springs
 * (spring.standard), CLOSE is a faster exit-eased timing. Keeps the overlay
 * mounted through the close animation, then reports unmount via `mounted`.
 * Honors reduce-motion (jumps). NOT exported from the barrel.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { motion, useReducedMotion } from '../../../theme/motion';

export const useOverlayProgress = (visible: boolean) => {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reduce) {
        progress.setValue(1);
        return;
      }
      Animated.spring(progress, {
        toValue: 1,
        stiffness: motion.spring.standard.stiffness,
        damping: motion.spring.standard.damping,
        mass: 1,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      if (reduce) {
        progress.setValue(0);
        setMounted(false);
        return;
      }
      // close = faster (exit easing) per motion-rules open/close asymmetry.
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.fast,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return { progress, mounted };
};
