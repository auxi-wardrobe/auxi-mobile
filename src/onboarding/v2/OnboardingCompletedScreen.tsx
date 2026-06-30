/**
 * Onboarding V2 — Completed (Figma node 2849:8498).
 *
 * Same layout for two jobs, keyed by the `flow` route param:
 *
 *  - `onboarding` (default): the first-time "Your wardrobe is ready" screen.
 *    Single "Continue" → Outro. Does NOT call completeOnboarding (deferred to
 *    the Outro "See my outfit" tap).
 *
 *  - `retake`: the Style Direction review entry from Settings → Personalization.
 *    The SAME chips/headline/footer, but "Continue" is replaced by "Save"
 *    (enabled only once `changed` — i.e. after a completed retake) and a
 *    "Retake" secondary. Retake shows a replace-confirm; Save is the single
 *    commit point (regenerate wardrobe + persist profile) per the deferred-write
 *    contract — nothing changes server-side until then. Leaving with unsaved
 *    answers prompts a discard confirm.
 *
 * Chips render instantly from the SAME local `selection` (no second fetch).
 */
import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { SelectedChips } from './SelectedChips';
import { useExitConfirm } from './useExitConfirm';
import { theme } from '../../theme/theme';
import {
  COMPLETED_COPY,
  RETAKE_COPY,
  SELECTED_CHIPS_LEADIN,
  selectionChipLabels,
} from '../config';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { generateStarterWardrobe } from '../../services/v05Api';
import { track } from '../../services/analytics';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'OnboardingCompleted'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'OnboardingCompleted'>;

export const OnboardingCompletedScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { selection, flow = 'onboarding', changed = false } = route.params;
  const isRetake = flow === 'retake';
  const { updateCurrentUser } = useAuth();
  // `selection` is absent only for the retake review of a legacy user with no
  // stored profile → the set-up variant (no chips, single "take the quiz" CTA).
  const isSetup = isRetake && !selection;
  const chips = selection ? selectionChipLabels(selection) : [];

  const [retakeConfirmVisible, setRetakeConfirmVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Guard accidental exit only when there are unsaved retake answers. Confirming
  // discard pops back to Personalization — nothing was written, so the previous
  // personalization is restored automatically.
  const leaveToPersonalization = useCallback(
    () => navigation.navigate('PersonalizationSettings'),
    [navigation],
  );
  const exit = useExitConfirm(
    isRetake && changed && !isSaving,
    leaveToPersonalization,
  );

  useFocusEffect(
    useCallback(() => {
      track('onboarding_step_viewed', {
        step_name: isRetake ? 'retake_completed' : 'completed',
        step_index: 7,
      });
    }, [isRetake]),
  );

  const goToQuiz = () => {
    track('personalization_retake_started', {
      wardrobe_direction: selection?.wardrobe_direction,
    });
    navigation.navigate('OnboardingWardrobe', { flow: 'retake' });
  };

  const confirmRetake = () => {
    setRetakeConfirmVisible(false);
    goToQuiz();
  };

  const handleSave = async () => {
    if (!selection || !changed || isSaving) return;
    setIsSaving(true);
    try {
      // Commit point: regenerate the seeded wardrobe from the new answers, then
      // persist the profile. Order matters — only persist once generate succeeds
      // so a failed regen leaves the previous personalization fully intact.
      await generateStarterWardrobe({
        wardrobe_direction: selection.wardrobe_direction,
        fit_preference: selection.fit_preference,
        style_preferences: selection.style_preferences,
      });
      await updateCurrentUser({
        user_metadata: { onboarding_profile: selection },
      });
      track('personalization_retake_saved', {
        wardrobe_direction: selection.wardrobe_direction,
        fit_preference: selection.fit_preference,
        styles_selected: selection.style_preferences.length,
      });
      exit.allowLeave();
      Toast.show({
        type: 'success',
        text1: RETAKE_COPY.savedToast,
        position: 'bottom',
        visibilityTime: 5000,
      });
      navigation.navigate('PersonalizationSettings');
    } catch {
      Toast.show({
        type: 'error',
        text1: RETAKE_COPY.saveError,
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-completed-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isSetup ? null : (
          <View style={styles.chipsBlock}>
            <Text style={styles.leadIn}>{SELECTED_CHIPS_LEADIN}</Text>
            <SelectedChips labels={chips} testID="onboarding-completed-chips" />
          </View>
        )}
        <Text style={styles.headline}>
          {isSetup ? RETAKE_COPY.review.setupHeadline : COMPLETED_COPY.headline}
        </Text>
        <Text style={styles.footer}>
          {isSetup ? RETAKE_COPY.review.setupFooter : COMPLETED_COPY.footer}
        </Text>
      </ScrollView>

      <View style={styles.footerBar}>
        {isSetup ? (
          <PillButton
            title={RETAKE_COPY.review.takeQuiz}
            variant="filled"
            onPress={goToQuiz}
            style={styles.cta}
            testID="onboarding-completed-take-quiz"
          />
        ) : isRetake ? (
          <>
            <PillButton
              title={RETAKE_COPY.review.save}
              variant="filled"
              disabled={!changed || isSaving}
              loading={isSaving}
              onPress={handleSave}
              style={styles.cta}
              testID="onboarding-completed-save"
            />
            <PillButton
              title={RETAKE_COPY.review.retake}
              variant="text"
              disabled={isSaving}
              onPress={() => setRetakeConfirmVisible(true)}
              style={styles.cta}
              testID="onboarding-completed-retake"
            />
          </>
        ) : (
          <PillButton
            title={COMPLETED_COPY.ctaLabel}
            variant="filled"
            onPress={() =>
              selection &&
              navigation.navigate('OnboardingOutro', { selection })
            }
            style={styles.cta}
            testID="onboarding-completed-continue"
          />
        )}
      </View>

      {isRetake ? (
        <>
          {/* Retake confirmation — the current profile would be replaced. */}
          <SettingsDialog
            visible={retakeConfirmVisible}
            onClose={() => setRetakeConfirmVisible(false)}
            isBusy={false}
            title={RETAKE_COPY.retakeConfirm.title}
            body={RETAKE_COPY.retakeConfirm.body}
            primaryLabel={RETAKE_COPY.retakeConfirm.confirm}
            primaryVariant="default"
            onPrimary={confirmRetake}
            cancelLabel={RETAKE_COPY.retakeConfirm.cancel}
            cancelTestID="retake-confirm-cancel"
            primaryTestID="retake-confirm-continue"
          />
          {/* Discard guard — only armed when there are unsaved retake answers. */}
          <SettingsDialog
            visible={exit.visible}
            onClose={exit.onCancel}
            isBusy={false}
            title={RETAKE_COPY.discard.title}
            body={RETAKE_COPY.discard.body}
            primaryLabel={RETAKE_COPY.discard.confirm}
            primaryVariant="danger"
            onPrimary={exit.onConfirm}
            cancelLabel={RETAKE_COPY.discard.cancel}
            cancelTestID="retake-discard-cancel"
            primaryTestID="retake-discard-confirm"
          />
        </>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaCaptionPillBg },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
  chipsBlock: { gap: theme.spacing.m },
  leadIn: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  headline: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  footer: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  footerBar: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  cta: { alignSelf: 'stretch' },
});
