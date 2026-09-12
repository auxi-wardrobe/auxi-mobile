import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from './SectionHeader';
import { styles } from '../styles';

export interface PopularFeature {
  key: string;
  /** i18n key under `homeLanding.feature_*`. */
  labelKey: string;
}

/**
 * The six shortcuts, each pointing at a screen that already exists — no
 * placeholder rows. `HomeLandingScreen` owns the navigation for each `key`
 * (the mapping lives in `feature-routes.ts`):
 *
 *   add_items   → Wardrobe      (the add-item flow lives on the grid)
 *   schedule    → Schedule
 *   capsule     → CapsuleCreate
 *   find_match  → Home          (the recommender: matches items into outfits)
 *   show_wearing→ Favourite     (try-on needs a saved outfit to render onto,
 *                                so it starts from the saved-outfit list)
 *   discover    → Discovery
 *
 * Label only — the tiles carry no icon, so the label IS the whole affordance.
 */
export const POPULAR_FEATURES: PopularFeature[] = [
  { key: 'add_items', labelKey: 'homeLanding.feature_add_items' },
  { key: 'schedule', labelKey: 'homeLanding.feature_schedule' },
  { key: 'capsule', labelKey: 'homeLanding.feature_capsule' },
  { key: 'find_match', labelKey: 'homeLanding.feature_find_matching' },
  { key: 'show_wearing', labelKey: 'homeLanding.feature_show_wearing' },
  { key: 'discover', labelKey: 'homeLanding.feature_discover' },
];

type Props = {
  onSelect: (key: string) => void;
};

export const PopularFeaturesGrid: React.FC<Props> = ({ onSelect }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('homeLanding.popular_features')}
        testID="home-landing-features-header"
      />
      <View style={styles.featureGrid}>
        {POPULAR_FEATURES.map(feature => {
          const label = t(feature.labelKey);
          return (
            <TouchableOpacity
              key={feature.key}
              style={styles.featureTile}
              activeOpacity={0.85}
              testID={`home-landing-feature-${feature.key}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onSelect(feature.key)}
            >
              <Text style={styles.featureLabel}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
