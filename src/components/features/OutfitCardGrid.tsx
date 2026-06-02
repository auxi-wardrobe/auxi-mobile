// AU-310 — OutfitCardGrid
//
// Renders an outfit's item cards from the pure layout descriptor
// (outfit-card-layouts.ts) with:
//   - count-driven layouts 1/2/3/4/5/6/>6 (matches the AU-310 Figma frames),
//   - staggered content reveal (hero → supporting → accessory),
//   - per-card image fade-in (reserve dims, no white flash / pop-in),
//   - reduced-motion support (opacity-only, no translate),
//   - the existing tile chrome (pin badge + "common" rarity tag) lifted from
//     HomeScreen's GarmentPreview, with the onPress / onTogglePin handlers.
//
// JS-only: built-in RN `Animated` only — no Reanimated / Moti / gradient lib.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../theme/theme';
import { Item } from '../../types/item';
import { resolveItemImage } from '../../utils/url';
import IconHomePin from '../../assets/images/icon_home_pin.svg';
import {
  GridCell,
  HeroSection,
  RevealGroup,
  computeOutfitCardGeometry,
  getOutfitCardLayout,
  revealDelay,
} from './outfit-card-layouts';
import { useReduceMotion } from './useReduceMotion';

const REVEAL_DURATION_MS = 300;
const REVEAL_TRANSLATE_Y = 8;
const IMAGE_FADE_MS = 200;

type CardSize = {
  width?: number; // omitted → flex:1 (fill the row column)
  height: number;
};

type AnimatedCardProps = {
  item: Item | null;
  size: CardSize;
  flex: boolean; // true → flex:1 cell (no fixed width)
  revealGroup: RevealGroup;
  reduceMotion: boolean;
  isPinned: boolean;
  testID?: string;
  pinTestID?: string;
  onPress?: (item: Item) => void;
  onTogglePin?: (item: Item) => void;
};

