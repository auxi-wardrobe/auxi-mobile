/**
 * Design System — button demos (faithful to auxi-ds.css).
 *  primary   : bg ink, height 56, radius md=16, label cream, Roboto/ui 16/24,
 *              minWidth 200; pressed → darker (black); disabled → opacity .38
 *  secondary : transparent, 1.5px ink inset border, radius lg=17
 *  text      : Inter 12/16, height 44, radius sm=12
 *  icon      : 48×48 round
 *
 * Roboto ships Regular only; the label uses the bundled Roboto-Regular face
 * (via uacM3BodySmall.fontFamily) at the DS label size.
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';

const { Plus: IconPlus, Edit: IconEdit } = Icons;

const ds = theme.ds;

const ROBOTO = theme.typography.aliases.uacM3BodySmall.fontFamily; // Roboto-Regular

export const DsPrimaryButton: React.FC<{
  label: string;
  disabled?: boolean;
  testID: string;
}> = ({ label, disabled, testID }) => (
  <Pressable
    testID={testID}
    accessibilityRole="button"
    disabled={disabled}
    style={({ pressed }) => [
      styles.btnPrimary,
      pressed && styles.btnPrimaryPressed,
      disabled && styles.disabled,
    ]}
  >
    <Text style={styles.labelPrimary}>{label}</Text>
  </Pressable>
);

export const DsSecondaryButton: React.FC<{
  label: string;
  testID: string;
}> = ({ label, testID }) => (
  <Pressable
    testID={testID}
    accessibilityRole="button"
    style={({ pressed }) => [styles.btnSecondary, pressed && styles.secPressed]}
  >
    <Text style={styles.labelSecondary}>{label}</Text>
  </Pressable>
);

export const DsTextButton: React.FC<{ label: string; testID: string }> = ({
  label,
  testID,
}) => (
  <Pressable
    testID={testID}
    accessibilityRole="button"
    style={({ pressed }) => [styles.btnText, pressed && styles.textPressed]}
  >
    <Text style={styles.labelText}>{label}</Text>
  </Pressable>
);

export const DsIconButton: React.FC<{
  icon: 'plus' | 'edit';
  testID: string;
  accessibilityLabel: string;
}> = ({ icon, testID, accessibilityLabel }) => {
  const Icon = icon === 'plus' ? IconPlus : IconEdit;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.textPressed]}
    >
      <Icon width={24} height={24} color={ds.color.ink} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btnPrimary: {
    backgroundColor: ds.color.ink,
    height: 56,
    minWidth: 200,
    paddingHorizontal: theme.spacing.l,
    borderRadius: ds.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryPressed: { backgroundColor: ds.color.black },
  labelPrimary: {
    fontFamily: ROBOTO,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    color: ds.color.cream,
  },
  btnSecondary: {
    backgroundColor: ds.color.white,
    height: 56,
    minWidth: 160,
    paddingHorizontal: 22,
    borderRadius: ds.radius.lg,
    borderWidth: 1.5,
    borderColor: ds.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secPressed: { backgroundColor: ds.color.cream },
  labelSecondary: {
    fontFamily: ROBOTO,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    color: ds.color.ink,
  },
  btnText: {
    height: 44,
    paddingHorizontal: theme.spacing.m,
    borderRadius: ds.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textPressed: { backgroundColor: ds.color.cream },
  labelText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: ds.color.ink,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: ds.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.38 },
});
