// AU-310 — useReduceMotion
//
// Tracks the OS "Reduce Motion" accessibility setting. Used by OutfitCardGrid
// (drop reveal translateY) and OutfitCardSkeleton (hold a static opacity, no
// breathing). Reads the initial value once and subscribes to changes so a
// toggle while the screen is mounted takes effect immediately.

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        // Default to motion enabled if the query fails.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => setReduceMotion(enabled),
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
