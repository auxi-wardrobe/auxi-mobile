/**
 * MacgieLogo — the animated Macgie brand mark (Figma node 2849:8332, component
 * "Macgie Animate 2"). On mount it fades + scales in, then settles into a
 * gentle breathing idle (subtle sway + bob).
 *
 * Unlike MacgieLoader this is a *logo*, not a loading state: it carries image
 * accessibility semantics ("Macgie"), never a busy/Loading announcement. Built
 * on built-in `Animated` + `react-native-svg`; honors OS Reduce Motion (static).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { MacgieFace } from './MacgieFace';
import { motion, useReducedMotion } from '../../theme/motion';

// Idle is lighter than the loader — a logo should breathe, not perform.
const SWAY_MAX_DEG = 3;
const BOB_PX_RATIO = 0.05;
const SWAY_HALF_MS = 1100;
const BOB_HALF_MS = 1300; // independent period → organic, non-mechanical drift
const ENTRANCE_FROM_SCALE = 0.86;

export interface MacgieLogoProps {
  /** Rendered height in px (width derives from the mascot aspect ratio). */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const MacgieLogo: React.FC<MacgieLogoProps> = ({
  size = 120,
  style,
  testID = 'macgie-logo',
}) => {
  const reduced = useReducedMotion();
  const appear = useRef(new Animated.Value(0)).current; // 0 → 1 entrance
  const sway = useRef(new Animated.Value(0)).current; // -1 ↔ 1
  const bob = useRef(new Animated.Value(0)).current; // 0 ↔ 1
  const bobPx = Math.round(size * BOB_PX_RATIO);

  useEffect(() => {
    if (reduced) {
      // Reduce Motion: appear fully present, no entrance or idle loops.
      appear.setValue(1);
      sway.setValue(0);
      bob.setValue(0);
      return;
    }

    appear.setValue(0);
    sway.setValue(0);
    bob.setValue(0);

    const breathe = (driver: Animated.Value, half: number, to: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(driver, {
            toValue: to,
            duration: half,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(driver, {
            toValue: to === 1 ? -1 : 0,
            duration: half,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const entrance = Animated.timing(appear, {
      toValue: 1,
      duration: motion.duration.reveal,
      easing: motion.easing.enter,
      useNativeDriver: true,
    });
    const swayLoop = breathe(sway, SWAY_HALF_MS, 1);
    const bobLoop = breathe(bob, BOB_HALF_MS, 1);

    entrance.start();
    swayLoop.start();
    bobLoop.start();
    return () => {
      entrance.stop();
      swayLoop.stop();
      bobLoop.stop();
    };
  }, [reduced, appear, sway, bob]);

  const entranceScale = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [ENTRANCE_FROM_SCALE, 1],
  });
  const rotate = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [`-${SWAY_MAX_DEG}deg`, `${SWAY_MAX_DEG}deg`],
  });
  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -bobPx],
  });

  // Hoisted (not inline literals) so react-native/no-inline-styles stays happy.
  const entranceStyle = {
    opacity: appear,
    transform: [{ scale: entranceScale }],
  };
  const idleStyle = {
    transform: [{ translateY }, { rotate }],
    transformOrigin: '50% 60%' as const,
  };

  return (
    <View
      style={style}
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Macgie"
    >
      <Animated.View style={entranceStyle}>
        <Animated.View style={idleStyle}>
          <MacgieFace size={size} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default MacgieLogo;
