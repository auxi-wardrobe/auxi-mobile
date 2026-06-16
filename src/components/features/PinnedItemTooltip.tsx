/**
 * AU-307 phase 06 — `PinnedItemTooltip`.
 *
 * Small dark pill rendered NEAR the pinned tile that nudges the user that
 * they can "Touch to unpin". Shown for the first 3 pin actions per session
 * (counter lives in HomeScreen, NOT here — this component is purely
 * presentational + owns its own auto-dismiss timer).
 *
 * Spec §7 (UX) + §8 (no persistence, session-scoped) + §9 (must NOT block
 * underlying tile interaction → `pointerEvents="box-none"` on the
 * absolute-positioned host container).
 *
 * a11y: read by screen readers via `accessibilityLiveRegion="polite"` so
 * VoiceOver announces the hint when it appears; role is `text` (RN/iOS
 * does not support `tooltip`).
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

const AUTO_DISMISS_MS = 3000;

export interface PinnedItemTooltipProps {
  /**
   * When `true`, the bubble is rendered and the 3s auto-dismiss timer starts.
   * Parent (HomeScreen) flips this to `false` either after the timer fires
   * via `onDismiss`, or when `pinnedItemId` clears.
   */
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

export const PinnedItemTooltip: React.FC<PinnedItemTooltipProps> = ({
  visible,
  onDismiss,
  testID = 'pin-tooltip-unpin',
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) {
    return null;
  }

  return (
    <View
      // `box-none` lets touches pass through to siblings (e.g. the pinned
      // tile underneath) while the inner pill itself is non-interactive.
      pointerEvents="box-none"
      style={styles.host}
    >
      <View
        testID={testID}
        style={styles.bubble}
        accessibilityRole="text"
        accessibilityLabel={t('pin.tooltip_unpin')}
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.text} numberOfLines={1}>
          {t('pin.tooltip_unpin')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    width: '100%',
  },
  bubble: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.ds.radius.full,
    backgroundColor: theme.colors.figmaAction,
    // Soft drop shadow so it reads against the cream wardrobe canvas.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.white,
  },
});

export default PinnedItemTooltip;
