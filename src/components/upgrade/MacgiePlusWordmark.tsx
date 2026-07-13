/**
 * MacgiePlusWordmark — the "Macgie+" brand wordmark painted with the Macgie+
 * gradient (see `brandGradient.ts`). Rendered as SVG <Text> so the gradient
 * clips to the glyphs (RN has no gradient-fill Text and no masked-view dep).
 *
 * Bundled Poppins-Bold is used as the SVG font family. Width is derived from
 * the font size (generous, overflow visible) so the glyphs never clip.
 */
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import {
  MACGIE_GRADIENT_OFFSETS,
  MACGIE_GRADIENT_STOPS,
} from './brandGradient';

const GRAD_ID = 'macgie-wordmark-gradient';
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
  return (
    <Svg
      width={width}
      height={height}
      testID={testID}
      accessibilityLabel="Macgie plus"
    >
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
      <SvgText
        x="0"
        y={fontSize}
        fill={`url(#${GRAD_ID})`}
        fontFamily="Poppins-Bold"
        fontSize={fontSize}
        fontWeight="bold"
      >
        {TEXT}
      </SvgText>
    </Svg>
  );
};
