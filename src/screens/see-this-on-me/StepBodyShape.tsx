/**
 * Step 3/3 · Body shape (AU-358). Controls-only: the prompt bubble is rendered
 * by the screen-level transcript. This renders a row of the 3 AI-GENERATED
 * body-shape PHOTOS (slim/average/fuller) as tappable thumbnails; tapping any
 * opens the expanded full-screen carousel (`BodyShapeCarousel`) where the user
 * confirms a build. When only 1–2/3 builds came back (`partial`), a regenerate
 * affordance is offered.
 *
 * B2 (see-on-me redesign) Next-button gating: `onSelectShape` is now a
 * LIGHTWEIGHT selection only (records `selectedShape`, shows the selected
 * border on its tile) — it does NOT fire the render. A bottom "Next" button
 * is disabled until a shape is selected; tapping it calls `onConfirm`, which
 * the orchestrator wires to the actual submit (persist profile → render).
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
  /** Records the selection only — does NOT fire the render (B2 gating). */
  onSelectShape: (shape: BodyShapeId) => void;
  /** Bottom "Next" button — submits `selectedShape` (persist + render). */
  onConfirm: () => void;
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
  onConfirm,
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

      {/* B2: Next is disabled until a shape is selected (via the expand sheet's
          "Use this photo") — tapping fires the real submit + render. Figma
          4814:13267 (enabled) is solid filled; 4814:12741 (disabled) is
          outline-only + faded — PillButton's `disabled` style only applies a
          50%-opacity overlay on top of the variant, so a disabled `filled`
          renders as a flat gray pill, not the outlined look. Swap the variant
          itself, not just the disabled overlay. */}
      <PillButton
        testID="stom-shape-next"
        title={t('seeThisOnMe.next')}
        variant={selectedShape ? 'filled' : 'outline'}
        disabled={!selectedShape}
        onPress={onConfirm}
      />

      <BodyShapeCarousel
        // Remount per tile tap so the carousel's internal page index
        // re-derives from the NEW `initialShape` (its `useState` initializer
        // only runs once per mount) — otherwise tapping a different tile after
        // the first open would keep showing whichever page was current.
        key={expandedShape ?? 'closed'}
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
