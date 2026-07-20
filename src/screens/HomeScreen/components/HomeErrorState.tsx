import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../theme/theme';
import { styles } from '../styles';

/**
 * Which recommendation-failure state to show:
 *   - `generic`        → couldn't load (connection / unknown) — offers retry.
 *   - `ai_limit`       → daily AI limit reached (429) — "come back tomorrow",
 *                        no retry (retrying today just re-hits the limit).
 *   - `ai_unavailable` → AI temporarily busy (503) — offers retry shortly.
 */
export type HomeErrorVariant = 'generic' | 'ai_limit' | 'ai_unavailable';

const VARIANT_COPY: Record<
  HomeErrorVariant,
  { titleKey: string; bodyKey: string; showRetry: boolean }
> = {
  generic: {
    titleKey: 'home.error_load_title',
    bodyKey: 'home.error_load_body',
    showRetry: true,
  },
  ai_limit: {
    titleKey: 'home.ai_limit_title',
    bodyKey: 'home.ai_limit_body',
    showRetry: false,
  },
  ai_unavailable: {
    titleKey: 'home.ai_unavailable_title',
    bodyKey: 'home.ai_unavailable_body',
    showRetry: true,
  },
};

export const HomeErrorState: React.FC<{
  onRetry: () => void;
  variant?: HomeErrorVariant;
  // ai_limit only: load the user's most recent past outfits (read-only, does
  // not re-hit the AI limit). When omitted, no fallback CTA is shown.
  onViewLatest?: () => void;
  // True while `onViewLatest` is fetching — swaps the CTA label for a spinner.
  isViewingLatest?: boolean;
}> = ({
  onRetry,
  variant = 'generic',
  onViewLatest,
  isViewingLatest = false,
}) => {
  const { t } = useTranslation();
  const copy = VARIANT_COPY[variant];
  const showViewLatest = variant === 'ai_limit' && !!onViewLatest;
  return (
    <View style={styles.errorState} testID="home-error-state">
      <Text style={styles.errorStateTitle}>{t(copy.titleKey)}</Text>
      <Text style={styles.errorStateBody}>{t(copy.bodyKey)}</Text>
      {copy.showRetry ? (
        <TouchableOpacity
          testID="home-error-retry"
          onPress={onRetry}
          style={styles.errorStateRetry}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={t('home.a11y_retry_load')}
        >
          <Text style={styles.errorStateRetryLabel}>{t('common.retry')}</Text>
        </TouchableOpacity>
      ) : null}
      {showViewLatest ? (
        <TouchableOpacity
          testID="home-error-view-latest"
          onPress={onViewLatest}
          disabled={isViewingLatest}
          style={styles.errorStateRetry}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityState={{ disabled: isViewingLatest, busy: isViewingLatest }}
          accessibilityLabel={t('home.ai_limit_view_latest')}
        >
          {isViewingLatest ? (
            <ActivityIndicator
              testID="home-error-view-latest-spinner"
              color={theme.colors.figmaText}
            />
          ) : (
            <Text style={styles.errorStateRetryLabel}>
              {t('home.ai_limit_view_latest')}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
