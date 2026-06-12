import React from 'react';
import { Switch } from 'react-native';
import { theme } from '../../theme/theme';

// Shared toggle colors for every Settings Switch (Daily Time + Dark Mode).
// Byte-identical prop set extracted to keep the two switches in lockstep.
// Active track is the Auxi Design System teal (figmaSwitchOn / ds.color.teal),
// split from the radio's confirm-green per `Auxi Design System.html`.
export const TOGGLE_COLORS = {
  trackColor: {
    false: theme.colors.figmaToggleOffTrack,
    true: theme.colors.figmaSwitchOn,
  },
  thumbColor: theme.colors.white,
  ios_backgroundColor: theme.colors.figmaToggleOffTrack,
} as const;

type SettingsSwitchProps = {
  testID: string;
  accessibilityLabel: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
};

export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  testID,
  accessibilityLabel,
  value,
  onValueChange,
  disabled,
}) => (
  <Switch
    testID={testID}
    accessibilityLabel={accessibilityLabel}
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    trackColor={TOGGLE_COLORS.trackColor}
    thumbColor={TOGGLE_COLORS.thumbColor}
    ios_backgroundColor={TOGGLE_COLORS.ios_backgroundColor}
  />
);
