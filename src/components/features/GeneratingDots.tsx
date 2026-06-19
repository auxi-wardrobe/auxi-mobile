/**
 * AU-364 — animated 3-dot "loading" glyph for the Home-loading "Generating"
 * pill (Figma Icons name="loading" size=M, node 3914:28293 — three dots in a
 * 24px box, the only "alive" signal in the calm skeleton design).
 *
 * The dots breathe in a staggered wave: opacity `subtle ↔ visible`, each dot
 * offset by `motion.stagger.normal` (80ms). All timings/easing come from
 * `motion.ts` (no hardcoded literal — motion-rules §5). Under OS "Reduce
 * Motion" the dots hold steady at full opacity (no loop).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { motion, useReducedMotion } from '../../theme/motion';
import { theme } from '../../theme/theme';

const DOT_COUNT = 3;
const DOT_SIZE = 4; // Figma glyph: three 4px dots in a 16px-wide row
const DOT_GAP = 2;
const CYCLE_MS = motion.duration.slow; // 500ms per fade leg

export interface GeneratingDotsProps {
  /** Box size (Figma "loading" icon = 24). */
  size?: number;
  testID?: string;
}

export const GeneratingDots: React.FC<GeneratingDotsProps> = ({
  size = 24,
  testID = 'home-loading-generating-dots',
}) => {
  const reduced = useReducedMotion();
  const dots = useRef(
    Array.from(
      { length: DOT_COUNT },
      () => new Animated.Value(motion.opacity.subtle),
    ),
  ).current;

  useEffect(() => {
    if (reduced) {
      dots.forEach(d => d.setValue(motion.opacity.visible));
      return;
    }
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * motion.stagger.normal),
          Animated.timing(dot, {
            toValue: motion.opacity.visible,
            duration: CYCLE_MS,
            easing: motion.easing.standard,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: motion.opacity.subtle,
            duration: CYCLE_MS,
            easing: motion.easing.standard,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => {
      loops.forEach(l => l.stop());
    };
  }, [reduced, dots]);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Generating"
      style={[styles.box, { width: size, height: size }]}
    >
      {dots.map((dot, i) => (
        <Animated.View
          key={`gen-dot-${i}`}
          style={[styles.dot, { opacity: dot }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: theme.colors.figmaTextDark, // #070707 — icon/primary/bold_700
  },
});

export default GeneratingDots;
