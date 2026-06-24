/**
 * Onboarding V2 — Completed (Figma node 2849:8498).
 *
 * Same layout as Loading minus the loading rows, with an enabled CTA. Reached
 * via `navigation.replace` from the Loading screen once `/generate` succeeds,
 * carrying the SAME selection — so the "You selected" chips render instantly
 * from local data (no second fetch; the API `profile_classification` is
 * optional flavor we don't depend on).
 *
 * Headline is the personalization line ("The more you use Macgie…"). Primary
 * CTA ("Next") → Outro; "Retake" restarts onboarding from Step 1 (Wardrobe).
 * Neither calls `completeOnboarding()` — that is deferred to the Outro "See my
 * outfit" tap. All copy/tokens from `onboarding/config` + theme (cream bg).
 */
import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { SelectedChips } from './SelectedChips';
import { theme } from '../../theme/theme';
import {
  COMPLETED_COPY,
  SELECTED_CHIPS_LEADIN,
  selectionChipLabels,
} from '../config';
import { AppStackParamList } from '../../types/navigation';
import { track } from '../../services/analytics';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'OnboardingCompleted'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'OnboardingCompleted'>;

export const OnboardingCompletedScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { selection } = route.params;
  const chips = selectionChipLabels(selection);

  // Retake → restart onboarding from Step 1. OnboardingWardrobe is still in the
  // stack below (Wardrobe → Fit → Styles → Completed, Loading having replaced
  // itself), so navigating to it pops the steps above and re-walks the flow.
  const handleRetake = useCallback(() => {
    navigation.navigate('OnboardingWardrobe');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      track('onboarding_step_viewed', {
        step_name: 'completed',
        step_index: 7,
      });
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} testID="onboarding-completed-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chipsBlock}>
          <Text style={styles.leadIn}>{SELECTED_CHIPS_LEADIN}</Text>
          <SelectedChips labels={chips} testID="onboarding-completed-chips" />
        </View>
        <Text style={styles.helper}>{COMPLETED_COPY.helper}</Text>
        <Text style={styles.headline}>{COMPLETED_COPY.headline}</Text>
      </ScrollView>
      <View style={styles.footerBar}>
        <PillButton
          title={COMPLETED_COPY.ctaLabel}
          variant="filled"
          onPress={() => navigation.navigate('OnboardingOutro', { selection })}
          style={styles.cta}
          testID="onboarding-completed-continue"
        />
        <PillButton
          title={COMPLETED_COPY.retakeLabel}
          variant="text"
          onPress={handleRetake}
          style={styles.cta}
          testID="onboarding-completed-retake"
        />
      </View>
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
  helper: {
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
