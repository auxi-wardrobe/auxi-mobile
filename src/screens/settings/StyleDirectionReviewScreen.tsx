/**
 * Style Direction review / retake-result (reuses the onboarding "Completed"
 * design — Figma node 2849:8498).
 *
 * Two entry states on ONE screen, keyed by the `changed` route param:
 *  - `changed:false` — opened read-only from Personalization. Shows the user's
 *    CURRENT profile chips; Save is disabled ("no changes yet"), Retake starts
 *    the quiz.
 *  - `changed:true` — reached after completing a retake (Styles → here). Shows
 *    the NEW answers; Save is enabled.
 *
 * Deferred-write contract (matches the onboarding "nothing until Save" rule):
 * the retake quiz mutates NOTHING server-side. Save is the single commit point
 * — it regenerates the starter wardrobe (`/v05/onboarding/generate`) and
 * persists the new profile to `user_metadata.onboarding_profile`. Leaving a
 * `changed` screen without saving prompts a discard confirm and changes nothing.
 */
import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {
  PillButton,
  TopIconButton,
} from '../../components/primitives/FigmaPrimitives';
import { SelectedChips } from '../../onboarding/v2/SelectedChips';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { useExitConfirm } from '../../onboarding/v2/useExitConfirm';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { RETAKE_COPY, selectionChipLabels } from '../../onboarding/config';
import { useAuth } from '../../context/AuthContext';
import { generateStarterWardrobe } from '../../services/v05Api';
import { track } from '../../services/analytics';
import { AppStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'StyleDirectionReview'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'StyleDirectionReview'>;

export const StyleDirectionReviewScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { selection, changed } = route.params;
  const { updateCurrentUser } = useAuth();

  const chips = selectionChipLabels(selection);
  const [retakeConfirmVisible, setRetakeConfirmVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Guard accidental exit only when there are unsaved changes (the retake
  // result). On confirm, discard pops all the way back to Personalization —
  // nothing was written, so "restore previous personalization" is automatic.
  const leaveToPersonalization = useCallback(
    () => navigation.navigate('PersonalizationSettings'),
    [navigation],
  );
  const exit = useExitConfirm(changed && !isSaving, leaveToPersonalization);

  const handleRetake = () => setRetakeConfirmVisible(true);

  const confirmRetake = () => {
    setRetakeConfirmVisible(false);
    track('personalization_retake_started', {
      wardrobe_direction: selection.wardrobe_direction,
    });
    navigation.navigate('OnboardingWardrobe', { flow: 'retake' });
  };

  const handleSave = async () => {
    if (!changed || isSaving) return;
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
    <SafeAreaView style={styles.container} testID="style-direction-review-screen">
      <View style={styles.headerRow}>
        <TopIconButton
          testID="style-direction-back"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          icon={<Icons.ChevronLeft width={20} height={20} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chipsBlock}>
          <Text style={styles.leadIn}>{RETAKE_COPY.review.leadIn}</Text>
          <SelectedChips labels={chips} testID="style-direction-chips" />
        </View>
        <Text style={styles.headline}>
          {changed
            ? RETAKE_COPY.review.headlineResult
            : RETAKE_COPY.review.headlineReview}
        </Text>
        <Text style={styles.footer}>
          {changed
            ? RETAKE_COPY.review.footerResult
            : RETAKE_COPY.review.footerReview}
        </Text>
      </ScrollView>

      <View style={styles.footerBar}>
        <PillButton
          title={RETAKE_COPY.review.save}
          variant="filled"
          disabled={!changed || isSaving}
          loading={isSaving}
          onPress={handleSave}
          style={styles.cta}
          testID="style-direction-save"
        />
        <PillButton
          title={RETAKE_COPY.review.retake}
          variant="text"
          disabled={isSaving}
          onPress={handleRetake}
          style={styles.cta}
          testID="style-direction-retake"
        />
      </View>

      {/* Retake confirmation — a completed profile would be replaced. */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaCaptionPillBg },
  headerRow: {
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.s,
  },
  backButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.m,
    ...theme.ds.shadow.headerIcon,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.l,
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