// One card slot: animated reveal wrapper + image (with its own fade-in) +
// pin badge + rarity tag. Empty slots (item===null) render a transparent
// shell that preserves grid geometry without drawing a surface.
const AnimatedCard: React.FC<AnimatedCardProps> = ({
  item,
  size,
  flex,
  revealGroup,
  reduceMotion,
  isPinned,
  testID,
  pinTestID,
  onPress,
  onTogglePin,
}) => {
  // Reveal animation: opacity 0→1 (+ translateY 8→0 unless reduced motion).
  const reveal = useRef(new Animated.Value(0)).current;
  // Image fade-in: starts at 0, animates to 1 on load.
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: REVEAL_DURATION_MS,
      delay: revealDelay(revealGroup),
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    // Re-run when the slot's item changes so a swapped item re-reveals.
  }, [reveal, revealGroup, item?.id]);

  const handleImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: IMAGE_FADE_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const cellStyle = flex
    ? styles.cellFlex
    : [styles.cellFixed, { width: size.width }];

  const revealStyle = {
    opacity: reveal,
    transform: reduceMotion
      ? []
      : [
          {
            translateY: reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [REVEAL_TRANSLATE_Y, 0],
            }),
          },
        ],
  };

  if (!item) {
    // Intentionally-empty slot — transparent, holds geometry only.
    return (
      <View style={cellStyle}>
        <View
          style={[styles.card, { height: size.height }, styles.cardEmpty]}
        />
      </View>
    );
  }

  const imageUrl = resolveItemImage(item);

  return (
    <View style={cellStyle}>
      <Animated.View style={revealStyle}>
        <TouchableOpacity
          testID={testID}
          accessibilityLabel={testID}
          activeOpacity={0.86}
          style={[
            styles.card,
            { height: size.height },
            isPinned && styles.cardPinned,
          ]}
          onPress={() => onPress?.(item)}
          onLongPress={() => onTogglePin?.(item)}
          delayLongPress={500}
        >
          {imageUrl ? (
            <Animated.Image
              source={{ uri: imageUrl }}
              style={[styles.cardImage, { opacity: imageOpacity }]}
              resizeMode="contain"
              onLoad={handleImageLoad}
            />
          ) : (
            <View style={styles.cardFallback} />
          )}

          <View style={styles.cardTag}>
            <Text style={styles.cardTagText}>common</Text>
          </View>

          <TouchableOpacity
            testID={pinTestID}
            activeOpacity={0.7}
            onPress={e => {
              e.stopPropagation();
              onTogglePin?.(item);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.pinBadge, isPinned && styles.pinBadgeActive]}
            accessibilityRole="button"
            accessibilityLabel={isPinned ? 'Unpin item' : 'Pin item'}
          >
            <IconHomePin width={24} height={24} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

type OutfitCardGridProps = {
  items: Item[];
  screenWidth: number;
  pinnedItemId?: string | null;
  // sheetIndex namespaces tile testIDs across stacked sheets (matches the
  // legacy `home-tile-<sheet>-<flat>` scheme so Maestro selectors survive).
  sheetIndex: number;
  onItemPress?: (item: Item) => void;
  onTogglePin?: (item: Item) => void;
  testID?: string;
};

export const OutfitCardGrid: React.FC<OutfitCardGridProps> = ({
  items,
  screenWidth,
  pinnedItemId,
  sheetIndex,
  onItemPress,
  onTogglePin,
  testID,
}) => {
  const reduceMotion = useReduceMotion();
  const filled = useMemo(() => items.filter((it): it is Item => !!it), [items]);
  const layout = getOutfitCardLayout(filled.length);
  const geometry = useMemo(
    () => computeOutfitCardGeometry(screenWidth),
    [screenWidth],
  );

  if (!layout) {
    return null;
  }

  // Flat running index for tile testIDs — matches the legacy ordering
  // (row-major; hero first, then stack, then rest) so QA selectors hold.
  let flatIndex = 0;

  const renderCell = (
    c: GridCell,
    size: CardSize,
    flex: boolean,
  ): React.ReactNode => {
    const idx = flatIndex;
    flatIndex += 1;
    const item = c.itemIndex == null ? null : filled[c.itemIndex] ?? null;
    const isPinned = !!item && item.id === pinnedItemId;
    return (
      <AnimatedCard
        key={`cell-${sheetIndex}-${idx}`}
        item={item}
        size={size}
        flex={flex}
        revealGroup={c.revealGroup}
        reduceMotion={reduceMotion}
        isPinned={isPinned}
        testID={item ? `home-tile-${sheetIndex}-${idx}` : undefined}
        pinTestID={
          item
            ? isPinned
              ? `home-tile-pin-${sheetIndex}-${idx}-set`
              : `home-tile-pin-${sheetIndex}-${idx}`
            : undefined
        }
        onPress={onItemPress}
        onTogglePin={onTogglePin}
      />
    );
  };

  const renderRow = (
    cells: GridCell[],
    align: 'start' | 'center' | 'fill',
    rowKey: string,
  ) => {
    const flex = align === 'fill';
    // Non-fill rows use the family's card width: two-col → twoColWidth,
    // hero-col → smallWidth. Full-width single-cell fill rows use fullWidth.
    const isTwoCol = layout.family === 'two-col';
    const isFullWidthRow = flex && cells.length === 1 && isTwoCol;

    const flatSize: CardSize = isTwoCol
      ? { width: geometry.twoColWidth, height: geometry.twoColHeight }
      : { width: geometry.smallWidth, height: geometry.smallHeight };

    const fillHeight = isFullWidthRow
      ? geometry.fullHeight
      : isTwoCol
      ? geometry.twoColHeight
      : geometry.smallHeight;

    const justify =
      align === 'center'
        ? 'center'
        : align === 'fill'
        ? 'flex-start'
        : 'flex-start';

    return (
      <View key={rowKey} style={[styles.row, { justifyContent: justify }]}>
        {cells.map(c =>
          renderCell(c, flex ? { height: fillHeight } : flatSize, flex),
        )}
      </View>
    );
  };

  const renderHero = (hero: HeroSection, nodeKey: string) => (
    <View key={nodeKey} style={styles.heroSection}>
      {renderCell(
        hero.hero,
        { width: geometry.heroWidth, height: geometry.heroHeight },
        false,
      )}
      <View style={styles.heroStack}>
        {renderCell(
          hero.stack[0],
          { width: geometry.smallWidth, height: geometry.smallHeight },
          false,
        )}
        {renderCell(
          hero.stack[1],
          { width: geometry.smallWidth, height: geometry.smallHeight },
          false,
        )}
      </View>
    </View>
  );

  return (
    <View testID={testID} style={styles.grid}>
      {layout.nodes.map((node, i) =>
        node.type === 'hero'
          ? renderHero(node, `node-${sheetIndex}-${i}`)
          : renderRow(node.cells, node.align, `node-${sheetIndex}-${i}`),
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 4, // GAP — Figma 193−189
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-start',
  },
  cellFlex: {
    flex: 1,
  },
  cellFixed: {
    alignSelf: 'flex-start',
  },
  heroSection: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-start',
  },
  heroStack: {
    gap: 4,
  },
  card: {
    borderRadius: theme.borderRadius.figmaTile, // 12
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmpty: {
    backgroundColor: theme.colors.transparent,
  },
  cardPinned: {
    borderWidth: 2,
    borderColor: theme.colors.figmaAction,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaBackground,
  },
  // Lifted verbatim from HomeScreen GarmentPreview chrome.
  cardTag: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    marginLeft: -28.5,
    width: 57,
    height: 19,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: theme.colors.figmaCardTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    // Inter-Regular 10/12 = Figma Text-xxs/Regular (rarity tag). Mapped to the
    // existing theme alias instead of a raw font literal (token-lint clean).
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
  pinBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.figmaSurface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  pinBadgeActive: {
    backgroundColor: theme.colors.figmaAction,
  },
});
