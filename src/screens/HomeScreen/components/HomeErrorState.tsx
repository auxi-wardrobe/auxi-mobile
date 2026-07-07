import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
}> = ({ onRetry, variant = 'generic' }) => {
  const { t } = useTranslation();
  const copy = VARIANT_COPY[variant];
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
    </View>
  );
};
