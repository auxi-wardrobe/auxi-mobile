import React, { useEffect, useRef, useState } from 'react';
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
 * Outfits are revealed 3 at a time: outfits[0:3], then [3:6], [6:9]… via a
 * "Discover more options" CTA at the foot of the last revealed card; the CTA
 * is hidden once every outfit is shown (so never when outfits.length <= 3).
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
  // (on the last revealed card) reveals the next 3. Local state: the panel
  // unmounts on close / re-run, so a fresh result always starts at 3.
  const [visibleCount, setVisibleCount] = useState(OUTFITS_PAGE_SIZE);
  const pagerRef = useRef<ScrollView>(null);
  const pendingScrollTo = useRef<number | null>(null);

  const visible = outfits.slice(0, visibleCount);
  const hasMore = outfits.length > visibleCount;

  const onLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (next !== pageIndex) onPageChange(Math.min(Math.max(next, 0), visible.length - 1));
  };

  const showMore = () => {
    const firstNew = visibleCount;
    track('make_it_yours_more_options_tapped', {
      shown_count: visibleCount,
      outfit_count: outfits.length,
    });
    pendingScrollTo.current = firstNew;
    setVisibleCount(firstNew + OUTFITS_PAGE_SIZE);
    onPageChange(firstNew);
  };

  // Once the new pages exist, glide to the first newly revealed outfit.
  useEffect(() => {
    const target = pendingScrollTo.current;
    if (target === null || !pageWidth) return;
    pendingScrollTo.current = null;
    pagerRef.current?.scrollTo({ x: target * pageWidth, animated: true });
  }, [visibleCount, pageWidth]);

  return (
    <View style={styles.panel} testID="make-it-yours-result">
      <Text style={styles.title} accessibilityRole="header">
        {t('makeItYours.result_title')}
      </Text>

      <View style={styles.resultBlock}>
        <ScrollView
          ref={pagerRef}
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
            >
              <View
                style={styles.pageTiles}
                accessibilityLabel={t('makeItYours.a11y_outfit_page', {
                  index: index + 1,
                  count: visible.length,
                })}
              >
                {filledItems(outfit).map(item => (
                  <OwnedTile key={item.id} item={item} />
                ))}
              </View>
              {hasMore && index === visible.length - 1 ? (
                <MButton
                  variant="secondary"
                  size="sm"
                  onPress={showMore}
                  testID="make-it-yours-discover-more"
                >
                  {t('makeItYours.discover_more')}
                </MButton>
              ) : null}
            </View>
          ))}
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
