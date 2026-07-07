/**
 * Step 3/3 · Body shape (AU-358). Controls-only: the prompt bubble is rendered
 * by the screen-level transcript. This renders a row of the 3 AI-GENERATED
 * body-shape PHOTOS (slim/average/fuller) as tappable thumbnails; tapping any
 * opens the expanded full-screen carousel (`BodyShapeCarousel`) where the user
 * confirms a build. When only 1–2/3 builds came back (`partial`), a regenerate
 * affordance is offered.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { theme } from '../../theme/theme';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { BodyShapeId, GeneratedShape } from './body-shapes';
import { BodyShapeCarousel } from './BodyShapeCarousel';

interface StepBodyShapeProps {
  /** The 3 generated body-shape photos (already sorted slim→average→fuller). */
  shapes: GeneratedShape[];
  /** True when only 1–2/3 builds succeeded — show the regenerate affordance. */
  partial?: boolean;
  selectedShape: BodyShapeId | null;
  onSelectShape: (shape: BodyShapeId) => void;
  /** Re-run the 3-shape generation (offered on partial). */
  onRegenerate?: () => void;
  // AU-346 (1.1): reusable-profile opt-in, surfaced inside the carousel modal.
  optIn: boolean;
  onToggleOptIn: () => void;
}

export const StepBodyShape: React.FC<StepBodyShapeProps> = ({
  shapes,
  partial,
  selectedShape,
  onSelectShape,
  onRegenerate,
  optIn,
  onToggleOptIn,
}) => {
  const { t } = useTranslation();
  const [expandedShape, setExpandedShape] = useState<BodyShapeId | null>(null);

  return (
    <View style={styles.container} testID="stom-step-3">
      <View style={styles.options}>
        {shapes.map(option => {
          const isSelected = option.shape === selectedShape;
          return (
            <TouchableOpacity
              key={option.shape}
              testID={`stom-shape-option-${option.shape}`}
              accessibilityRole="button"
              accessibilityLabel={t(`seeThisOnMe.shapes.${option.shape}`)}
              activeOpacity={0.85}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => setExpandedShape(option.shape)}
            >
              <LoadableRemoteImage
                uri={option.image_url}
                resizeMode="cover"
                skeletonTestID={`stom-shape-option-image-skeleton-${option.shape}`}
              />
              <View style={styles.optionLabelRow}>
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {t(`seeThisOnMe.shapes.${option.shape}`)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Only 1–2/3 builds returned — let the user retry the generation. */}
      {partial && onRegenerate ? (
        <View style={styles.partialRow}>
          <Text style={styles.partialHint}>
            {t('seeThisOnMe.shapesPartial')}
          </Text>
          <PillButton
            testID="stom-shapes-regenerate"
            title={t('seeThisOnMe.regenerate')}
            variant="text"
            onPress={onRegenerate}
          />
        </View>
      ) : null}

      <BodyShapeCarousel
        visible={expandedShape !== null}
        shapes={shapes}
        initialShape={expandedShape}
        optIn={optIn}
        onToggleOptIn={onToggleOptIn}
        onRetake={() => setExpandedShape(null)}
        onUse={shape => {
          setExpandedShape(null);
          onSelectShape(shape);
        }}
      />
    </View>
  );
};

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
  optionSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaAction,
  },
  optionLabelRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  optionLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.white,
    textAlign: 'center',
  },
  partialRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  partialHint: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.m,
  },
});
