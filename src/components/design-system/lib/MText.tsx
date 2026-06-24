/**
 * MText — self-contained typography primitive.
 *
 * Import + render, nothing else:
 *   import { MText } from '../components/design-system/lib';
 *   <MText variant="h2" color="ink2">Style direction</MText>
 *
 * It WRAPS the m-tokens type scale (`type.*`) + semantic colors (`role`/`color`)
 * so consumers stop pairing `import {Text} from 'react-native'` with a manual
 * `import {type} from m-tokens` and hand-applied color. Tokens stay the source —
 * MText only consumes them. Plain RN <Text> under the hood; all other TextProps
 * (onPress, accessibilityLabel, testID, allowFontScaling, style…) pass through,
 * and a caller `style` is merged LAST so it can tweak anything.
 */
import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { color, FONT, role, type } from '../m-tokens';

export type MTextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'overline';

export type MTextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

// Semantic color roles MText understands. Drawn from m-tokens `role` (the text
// roles) plus a few `color` ramp keys useful for inline emphasis/feedback. Keep
// this curated — it is the typography color contract, not the full ramp.
const COLOR_BY_ROLE = {
  ink: role.ink,
  ink2: role.ink2,
  ink3: role.ink3,
  surface: role.surface,
  onDark: color.white,
  danger: color.da400,
  success: color.su400,
  warning: color.wa400,
  info: color.in400,
} as const;

export type MTextColor = keyof typeof COLOR_BY_ROLE;

const WEIGHT_FACE: Record<MTextWeight, string> = {
  regular: FONT.regular,
  medium: FONT.medium,
  semibold: FONT.semibold,
  bold: FONT.bold,
};

export interface MTextProps extends TextProps {
  variant?: MTextVariant;
  /** Semantic color role (default 'ink'). */
  color?: MTextColor;
  /** Override the variant's font weight (Poppins faces). */
  weight?: MTextWeight;
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

export const MText: React.FC<MTextProps> = ({
  variant = 'body',
  color: colorRole = 'ink',
  weight,
  align,
  style,
  // App convention: text scales with the OS setting unless a caller opts out.
  allowFontScaling = true,
  children,
  ...rest
}) => {
  const variantStyle = type[variant];
  const resolved: TextStyle = {
    ...variantStyle,
    color: COLOR_BY_ROLE[colorRole],
    ...(weight ? { fontFamily: WEIGHT_FACE[weight] } : null),
    ...(align ? { textAlign: align } : null),
  };

  return (
    <Text
      allowFontScaling={allowFontScaling}
      // caller `style` last so it can override anything (color, size, etc.)
      style={[styles.base, resolved, style]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  // Reset so platform Text defaults (e.g. Android padding) don't drift specimens.
  base: { includeFontPadding: false, padding: 0, margin: 0 },
});
