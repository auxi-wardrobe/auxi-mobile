/**
 * Onboarding V2 — Completed (Figma node 2849:8498).
 *
 * Same layout as Loading minus the loading rows, with an enabled CTA. Reached
 * via `navigation.replace` from the Loading screen once `/generate` succeeds,
 * carrying the SAME selection — so the "You selected" chips render instantly
 * from local data (no second fetch; the API `profile_classification` is
 * optional flavor we don't depend on).
 *
 * "Your wardrobe is ready" (D3, present tense). CTA → Outro. Does NOT call
 * `completeOnboarding()` — that is deferred to the Outro "See my outfit" tap.
 * All copy/tokens from `onboarding/config` + theme (cream bg = figmaCaptionPillBg).
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
        <Text style={styles.headline}>{COMPLETED_COPY.headline}</Text>
        <Text style={styles.footer}>{COMPLETED_COPY.footer}</Text>
      </ScrollView>
      <View style={styles.footerBar}>
        <PillButton
          title={COMPLETED_COPY.ctaLabel}
          variant="filled"
          onPress={() => navigation.navigate('OnboardingOutro', { selection })}
          style={styles.cta}
          testID="onboarding-completed-continue"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaCaptionPillBg },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
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
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  footer: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  footerBar: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.xl,
  },
  cta: { alignSelf: 'stretch' },
});
