import React, { useCallback, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { motion, useReducedMotion } from '../../theme/motion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PressableScaleProps extends TouchableOpacityProps {
  /** Scale to dip to on press-in. Defaults to `motion.scale.press` (0.97). */
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Press-feedback wrapper (design-review F2). Adds the house press
 * micro-interaction — dip to `motion.scale.press` on press-in, `spring.standard`
 * back to 1 on release — on top of the existing `TouchableOpacity` dim. Under OS
 * "Reduce Motion" the scale is a no-op (opacity dim still applies). Single helper
 * so tiles / chips / CTAs / sheet rows share one affordance (DRY).
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  pressScale = motion.scale.press,
  style,
  children,
  onPressIn,
  onPressOut,
  activeOpacity = 0.85,
  ...rest
}) => {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!reduced) {
        Animated.timing(scale, {
          toValue: pressScale,
          duration: motion.duration.instant,
          easing: motion.easing.standard,
          useNativeDriver: true,
        }).start();
      }
      onPressIn?.(e);
    },
    [reduced, scale, pressScale, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      if (!reduced) {
        Animated.spring(scale, {
          toValue: 1,
          stiffness: motion.spring.standard.stiffness,
          damping: motion.spring.standard.damping,
          mass: 1,
          useNativeDriver: true,
        }).start();
      }
      onPressOut?.(e);
    },
    [reduced, scale, onPressOut],
  );

  return (
    <AnimatedTouchable
      {...rest}
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedTouchable>
  );
};
