import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { motion, useReducedMotion } from '../theme/motion';

type BackgroundScaleContextValue = {
  /** Call when a contextual sheet opens. Ref-counted. */
  pushSheet: () => void;
  /** Call when a contextual sheet closes. Ref-counted. */
  popSheet: () => void;
};

const BackgroundScaleContext = createContext<BackgroundScaleContextValue>({
  pushSheet: () => {},
  popSheet: () => {},
});

export const useBackgroundScale = () => useContext(BackgroundScaleContext);

/**
 * Macgie Motion 1.1 — "04. Contextual Bottom Sheet Reveal" background
 * de-emphasis. While a contextual bottom sheet is open the page behind it
 * scales to `motion.scale.background` (0.96) and lifts `-motion.distance.sm`
 * (-8px), so focus shifts to the sheet without a full-screen replacement.
 *
 * The sheets keep using a transparent RN `Modal` (which renders the scaled
 * app content behind its backdrop), so no Modal -> overlay rewrite is needed.
 * Ref-counted: stacked sheets only restore the page once all are dismissed.
 * Honours OS "Reduce Motion" (no scale).
 */
export const BackgroundScaleProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const reduced = useReducedMotion();
  const driver = useRef(new Animated.Value(0)).current;
  const countRef = useRef(0);

  const animateTo = useCallback(
    (to: number) => {
      Animated.timing(driver, {
        toValue: to,
        duration: motion.duration.medium,
        easing: motion.easing.standard,
        useNativeDriver: true,
      }).start();
    },
    [driver],
  );

  const pushSheet = useCallback(() => {
    countRef.current += 1;
    if (!reduced && countRef.current === 1) {
      animateTo(1);
    }
  }, [animateTo, reduced]);

  const popSheet = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (!reduced && countRef.current === 0) {
      animateTo(0);
    }
  }, [animateTo, reduced]);

  const value = useMemo(
    () => ({ pushSheet, popSheet }),
    [pushSheet, popSheet],
  );

  const animatedStyle = {
    transform: [
      {
        scale: driver.interpolate({
          inputRange: [0, 1],
          outputRange: [1, motion.scale.background],
        }),
      },
      {
        translateY: driver.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -motion.distance.sm],
        }),
      },
    ],
  };

  return (
    <BackgroundScaleContext.Provider value={value}>
      <View style={styles.root}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </View>
    </BackgroundScaleContext.Provider>
  );
};

const styles = StyleSheet.create({
  // Dark frame revealed as the page shrinks — reads as background de-emphasis.
  root: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1 },
});
