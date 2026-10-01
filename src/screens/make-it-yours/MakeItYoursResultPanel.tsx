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

  const onLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (next !== pageIndex) onPageChange(Math.min(Math.max(next, 0), outfits.length - 1));
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
          {outfits.map((outfit, index) => (
            <View
              key={outfit.outfit_hash}
              style={[styles.page, { width: pageWidth || undefined }]}
              testID={`make-it-yours-outfit-${index}`}
              accessibilityLabel={t('makeItYours.a11y_outfit_page', {
                index: index + 1,
                count: outfits.length,
              })}
            >
              {filledItems(outfit).map(item => (
                <OwnedTile key={item.id} item={item} />
              ))}
            </View>
          ))}
        </ScrollView>

        {outfits.length > 1 ? (
          <View style={styles.dots} testID="make-it-yours-dots">
            {outfits.map((outfit, index) => (
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
