/**
 * MacgieLoader — the app's shared loading state. Wraps the Macgie mascot in an
 * idle "alive" loop that mirrors the source loader
 * (https://above-primer-31308996.figma.site/):
 *   - sway: head rotates ±4° about a low pivot, dwelling at each extreme
 *   - bob:  gentle vertical bob on an independent (slightly slower) period, so
 *           the two rhythms drift and never look mechanical
 *   - look: pupils drift toward the tilt, in phase with the sway
 *
 * Motion values come from the Macgie Motion System (src/theme/motion.ts) and
 * the loops are paused entirely under the OS "Reduce Motion" setting.
 *
 * Variants:
 *   - fullScreen: centred, fills its parent, label beneath (default)
 *   - inline:     compact row (small face + label) for footers/sections
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MacgieFace } from './MacgieFace';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';

// Sway/look rhythm: long dwell at each extreme, quick turn between them.
const SWAY_HOLD_MS = 800;
const SWAY_TURN_MS = motion.duration.slow; // 500
// Bob rhythm: independent period so it drifts against the sway.
const BOB_HALF_MS = 1500;
const SWAY_MAX_DEG = 4;

export interface MacgieLoaderProps {
  /** Optional caption shown with the mascot. */
  label?: string;
  variant?: 'fullScreen' | 'inline';
  /** Override the mascot height (px). Defaults by variant. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const MacgieLoader: React.FC<MacgieLoaderProps> = ({
  label,
  variant = 'fullScreen',
  size,
  style,
  testID = 'macgie-loader',
}) => {
  const reduced = useReducedMotion();
  const faceSize = size ?? (variant === 'inline' ? 28 : 112);
  const bobPx = Math.round(faceSize * 0.09);

  // -1 = tilt/look left, +1 = right. bob: 0 = rest, 1 = top of bob.
  const sway = useRef(new Animated.Value(-1)).current;
  const look = useRef(new Animated.Value(-1)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      // Park everything at rest; no loops under Reduce Motion.
      sway.setValue(0);
      look.setValue(0);
      bob.setValue(0);
      return;
    }

    sway.setValue(-1);
    look.setValue(-1);
    bob.setValue(0);

    const swayStep = (driver: Animated.Value, useNative: boolean) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(SWAY_HOLD_MS),
          Animated.timing(driver, {
            toValue: 1,
            duration: SWAY_TURN_MS,
            easing: motion.easing.standard,
            useNativeDriver: useNative,
          }),
          Animated.delay(SWAY_HOLD_MS),
          Animated.timing(driver, {
            toValue: -1,
            duration: SWAY_TURN_MS,
            easing: motion.easing.standard,
            useNativeDriver: useNative,
          }),
        ]),
      );

    // sway drives a transform (native driver); look drives an SVG prop (JS
    // driver). Same sequence shape + shared start → they stay in phase.
    const swayLoop = swayStep(sway, true);
    const lookLoop = swayStep(look, false);
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: BOB_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: BOB_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    swayLoop.start();
    lookLoop.start();
    bobLoop.start();
    return () => {
      swayLoop.stop();
      lookLoop.stop();
      bobLoop.stop();
    };
  }, [reduced, sway, look, bob]);

  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [`-${SWAY_MAX_DEG}deg`, `${SWAY_MAX_DEG}deg`],
  });
  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -bobPx],
  });
  // Hoisted to a variable so the Animated transform isn't an inline-style
  // literal (react-native/no-inline-styles); the transform must stay dynamic.
  const faceTransformStyle = {
    transform: [{ translateY }, { rotate }],
    transformOrigin: '50% 60%' as const,
  };

  const isInline = variant === 'inline';
  const containerStyle = useMemo(
    () => [isInline ? styles.inline : styles.fullScreen, style],
    [isInline, style],
  );

  return (
    <View
      style={containerStyle}
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? 'Loading'}
      accessibilityState={{ busy: true }}
    >
      <Animated.View style={faceTransformStyle}>
        <MacgieFace size={faceSize} look={reduced ? undefined : look} />
      </Animated.View>
      {label ? (
        <Text style={isInline ? styles.inlineLabel : styles.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
    gap: theme.spacing.m,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  label: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  inlineLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
  },
});

export default MacgieLoader;
