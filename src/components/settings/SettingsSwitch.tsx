import React from 'react';
import { MSwitch } from '../design-system/lib';

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
  <MSwitch
    testID={testID}
    accessibilityLabel={accessibilityLabel}
    value={value}
    onValueChange={onValueChange ?? (() => {})}
    disabled={disabled || !onValueChange}
    appendStateToTestID={false}
  />
);
