/**
 * useOverlayProgress — internal lib hook for overlay enter/exit motion.
 *
 * Drives a 0↔1 progress value with motion-rules asymmetry: ENTER springs
 * (spring.standard), CLOSE is a faster exit-eased timing. Keeps the overlay
 * mounted through the close animation, then reports unmount via `mounted`.
 * Honors reduce-motion (jumps). NOT exported from the barrel.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { motion, useReducedMotion } from '../../../theme/motion';

// Inside RNW's <Modal>, the native driver for transform/opacity can drop frames
// or no-op; the JS driver is reliable on web. Native platforms keep the native
// driver. (Overlays now portal through a real RN Modal — see MBottomSheet etc.)
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

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
        useNativeDriver: USE_NATIVE_DRIVER,
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
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => setMounted(false));
    }
  }, [visible, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return { progress, mounted };
};
