/**
 * Body-shape picker — expanded full-screen carousel (AU-358). Tap-to-expand
 * modal over a scrim: headline + a swipeable carousel of the 3 AI-GENERATED
 * body-shape PHOTOS with pagination dots + Retake / Use this photo actions.
 * Each page renders a real generated image (`image_url`), not a label.
 */
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import { BodyShapeId, GeneratedShape } from './body-shapes';

const { width: screenWidth } = Dimensions.get('window');

interface BodyShapeCarouselProps {
  visible: boolean;
  /** The generated builds to page through (sorted slim→average→fuller). */
  shapes: GeneratedShape[];
  initialShape: BodyShapeId | null;
  // AU-346 (1.1): the "save this as my reusable profile" opt-in lives here now
  // (default checked). When checked at "Use this photo", the screen persists the
  // shape + photos as the user's primary profile so future outfits skip capture.
  optIn: boolean;
  onToggleOptIn: () => void;
  onRetake: () => void;
  onUse: (shape: BodyShapeId) => void;
}

export const BodyShapeCarousel: React.FC<BodyShapeCarouselProps> = ({
  visible,
  shapes,
  initialShape,
  optIn,
  onToggleOptIn,
  onRetake,
  onUse,
}) => {
  const { t } = useTranslation();
  const initialIndex = Math.max(
    0,
    shapes.findIndex(s => s.shape === initialShape),
  );
  const [index, setIndex] = useState(initialIndex);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (next !== index) {
      setIndex(next);
    }
  };

  const current = shapes[index] ?? shapes[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRetake}
    >
      <View style={styles.scrim}>
        <View style={styles.sheet} testID="stom-shape-carousel">
          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>
              {t('seeThisOnMe.step3.expandedTitle')}
            </Text>
            <Text style={styles.headlineSubtext}>
              {t('seeThisOnMe.step3.expandedSubtitle')}
            </Text>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            contentOffset={{ x: initialIndex * screenWidth, y: 0 }}
            style={styles.carousel}
          >
            {shapes.map(option => (
              <View
                key={option.shape}
                style={styles.page}
                testID={`stom-shape-page-${option.shape}`}
              >
                <LoadableRemoteImage
                  uri={option.image_url}
                  style={styles.shapeImage}
                  resizeMode="cover"
                  skeletonTestID={`stom-shape-carousel-image-skeleton-${option.shape}`}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {shapes.map((option, i) => (
              <View
                key={option.shape}
                style={[
                  styles.dot,
                  i === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <PillButton
              testID="stom-shape-retake"
              title={t('seeThisOnMe.retake')}
              variant="text"
              onPress={onRetake}
            />
            <PillButton
              testID="stom-generate"
              title={t('seeThisOnMe.useThisPhoto')}
              variant="filled"
              onPress={() => current && onUse(current.shape)}
              style={styles.useButton}
            />
          </View>

          <TouchableOpacity
            testID="stom-optin"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: optIn }}
            accessibilityLabel={t('seeThisOnMe.optIn')}
            activeOpacity={0.8}
            style={styles.optInRow}
            onPress={onToggleOptIn}
          >
            <View style={[styles.checkbox, optIn && styles.checkboxChecked]}>
              {/* No standalone checkmark SVG exists in assets/icons — the
                  codebase's other checkbox (MCheckbox, design-system/lib)
                  already draws its check the same way: a rotated
                  border-left/border-bottom glyph, no icon asset. Reused that
                  pattern here instead of the semantically-wrong "+" icon. */}
              {optIn ? <View style={styles.checkmark} /> : null}
            </View>
            <View style={styles.optInTextBlock}>
              <Text style={styles.optInLabel}>{t('seeThisOnMe.optIn')}</Text>
              <Text style={styles.optInHint}>{t('seeThisOnMe.optInHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: theme.colors.figmaOverlayScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.figmaSurface,
    borderTopLeftRadius: theme.borderRadius.l,
    borderTopRightRadius: theme.borderRadius.l,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },
  headlineBlock: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    // Sheet applies a uniform gap: theme.spacing.l (24px) between children;
    // trim 8px so the headline block→carousel gap lands at 16px (theme.spacing.m).
    marginBottom: -theme.spacing.s,
  },
  headline: {
    ...theme.typography.aliases.poppinsSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  headlineSubtext: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    textAlign: 'center',
  },
  carousel: {
    height: screenWidth * (4 / 3) * 0.7,
  },
  page: {
    width: screenWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  shapeImage: {
    width: '70%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.figmaCardSurface,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: theme.spacing.s,
  },
  dot: {
    borderRadius: theme.borderRadius.s,
  },
  // Figma 4814:11783: active dot is a wide pill, inactive dots are small
  // circles — distinct SHAPE, not just color. `dotInactive` gets its own
  // (smaller, round) dimensions rather than sharing the pill's 16x4 base.
  dotActive: {
    width: 16,
    height: 4,
    backgroundColor: theme.colors.figmaChipBg,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaDotInactive,
  },
  optInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.s,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.s,
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.figmaAction,
    borderColor: theme.colors.figmaAction,
  },
  // Same drawn-glyph technique as MCheckbox (design-system/lib/MCheckbox.tsx):
  // a rotated border-left/border-bottom "L" reads as a checkmark, no SVG asset
  // needed.
  checkmark: {
    width: 9,
    height: 5,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.white,
    transform: [{ rotate: '-45deg' }],
    marginTop: -1,
  },
  optInTextBlock: {
    flexShrink: 1,
    gap: 2,
  },
  optInLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    flexShrink: 1,
  },
  optInHint: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.m,
  },
  useButton: {
    flex: 1,
  },
});
