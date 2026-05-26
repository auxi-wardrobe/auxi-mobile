import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { theme } from '../../theme/theme';

type PillVariant = 'filled' | 'outline' | 'soft' | 'text' | 'danger';

interface TopIconButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  icon?: React.ReactNode;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

interface DividerRowProps {
  label: string;
  value?: string;
  rightNode?: React.ReactNode;
  hideDivider?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
}

interface PillButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: PillVariant;
  disabled?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

interface BottomSheetSurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TopIconButton: React.FC<TopIconButtonProps> = ({
  onPress,
  icon,
  label,
  style,
  disabled,
  testID,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    testID={testID}
    accessibilityLabel={accessibilityLabel}
    activeOpacity={0.82}
    onPress={onPress}
    disabled={disabled}
    style={[styles.topIconButton, disabled && styles.disabled, style]}
  >
    {icon || (label ? <Text style={styles.topIconLabel}>{label}</Text> : null)}
  </TouchableOpacity>
);

export const DividerRow: React.FC<DividerRowProps> = ({
  label,
  value,
  rightNode,
  hideDivider,
  style,
  labelStyle,
  valueStyle,
}) => (
  <View style={[styles.dividerRow, !hideDivider && styles.rowDivider, style]}>
    <Text style={[styles.dividerLabel, labelStyle]}>{label}</Text>
    {rightNode || <Text style={[styles.dividerValue, valueStyle]}>{value}</Text>}
  </View>
);

export const PillButton: React.FC<PillButtonProps> = ({
  title,
  onPress,
  variant = 'outline',
  disabled,
  loading,
  leading,
  trailing,
  style,
  textStyle,
  testID,
}) => {
  const isText = variant === 'text';

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.pillBase,
        isText && styles.textButton,
        variant === 'filled' && styles.filledButton,
        variant === 'outline' && styles.outlineButton,
        variant === 'soft' && styles.softButton,
        variant === 'danger' && styles.dangerButton,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'filled' ? theme.colors.white : theme.colors.figmaAction}
        />
      ) : (
        <>
          {leading}
          <Text
            style={[
              styles.pillText,
              variant === 'filled' && styles.filledText,
              variant === 'danger' && styles.dangerText,
              variant === 'text' && styles.textOnly,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {trailing}
        </>
      )}
    </TouchableOpacity>
  );
};

export const BottomSheetSurface: React.FC<BottomSheetSurfaceProps> = ({ children, style }) => (
  <View style={[styles.bottomSheetSurface, style]}>{children}</View>
);

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
  topIconButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: theme.colors.figmaIconSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topIconLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.figmaAction,
  },
  dividerRow: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaDivider,
  },
  dividerLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextMuted,
  },
  dividerValue: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextMuted,
  },
  pillBase: {
    height: 56,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaAction,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  filledButton: {
    backgroundColor: theme.colors.figmaAction,
    borderColor: theme.colors.figmaAction,
  },
  outlineButton: {
    backgroundColor: 'transparent',
  },
  softButton: {
    backgroundColor: theme.colors.figmaIconSurface,
    borderColor: theme.colors.figmaIconSurface,
  },
  dangerButton: {
    borderColor: theme.colors.figmaRed,
  },
  textButton: {
    height: 40,
    borderWidth: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  pillText: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaAction,
  },
  filledText: {
    color: theme.colors.white,
  },
  dangerText: {
    color: theme.colors.figmaRed,
  },
  textOnly: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaAction,
  },
  bottomSheetSurface: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
});
