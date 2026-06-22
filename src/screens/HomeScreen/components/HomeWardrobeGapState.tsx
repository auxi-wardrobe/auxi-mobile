import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

export const HomeWardrobeGapState: React.FC<{ onAddItems: () => void }> = ({
  onAddItems,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorState} testID="home-wardrobe-gap-state">
      <Text style={styles.errorStateTitle}>{t('home.wardrobe_gap_title')}</Text>
      <Text style={styles.errorStateBody}>{t('home.wardrobe_gap_body')}</Text>
      <TouchableOpacity
        testID="home-wardrobe-gap-add-items"
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
    </View>
  );
};
