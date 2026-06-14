/**
 * MacgieFace — the Macgie mascot (loading character) as a pure SVG.
 *
 * Geometry is lifted 1:1 from the source idle-loop loader
 * (https://above-primer-31308996.figma.site/): a black cat-head silhouette
 * with two tall, shaded-white eyes and small black pupils. viewBox is the
 * source's 75.2539 × 79.775.
 *
 * This component owns NO animation timing — it is a stateless renderer. The
 * only moving part it exposes is `look`: an Animated value in [-1, 1] that the
 * caller drives to drift the pupils toward the head's tilt. MacgieLoader owns
 * the loops; render this directly for a static mascot.
 */
import React, { useMemo } from 'react';
import { Animated } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { theme } from '../../theme/theme';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// Source viewBox + base pupil centres (viewBox units).
const VB_W = 75.2539;
const VB_H = 79.775;
const LEFT_PUPIL_CX = 36.4;
const RIGHT_PUPIL_CX = 64.5;
// How far the pupils drift at full look (±1). Subtle by design.
const PUPIL_SHIFT = 0.9;

const HEAD_PATH =
  'M0 14.1574C0 -2.09793 11.6167 -2.39268 18.9355 3.51872L33.0361 14.5871C37.9781 18.5786 45.1041 18.2744 51.6162 14.6691C52.2109 14.3399 52.7637 13.9396 53.2881 13.507L63.9131 4.74137C67.8141 1.67311 75.2537 4.09323 75.2539 11.0715V59.6886C75.2539 68.8386 70.7674 74.7546 63.458 75.4513L18.9355 79.6955C8.78202 80.6632 3.74105e-05 72.6763 0 62.4738V14.1574Z';

export interface MacgieFaceProps {
  /** Rendered height in px. Width is derived to keep the source aspect ratio. */
  size: number;
  /** Animated value in [-1, 1] driving pupil drift. Omit for a static gaze. */
  look?: Animated.Value;
}

export const MacgieFace: React.FC<MacgieFaceProps> = ({ size, look }) => {
  // Fallback so the pupils render at rest when no `look` driver is supplied.
  const staticLook = useMemo(() => new Animated.Value(0), []);
  const driver = look ?? staticLook;

  const leftPupilCx = driver.interpolate({
    inputRange: [-1, 1],
    outputRange: [LEFT_PUPIL_CX - PUPIL_SHIFT, LEFT_PUPIL_CX + PUPIL_SHIFT],
  });
  const rightPupilCx = driver.interpolate({
    inputRange: [-1, 1],
    outputRange: [RIGHT_PUPIL_CX - PUPIL_SHIFT, RIGHT_PUPIL_CX + PUPIL_SHIFT],
  });

  const width = Math.round(size * (VB_W / VB_H));

  return (
    <Svg
      width={width}
      height={size}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      fill="none"
    >
      <Defs>
        <LinearGradient
          id="macgieEyeLeft"
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
          id="macgieEyeRight"
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
      <Ellipse
        cx={33.06}
        cy={45.92}
        rx={8.02}
        ry={16.58}
        fill="url(#macgieEyeLeft)"
      />
      <AnimatedEllipse
        cx={leftPupilCx}
        cy={46.5}
        rx={2.2}
        ry={4.4}
        fill={theme.colors.macgiePupil}
      />

      {/* Right eye (white) + pupil */}
      <Ellipse
        cx={63.54}
        cy={44.6}
        rx={5}
        ry={13.5}
        fill="url(#macgieEyeRight)"
      />
      <AnimatedEllipse
        cx={rightPupilCx}
        cy={44.6}
        rx={1.6}
        ry={3.5}
        fill={theme.colors.macgiePupil}
      />
    </Svg>
  );
};

export default MacgieFace;
