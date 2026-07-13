/**
 * BrandGradientFill — an absolute-fill Macgie+ brand gradient (see
 * `brandGradient.ts`), drawn with react-native-svg. Drop it as the first child
 * of any `overflow: 'hidden'` container to paint that surface with the brand
 * ramp: the "Upgrade to Macgie+" / Subscribe pills and the "Best value" badge
 * all share this one definition so they stay pixel-identical.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  MACGIE_GRADIENT_OFFSETS,
  MACGIE_GRADIENT_STOPS,
} from './brandGradient';

// react-native-svg scopes <Defs> ids per <Svg>, so reusing this id across many
// instances is safe (each Svg carries its own gradient).
const GRAD_ID = 'macgie-gradient-fill';

export const BrandGradientFill: React.FC<{ testID?: string }> = ({ testID }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none" testID={testID}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="0">
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
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${GRAD_ID})`} />
    </Svg>
  </View>
);
