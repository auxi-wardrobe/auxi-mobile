/**
 * Step 1/3 · Selfie (Figma node 3395:8480). REQUIRED.
 *
 * Controls-only: the prompt bubble is rendered by the screen-level transcript
 * (see SeeThisOnMeScreen `Transcript`) so accumulation stays in one place.
 * This renders just the full-width "Take photo" action.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

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
