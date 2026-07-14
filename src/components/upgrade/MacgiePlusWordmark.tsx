/**
 * MacgiePlusWordmark — the "Macgie+" brand wordmark painted with the Macgie+
 * gradient (see `brandGradient.ts`). Rendered as SVG <Text> so the gradient
 * clips to the glyphs (RN has no gradient-fill Text and no masked-view dep).
 *
 * Bundled Poppins-SemiBold is used as the SVG font family. Width is derived
 * from the font size (generous, overflow visible) so the glyphs never clip.
 */
import React, { useId } from 'react';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import {
  MACGIE_GRADIENT_OFFSETS,
  MACGIE_GRADIENT_STOPS,
} from './brandGradient';

const TEXT = 'Macgie+';

export interface MacgiePlusWordmarkProps {
  /** Glyph height in px. Width derives from this. */
  fontSize?: number;
  testID?: string;
}

export const MacgiePlusWordmark: React.FC<MacgiePlusWordmarkProps> = ({
  fontSize = 28,
  testID = 'macgie-plus-wordmark',
}) => {
  // Poppins-Bold "Macgie+" runs ~0.62em per glyph; pad generously so it never
  // clips at any font size.
  const width = Math.ceil(fontSize * TEXT.length * 0.66);
  const height = Math.ceil(fontSize * 1.32);
  // Unique id per instance + userSpaceOnUse span so the gradient fills the
  // glyphs identically on native and the react-native-web build (a shared id or
  // objectBoundingBox on <Text> can drop the fill on web).
  const gradId = `mg-wordmark-${useId().replace(/:/g, '')}`;
  return (
    <Svg
      width={width}
      height={height}
      testID={testID}
      accessibilityLabel="Macgie plus"
    >
      <Defs>
        <LinearGradient
          id={gradId}
          x1="0"
          y1="0"
          x2={width}
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
      <SvgText
        x="0"
        y={fontSize}
        fill={`url(#${gradId})`}
        fontFamily="Poppins-SemiBold"
        fontSize={fontSize}
        fontWeight="600"
      >
        {TEXT}
      </SvgText>
    </Svg>
  );
};
