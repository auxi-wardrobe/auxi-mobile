/**
 * Step 3/3 · Body shape (Figma node 3395:9248). Controls-only: the body
 * thumbnail + prompt bubble are rendered by the screen-level transcript (see
 * SeeThisOnMeScreen `Transcript`). This renders the row of tappable shape
 * option tiles; tapping any tile opens the expanded full-screen carousel
 * (`BodyShapeCarousel`) where the user confirms a shape.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { BODY_SHAPE_OPTIONS, BodyShapeId } from './body-shapes';
import { BodyShapeCarousel } from './BodyShapeCarousel';

interface StepBodyShapeProps {
  selectedShape: BodyShapeId | null;
  onSelectShape: (shape: BodyShapeId) => void;
}

export const StepBodyShape: React.FC<StepBodyShapeProps> = ({
  selectedShape,
  onSelectShape,
}) => {
  const { t } = useTranslation();
  const [expandedShape, setExpandedShape] = useState<BodyShapeId | null>(null);

  return (
    <View style={styles.container} testID="stom-step-3">
      <View style={styles.options}>
        {BODY_SHAPE_OPTIONS.map(option => {
          const isSelected = option.id === selectedShape;
          return (
            <TouchableOpacity
              key={option.id}
              testID={`stom-shape-option-${option.id}`}
              accessibilityRole="button"
              accessibilityLabel={t(`seeThisOnMe.shapes.${option.labelKey}`)}
              activeOpacity={0.85}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => setExpandedShape(option.id)}
            >
              <Text style={styles.optionLabel} numberOfLines={1}>
                {t(`seeThisOnMe.shapes.${option.labelKey}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <BodyShapeCarousel
        visible={expandedShape !== null}
        initialShape={expandedShape}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.s,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaAction,
  },
  optionLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
});
