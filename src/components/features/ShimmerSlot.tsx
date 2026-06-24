/**
 * AU-364 — Home-loading shimmer slot. Replaces the flat `figmaCardSurface`
 * loading cards with the Figma "Home - loading" diagonal gradient
 * (linear-gradient(230deg, #f2efec 26.8% → #d5ccc3 84%), node 2850:11215) plus
 * a token-correct opacity pulse so the slot reads as "image about to appear"
 * rather than a frozen empty box.
 *
 * The pulse mirrors `SkeletonTile` (the codebase's reduce-motion-aware loading
 * primitive) so Home-loading and pin/build loading share one motion language —
 * 0.5 ↔ 1.0 opacity over `motion.duration.reveal * 2`, halted under OS
 * "Reduce Motion". Gradient rendered via `react-native-svg` (no gradient lib),
 * consistent with AuthLayout / MacgieFace.
 *
 * The bottom two loading slots carry a static (non-interactive) pin affordance
 * matching the loaded grid's `pinBadge`, so the load→loaded transition does not
 * shift the pin position.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import IconHomePin from '../../assets/images/icon_home_pin.svg';

// Pulse cycle: a slow, calm breath. `reveal` (700ms) per half = 1400ms loop —
// in the same family as SkeletonTile's 1200ms, all sourced from motion tokens.
const PULSE_HALF_MS = motion.duration.reveal;
const PULSE_MIN_OPACITY = motion.opacity.subtle; // 0.6
const PULSE_MAX_OPACITY = motion.opacity.visible; // 1.0

export interface ShimmerSlotProps {
  /** Render a static (non-interactive) pin badge in the top-right (Figma Default state). */
  showPin?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const ShimmerSlot: React.FC<ShimmerSlotProps> = ({
  showPin = false,
  style,
  testID = 'home-loading-slot',
}) => {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(PULSE_MIN_OPACITY)).current;

  useEffect(() => {
    if (reduced) {
      // Reduce Motion: hold a calm mid-opacity, no loop (motion-rules §3.2).
      pulse.setValue(PULSE_MAX_OPACITY);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: PULSE_MAX_OPACITY,
          duration: PULSE_HALF_MS,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: PULSE_MIN_OPACITY,
          duration: PULSE_HALF_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [reduced, pulse]);

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading outfit"
      style={[styles.slot, style, { opacity: pulse }]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Figma 230.17deg ramp ≈ top-right → bottom-left. Offsets match the
              26.8% / 84% stops from node 2850:11215. */}
          <LinearGradient id="homeLoadingRamp" x1="1" y1="0" x2="0" y2="1">
            <Stop
              offset="0.268"
              stopColor={theme.colors.figmaCardSurface}
              stopOpacity="1"
            />
            <Stop
              offset="0.84"
              stopColor={theme.colors.figmaSkeletonRampEnd}
              stopOpacity="1"
            />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#homeLoadingRamp)"
        />
      </Svg>
      {showPin ? (
        // Static, non-interactive pin affordance (Figma Pin "Default", node
        // 3399:18455). pointerEvents="none" — there is nothing to pin yet.
        <View
          testID={`${testID}-pin`}
          pointerEvents="none"
          style={styles.pin}
        >
          <IconHomePin width={17} height={17} />
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  slot: {
    // Fill the grid cell via flex (NOT a percentage height) so the gradient
    // always has a real box to paint — `height: '100%'` collapses to 0 inside a
    // flex-stretched cell on react-native-web (the web preview), which left the
    // grid looking empty. `alignSelf: 'stretch'` fills the cross axis (width).
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.figmaCardSurface, // gradient base + web fallback
    borderRadius: theme.borderRadius.figmaTile, // 12 — Figma border-radius/xl
    overflow: 'hidden',
  },
  // Mirrors HomeScreen `pinBadge` geometry so the badge does not jump when the
  // real tile (with its interactive pin) swaps in on load complete.
  pin: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.m, // 8 — Figma border-radius/md
    backgroundColor: theme.colors.figmaOverlayLight30,
    alignItems: 'center',
    justifyContent: 'center',
    // Figma 3399:18455 drop-shadow: 4/4, blur 5.3, #070707 @ 5%.
    shadowColor: 'rgba(7, 7, 7, 0.05)',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 5.3,
    elevation: 3,
  },
});

export default ShimmerSlot;
