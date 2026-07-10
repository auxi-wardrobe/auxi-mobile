import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

/**
 * Home | empty state — the recommendation resolved but surfaced no outfit and
 * it is NOT a climate wardrobe-gap (that has its own CTA via
 * `HomeWardrobeGapState`) nor a load error (`HomeErrorState`). This covers the
 * new-user "wardrobe is empty / nothing composable yet" case that previously
 * rendered a blank white screen (only header chrome).
 *
 * Reuses the same centred-message + CTA pattern as the Favourite / Schedule
 * empty states and the Home error/gap states (shared `styles.errorState*`), so
 * it stays on-system and DRY. Offers a primary "Add items" → Wardrobe plus a
 * secondary "Try again" so the user is never stranded.
 */
export const HomeEmptyState: React.FC<{
  onAddItems: () => void;
  onRetry: () => void;
}> = ({ onAddItems, onRetry }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorState} testID="home-empty-state">
      <Text style={styles.errorStateTitle}>{t('home.empty_title')}</Text>
      <Text style={styles.errorStateBody}>{t('home.empty_body')}</Text>
      <TouchableOpacity
        testID="home-empty-add-items"
        onPress={onAddItems}
        style={styles.errorStateRetry}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_add_to_wardrobe')}
      >
        <Text style={styles.errorStateRetryLabel}>
          {t('home.add_to_wardrobe')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="home-empty-try-again"
        onPress={onRetry}
        style={styles.errorStateSecondary}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_retry_load')}
      >
        <Text style={styles.errorStateSecondaryLabel}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
};
