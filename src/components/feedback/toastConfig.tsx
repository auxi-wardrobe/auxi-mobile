import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type {
  ToastConfig,
  ToastConfigParams,
} from 'react-native-toast-message';
import { theme } from '../../theme/theme';
import IconCheckCircle from '../../assets/images/icon_check_circle.svg';

/**
 * Custom `react-native-toast-message` config.
 *
 * Adds the `successSnackbar` type — an M3-style success snackbar matching the
 * Figma "Your item is ready" design (node 3915:30077). Teal/mint surface,
 * check-circle glyph, 4px radius, M3 Elevation Light/3 drop shadow.
 *
 * Source spec:
 *   plans/260617-1743-au-361-item-ready-toast/figma-extraction-item-ready-toast.md
 *
 * Only this NEW type is added — the global `success` / `error` / `info`
 * presets that the other toasts use are intentionally left untouched.
 *
 * NOTE (AU-361 hotfix): this file + the `<Toast config={toastConfig} />` wiring
 * in App.tsx were omitted from PR #87, so `successSnackbar` was registered
 * nowhere and the "item ready" snackbar silently no-op'd. Restored here.
 */
const SuccessSnackbar = ({ text1 }: ToastConfigParams<unknown>) => (
  <View
    style={styles.snackbar}
    testID="wardrobe-item-ready-snackbar"
    accessible
    accessibilityRole="alert"
    accessibilityLabel={text1}
  >
    {/* 24px container, 16px glyph — matches Figma icon sizing. */}
    <View style={styles.iconContainer}>
      <IconCheckCircle
        width={16}
        height={16}
        color={theme.colors.figmaTextDark}
      />
    </View>
    <Text style={styles.label} numberOfLines={2}>
      {text1}
    </Text>
  </View>
);

export const toastConfig: ToastConfig = {
  successSnackbar: props => <SuccessSnackbar {...props} />,
};

const styles = StyleSheet.create({
  snackbar: {
    width: 344,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s, // dimension/8 = 8px
    paddingHorizontal: theme.spacing.m, // 16px
    paddingVertical: 14, // Figma py-14 (between xs=4 / m=16, no exact token)
    borderRadius: theme.borderRadius.s, // 4px
    backgroundColor: theme.colors.figmaSnackbarSuccessBg, // color/success/200
    // M3/Elevation Light/3 — RN approximation of the two Figma drop shadows.
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: theme.colors.uacTextBase, // text/neutral/base #1d1f23
    fontSize: 14, // body/sm
    lineHeight: 20, // body/sm line-height
    fontWeight: '400',
  },
});
