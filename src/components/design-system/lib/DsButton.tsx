/**
 * DsButton / DsIconButton — self-contained action primitives.
 *
 * Import + render, nothing else:
 *   import { DsButton } from '../components/design-system/lib';
 *   <DsButton variant="primary" onPress={save}>Save</DsButton>
 *
 * Tokens + press-scale motion are encapsulated INSIDE. Honors reduce-motion via
 * PressScale. Minimal call works: `<DsButton>Label</DsButton>` (primary / lg).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../../assets/icons';
import { color, radius, role, type } from '../ds-tokens';
import { DotsLoader, PressScale } from '../DsMotion';

const IconPlus = Icons.Plus;

export type DsButtonVariant =
  | 'primary'
  | 'secondary'
  | 'text'
  | 'danger'
  | 'dangerOutline';
export type DsButtonSize = 'lg' | 'md' | 'sm';

const SIZE: Record<
  DsButtonSize,
  { height: number; px: number; r: number; fs: number }
> = {
  lg: { height: 56, px: 28, r: radius['2xl'], fs: 16 },
  md: { height: 44, px: 22, r: radius.xl, fs: 15 },
  sm: { height: 32, px: 14, r: radius.lg, fs: 13 },
};

export interface DsButtonProps {
  children: React.ReactNode;
  variant?: DsButtonVariant;
  size?: DsButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.FC<{ width?: number; height?: number; color?: string }>;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const DsButton: React.FC<DsButtonProps> = ({
  children,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  leftIcon: LeftIcon,
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
      ? color.p50
      : variant === 'danger'
      ? color.white
      : variant === 'dangerOutline'
      ? color.da400
      : variant === 'secondary'
      ? role.ink
      : role.ink;
  const borderColor = variant === 'dangerOutline' ? color.da400 : role.ink;
  const isSecondary = variant === 'secondary';
  const label = typeof children === 'string' ? children : accessibilityLabel;

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
          {LeftIcon && <LeftIcon width={18} height={18} color={fg} />}
          <Text style={[styles.label, { color: fg, fontSize: sz.fs }]}>
            {children}
          </Text>
        </View>
      )}
    </PressScale>
  );
};

export interface DsIconButtonProps {
  icon?: React.FC<{ width?: number; height?: number; color?: string }>;
  size?: DsButtonSize;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const DsIconButton: React.FC<DsIconButtonProps> = ({
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
      style={[styles.iconBtn, { width: dim, height: dim, borderRadius: r }]}
    >
      <Icon width={20} height={20} color={role.ink} />
    </PressScale>
  );
};

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', minWidth: 96 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outline: { borderWidth: 1.5 },
  label: { fontFamily: type.h3.fontFamily, lineHeight: 24 },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: role.line,
  },
  disabled: { opacity: 0.5 },
});
