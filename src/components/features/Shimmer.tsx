/**
 * Shimmer — the shared "card is loading" primitive. A cream
 * (#f2efec / `figmaCardSurface`) highlight band sweeps left → right across a tan
 * (#e0d2c4 / `figmaInsightPillBg`) base, once per cycle, giving loading cards a
 * living "content about to appear" feel instead of a frozen box.
 *
 * It backs every card loading state in the app: `SkeletonTile` (which wraps it)
 * covers card images via `LoadableRemoteImage`, Home outfit tiles and the
 * body-shape picker; the wardrobe / database loading grids and the item-detail
 * text placeholders use it directly.
 *
 * Built on RN `Animated` + `react-native-svg` (no gradient/animation lib),
 * matching `ShimmerSlot` / `AuthLayout`. The sweep translates a `useNativeDriver`
 * transform, timing comes from `motion.ts`, and it holds a static base frame
 * under OS "Reduce Motion" (motion-rules §3.2).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';

// One full highlight pass per SWEEP_MS. reveal * 2 = 1400ms — the same calm
// cadence as ShimmerSlot's pulse, sourced from motion tokens (no hardcoded ms).
const SWEEP_MS = motion.duration.reveal * 2;
const BASE = theme.colors.figmaInsightPillBg; // #e0d2c4 — color/primary/200
const HIGHLIGHT = theme.colors.figmaCardSurface; // #f2efec — subtle_50

export interface ShimmerProps {
  /** Explicit width in px. Omit to let the shimmer fill/measure via layout. */
  width?: number;
  /** Explicit height in px. Omit to let the shimmer fill/measure via layout. */
  height?: number;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width,
  height,
  borderRadius = theme.borderRadius.figmaTile,
  style,
  testID = 'shimmer',
}) => {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [box, setBox] = useState<{ width: number; height: number }>({
    width: typeof width === 'number' ? width : 0,
    height: typeof height === 'number' ? height : 0,
  });

  // react-native-svg gradient ids are document-global on web; keep them
  // per-instance so stacked shimmers (a loading grid) never share/clobber one
  // ramp. Strip ':' — it's invalid inside an SVG url() reference.
  const rampId = `shimmer-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    if (reduced || box.width === 0) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SWEEP_MS,
        // Linear so the highlight travels at an even pace each cycle; the loop
        // restart is seamless because both ends sit fully off-frame.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [reduced, box.width, progress]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox(prev =>
      prev.width === w && prev.height === h ? prev : { width: w, height: h },
    );
  };

  const sizeStyle: ViewStyle = { borderRadius };
  if (typeof width === 'number') {
    sizeStyle.width = width;
  }
  if (typeof height === 'number') {
    sizeStyle.height = height;
  }

  // The band is one box-width wide and travels from a full width off the left
  // edge to a full width off the right, so the highlight sweeps cleanly through
  // the frame instead of resting mid-card.
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-box.width, box.width],
  });

  const animate = !reduced && box.width > 0 && box.height > 0;

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.base, sizeStyle, style]}
    >
      {animate ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
        >
          <Svg width={box.width} height={box.height}>
            <Defs>
              <LinearGradient id={rampId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={BASE} stopOpacity="1" />
                <Stop offset="0.5" stopColor={HIGHLIGHT} stopOpacity="1" />
                <Stop offset="1" stopColor={BASE} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={box.width}
              height={box.height}
              fill={`url(#${rampId})`}
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: BASE,
    overflow: 'hidden',
  },
});

export default Shimmer;
