import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

/**
 * Home | exhausted state (plan 260923) — the user has already seen every
 * distinct outfit their wardrobe makes for this weather + occasion. The server
 * no longer repeats outfits or pads the deck with catalog items, so Home says
 * so honestly. Same centred-message + CTA pattern as the empty / wardrobe-gap
 * states (shared `styles.errorState*`): primary "Add items" → Wardrobe,
 * secondary "Start over" (`reset_seen`).
 */
export const HomeExhaustedState: React.FC<{
  onAddItems: () => void;
  onStartOver: () => void;
}> = ({ onAddItems, onStartOver }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorState} testID="home-exhausted-state">
      <Text style={styles.errorStateTitle}>{t('home.exhausted_title')}</Text>
      <Text style={styles.errorStateBody}>{t('home.exhausted_body')}</Text>
      <TouchableOpacity
        testID="home-exhausted-add-items"
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
        testID="home-exhausted-start-over"
        onPress={onStartOver}
        style={styles.errorStateSecondary}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_start_over')}
      >
        <Text style={styles.errorStateSecondaryLabel}>
          {t('home.start_over')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
