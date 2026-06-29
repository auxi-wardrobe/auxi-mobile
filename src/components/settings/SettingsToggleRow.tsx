import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { SettingsSwitch } from './SettingsSwitch';

type SettingsToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  testID: string;
  accessibilityLabel: string;
};

// Label + on-system SettingsSwitch. The only justified bespoke Settings row —
// MListRow has no trailing-switch slot. Mirrors the row metrics/divider of
// MListRow so it sits flush in a grouped list.
export const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  label,
  value,
  onValueChange,
  disabled,
  testID,
  accessibilityLabel,
}) => (
  <View style={[styles.row, disabled && styles.disabled]}>
    <Text style={styles.label}>{label}</Text>
    <SettingsSwitch
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaListDivider,
  },
  label: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  disabled: { opacity: 0.5 },
});
