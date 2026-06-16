/**
 * AU-307 phase 05 — ephemeral inline banner shown when the wardrobe sync
 * watcher detects the pinned item is no longer in the user's wardrobe
 * (deleted / archived elsewhere). Mirrors `PinFallbackNotice` styling so
 * the two messages feel consistent. Auto-dismissed by HomeScreen after
 * ~5s; this component is purely presentational.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

export interface PinnedItemUnavailableNoticeProps {
  testID?: string;
}

export const PinnedItemUnavailableNotice: React.FC<
  PinnedItemUnavailableNoticeProps
> = ({ testID = 'pin-item-unavailable-notice' }) => {
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message} numberOfLines={2}>
        {t('pin.item_unavailable')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.figmaCaptionPillBg,
    borderRadius: 12,
  },
  message: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
});

export default PinnedItemUnavailableNotice;
