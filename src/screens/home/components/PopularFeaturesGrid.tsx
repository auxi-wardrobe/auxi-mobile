import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../theme/theme';
import { Icons } from '../../../assets/icons';
import { SectionHeader } from './SectionHeader';
import { styles } from '../styles';

type IconCmp = React.FC<{ width?: number; height?: number; color?: string }>;

export interface PopularFeature {
  key: string;
  /** i18n key under `homeLanding.feature_*`. */
  labelKey: string;
  icon: IconCmp;
}

/**
 * The six shortcuts, each pointing at a screen that already exists — no
 * placeholder rows. `HomeLandingScreen` owns the navigation for each `key`:
 *
 *   add_items   → Wardrobe      (the add-item flow lives on the grid)
 *   schedule    → Schedule
 *   capsule     → CapsuleCreate
 *   find_match  → Home          (the recommender: matches items into outfits)
 *   show_wearing→ Favourite     (try-on needs a saved outfit to render onto,
 *                                so it starts from the saved-outfit list)
 *   discover    → Discovery
 */
export const POPULAR_FEATURES: PopularFeature[] = [
  { key: 'add_items', labelKey: 'homeLanding.feature_add_items', icon: Icons.Plus },
  { key: 'schedule', labelKey: 'homeLanding.feature_schedule', icon: Icons.Calendar },
  { key: 'capsule', labelKey: 'homeLanding.feature_capsule', icon: Icons.Capsule },
  { key: 'find_match', labelKey: 'homeLanding.feature_find_matching', icon: Icons.Grid },
  { key: 'show_wearing', labelKey: 'homeLanding.feature_show_wearing', icon: Icons.BodyOutline },
  { key: 'discover', labelKey: 'homeLanding.feature_discover', icon: Icons.Globe },
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
              <feature.icon
                width={20}
                height={20}
                color={theme.colors.uacTextBase}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
