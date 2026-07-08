import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { MListRow } from '../design-system/lib';

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
  style?: StyleProp<ViewStyle>;
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
  return (
    <MListRow
      testID={testID}
      label={label}
      value={value}
      trailing={trailing}
      chevron={chevron}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={style}
    />
  );
};

export const SettingsDivider = () => null;
