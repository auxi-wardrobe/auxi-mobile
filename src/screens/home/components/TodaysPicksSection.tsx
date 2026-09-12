import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../../assets/icons';
import { resolveItemImage } from '../../../utils/url';
import type { Item } from '../../../types/item';
import type { OutfitSheet } from '../../HomeScreen/types';
import type { TodaysPicksSource } from '../todays-picks';
import { SectionHeader } from './SectionHeader';
import { GUTTER, styles } from '../styles';

/** Garment tiles shown per outfit page — the design's 3-up row. */
export const TILES_PER_PAGE = 3;

type Props = {
  sheets: OutfitSheet[];
  source: TodaysPicksSource;
  loading: boolean;
  /** "see more" + the empty state's CTA — both open the outfit recommender. */
  onSeeMore: () => void;
  /** Remix the visible outfit on the Outfit Canvas. */
  onRemix: (sheet: OutfitSheet) => void;
  /** "Wear this" — hands off to the recommender, which owns the wear/save flow. */
  onWearThis: (sheet: OutfitSheet) => void;
  onItemPress: (item: Item) => void;
};

const PickTile: React.FC<{
  item: Item;
  index: number;
  onPress: () => void;
}> = ({ item, index, onPress }) => {
  const imageUrl = resolveItemImage(item);
  return (
    <TouchableOpacity
      style={styles.pickTile}
      activeOpacity={0.85}
      onPress={onPress}
      testID={`home-landing-pick-tile-${index}`}
      accessibilityRole="button"
      accessibilityLabel={item.name ?? item.category}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.pickTileImage}
          resizeMode="contain"
        />
      ) : null}
    </TouchableOpacity>
  );
};

/**
 * "Today's picks" — a paged preview of the outfits the app already has for the
 * user today (scheduled plan, live recommender deck, or the persisted latest
 * suggestions; see `useTodaysPicks`). It never generates a suggestion itself:
 * Remix / Wear this / see more all hand off to the screens that own those
 * flows, so the daily AI budget is spent in exactly one place.
 */
export const TodaysPicksSection: React.FC<Props> = ({
  sheets,
  source,
  loading,
  onSeeMore,
  onRemix,
  onWearThis,
  onItemPress,
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  // The carousel sits INSIDE the screen gutter, so its own width is the
  // gutter-inset content width — which is exactly what `pagingEnabled` snaps
  // to. Sizing each page to the same value keeps one outfit per swipe. (Don't
  // widen the carousel with negative margins to get a peek of the next page:
  // pagingEnabled snaps to the scroll view's width, not the page's, and the
  // two would stop agreeing.)
  const pageWidth = Math.max(1, width - GUTTER * 2);

  const visible = sheets[Math.min(page, Math.max(0, sheets.length - 1))];

  const chips = useMemo(() => {
    const labels: string[] = [];
    if (source === 'scheduled') {
      labels.push(t('homeLanding.chip_scheduled'));
    }
    const caption = visible?.caption?.trim();
    if (caption) {
      labels.push(caption);
    } else if (source !== 'none') {
      labels.push(t('homeLanding.chip_ready'));
    }
    return labels;
  }, [source, visible, t]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== page) {
      setPage(next);
    }
  };

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('homeLanding.todays_picks')}
        onSeeMore={onSeeMore}
        testID="home-landing-picks-see-more"
        seeMoreAccessibilityLabel={t('homeLanding.a11y_see_more_picks')}
      />

      {loading ? (
        <View style={styles.pickRow} testID="home-landing-picks-loading">
          {Array.from({ length: TILES_PER_PAGE }).map((_, index) => (
            <View key={index} style={styles.pickTileEmpty} />
          ))}
        </View>
      ) : sheets.length === 0 ? (
        <View style={styles.stateBox} testID="home-landing-picks-empty">
          <Text style={styles.stateTitle}>
            {t('homeLanding.picks_empty_title')}
          </Text>
          <Text style={styles.stateBody}>
            {t('homeLanding.picks_empty_body')}
          </Text>
          <TouchableOpacity
            testID="home-landing-picks-empty-cta"
            accessibilityRole="button"
            accessibilityLabel={t('homeLanding.picks_empty_cta')}
            activeOpacity={0.82}
            onPress={onSeeMore}
          >
            <Text style={styles.stateCta}>
              {t('homeLanding.picks_empty_cta')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {chips.length > 0 ? (
            <View style={styles.chipRow}>
              {chips.map((label, index) => (
                <View
                  key={`${label}-${index}`}
                  style={styles.chip}
                  testID={`home-landing-pick-chip-${index}`}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <ScrollView
            testID="home-landing-picks-carousel"
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
          >
            {sheets.map((sheet, sheetIndex) => (
              <View
                key={sheet.outfitHash}
                style={[styles.pickRow, { width: pageWidth }]}
              >
                {Array.from({ length: TILES_PER_PAGE }).map((_, tileIndex) => {
                  const item = sheet.items[tileIndex];
                  const key = `${sheet.outfitHash}-${tileIndex}`;
                  return item ? (
                    <PickTile
                      key={key}
                      item={item}
                      index={sheetIndex * TILES_PER_PAGE + tileIndex}
                      onPress={() => onItemPress(item)}
                    />
                  ) : (
                    <View key={key} style={styles.pickTileEmpty} />
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.pickActionRow}>
            <TouchableOpacity
              style={styles.pickAction}
              testID="home-landing-pick-remix"
              accessibilityRole="button"
              accessibilityLabel={t('homeLanding.a11y_remix')}
              activeOpacity={0.82}
              onPress={() => visible && onRemix(visible)}
            >
              <Text style={styles.pickActionText}>
                {t('homeLanding.remix')}
              </Text>
              <Icons.Remix width={20} height={20} />
            </TouchableOpacity>

            {sheets.length > 1 ? (
              <View style={styles.dots} testID="home-landing-pick-dots">
                {sheets.map((sheet, index) => (
                  <View
                    key={sheet.outfitHash}
                    style={[styles.dot, index === page && styles.dotActive]}
                  />
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.pickAction, styles.pickActionEnd]}
              testID="home-landing-pick-wear-this"
              accessibilityRole="button"
              accessibilityLabel={t('homeLanding.a11y_wear_this')}
              activeOpacity={0.82}
              onPress={() => visible && onWearThis(visible)}
            >
              <Text style={styles.pickActionText}>
                {t('homeLanding.wear_this')}
              </Text>
              <Icons.Heart width={20} height={20} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};
