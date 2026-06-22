import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

export const HomeErrorState: React.FC<{ onRetry: () => void }> = ({
  onRetry,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorState} testID="home-error-state">
      <Text style={styles.errorStateTitle}>{t('home.error_load_title')}</Text>
      <Text style={styles.errorStateBody}>{t('home.error_load_body')}</Text>
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
    </View>
  );
};
