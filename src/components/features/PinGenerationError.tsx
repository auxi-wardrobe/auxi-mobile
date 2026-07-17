/**
 * AU-307 phase 04 — inline error banner shown below the outfit grid when the
 * pin-driven `/build` (or `/try_another`) request failed. Surfaces the
 * `pin.error_message` (or `pin.network_error` when the failure was a network
 * abort/timeout) plus a Retry CTA that dispatches `RETRY` into the pin reducer.
 *
 * Intentionally minimal — no animation, no auto-dismiss. The reducer's
 * GENERATE_ERROR transition restored the prior outfit snapshot so the grid
 * behind us is showing what the user saw before the failed generation.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

export type PinErrorKind = 'generic' | 'network' | 'item_unavailable';

export interface PinGenerationErrorProps {
  kind?: PinErrorKind;
  onRetry: () => void;
  testID?: string;
}

export const PinGenerationError: React.FC<PinGenerationErrorProps> = ({
  kind = 'generic',
  onRetry,
  testID = 'pin-generation-error',
}) => {
  const { t } = useTranslation();
  const message =
    kind === 'network'
      ? t('pin.network_error')
      : kind === 'item_unavailable'
      ? t('pin.item_unavailable')
      : t('pin.error_message');

  return (
    <View testID={testID} style={styles.container} accessibilityRole="alert">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {kind === 'item_unavailable' ? null : (
        <TouchableOpacity
          testID={`${testID}-retry`}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          activeOpacity={0.7}
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
  message: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
  },
  retryLabel: {
    ...theme.typography.aliases.interBodySm,
    fontFamily: 'Inter-Medium',
    color: theme.colors.figmaPrimaryButtonText,
  },
});

export default PinGenerationError;
