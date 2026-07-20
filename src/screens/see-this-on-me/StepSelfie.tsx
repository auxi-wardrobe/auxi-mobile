/**
 * Step 1/3 · Selfie (Figma node 4814:11695). REQUIRED.
 *
 * Owns its own intro content — bold headline + photo-placeholder square +
 * bullet tips (`CaptureStepIntro`) — plus the full-width "Take photo" action.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { CaptureStepIntro } from './components';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

const STEP1_TIP_KEYS = [
  'seeThisOnMe.step1.tips.0',
  'seeThisOnMe.step1.tips.1',
  'seeThisOnMe.step1.tips.2',
] as const;

interface StepSelfieProps {
  onTakePhoto: () => void;
  busy?: boolean;
}

export const StepSelfie: React.FC<StepSelfieProps> = ({
  onTakePhoto,
  busy,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="stom-step-1">
      <CaptureStepIntro
        testID="stom-step-1-intro"
        headline={t('seeThisOnMe.step1.headline')}
        tips={STEP1_TIP_KEYS.map(key => t(key))}
        photoPlaceholder={<Icons.FaceId width={44} height={44} />}
      />
      <PillButton
        testID="stom-take-photo"
        title={t('seeThisOnMe.takePhoto')}
        variant="outline"
        loading={busy}
        onPress={onTakePhoto}
        trailing={<Icons.Camera width={20} height={20} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.l,
  },
});
