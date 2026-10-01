import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { button } from '../../components/design-system/m-tokens';
import { theme } from '../../theme/theme';

const BUTTON_HEIGHT = button.primaryHeight;

type Props = {
  /** The row's buttons — wrap each in `actionBarStyles.grow` to share the width. */
  children: React.ReactNode;
  /** Optional caption under the row (e.g. "not available for try-on"). */
  hint?: string;
  testID?: string;
};

/**
 * Sticky footer shell for the Discovery outfit detail — house sticky-footer
 * treatment (header-footer-rules §3b): blur + white tint, sticky z-tier,
 * bottom safe-area. Figma button group (5456:18703 / 5456:21357): 56px `lg`
 * buttons, 12 apart, 16 top padding. The row content depends on the screen
 * state (idle detail vs the AU-458 Make It Yours states), so callers supply it.
 */
export const DiscoveryDetailActionBar: React.FC<Props> = ({ children, hint, testID }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[styles.container, { paddingBottom: insets.bottom + theme.spacing.s }]}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={4}
        reducedTransparencyFallbackColor={theme.colors.figmaItemDetailHeaderBg}
        pointerEvents="none"
      />
      <View style={styles.tint} pointerEvents="none" />
      <View style={styles.row}>{children}</View>
      {hint ? (
        <Text style={styles.hint} testID="discovery-detail-see-on-me-unavailable">
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

/** Button height (56) + top padding — the screen pads its scroll content by this. */
export const DISCOVERY_ACTION_BAR_HEIGHT = BUTTON_HEIGHT + theme.spacing.m;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: theme.zIndex.sticky,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaBlurTintWhite80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  hint: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});

/** Layout helpers for the buttons callers put in the row. */
export const actionBarStyles = StyleSheet.create({
  grow: { flex: 1 },
});
