/**
 * AU-307 phase 04 — Skeleton tile rendered in non-pinned outfit slots while
 * the pin-driven `/build` (or `/try_another`) request is in flight.
 *
 * Matches the dims of the `GarmentPreview` tile exactly so the swap to the
 * real tile on success doesn't shift layout. Subtle opacity pulse (0.4 →
 * 0.8 → 0.4 over 1.2s) using react-native's Animated.loop — no native
 * gradient lib needed. Halted under OS "Reduce Motion".
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../../theme/theme';
import { useReducedMotion } from '../../theme/motion';

const PULSE_DURATION_MS = 1200;
const PULSE_MIN_OPACITY = 0.4;
const PULSE_MAX_OPACITY = 0.8;

export interface SkeletonTileProps {
  width?: number;
  height?: number;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const SkeletonTile: React.FC<SkeletonTileProps> = ({
  width,
  height,
  style,
  testID = 'skeleton-tile',
}) => {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(PULSE_MIN_OPACITY)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(PULSE_MIN_OPACITY);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: PULSE_MAX_OPACITY,
          duration: PULSE_DURATION_MS / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: PULSE_MIN_OPACITY,
          duration: PULSE_DURATION_MS / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [reduced, pulse]);

  const sizeStyle: ViewStyle = {};
  if (typeof width === 'number') {
    sizeStyle.width = width;
  }
  if (typeof height === 'number') {
    sizeStyle.height = height;
  }

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.base, sizeStyle, style, { opacity: pulse }]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
});

export default SkeletonTile;
