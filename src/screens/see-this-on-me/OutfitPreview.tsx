/**
 * Your outfit preview (Figma node 3398:17581). Full-bleed rendered try-on image
 * (3:4) + "Use this photo for future outfit previews" opt-in checkbox + a
 * "Back to home" pill.
 */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

interface OutfitPreviewProps {
  imageUri: string;
  optIn: boolean;
  onToggleOptIn: () => void;
  onBackHome: () => void;
}

export const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  imageUri,
  optIn,
  onToggleOptIn,
  onBackHome,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="stom-preview">
      <View style={styles.imageWrap}>
        <Image
          testID="stom-preview-image"
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.footer}>
        <PillButton
          testID="stom-back-home"
          title={t('seeThisOnMe.backToHome')}
          variant="outline"
          onPress={onBackHome}
        />

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
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
  optInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
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
  },
});
