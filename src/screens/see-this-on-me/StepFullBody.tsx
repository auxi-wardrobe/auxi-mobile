/**
 * Step 2/3 · Full body (Figma node 4814:11710). OPTIONAL.
 *
 * Owns its own intro content — bold headline + emoji bullet tips
 * (`CaptureStepIntro`, no photo placeholder per Figma) — plus the "Skip this
 * step" text action and a "Take photo" outline pill row.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { CaptureStepIntro } from './components';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

const STEP2_TIP_KEYS = [
  'seeThisOnMe.step2.tips.0',
  'seeThisOnMe.step2.tips.1',
  'seeThisOnMe.step2.tips.2',
  'seeThisOnMe.step2.tips.3',
] as const;

interface StepFullBodyProps {
  onTakePhoto: () => void;
  onSkip: () => void;
  busy?: boolean;
}

export const StepFullBody: React.FC<StepFullBodyProps> = ({
  onTakePhoto,
  onSkip,
  busy,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="stom-step-2">
      <CaptureStepIntro
        testID="stom-step-2-intro"
        headline={t('seeThisOnMe.step2.headline')}
        tips={STEP2_TIP_KEYS.map(key => t(key))}
      />
      <View style={styles.actions}>
        <PillButton
          testID="stom-skip"
          title={t('seeThisOnMe.skipStep')}
          variant="text"
          onPress={onSkip}
          disabled={busy}
          trailing={<Icons.Plus width={16} height={16} />}
        />
        <PillButton
          testID="stom-take-photo"
          title={t('seeThisOnMe.takePhoto')}
          variant="outline"
          loading={busy}
          onPress={onTakePhoto}
          style={styles.takePhoto}
          trailing={<Icons.Camera width={20} height={20} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.l,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.m,
  },
  takePhoto: {
    flex: 1,
  },
});
