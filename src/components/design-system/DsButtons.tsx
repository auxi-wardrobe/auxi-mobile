/**
 * Design System — Buttons (NEW showcase).
 * Variants: primary · outline · text · danger · danger-outline · icon.
 * Sizes: lg 56 / md 44 / sm 32. States: enabled → pressed → disabled → loading.
 * Motion: press → scale .96 spring (PressScale); loading → 3-dot loader.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { color, radius, role, space, type } from './ds-tokens';
import { DotsLoader, PressScale } from './DsMotion';

const IconPlus = Icons.Plus;

type Variant = 'primary' | 'outline' | 'text' | 'danger' | 'danger-outline';
type Size = 'lg' | 'md' | 'sm';

const SIZE: Record<
  Size,
  { height: number; px: number; r: number; fs: number }
> = {
  lg: { height: 56, px: 28, r: radius['2xl'], fs: 16 },
  md: { height: 44, px: 22, r: radius.xl, fs: 15 },
  sm: { height: 32, px: 14, r: radius.lg, fs: 13 },
};

export const DsButton: React.FC<{
  label: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  testID: string;
}> = ({
  label,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  testID,
}) => {
  const sz = SIZE[size];
  const isOutline = variant === 'outline' || variant === 'danger-outline';
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
      : variant === 'danger-outline'
      ? color.da400
      : role.ink;
  const borderColor = variant === 'danger-outline' ? color.da400 : role.ink;

  return (
    <PressScale
      testID={testID}
      disabled={disabled || loading}
      accessibilityLabel={label}
      style={[
        styles.btn,
        {
          height: sz.height,
          paddingHorizontal: sz.px,
          borderRadius: sz.r,
          backgroundColor: bg,
        },
        isOutline && styles.outline,
        isOutline && { borderColor },
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <DotsLoader tint={fg} testID={`${testID}-loader`} />
      ) : (
        <Text style={[styles.label, { color: fg, fontSize: sz.fs }]}>
          {label}
        </Text>
      )}
    </PressScale>
  );
};

export const DsIconButton: React.FC<{
  testID: string;
  accessibilityLabel: string;
  size?: Size;
}> = ({ testID, accessibilityLabel, size = 'md' }) => {
  const dim = size === 'lg' ? 56 : size === 'sm' ? 32 : 44;
  const r =
    size === 'lg' ? radius['2xl'] : size === 'sm' ? radius.lg : radius.xl;
  return (
    <PressScale
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconBtn, { width: dim, height: dim, borderRadius: r }]}
    >
      <IconPlus width={20} height={20} color={role.ink} />
    </PressScale>
  );
};

/** Stage content: full variant + size + state matrix. */
export const DsButtonShowcase: React.FC = () => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      <DsButton label="Primary" variant="primary" testID="ds-btn-primary" />
      <DsButton label="Outline" variant="outline" testID="ds-btn-outline" />
      <DsButton label="Text" variant="text" testID="ds-btn-text" />
    </View>
    <View style={styles.row}>
      <DsButton label="Danger" variant="danger" testID="ds-btn-danger" />
      <DsButton
        label="Danger outline"
        variant="danger-outline"
        testID="ds-btn-danger-outline"
      />
      <DsIconButton testID="ds-btn-icon" accessibilityLabel="Add item" />
    </View>
    <View style={styles.row}>
      <DsButton label="Large" size="lg" testID="ds-btn-lg" />
      <DsButton label="Medium" size="md" testID="ds-btn-md" />
      <DsButton label="Small" size="sm" testID="ds-btn-sm" />
    </View>
    <View style={styles.row}>
      <DsButton label="Disabled" disabled testID="ds-btn-disabled" />
      <DsButton label="Loading" loading testID="ds-btn-loading" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: space.s3, width: '100%' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
    alignItems: 'center',
  },
  btn: { alignItems: 'center', justifyContent: 'center', minWidth: 96 },
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
