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
import { Icons } from '../../assets/icons';
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
          <Text style={styles.headline}>
            {t('seeThisOnMe.step3.expandedTitle')}
          </Text>

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
                <Text style={styles.shapeLabel}>
                  {t(`seeThisOnMe.shapes.${option.shape}`)}
                </Text>
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
              {optIn ? (
                <Icons.Plus width={14} height={14} color={theme.colors.white} />
              ) : null}
            </View>
            <Text style={styles.optInLabel}>{t('seeThisOnMe.optIn')}</Text>
          </TouchableOpacity>

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
  headline: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.m,
    // Sheet applies a uniform gap: theme.spacing.l (24px) between children;
    // trim 8px so the headline→carousel gap lands at 16px (theme.spacing.m).
    marginBottom: -theme.spacing.s,
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
  shapeLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: theme.spacing.s,
  },
  dot: {
    width: 16,
    height: 4,
    borderRadius: theme.borderRadius.s,
  },
  dotActive: {
    backgroundColor: theme.colors.figmaChipBg,
  },
  dotInactive: {
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
  optInLabel: {
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
