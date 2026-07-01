/**
 * Square icon button for the Outfit Canvas toolbar (add / layer / duplicate /
 * swap / delete). Extracted verbatim from OutfitCanvasScreen (carries its own
 * styles). Pressed + disabled states preserved.
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export const ToolbarBtn = ({
  testID,
  onPress,
  disabled,
  children,
  accessibilityLabel,
}: {
  testID: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  accessibilityLabel: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.toolbarBtn,
      disabled && styles.toolbarBtnDisabled,
      pressed && !disabled && styles.toolbarBtnPressed,
    ]}
  >
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  toolbarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
  },
  toolbarBtnDisabled: {
    opacity: 0.5,
  },
  toolbarBtnPressed: {
    backgroundColor: theme.colors.figmaSurfaceSoft,
  },
});
