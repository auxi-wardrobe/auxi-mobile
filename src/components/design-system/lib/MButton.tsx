/**
 * MButton / MIconButton — self-contained action primitives.
 *
 * Import + render, nothing else:
 *   import { MButton } from '../components/design-system/lib';
 *   <MButton variant="primary" onPress={save}>Save</MButton>
 *
 * Tokens + press-scale motion are encapsulated INSIDE. Honors reduce-motion via
 * PressScale. Minimal call works: `<MButton>Label</MButton>` (primary / lg).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../../assets/icons';
import { button, color, radius, role, FONT } from '../m-tokens';
import { DotsLoader, PressScale } from '../MMotion';

const IconPlus = Icons.Plus;

export type MButtonVariant =
  | 'primary'
  | 'secondary'
  | 'text'
  | 'danger'
  | 'dangerOutline';
export type MButtonSize = 'lg' | 'md' | 'sm';

const SIZE: Record<
  MButtonSize,
  { height: number; px: number; r: number; fs: number }
> = {
  // `lg` is the full-width sheet CTA — exact PR #138 geometry
  // (height 56, radius 16, paddingHorizontal 32, label Poppins-Medium 16/24).
  lg: { height: button.primaryHeight, px: button.px, r: button.radius, fs: 16 },
  md: { height: 44, px: 22, r: radius.xl, fs: 15 },
  sm: { height: 32, px: 14, r: radius.lg, fs: 13 },
};

export interface MButtonProps {
  children: React.ReactNode;
  variant?: MButtonVariant;
  size?: MButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.FC<{ width?: number; height?: number; color?: string }>;
  /** Trailing icon (rendered after the label), e.g. the AI sparkle. */
  rightIcon?: React.FC<{ width?: number; height?: number; color?: string }>;
  /** Override the icon tint. Defaults to the label colour (`fg`). */
  iconColor?: string;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const MButton: React.FC<MButtonProps> = ({
  children,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconColor,
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const sz = SIZE[size];
  const isOutline = variant === 'dangerOutline';
  const bg =
    variant === 'primary'
      ? role.ink
      : variant === 'danger'
      ? color.da400
      : 'transparent';
  const fg =
    variant === 'primary'
      ? role.primaryBtnLabel // color/primary/100 (#EFE9E3) — PR #138 truth
      : variant === 'danger'
      ? color.white
      : variant === 'dangerOutline'
      ? color.da400
      : variant === 'secondary'
      ? role.ink
      : variant === 'text'
      ? role.secondaryBtnLabel // color/primary/600 (#1C1A19) — "Skip for now"
      : role.ink;
  const borderColor = variant === 'dangerOutline' ? color.da400 : role.ink;
  const isSecondary = variant === 'secondary';
  const label = typeof children === 'string' ? children : accessibilityLabel;
  // Label face per PR #138: primary solid CTA = `interButton` (Inter-Medium,
  // tracking 0); the borderless `text` button = `archivoBody` (Inter-Regular,
  // tracking 0.15). Other variants keep the DS SemiBold treatment.
  const labelFont =
    variant === 'primary'
      ? { fontFamily: button.labelFont, letterSpacing: 0 }
      : variant === 'text'
      ? { fontFamily: FONT.regular, letterSpacing: 0.15 }
      : { fontFamily: FONT.semibold, letterSpacing: 0 };

  return (
    <PressScale
      testID={testID}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[
        styles.btn,
        {
          height: sz.height,
          paddingHorizontal: sz.px,
          borderRadius: sz.r,
          backgroundColor: bg,
        },
        (isOutline || isSecondary) && styles.outline,
        (isOutline || isSecondary) && { borderColor },
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <DotsLoader
          tint={fg}
          testID={testID ? `${testID}-loader` : undefined}
        />
      ) : (
        <View style={styles.inner}>
          {LeftIcon && (
            <LeftIcon width={18} height={18} color={iconColor ?? fg} />
          )}
          <Text style={[styles.label, labelFont, { color: fg, fontSize: sz.fs }]}>
            {children}
          </Text>
          {RightIcon && (
            <RightIcon width={18} height={18} color={iconColor ?? fg} />
          )}
        </View>
      )}
    </PressScale>
  );
};

export interface MIconButtonProps {
  icon?: React.FC<{ width?: number; height?: number; color?: string }>;
  size?: MButtonSize;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const MIconButton: React.FC<MIconButtonProps> = ({
  icon: Icon = IconPlus,
  size = 'md',
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const dim = size === 'lg' ? 56 : size === 'sm' ? 32 : 44;
  const r =
    size === 'lg' ? radius['2xl'] : size === 'sm' ? radius.lg : radius.xl;
  return (
    <PressScale
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.iconBtn,
        { width: dim, height: dim, borderRadius: r },
      ]}
    >
      <Icon width={20} height={20} color={role.ink} />
    </PressScale>
  );
};

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', minWidth: 96 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outline: { borderWidth: 1.5 },
  label: { lineHeight: 24 },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: role.line,
  },
  disabled: { opacity: 0.5 },
});
