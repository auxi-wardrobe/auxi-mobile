import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';

type SettingsRowProps = {
  testID: string;
  label: string;
  /** Right-aligned value text (e.g. "06:15 AM", the current language). */
  value?: string;
  /** Trailing node — a switch, delete glyph, or custom control. */
  trailing?: React.ReactNode;
  /** Show the forward chevron (navigation / opens-a-picker affordance). */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

/**
 * Canonical Settings list row — one flexible primitive for every screen in the
 * Settings IA (nav rows, value rows, toggle rows, the delete row). Layout is
 * always `[label] … [value] [trailing|chevron]`. A row with `onPress` is a
 * Touchable; otherwise it's a static container (so an embedded switch owns the
 * press). Keeps spacing/typography identical across the main screen and the
 * Personalization / Privacy / About sub-screens.
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  testID,
  label,
  value,
  trailing,
  chevron,
  onPress,
  disabled,
  accessibilityLabel,
  style,
}) => {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.trailingWrap}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {trailing}
        {chevron ? (
          <Icons.ChevronRight
            width={24}
            height={24}
            color={theme.colors.figmaOnboardingStepLabel}
          />
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={[styles.row, disabled && styles.disabled, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={disabled}
      style={[styles.row, disabled && styles.disabled, style]}
      onPress={onPress}
    >
      {content}
    </TouchableOpacity>
  );
};

export const SettingsDivider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  label: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
  trailingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaOnboardingStepLabel,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
  },
  disabled: {
    opacity: 0.5,
  },
});
