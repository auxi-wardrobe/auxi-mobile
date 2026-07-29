/**
 * SpinnerIcon — the rotating `Icons.Loading` glyph used by the staggered
 * loading screens (see-on-me "Loading step 3" / "loading to see result",
 * Enhance Image "Loading step 6"): the row currently in progress spins while
 * completed rows swap to a green check.
 *
 * One revolution per second, linear — the loop is skipped entirely under the
 * OS "Reduce Motion" setting (the glyph still renders, it just doesn't turn).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { useReducedMotion } from '../../theme/motion';

const SPIN_MS = 1000;

export interface SpinnerIconProps {
  /** Glyph size in px (square). Defaults to the 24px loading-row icon. */
  size?: number;
  color?: string;
  testID?: string;
}

export const SpinnerIcon: React.FC<SpinnerIconProps> = ({
  size = 24,
  color = theme.colors.uacTextSubtle200,
  testID,
}) => {
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  // Hoisted so the Animated transform isn't an inline-style literal
  // (react-native/no-inline-styles); it must stay a dynamic value.
  const spinStyle = { transform: [{ rotate }] };

  return (
    <Animated.View style={spinStyle} testID={testID}>
      <Icons.Loading width={size} height={size} color={color} />
    </Animated.View>
  );
};

export default SpinnerIcon;
