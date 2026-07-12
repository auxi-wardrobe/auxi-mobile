/**
 * Your outfit preview (Figma node 3398:17581). The rendered try-on image is
 * always 9:16; how it sits in the available space adapts to the device:
 *   • short / small screens  → the frame fills the available HEIGHT (9:16 box
 *     centred, letterboxed left/right) so it never overflows the viewport.
 *   • tall / large screens   → the frame fills the full WIDTH (9:16 box centred,
 *     space above/below the image goes to the footer affordances).
 * This is the "full height on small, full width on large" behaviour requested
 * for the persisted "See on me" result. We measure the available area with
 * `onLayout` and derive the box that fits both dimensions at a 9:16 ratio.
 *
 * AU-346 (1.1): the "use this photo for future outfit previews" opt-in checkbox
 * moved off this preview screen to the body-shape capture step (BodyShapeCarousel),
 * where it's checked by default and drives saving the reusable profile on
 * generate. This screen is now the result + back-home affordance, plus an
 * optional Retake action (shown when re-entering on a cached result).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { AiContentDisclosure } from '../../components/features/AiContentDisclosure';
import { theme } from '../../theme/theme';

const ASPECT = 9 / 16;

interface OutfitPreviewProps {
  imageUri: string;
  onBackHome: () => void;
  /** When set, a Retake pill is shown (persisted-result re-entry). */
  onRetake?: () => void;
}

export const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  imageUri,
  onBackHome,
  onRetake,
}) => {
  const { t } = useTranslation();

  // Measured 9:16 box that fits the available area (null until first layout).
  const [box, setBox] = useState<{ width: number; height: number } | null>(
    null,
  );

  const handleAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    // Width implied if we fill the height at 9:16. If it fits, the screen is
    // height-constrained (short/small) → full height, letterboxed sides.
    // Otherwise it's width-constrained (tall/large) → full width.
    const widthAtFullHeight = height * ASPECT;
    const next =
      widthAtFullHeight <= width
        ? { width: widthAtFullHeight, height }
        : { width, height: width / ASPECT };
    setBox(prev =>
      prev && prev.width === next.width && prev.height === next.height
        ? prev
        : next,
    );
  }, []);

  return (
    <View style={styles.container} testID="stom-preview">
      <View style={styles.imageArea} onLayout={handleAreaLayout}>
        <View
          style={[styles.imageWrap, box ? { width: box.width, height: box.height } : null]}
          testID="stom-preview-image-frame"
        >
          <LoadableRemoteImage
            uri={imageUri}
            imageTestID="stom-preview-image"
            resizeMode="cover"
            skeletonTestID="stom-preview-image-skeleton"
          />
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
    justifyContent: 'space-between',
  },
  // Flexes to take the space above the footer; the 9:16 frame is centred here.
  imageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    // Fallback before measurement (and the invariant the sizing preserves):
    // 9:16 at full width. Once measured, width/height are set explicitly.
    width: '100%',
    aspectRatio: ASPECT,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaCardSurface,
  },
  footer: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
});
