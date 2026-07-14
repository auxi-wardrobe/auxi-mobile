/**
 * BrandGradientFill — an absolute-fill Macgie+ brand gradient (see
 * `brandGradient.ts`), drawn with react-native-svg. Drop it as the first child
 * of any `overflow: 'hidden'` container to paint that surface with the brand
 * ramp: the "Upgrade to Macgie+" / Subscribe pills and the "Best value" badge
 * all share this one definition so they stay pixel-identical.
 *
 * Cross-platform robustness (this must render identically on native AND on the
 * react-native-web sandbox build):
 *   - `viewBox` + `preserveAspectRatio="none"` so the fill stretches to any
 *     pixel size WITHOUT relying on `width="100%"` (which can size to 0 on web).
 *   - `gradientUnits="userSpaceOnUse"` over the viewBox span (0→100) instead of
 *     the default objectBoundingBox.
 *   - a UNIQUE gradient id per instance (via useId). On the web DOM every
 *     `fill="url(#id)"` resolves to the FIRST element with that id, so a shared
 *     id across the pills + badge would make later instances reference a
 *     stale/detached gradient. Unique ids avoid that collision entirely.
 */
import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  MACGIE_GRADIENT_OFFSETS,
  MACGIE_GRADIENT_STOPS,
} from './brandGradient';

export const BrandGradientFill: React.FC<{ testID?: string }> = ({ testID }) => {
  // useId() can contain ':' which is awkward inside url(#…); strip it.
  const gradId = `mg-grad-${useId().replace(/:/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID={testID}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient
            id={gradId}
            x1="0"
            y1="0"
            x2="100"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            {MACGIE_GRADIENT_STOPS.map((stop, i) => (
              <Stop
                key={stop}
                offset={MACGIE_GRADIENT_OFFSETS[i]}
                stopColor={stop}
                stopOpacity="1"
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradId})`} />
      </Svg>
    </View>
  );
};
