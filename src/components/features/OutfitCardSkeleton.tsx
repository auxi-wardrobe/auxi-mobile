// AU-310 — OutfitCardSkeleton
//
// Loading placeholder that occupies the EXACT same slots as the final
// OutfitCardGrid for a given count (shared outfit-card-layouts descriptor) →
// zero layout shift when the real images arrive.
//
// Animation = spec Option B opacity-breathing: one shared Animated.Value loops
// 0.92↔1 over ~1700ms ease-in-out, applied to every cell. Soft neutral surface
// (figmaCardSurface), radius 12 — NO high-contrast gray, NO movement, NO
// gradient lib (JS-only constraint; the Figma gradient is intentionally swapped
// for breathing — see figma-extraction-outfit-cards.md).
//
// Reduced motion → hold a static 1.0 (no breathing).

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';
import {
  GridCell,
  HeroSection,
  computeOutfitCardGeometry,
  getOutfitCardLayout,
} from './outfit-card-layouts';
import { useReduceMotion } from './useReduceMotion';

const BREATHE_MIN = 0.92;
const BREATHE_MAX = 1;
const BREATHE_HALF_MS = 850; // full 0.92→1→0.92 cycle ≈ 1700ms.

type SkeletonCardProps = {
  width?: number; // omitted → flex:1 fill
  height: number;
  flex: boolean;
  opacity: Animated.Value | number;
};

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width,
  height,
  flex,
  opacity,
}) => (
  <View style={flex ? styles.cellFlex : [styles.cellFixed, { width }]}>
    <Animated.View style={[styles.card, { height, opacity }]} />
  </View>
);

type OutfitCardSkeletonProps = {
  // Item count to mirror. Defaults to 4 (the Figma "Home - loading" 2×2 frame).
  count?: number;
  screenWidth: number;
  testID?: string;
};

export const OutfitCardSkeleton: React.FC<OutfitCardSkeletonProps> = ({
  count = 4,
  screenWidth,
  testID,
}) => {
  const reduceMotion = useReduceMotion();
  const breathe = useRef(new Animated.Value(BREATHE_MAX)).current;
  const layout = getOutfitCardLayout(count);
  const geometry = computeOutfitCardGeometry(screenWidth);

  useEffect(() => {
    if (reduceMotion) {
      breathe.setValue(BREATHE_MAX);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: BREATHE_MIN,
          duration: BREATHE_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: BREATHE_MAX,
          duration: BREATHE_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, reduceMotion]);

  if (!layout) {
    return null;
  }

  const opacity: Animated.Value | number = reduceMotion ? BREATHE_MAX : breathe;

  const renderCell = (
    key: string,
    width: number | undefined,
    height: number,
    flex: boolean,
  ) => (
    <SkeletonCard
      key={key}
      width={width}
      height={height}
      flex={flex}
      opacity={opacity}
    />
  );

  const renderRow = (
    cells: GridCell[],
    align: 'start' | 'center' | 'fill',
    nodeKey: string,
  ) => {
    const flex = align === 'fill';
    const isTwoCol = layout.family === 'two-col';
    const isFullWidthRow = flex && cells.length === 1 && isTwoCol;

    const flatWidth = isTwoCol ? geometry.twoColWidth : geometry.smallWidth;
    const flatHeight = isTwoCol ? geometry.twoColHeight : geometry.smallHeight;
    const fillHeight = isFullWidthRow
      ? geometry.fullHeight
      : isTwoCol
      ? geometry.twoColHeight
      : geometry.smallHeight;

    const justify = align === 'center' ? 'center' : 'flex-start';

    return (
      <View key={nodeKey} style={[styles.row, { justifyContent: justify }]}>
        {cells.map((_c, i) =>
          renderCell(
            `${nodeKey}-${i}`,
            flex ? undefined : flatWidth,
            flex ? fillHeight : flatHeight,
            flex,
          ),
        )}
      </View>
    );
  };

  const renderHero = (_hero: HeroSection, nodeKey: string) => (
    <View key={nodeKey} style={styles.heroSection}>
      {renderCell(
        `${nodeKey}-hero`,
        geometry.heroWidth,
        geometry.heroHeight,
        false,
      )}
      <View style={styles.heroStack}>
        {renderCell(
          `${nodeKey}-s0`,
          geometry.smallWidth,
          geometry.smallHeight,
          false,
        )}
        {renderCell(
          `${nodeKey}-s1`,
          geometry.smallWidth,
          geometry.smallHeight,
          false,
        )}
      </View>
    </View>
  );

  return (
    <View testID={testID} style={styles.grid}>
      {layout.nodes.map((node, i) =>
        node.type === 'hero'
          ? renderHero(node, `skeleton-node-${i}`)
          : renderRow(node.cells, node.align, `skeleton-node-${i}`),
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 4,
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
  },
});
