import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  AccessibilityRole,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';

type PillVariant = 'filled' | 'outline' | 'soft' | 'text' | 'danger';

interface TopIconButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  icon?: React.ReactNode;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  // Icon-only header buttons render an SVG child with no text node, so without
  // an explicit role they never enter the iOS accessibility tree — VoiceOver
  // can't announce/activate them and Maestro/mobile-mcp can't tap them.
  // Defaults to 'button' since every TopIconButton is, by definition, a button.
  accessibilityRole?: AccessibilityRole;
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
  accessibilityLabel?: string;
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
  accessibilityRole = 'button',
}) => (
  <TouchableOpacity
    testID={testID}
    accessibilityRole={accessibilityRole}
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: !!disabled }}
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
    {rightNode || (
      <Text style={[styles.dividerValue, valueStyle]}>{value}</Text>
    )}
  </View>
);

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
  accessibilityLabel,
}) => {
  const isText = variant === 'text';
  const reduced = useReducedMotion();

  // Macgie Motion (AU-348): a press micro-interaction (scale.press) plus a
  // smooth cross-fade into the loading state, both driven by
  // src/theme/motion.ts tokens — no hardcoded timings. The loader overlays the
  // content (which stays laid out at opacity 0), so the button never changes
  // width while loading. Under OS "Reduce Motion" the transitions are instant.
  const pressScale = useRef(new Animated.Value(1)).current;
  const loadingAnim = useRef(new Animated.Value(loading ? 1 : 0)).current;

  const animatePress = useCallback(
    (to: number) => {
      if (reduced) {
        return;
      }
      Animated.timing(pressScale, {
        toValue: to,
        duration: motion.duration.instant,
        easing: motion.easing.standard,
        useNativeDriver: true,
      }).start();
    },
    [pressScale, reduced],
  );

  useEffect(() => {
    if (reduced) {
      loadingAnim.setValue(loading ? 1 : 0);
      return;
    }
    Animated.timing(loadingAnim, {
      toValue: loading ? 1 : 0,
      duration: motion.duration.fast,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
  }, [loading, loadingAnim, reduced]);

  // Hoisted dynamic styles — transforms/opacity must stay dynamic Animated
  // values; hoisting keeps them out of JSX (react-native/no-inline-styles).
  const pressStyle = { transform: [{ scale: pressScale }] };
  const contentStyle = {
    opacity: loadingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };
  const loaderStyle = {
    opacity: loadingAnim,
    transform: [
      {
        scale: loadingAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
    ],
  };

  return (
    <AnimatedTouchable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={() => animatePress(motion.scale.press)}
      onPressOut={() => animatePress(1)}
      disabled={disabled || loading}
      style={[
        styles.pillBase,
        isText && styles.textButton,
        variant === 'filled' && styles.filledButton,
        variant === 'outline' && styles.outlineButton,
        variant === 'soft' && styles.softButton,
        variant === 'danger' && styles.dangerButton,
        (disabled || loading) && styles.disabled,
        pressStyle,
        style,
      ]}
    >
      <Animated.View style={[styles.pillContent, contentStyle]}>
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
      </Animated.View>
      {loading ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.loaderOverlay, loaderStyle]}
        >
          <ActivityIndicator
            testID={testID ? `${testID}-loading` : undefined}
            size="small"
            color={
              variant === 'filled'
                ? theme.colors.white
                : theme.colors.figmaAction
            }
          />
        </Animated.View>
      ) : null}
    </AnimatedTouchable>
  );
};

export const BottomSheetSurface: React.FC<BottomSheetSurfaceProps> = ({
  children,
  style,
}) => <View style={[styles.bottomSheetSurface, style]}>{children}</View>;

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Canonical header icon chip (left or right): 44×44 white square, radius 8,
  // with the design-system header-icon drop-shadow. Per-screen overrides should
  // not change size/radius/fill — only positioning.
  topIconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.ds.shadow.headerIcon,
  },
  topIconLabel: {
    fontFamily: 'Poppins-Medium',
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
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase, // secondary/outline border #1D1F23
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  filledButton: {
    backgroundColor: theme.colors.uacTextBase,
    borderColor: theme.colors.uacTextBase,
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
    color: theme.colors.figmaTextDark, // secondary/text button label #070707
  },
  filledText: {
    color: theme.colors.uacTextPrimaryBase, // primary button label #F2EFEC
  },
  dangerText: {
    color: theme.colors.figmaRed,
  },
  textOnly: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaTextDark, // text button label #070707
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
