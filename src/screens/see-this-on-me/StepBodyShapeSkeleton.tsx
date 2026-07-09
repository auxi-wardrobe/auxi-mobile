/**
 * Loading placeholder for Step 3/3 · Body shape (AU-358). Rendered in the
 * transcript while the 3 AI body-shape photos generate, so the user stays in
 * the conversational flow instead of a full-screen loader. Mirrors
 * `StepBodyShape`'s card structure so the swap to the real photos causes zero
 * layout shift.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';
import { SkeletonTile } from '../../components/features/SkeletonTile';

export const StepBodyShapeSkeleton: React.FC = () => (
  <View style={styles.container} testID="stom-step-3-skeleton">
    <View style={styles.options}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          testID={`stom-shape-skeleton-option-${i}`}
          style={styles.option}
        >
          <SkeletonTile
            testID={`stom-shape-skeleton-${i}`}
            style={styles.imageSkeleton}
          />
          <View style={styles.optionLabelRow}>
            <SkeletonTile
              testID={`stom-shape-skeleton-label-${i}`}
              style={styles.labelSkeleton}
            />
          </View>
        </View>
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
  option: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.figmaTile,
  },
  optionLabelRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  labelSkeleton: {
    flex: 0,
    width: 44,
    height: 10,
    borderRadius: 5,
  },
});
