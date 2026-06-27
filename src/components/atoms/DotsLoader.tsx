import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { motion, useReducedMotion } from '../../theme/motion';
import { theme } from '../../theme/theme';

// Three-dot "typing/loading" indicator (recreates the LottieFiles dots loader
// natively, so it needs no Lottie runtime and renders on web + native alike).
// Each dot pulses opacity + scale on a shared period, staggered so the highlight
// travels left→right. Reference motion tokens — never hardcode timings here.

interface DotsLoaderProps {
  // Dot fill. Default reads on light surfaces; pass a light tone on dark fills.
  color?: string;
  // Dot diameter (px).
  size?: number;
  // Space between dots (px).
  gap?: number;
  // How many dots. Treated as static — the dot drivers are sized once at mount
  // (see `progress`), so a runtime change won't resize the array. Fine for the
  // fixed loaders we ship; make `progress` derive from `count` if it ever varies.
  count?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  // Spoken by screen readers for this indeterminate progress indicator (e.g.
  // "Adding…"). Without it the progressbar role announces with no context.
  accessibilityLabel?: string;
}

// One up-then-down pulse per dot; the stagger offset is a fraction of this so
// the wave reads as continuous. Uses the shared motion duration token.
const PULSE_MS = motion.duration.normal;

export const DotsLoader: React.FC<DotsLoaderProps> = ({
  color = theme.ds.color.black,
  size = 8,
  gap = theme.spacing.xs,
  count = 3,
  style,
  testID,
  accessibilityLabel,
}) => {
  const reduced = useReducedMotion();
  // One driver per dot, created once and kept stable across renders.
  const progress = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Reduced motion: hold the dots at a calm mid-opacity, no looping.
    if (reduced) {
      progress.forEach(p => p.setValue(0.5));
      return;
    }
    const stagger = PULSE_MS / count;
    const loops = progress.map((p, i) =>
      Animated.loop(
        Animated.sequence([
          // Lead-in so each dot starts a beat after the previous one…
          Animated.delay(i * stagger),
          Animated.timing(p, {
            toValue: 1,
            duration: PULSE_MS,
            easing: motion.easing.standard,
            useNativeDriver: true,
          }),
          Animated.timing(p, {
            toValue: 0,
            duration: PULSE_MS,
            easing: motion.easing.standard,
            useNativeDriver: true,
          }),
          // …and a matching tail so every dot shares one period.
          Animated.delay((count - 1 - i) * stagger),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [progress, count, reduced]);

  // Hoisted dynamic styles (size/color/gap are props, animated values must stay
  // dynamic) — kept out of JSX so react-native/no-inline-styles stays quiet.
  const rowStyle = useMemo<ViewStyle>(() => ({ gap }), [gap]);
  const dotShape = useMemo<ViewStyle>(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
    }),
    [size, color],
  );

  return (
    <View
      style={[styles.row, rowStyle, style]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      {progress.map((p, i) => {
        const animatedStyle = {
          opacity: p.interpolate({
            inputRange: [0, 1],
            outputRange: [motion.opacity.subtle, motion.opacity.visible],
          }),
          transform: [
            {
              // Decorative pulse amplitude. Hardcoded by exception: the
              // motion.scale token set (press/hover/select/emphasis) has no
              // decorative-pulse value, so there's no token to reference here.
              scale: p.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
            },
          ],
        };
        return (
          <Animated.View
            // Dots are positional and never reordered — index key is stable.
            key={i}
            style={[dotShape, animatedStyle]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
