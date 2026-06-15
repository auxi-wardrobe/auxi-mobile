/**
 * AU-307 phase 04 — inline fallback banner shown below the outfit grid when
 * the BE returns `low_confidence: true` (relaxed-constraint outfit). No CTA;
 * purely informational. Persists until the next pin action / dispatch shifts
 * outfit state away from 'fallback'.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

export interface PinFallbackNoticeProps {
  testID?: string;
}

export const PinFallbackNotice: React.FC<PinFallbackNoticeProps> = ({
  testID = 'pin-fallback-notice',
}) => {
  const { t } = useTranslation();
  return (
    <View testID={testID} style={styles.container} accessibilityRole="alert">
      <Text style={styles.message} numberOfLines={2}>
        {t('pin.fallback_message')}
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

export default PinFallbackNotice;
