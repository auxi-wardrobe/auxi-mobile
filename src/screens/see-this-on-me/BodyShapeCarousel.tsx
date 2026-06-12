/**
 * Body-shape picker — expanded full-screen carousel (Figma node 3398:17745 →
 * `noti` 3398:17798). Tap-to-expand modal over a scrim: headline + a swipeable
 * shape carousel with pagination dots + Retake / Use this photo actions.
 *
 * ASSET GAP: no silhouette SVGs exist, so each "page" renders the labeled shape
 * card from `body-shapes.ts` rather than artwork (see body-shapes.ts header).
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
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import { BODY_SHAPE_OPTIONS, BodyShapeId } from './body-shapes';

const { width: screenWidth } = Dimensions.get('window');

interface BodyShapeCarouselProps {
  visible: boolean;
  initialShape: BodyShapeId | null;
  onRetake: () => void;
  onUse: (shape: BodyShapeId) => void;
}

export const BodyShapeCarousel: React.FC<BodyShapeCarouselProps> = ({
  visible,
  initialShape,
  onRetake,
  onUse,
}) => {
  const { t } = useTranslation();
  const initialIndex = Math.max(
    0,
    BODY_SHAPE_OPTIONS.findIndex(o => o.id === initialShape),
  );
  const [index, setIndex] = useState(initialIndex);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (next !== index) {
      setIndex(next);
    }
  };

  const current = BODY_SHAPE_OPTIONS[index] ?? BODY_SHAPE_OPTIONS[0];

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
            {BODY_SHAPE_OPTIONS.map(option => (
              <View
                key={option.id}
                style={styles.page}
                testID={`stom-shape-page-${option.id}`}
              >
                <View style={styles.shapeCard}>
                  <Text style={styles.shapeLabel}>
                    {t(`seeThisOnMe.shapes.${option.labelKey}`)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {BODY_SHAPE_OPTIONS.map((option, i) => (
              <View
                key={option.id}
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
              onPress={() => onUse(current.id)}
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
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.m,
  },
  carousel: {
    height: screenWidth * (4 / 3) * 0.7,
  },
  page: {
    width: screenWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  shapeCard: {
    width: '70%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.figmaCardSurface,
    alignItems: 'center',
    justifyContent: 'center',
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
