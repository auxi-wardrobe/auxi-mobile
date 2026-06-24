/**
 * MacgieNod — the Macgie mascot performing the "nod sequence" idle loop
 * (glance left → glance right → hop + squash/stretch + nod with an eye squint,
 * then settle and repeat on a ~3.4s cycle).
 *
 * The geometry is the same mascot as `MacgieFace` (black cat-head silhouette,
 * two shaded-white eyes, small black pupils); this variant owns a richer
 * keyframe timeline than `MacgieLogo`'s gentle breathing, so it renders its own
 * SVG with animated eyes rather than reusing `MacgieFace` (whose only animated
 * part is pupil drift).
 *
 * The motion is a 1:1 port of a source SMIL `<animateTransform>` timeline. As in
 * `MacgieLoader`, transforms (bounce/squash/rotate) run on the native driver
 * while SVG-prop animations (eye squint via `ry`, glance via `cx`) run on the JS
 * driver; both drivers share one linear 0→1 loop so the timelines stay in phase.
 * The cycle's end state equals its start state, so the loop's 1→0 reset is
 * seamless. OS "Reduce Motion" parks the mascot at rest.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { theme } from '../../theme/theme';
import { useReducedMotion } from '../../theme/motion';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Source mascot viewBox + geometry (lifted 1:1 from MacgieFace / the source SVG).
const VB_W = 75.2539;
const VB_H = 79.775;
const SRC_CANVAS_H = 148; // the source art's canvas height — bounce units scale by it
const HEAD_PATH =
  'M0 14.1574C0 -2.09793 11.6167 -2.39268 18.9355 3.51872L33.0361 14.5871C37.9781 18.5786 45.1041 18.2744 51.6162 14.6691C52.2109 14.3399 52.7637 13.9396 53.2881 13.507L63.9131 4.74137C67.8141 1.67311 75.2537 4.09323 75.2539 11.0715V59.6886C75.2539 68.8386 70.7674 74.7546 63.458 75.4513L18.9355 79.6955C8.78202 80.6632 3.74105e-05 72.6763 0 62.4738V14.1574Z';

// Eye / pupil base geometry (viewBox units).
const L_EYE = { cx: 33.06, cy: 45.92, rx: 8.02, ry: 16.58 };
const R_EYE = { cx: 63.54, cy: 44.6, rx: 5, ry: 13.5 };
const L_PUPIL = { cx: 36.4, cy: 46.5, r: 2.8 };
const R_PUPIL = { cx: 64.5, cy: 44.6, r: 2 };

// ── Source SMIL timeline (one ~3.4s linear cycle) ──────────────────────────
const DUR_MS = 3400;

// keyTimes for the body bounce/squash track.
const KT_BODY = [0, 0.3, 0.379, 0.438, 0.521, 0.585, 0.656, 0.721, 1];
const BODY_TRANSLATE_Y = [0, 0, 0, -5, -10, 4, -4, 0, 0]; // source-canvas units
const BODY_SCALE_X = [1, 1, 1, 0.99, 0.97, 1.03, 0.99, 1, 1];
const BODY_SCALE_Y = [1, 1, 1, 1.015, 1.03, 0.96, 1.015, 1, 1];

// keyTimes for the head/eye track (glance → nod → settle).
const KT_HEAD = [
  0, 0.062, 0.176, 0.238, 0.353, 0.382, 0.521, 0.585, 0.656, 0.721, 1,
];
const HEAD_ROTATE_DEG = [0, -5, -5, 5, 5, 0, 0, 14, 0, 0, 0];
// Eye whites shift with the glance; pupils shift further (eye + pupil summed).
const L_EYE_SHIFT = [0, -3, -3, 3, 3, 0, 0, 0, 0, 0, 0];
const L_PUPIL_SHIFT = [0, -8, -8, 8, 8, 0, 0, 0, 0, 0, 0];
const R_EYE_SHIFT = [0, -2, -2, 2, 2, 0, 0, 0, 0, 0, 0];
const R_PUPIL_SHIFT = [0, -5, -5, 5, 5, 0, 0, 0, 0, 0, 0];
// Eye-height multiplier: tiny widen on anticipation, hard squint on the nod.
const EYE_SQUINT = [1, 1, 1, 1, 1, 1.1, 1.1, 0.28, 1, 1, 1];

export interface MacgieNodProps {
  /** Rendered height in px (width derives from the mascot aspect ratio). */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const MacgieNod: React.FC<MacgieNodProps> = ({
  size = 120,
  style,
  testID = 'macgie-nod',
}) => {
  const reduced = useReducedMotion();
  // Two drivers running the same 0→1 cycle: native for view transforms, JS for
  // the SVG ellipse/circle props (which the native driver can't animate).
  const tNative = useRef(new Animated.Value(0)).current;
  const tJs = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      tNative.setValue(0);
      tJs.setValue(0);
      return;
    }
    tNative.setValue(0);
    tJs.setValue(0);
    const cycle = (driver: Animated.Value, useNative: boolean) =>
      Animated.loop(
        Animated.timing(driver, {
          toValue: 1,
          duration: DUR_MS,
          easing: Easing.linear, // SMIL default calcMode — linear between keys
          useNativeDriver: useNative,
        }),
      );
    const nativeLoop = cycle(tNative, true);
    const jsLoop = cycle(tJs, false);
    nativeLoop.start();
    jsLoop.start();
    return () => {
      nativeLoop.stop();
      jsLoop.stop();
    };
  }, [reduced, tNative, tJs]);

  const width = Math.round(size * (VB_W / VB_H));
  const bounceScale = size / SRC_CANVAS_H;

  // ── View-transform tracks (native driver) ────────────────────────────────
  const translateY = tNative.interpolate({
    inputRange: KT_BODY,
    outputRange: BODY_TRANSLATE_Y.map(v => v * bounceScale),
  });
  const scaleX = tNative.interpolate({
    inputRange: KT_BODY,
    outputRange: BODY_SCALE_X,
  });
  const scaleY = tNative.interpolate({
    inputRange: KT_BODY,
    outputRange: BODY_SCALE_Y,
  });
  const rotate = tNative.interpolate({
    inputRange: KT_HEAD,
    outputRange: HEAD_ROTATE_DEG.map(d => `${d}deg`),
  });

  // ── SVG-prop tracks (JS driver) ──────────────────────────────────────────
  const lEyeCx = tJs.interpolate({
    inputRange: KT_HEAD,
    outputRange: L_EYE_SHIFT.map(s => L_EYE.cx + s),
  });
  const lPupilCx = tJs.interpolate({
    inputRange: KT_HEAD,
    outputRange: L_PUPIL_SHIFT.map(s => L_PUPIL.cx + s),
  });
  const rEyeCx = tJs.interpolate({
    inputRange: KT_HEAD,
    outputRange: R_EYE_SHIFT.map(s => R_EYE.cx + s),
  });
  const rPupilCx = tJs.interpolate({
    inputRange: KT_HEAD,
    outputRange: R_PUPIL_SHIFT.map(s => R_PUPIL.cx + s),
  });
  const lEyeRy = tJs.interpolate({
    inputRange: KT_HEAD,
    outputRange: EYE_SQUINT.map(m => L_EYE.ry * m),
  });
  const rEyeRy = tJs.interpolate({
    inputRange: KT_HEAD,
    outputRange: EYE_SQUINT.map(m => R_EYE.ry * m),
  });

  // Hoisted so the Animated transforms aren't inline-style literals
  // (react-native/no-inline-styles); the transforms must stay dynamic.
  const bodyStyle = {
    transform: [{ translateY }, { scaleX }, { scaleY }],
    transformOrigin: '50% 100%' as const, // squash/stretch from the feet
  };
  const headStyle = {
    transform: [{ rotate }],
    transformOrigin: '50% 75%' as const, // nod/glance pivots low on the head
  };

  return (
    <View
      style={style}
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Macgie"
    >
      <Animated.View style={bodyStyle}>
        <Animated.View style={headStyle}>
          <Svg width={width} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`} fill="none">
            <Defs>
              <LinearGradient
                id="macgieNodEyeLeft"
                gradientUnits="userSpaceOnUse"
                x1={41.0487}
                y1={36.0579}
                x2={23.9328}
                y2={53.1669}
              >
                <Stop stopColor={theme.colors.macgieEyeLight} />
                <Stop offset={1} stopColor={theme.colors.macgieEyeWhite} />
              </LinearGradient>
              <LinearGradient
                id="macgieNodEyeRight"
                gradientUnits="userSpaceOnUse"
                x1={68.071}
                y1={38.7811}
                x2={60.4373}
                y2={50.9894}
              >
                <Stop stopColor={theme.colors.macgieEyeLight} />
                <Stop offset={1} stopColor={theme.colors.macgieEyeWhite} />
              </LinearGradient>
            </Defs>

            <Path d={HEAD_PATH} fill={theme.colors.macgieBody} />

            {/* Left eye (white) + pupil */}
            <AnimatedEllipse
              cx={lEyeCx}
              cy={L_EYE.cy}
              rx={L_EYE.rx}
              ry={lEyeRy}
              fill="url(#macgieNodEyeLeft)"
            />
            <AnimatedCircle
              cx={lPupilCx}
              cy={L_PUPIL.cy}
              r={L_PUPIL.r}
              fill={theme.colors.macgiePupil}
            />

            {/* Right eye (white) + pupil */}
            <AnimatedEllipse
              cx={rEyeCx}
              cy={R_EYE.cy}
              rx={R_EYE.rx}
              ry={rEyeRy}
              fill="url(#macgieNodEyeRight)"
            />
            <AnimatedCircle
              cx={rPupilCx}
              cy={R_PUPIL.cy}
              r={R_PUPIL.r}
              fill={theme.colors.macgiePupil}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default MacgieNod;
