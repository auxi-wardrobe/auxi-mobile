import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { track } from '../../services/analytics';
import type {
  MakeItYoursItem,
  MakeItYoursOutfit,
} from '../../services/makeItYoursService';
import { makeItYoursStyles as styles } from './makeItYoursStyles';
import { TileImage } from './MakeItYoursTileImage';

/** An owned piece. Only the user's own items are ever shown (user decision
 * 2026-09-27): a slot the user can't fill is simply left out — never shown
 * with a catalog / inspiration image. */
const filledItems = (outfit: MakeItYoursOutfit): MakeItYoursItem[] =>
  outfit.slots.flatMap(slot => (slot.item ? [slot.item] : []));

/** Outfits revealed up front and per "Discover more options" tap. */
export const OUTFITS_PAGE_SIZE = 3;

const OwnedTile: React.FC<{ item: MakeItYoursItem }> = ({ item }) => (
  <View style={styles.tile} accessible accessibilityLabel={item.name ?? item.category}>
    <TileImage item={item} />
  </View>
);

type Props = {
  outfits: MakeItYoursOutfit[];
  pageIndex: number;
  onPageChange: (index: number) => void;
  /** True when the outfit on screen is saved → prompt links to Favourites. */
  currentSaved: boolean;
  onOpenFavourites: () => void;
};

/**
 * Make It Yours result (Figma 5456:19149): title, a swipeable page per
 * generated outfit (3:4 tiles, 4 apart), line dots, See on Me prompt.
 * Outfits are revealed 3 at a time: outfits[0:3], then [3:6], [6:9]… The
 * "Discover more options" CTA is its own page, reached by swiping past the
 * last revealed card; tapping it turns that page into the next outfit. It's
 * gone once every outfit is shown (so never when outfits.length <= 3).
 * The summary card + match stars in the frame are OUT of AU-458 scope
 * (user decision 2026-09-26) and intentionally not rendered.
 */
export const MakeItYoursResultPanel: React.FC<Props> = ({
  outfits,
  pageIndex,
  onPageChange,
  currentSaved,
  onOpenFavourites,
}) => {
  const { t } = useTranslation();
  const [pageWidth, setPageWidth] = useState(0);
  // Only the first 3 outfits are swipeable; each "Discover more options" tap
  // reveals the next 3. Local state: the panel unmounts on close / re-run, so
  // a fresh result always starts at 3.
  const [visibleCount, setVisibleCount] = useState(OUTFITS_PAGE_SIZE);

  const visible = outfits.slice(0, visibleCount);
  const hasMore = outfits.length > visibleCount;

  const onLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);
  // The CTA page isn't an outfit: clamping keeps the current (save) outfit on
  // the last revealed card while the CTA is on screen — never an unrevealed one.
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const next = Math.min(
      Math.max(Math.round(e.nativeEvent.contentOffset.x / pageWidth), 0),
      visible.length - 1,
    );
    if (next !== pageIndex) onPageChange(next);
  };

  // The CTA page sits at index `visibleCount`, so once the next 3 render the
  // pager is already resting on the first new outfit — no scroll needed.
  const showMore = () => {
    track('make_it_yours_more_options_tapped', {
      shown_count: visibleCount,
      outfit_count: outfits.length,
    });
    setVisibleCount(visibleCount + OUTFITS_PAGE_SIZE);
    onPageChange(visibleCount);
  };

  return (
    <View style={styles.panel} testID="make-it-yours-result">
      <Text style={styles.title} accessibilityRole="header">
        {t('makeItYours.result_title')}
      </Text>

      <View style={styles.resultBlock}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={onLayout}
          onMomentumScrollEnd={onMomentumEnd}
          style={styles.pager}
          testID="make-it-yours-pager"
        >
          {visible.map((outfit, index) => (
            <View
              key={outfit.outfit_hash}
              style={[styles.page, { width: pageWidth || undefined }]}
              testID={`make-it-yours-outfit-${index}`}
              accessibilityLabel={t('makeItYours.a11y_outfit_page', {
                index: index + 1,
                count: visible.length,
              })}
            >
              {filledItems(outfit).map(item => (
                <OwnedTile key={item.id} item={item} />
              ))}
            </View>
          ))}
          {hasMore ? (
            <View
              style={[styles.morePage, { width: pageWidth || undefined }]}
              testID="make-it-yours-more-page"
            >
              <MButton
                variant="secondary"
                size="sm"
                onPress={showMore}
                testID="make-it-yours-discover-more"
              >
                {t('makeItYours.discover_more')}
              </MButton>
            </View>
          ) : null}
        </ScrollView>

        {visible.length > 1 ? (
          <View style={styles.dots} testID="make-it-yours-dots">
            {visible.map((outfit, index) => (
              <View
                key={outfit.outfit_hash}
                style={[styles.dot, index === pageIndex ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {currentSaved ? (
        <MButton
          variant="text"
          size="sm"
          onPress={onOpenFavourites}
          testID="make-it-yours-open-favourites"
        >
          {t('makeItYours.open_favourites')}
        </MButton>
      ) : (
        <Text style={styles.prompt} testID="make-it-yours-see-on-me-prompt">
          {t('makeItYours.see_on_me_prompt')}
        </Text>
      )}
    </View>
  );
};
