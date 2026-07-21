import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Item } from '../../../types/item';
import { motion } from '../../../theme/motion';
import { HomeView } from '../../../components/features/HomeViewToggleFooter';
import { OutfitCardCaption } from '../../../components/features/OutfitCardCaption';
import { CollageSheetCanvas } from '../../../components/features/CollageSheetCanvas';
import { SkeletonTile } from '../../../components/features/SkeletonTile';
import { PinTilePill } from '../../../components/features/PinTilePill';
import {
  COLLAGE_SURFACE_HEIGHT,
  COLLAGE_SURFACE_WIDTH,
  GRID_GAP,
} from '../constants';
import { computeHeroRowHeight, pickLayout } from '../grid-layout';
import { OutfitReveal, OutfitSheetWithGrid } from '../types';
import { styles } from '../styles';
import { GarmentPreview } from './GarmentPreview';

export const OptionSheet = React.memo(
  ({
    cellKey,
    outfit,
    pinnedItemId,
    reveal,
    onItemPress,
    onTogglePin,
    homeView,
    onCollageDragActiveChange,
    isGenerating = false,
    wornDaysAgo = null,
  }: {
    cellKey: string;
    outfit: OutfitSheetWithGrid;
    pinnedItemId: string | null;
    reveal: OutfitReveal;
    onItemPress: (item: Item) => void;
    onTogglePin: (item: Item) => void;
    homeView: HomeView;
    onCollageDragActiveChange: (active: boolean) => void;
    isGenerating?: boolean;
    /**
     * Days since the user last wore this outfit (null when never worn). Passed
     * through to the caption so a re-surfaced look reads "Worn N days ago".
     */
    wornDaysAgo?: number | null;
  }) => {
    const { t } = useTranslation();
    const items = outfit.items;
    const layout = pickLayout(items);
    const itemCount = items.length;

    const revealAnim = useRef(
      new Animated.Value(reveal === 'none' ? 1 : 0),
    ).current;
    useEffect(() => {
      if (reveal === 'none') {
        revealAnim.setValue(1);
        return;
      }
      Animated.timing(revealAnim, {
        toValue: 1,
        duration:
          reveal === 'full' ? motion.duration.reveal : motion.duration.fast,
        easing: motion.easing.enter,
        useNativeDriver: true,
      }).start();
    }, [reveal, revealAnim]);
    const revealStyle = {
      opacity: revealAnim,
      transform: [
        {
          translateY: revealAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [motion.distance.sm, 0],
          }),
        },
      ],
    };

    const renderTile = (
      item: Item | null,
      flatTileIndex: number,
      style?: object,
    ) => {
      if (!item) {
        return (
          <View
            key={`card-placeholder-${outfit.outfitHash}-${flatTileIndex}`}
            style={[styles.card, style, styles.cardPlaceholder]}
          />
        );
      }
      const isPinned = item.id === pinnedItemId;
      if (isGenerating && !isPinned) {
        return (
          <View
            key={`card-skel-${outfit.outfitHash}-${flatTileIndex}`}
            style={[styles.card, style]}
          >
            <SkeletonTile
              testID={`home-tile-skeleton-${cellKey}-${flatTileIndex}`}
            />
          </View>
        );
      }
      return (
        <TouchableOpacity
          key={`card-${outfit.outfitHash}-${flatTileIndex}`}
          testID={`home-tile-${cellKey}-${flatTileIndex}`}
          accessibilityLabel={`home-tile-${cellKey}-${flatTileIndex}`}
          activeOpacity={0.86}
          style={[styles.card, style]}
          onPress={() => onItemPress(item)}
          onLongPress={() => onTogglePin(item)}
          delayLongPress={500}
        >
          <GarmentPreview item={item} />
          {item.isExploration ? (
            <View
              testID={`home-tile-yourpiece-${cellKey}-${flatTileIndex}`}
              style={styles.yourPieceBadge}
              accessibilityLabel={t('home.a11y_your_piece')}
            >
              <Text style={styles.yourPieceBadgeText}>
                {t('home.your_piece_badge')}
              </Text>
            </View>
          ) : null}
          {/* Pin affordance shows on every item — common/system items are
              pinnable too (confirm sheet shows the "common" badge). */}
          <PinTilePill
            isPinned={isPinned}
            testID={`home-tile-pin-${cellKey}-${flatTileIndex}`}
            onPress={() => onTogglePin(item)}
          />
        </TouchableOpacity>
      );
    };

    const renderLayout = () => {
      if (!layout) {
        return null;
      }

      if (layout.kind === 'fullPlusSmall') {
        return (
          <View style={[styles.gridWrap, styles.gridWrapCenter]}>
            {renderTile(layout.full, 0, styles.cardFull)}
            {layout.small
              ? renderTile(layout.small, 1, styles.cardFixedSmall)
              : null}
          </View>
        );
      }

      if (layout.kind === 'twoRowOneLarge') {
        return (
          <View style={[styles.gridWrap, styles.gridWrapStart, styles.gridFill]}>
            <View style={[styles.cardRow, styles.cardRowFill]}>
              <View style={styles.cardShellFixed}>
                {renderTile(layout.row1[0], 0)}
              </View>
              <View style={styles.cardShellFixed}>
                {renderTile(layout.row1[1], 1)}
              </View>
            </View>
            <View style={[styles.cardRow, styles.cardRowFill]}>
              <View style={styles.cardShellFixed}>
                {renderTile(layout.row2Large, 2)}
              </View>
              <View style={[styles.cardShellFixed, styles.cardCellHidden]} />
            </View>
          </View>
        );
      }

      if (layout.kind === 'twoByTwo') {
        return (
          <View style={[styles.gridWrap, styles.gridWrapStart, styles.gridFill]}>
            {layout.rows.map((row, rowIndex) => (
              <View
                key={`row-${outfit.outfitHash}-${rowIndex}`}
                style={[styles.cardRow, styles.cardRowFill]}
              >
                {row.map((item, itemIndex) => (
                  <View
                    key={`shell-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                    style={styles.cardShellFixed}
                  >
                    {renderTile(item, rowIndex * 2 + itemIndex)}
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      }

      const heroRowHeight = computeHeroRowHeight(layout.rest.length);
      const heroRowStyle = { height: heroRowHeight };
      const heroStackCellHeight = Math.floor((heroRowHeight - GRID_GAP) / 2);
      const heroStackCellStyle = { height: heroStackCellHeight };
      const restRows: (Item | null)[][] = [];
      for (let i = 0; i < layout.rest.length; i += 3) {
        const slice: (Item | null)[] = layout.rest.slice(i, i + 3);
        while (slice.length < 3) slice.push(null);
        restRows.push(slice);
      }
      return (
        <View style={[styles.gridWrap, styles.gridWrapStart]}>
          <View style={[styles.heroRow, { height: heroRowHeight }]}>
            <View style={styles.heroCol}>
              {renderTile(layout.hero, 0, heroRowStyle)}
            </View>
            <View style={styles.heroStackCol}>
              <View style={styles.heroStackCell}>
                {renderTile(layout.stack[0], 1, heroStackCellStyle)}
              </View>
              <View style={styles.heroStackCell}>
                {renderTile(layout.stack[1], 2, heroStackCellStyle)}
              </View>
            </View>
          </View>
          {restRows.map((row, rowIndex) => (
            <View
              key={`rest-row-${outfit.outfitHash}-${rowIndex}`}
              style={styles.cardRow}
            >
              {row.map((item, itemIndex) => {
                const isNarrow = itemIndex === 2;
                const cellStyle = isNarrow
                  ? styles.cardShellNarrow
                  : styles.cardShell;
                if (!item) {
                  return (
                    <View
                      key={`rest-pad-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                      style={[cellStyle, styles.cardCellHidden]}
                    />
                  );
                }
                return (
                  <View
                    key={`rest-shell-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                    style={cellStyle}
                  >
                    {renderTile(
                      item,
                      3 + rowIndex * 3 + itemIndex,
                      isNarrow ? styles.cardFixedSmall : heroRowStyle,
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    };

    return (
      <View testID={`home-outfit-sheet-${cellKey}`} style={styles.outfitCell}>
        <View style={styles.optionSheet}>
          <OutfitCardCaption
            testID={`home-card-caption-${cellKey}`}
            caption={outfit.caption}
            scheduled={outfit.scheduled}
            wornDaysAgo={wornDaysAgo}
          />

          <ScrollView
            style={styles.gridScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridScrollContent}
            scrollEnabled={homeView !== 'collage'}
          >
            <Animated.View
              testID={`home-outfit-grid-${itemCount}`}
              style={[styles.gridFill, revealStyle]}
            >
              {homeView === 'collage' ? (
                <CollageSheetCanvas
                  testID={`home-collage-${cellKey}`}
                  outfitItems={items}
                  surfaceWidth={COLLAGE_SURFACE_WIDTH}
                  surfaceHeight={COLLAGE_SURFACE_HEIGHT}
                  onDragActiveChange={onCollageDragActiveChange}
                  onItemPress={onItemPress}
                />
              ) : (
                renderLayout()
              )}
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    );
  },
);
OptionSheet.displayName = 'OptionSheet';
