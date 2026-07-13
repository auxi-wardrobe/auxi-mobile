/**
 * GradientPillButton — a full-width, pill-shaped CTA painted with the Macgie+
 * brand gradient (see `brandGradient.ts`). Used for the Settings "Upgrade to
 * Macgie+" entry pill and the Upgrade paywall's "Subscribe" CTA.
 *
 * The gradient is drawn with react-native-svg (the repo has no
 * react-native-linear-gradient — svg is the established gradient primitive,
 * see MacgieNod/AuthLayout), laid absolutely behind a Row of label + optional
 * trailing icon. Press-scale + reduce-motion come from the shared PressScale.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { PressScale } from '../design-system/MMotion';
import { color } from '../design-system/m-tokens';
import { theme } from '../../theme/theme';
import {
  MACGIE_GRADIENT_OFFSETS,
  MACGIE_GRADIENT_STOPS,
} from './brandGradient';

const GRAD_ID = 'macgie-pill-gradient';

export interface GradientPillButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  /** Trailing icon (e.g. the Subscribe chevron), tinted white to match label. */
  rightIcon?: React.FC<{ width?: number; height?: number; color?: string }>;
  /** Leading node rendered before the label (e.g. the Macgie+ wordmark). */
  leading?: React.ReactNode;
}

export const GradientPillButton: React.FC<GradientPillButtonProps> = ({
  children,
  onPress,
  disabled,
  testID,
  accessibilityLabel,
  rightIcon: RightIcon,
  leading,
}) => {
  const label = typeof children === 'string' ? children : accessibilityLabel;
  return (
    <PressScale
      testID={testID}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.pill, disabled && styles.disabled]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${GRAD_ID})`}
          />
        </Svg>
      </View>
      <View style={styles.inner}>
        {leading}
        {typeof children === 'string' ? (
          <Text style={styles.label}>{children}</Text>
        ) : (
          children
        )}
        {RightIcon && <RightIcon width={20} height={20} color={color.white} />}
      </View>
    </PressScale>
  );
};

const styles = StyleSheet.create({
  pill: {
    height: 56,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minWidth: 96,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 18,
    color: color.white,
  },
  disabled: { opacity: 0.5 },
});
