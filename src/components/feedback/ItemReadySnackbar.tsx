import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import IconCheckCircle from '../../assets/images/icon_check_circle.svg';

/**
 * M3-style "Your item is ready" success snackbar (Figma node 3915:30077).
 * Teal/mint surface, check-circle glyph, 4px radius, M3 Elevation Light/3.
 *
 * Source spec:
 *   plans/260617-1743-au-361-item-ready-toast/figma-extraction-item-ready-toast.md
 *
 * AU-361: extracted from the now-deleted `toastConfig.tsx`. The library's
 * custom-config render path never mounted the snackbar; WardrobeScreen now
 * renders this presentational component directly as a self-controlled overlay.
 * Styling, testID and a11y are preserved verbatim from the original.
 */
interface ItemReadySnackbarProps {
  message: string;
}

export const ItemReadySnackbar: React.FC<ItemReadySnackbarProps> = ({
  message,
}) => (
  <View
    style={styles.snackbar}
    testID="wardrobe-item-ready-snackbar"
    accessible
    accessibilityRole="alert"
    accessibilityLabel={message}
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
      {message}
    </Text>
  </View>
);

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
