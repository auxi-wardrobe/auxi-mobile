/**
 * Onboarding V2 — Outro / welcome quote (Figma node 2849:8510).
 *
 * The ONLY place `completeOnboarding()` is called in the V2 flow (the
 * deferred-completion endpoint). "See my outfit" → `completeOnboarding()`
 * flips `is_first_login=false`, which makes AppNavigator swap to the Home
 * stack. No `navigation.reset` needed — the conditional stack swap unmounts
 * onboarding and mounts Home.
 *
 * Visual (extraction §3.7): cream bg (#eee6df = figmaCaptionPillBg), no header,
 * a Poppins-Bold quote, and a bottom sheet (top corners radius 16) holding the
 * "See my outfit" text button with a leading `Icons.SeeOutfit` glyph.
 *
 * Copy comes from `onboarding/config`. The `selection` route param feeds the
 * activation analytics event.
 */
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { track } from '../../services/analytics';
import {
  BottomSheetSurface,
  PillButton,
} from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { OUTRO_COPY } from '../config';
import { AppStackParamList } from '../../types/navigation';

type ScreenRoute = RouteProp<AppStackParamList, 'OnboardingOutro'>;

export const OnboardingOutroScreen = () => {
  const route = useRoute<ScreenRoute>();
  const { selection } = route.params;
  const { completeOnboarding } = useAuth();
  const [isFinishing, setIsFinishing] = useState(false);

  const handleSeeOutfit = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      // Deferred completion: flips is_first_login=false → AppNavigator swaps
      // to Home. Clears the dev replay override internally.
      await completeOnboarding();
      // Activation milestone — fired AFTER completion resolves (not on
      // /generate, and not before the await) so it emits exactly once, at the
      // true completion point. If completeOnboarding throws, the CTA stays
      // tappable for retry and this event is NOT (double-)fired. Mirrors the
      // legacy StylePickerScreen ordering.
      track('onboarding_completed', {
        styles_selected: selection.style_preferences.length,
        wardrobe_direction: selection.wardrobe_direction,
        fit_preference: selection.fit_preference,
      });
    } catch (error) {
      // completeOnboarding failed (network). The wardrobe IS materialised
      // server-side, so keep the CTA tappable and let the user retry.
      console.error('Failed to complete onboarding at Outro', error);
      setIsFinishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-outro-screen">
      <View style={styles.body}>
        <Text style={styles.quote}>{OUTRO_COPY.quote}</Text>
      </View>
      <BottomSheetSurface style={styles.sheet}>
        <PillButton
          title={OUTRO_COPY.ctaLabel}
          variant="text"
          loading={isFinishing}
          disabled={isFinishing}
          onPress={handleSeeOutfit}
          leading={
            <Icons.SeeOutfit
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          }
          textStyle={styles.ctaLabel}
          style={styles.cta}
          testID="onboarding-outro-see-outfit"
        />
      </BottomSheetSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaCaptionPillBg },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  quote: {
    ...theme.typography.aliases.uacH1Bold,
    letterSpacing: -0.72,
    color: theme.colors.uacTextBase,
  },
  sheet: {
    padding: theme.spacing.l,
  },
  cta: { alignSelf: 'stretch' },
  ctaLabel: {
    color: theme.colors.uacTextBase,
  },
});
