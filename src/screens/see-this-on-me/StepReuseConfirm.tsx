/**
 * Reuse-confirm re-entry view (AU-354 pt.3 / UAC).
 *
 * WHY THIS EXISTS
 * ---------------
 * AU-346 persists the user's chosen body photo + shape as a reusable profile on
 * the server. Before this, re-entering the flow with a saved profile silently
 * auto-rendered the current outfit — the user never saw which photo was being
 * reused and had no chance to confirm or swap it. Viet's UAC: on return, SHOW
 * the previously selected photo with CONFIRM and RETAKE actions instead of
 * either redoing capture from scratch OR generating blindly.
 *
 * This is a pure presentational step: it shows the persisted photo in the same
 * conversational transcript style as the capture steps (prompt bubble + 3:4
 * thumbnail) and surfaces two pills. The screen owns the actual confirm/retake
 * behaviour (generate vs restart capture) + analytics.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import { PromptBubble, PhotoThumb } from './components';

interface StepReuseConfirmProps {
  /** The persisted body photo to show (full-body preferred, else selfie). */
  photoUri: string;
  onConfirm: () => void;
  onRetake: () => void;
}

export const StepReuseConfirm: React.FC<StepReuseConfirmProps> = ({
  photoUri,
  onConfirm,
  onRetake,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="stom-reuse-confirm">
      <ScrollView contentContainerStyle={styles.transcript}>
        <PromptBubble
          testID="stom-reuse-confirm-prompt"
          text={t('seeThisOnMe.reuseConfirm.prompt')}
        />
        <PhotoThumb uri={photoUri} testID="stom-reuse-confirm-thumb" />
      </ScrollView>
      <View style={styles.actions}>
        <PillButton
          testID="stom-reuse-confirm-use"
          title={t('seeThisOnMe.reuseConfirm.confirm')}
          variant="filled"
          onPress={onConfirm}
        />
        <PillButton
          testID="stom-reuse-confirm-retake"
          title={t('seeThisOnMe.reuseConfirm.retake')}
          variant="text"
          onPress={onRetake}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  transcript: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },
  actions: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.s,
  },
});
