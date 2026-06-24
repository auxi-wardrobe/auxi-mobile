/**
 * Design System — motion primitives (the explicit CEO ask, spec §C).
 *
 * Interactive, web-safe demos built on RN `Animated` (works on react-native-web)
 * + the canonical motion.ts tokens, all honoring `useReducedMotion()`.
 *
 *  - PressScale     : press → scale .96 spring (no shadow/opacity change)
 *  - DotsLoader     : 3-dot loader, delays 0/.16/.32, opacity .3→1 + scale .72→1
 *  - SpinLoader     : continuous 360° rotate (.8s linear) — toast spinner
 *  - useToggleValue : 0↔1 timing driver for switch/snackbar/tile transitions
 *
 * Reduce-motion fallback: animations collapse to their end state instantly.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { motion, useReducedMotion } from '../../theme/motion';
import { color } from './ds-tokens';

/** Wraps children; presses spring-scale to .96 (motion.scale.background). */
export const PressScale: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  testID: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button';
  style?: any;
}> = ({
  children,
  onPress,
  disabled,
  testID,
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
}) => {
  const reduce = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) => {
    if (reduce) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: v,
      stiffness: motion.spring.confident.stiffness,
      damping: motion.spring.confident.damping,
      mass: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => to(motion.scale.background)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/** A single bouncing dot with a phase delay. */
const Dot: React.FC<{ delay: number; tint: string; reduce: boolean }> = ({
  delay,
  tint,
  reduce,
}) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 400,
          easing: motion.easing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 600,
          easing: motion.easing.standard,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, reduce]);

  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: tint, opacity, transform: [{ scale }] },
      ]}
    />
  );
};

/** 3-dot loading indicator (auxiDot keyframes). */
export const DotsLoader: React.FC<{ tint?: string; testID?: string }> = ({
  tint = color.p50,
  testID,
}) => {
  const reduce = useReducedMotion();
  return (
    <View style={styles.dots} testID={testID}>
      <Dot delay={0} tint={tint} reduce={reduce} />
      <Dot delay={160} tint={tint} reduce={reduce} />
      <Dot delay={320} tint={tint} reduce={reduce} />
    </View>
  );
};

/** Continuous 360° spinner (atoastSpin — .8s linear). */
export const SpinLoader: React.FC<{
  size?: number;
  testID?: string;
}> = ({ size = 32, testID }) => {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  const rotate = v.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <Animated.View
      testID={testID}
      style={[
        styles.spin,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ rotate }],
        },
      ]}
    />
  );
};

/**
 * Drives a 0↔1 Animated.Value with `motion.duration.fast` timing. Used for
 * switch knob, snackbar/toast reveal, tile pin-status slide. Returns the value
 * + a setter that respects reduce-motion (jumps to end state).
 */
export const useToggleValue = (
  on: boolean,
  duration: number = motion.duration.fast,
) => {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(on ? 1 : 0);
      return;
    }
    Animated.timing(v, {
      toValue: on ? 1 : 0,
      duration,
      easing: motion.easing.standard,
      useNativeDriver: false,
    }).start();
  }, [on, v, reduce, duration]);
  return v;
};

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  spin: {
    borderWidth: 3,
    borderColor: 'rgba(242,239,236,0.25)',
    borderTopColor: color.p50,
  },
});
