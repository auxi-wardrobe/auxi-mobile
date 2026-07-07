/**
 * Your outfit preview (Figma node 3398:17581). Full-bleed rendered try-on image
 * (3:4) + a "Back to home" pill.
 *
 * AU-346 (1.1): the "use this photo for future outfit previews" opt-in checkbox
 * moved off this preview screen to the body-shape capture step (BodyShapeCarousel),
 * where it's checked by default and drives saving the reusable profile on
 * generate. This screen is now purely the result + back-home affordance.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { AiContentDisclosure } from '../../components/features/AiContentDisclosure';
import { theme } from '../../theme/theme';

interface OutfitPreviewProps {
  imageUri: string;
  onBackHome: () => void;
}

export const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  imageUri,
  onBackHome,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="stom-preview">
      <View style={styles.imageWrap}>
        <LoadableRemoteImage
          uri={imageUri}
          imageTestID="stom-preview-image"
          resizeMode="cover"
          skeletonTestID="stom-preview-image-skeleton"
        />
      </View>

      <View style={styles.footer}>
        {/* B2: AI-generated disclosure + Report (this image is AI-generated). */}
        <AiContentDisclosure surface="tryon" testID="stom-ai-disclosure" />
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
  imageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaCardSurface,
  },
  footer: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
});
