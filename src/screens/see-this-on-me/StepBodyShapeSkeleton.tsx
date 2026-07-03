/**
 * Loading placeholder for Step 3/3 · Body shape (AU-358). Rendered in the
 * transcript while the 3 AI body-shape photos generate, so the user stays in
 * the conversational flow instead of a full-screen loader. Mirrors
 * `StepBodyShape`'s `container` / `options` / `option` layout EXACTLY (row of 3
 * flex tiles, 3:4, `figmaTile` radius) so the swap to the real photos causes
 * zero layout shift.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';
import { SkeletonTile } from '../../components/features/SkeletonTile';

export const StepBodyShapeSkeleton: React.FC = () => (
  <View style={styles.container} testID="stom-step-3-skeleton">
    <View style={styles.options}>
      {[0, 1, 2].map(i => (
        <SkeletonTile
          key={i}
          testID={`stom-shape-skeleton-${i}`}
          style={styles.tile}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.l,
  },
  options: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
  },
});
