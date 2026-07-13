/**
 * Your outfit preview (Figma node 3398:17581). Rendered try-on image (9:16),
 * aspect-fit to the space between header and footer, + a "Back to home" pill.
 *
 * The rendered try-on is always 9:16; how it sits in the available space adapts
 * to the device:
 *   • short / small screens  → the frame fills the available HEIGHT (9:16 box
 *     centred, letterboxed left/right) so it never overflows the viewport.
 *   • tall / large screens   → the frame fills the full WIDTH (9:16 box centred,
 *     space above/below the image goes to the footer affordances).
 * We measure the available area with `onLayout` and derive the largest 9:16
 * box that fits both dimensions.
 *
 * AU-346 (1.1): the "use this photo for future outfit previews" opt-in checkbox
 * moved off this preview screen to the body-shape capture step (BodyShapeCarousel),
 * where it's checked by default and drives saving the reusable profile on
 * generate. This screen is now the result + back-home affordance, plus an
 * optional Retake action (shown when re-entering on a cached result).
 */
import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { AiContentDisclosure } from '../../components/features/AiContentDisclosure';
import { theme } from '../../theme/theme';

interface OutfitPreviewProps {
  imageUri: string;
  onBackHome: () => void;
  /** When set, a Retake pill is shown (persisted-result re-entry). */
  onRetake?: () => void;
}

// The rendered try-on is always 9:16. We aspect-*fit* it into whatever space is
// left between the header and footer so it never overflows or crops the frame:
// short screens are height-constrained (full height), tall/large screens are
// width-constrained (full width, letterboxed top/bottom).
const PREVIEW_ASPECT = 9 / 16;

export const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  imageUri,
  onBackHome,
  onRetake,
}) => {
  const { t } = useTranslation();
  const [area, setArea] = useState<{ width: number; height: number } | null>(
    null,
  );

  const handleAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  // Largest 9:16 rect that fits inside the measured area.
  const fitted = area
    ? area.width / area.height > PREVIEW_ASPECT
      ? { width: area.height * PREVIEW_ASPECT, height: area.height } // height-bound
      : { width: area.width, height: area.width / PREVIEW_ASPECT } // width-bound
    : null;

  return (
    <View style={styles.container} testID="stom-preview">
      <View style={styles.imageArea} onLayout={handleAreaLayout}>
        <View
          style={[styles.imageWrap, fitted]}
          testID="stom-preview-image-frame"
        >
          {fitted ? (
            <LoadableRemoteImage
              uri={imageUri}
              imageTestID="stom-preview-image"
              resizeMode="cover"
              skeletonTestID="stom-preview-image-skeleton"
            />
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        {/* B2: AI-generated disclosure + Report (this image is AI-generated). */}
        <AiContentDisclosure surface="tryon" testID="stom-ai-disclosure" />
        {onRetake ? (
          <PillButton
            testID="stom-preview-retake"
            title={t('seeThisOnMe.retake')}
            variant="filled"
            onPress={onRetake}
          />
        ) : null}
        <PillButton
          testID="stom-back-home"
          title={t('seeThisOnMe.backToHome')}
          variant="outline"
          onPress={onBackHome}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.m,
  },
  // Flexes to fill the gap between header and footer; centers the fitted frame.
  imageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaCardSurface,
  },
  footer: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
});
