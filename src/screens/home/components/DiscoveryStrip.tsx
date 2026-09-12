import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DiscoveryOutfitCard } from '../../../services/discoveryService';
import { SectionHeader } from './SectionHeader';
import { styles } from '../styles';

/**
 * Cards in the landing strip — one row of TWO.
 *
 * The row's children are `flex: 1` with a single gap between them, so this
 * count alone sets how wide each card is; there is no per-card width to keep
 * in sync. Two also means each card is close to double the area it had at
 * three, which suits the portrait lookbook crop (`DISCOVERY_CARD_RATIO`).
 * The loading skeleton reads the same constant, so placeholders and real
 * cards can never disagree about the row.
 */
export const DISCOVERY_STRIP_SIZE = 2;

type Props = {
  outfits: DiscoveryOutfitCard[];
  loading: boolean;
  loadError: boolean;
  onSeeMore: () => void;
  onOutfitPress: (outfit: DiscoveryOutfitCard, index: number) => void;
};

/**
 * A three-card peek at the newest curated Discovery outfits. Reads the same
 * `useDiscoveryOutfits` query the Discovery feed uses, so opening the full page
 * right after is served from cache rather than a second round trip.
 */
export const DiscoveryStrip: React.FC<Props> = ({
  outfits,
  loading,
  loadError,
  onSeeMore,
  onOutfitPress,
}) => {
  const { t } = useTranslation();

  const body = () => {
    if (loading) {
      return (
        <View style={styles.discoveryRow} testID="home-landing-discovery-loading">
          {Array.from({ length: DISCOVERY_STRIP_SIZE }).map((_, index) => (
            <View key={index} style={styles.discoveryCard} />
          ))}
        </View>
      );
    }
    if (loadError) {
      return (
        <View style={styles.stateBox} testID="home-landing-discovery-error">
          <Text style={styles.stateTitle}>{t('discovery.error_title')}</Text>
        </View>
      );
    }
    if (outfits.length === 0) {
      return (
        <View style={styles.stateBox} testID="home-landing-discovery-empty">
          <Text style={styles.stateTitle}>{t('discovery.empty_title')}</Text>
          <Text style={styles.stateBody}>{t('discovery.empty_body')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.discoveryRow}>
        {outfits.map((outfit, index) => (
          <TouchableOpacity
            key={outfit.id}
            style={styles.discoveryCard}
            activeOpacity={0.85}
            testID={`home-landing-discovery-card-${index}`}
            accessibilityRole="button"
            accessibilityLabel={outfit.title}
            onPress={() => onOutfitPress(outfit, index)}
          >
            {outfit.composite_image_url ? (
              <Image
                source={{ uri: outfit.composite_image_url }}
                style={styles.discoveryImage}
                resizeMode="cover"
              />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('homeLanding.discovery')}
        onSeeMore={onSeeMore}
        testID="home-landing-discovery-see-more"
        seeMoreAccessibilityLabel={t('homeLanding.a11y_see_more_discovery')}
      />
      {body()}
    </View>
  );
};
