/**
 * Onboarding V2 — Loading (Figma node 2849:8477).
 *
 * D10: Loading IS the in-flight `/generate` call — a real async wait, not a
 * timed splash. This screen OWNS the mutation (moved out of the Styles screen
 * per the Phase 4 reconciliation). It fires `POST /v05/onboarding/generate`
 * once on mount with the selection threaded through route params and:
 *   - on success → `navigation.replace('OnboardingCompleted', { selection })`
 *     so a back gesture from Completed does NOT return to this Loading screen
 *     (the generate already ran). Completed renders chips from the SAME local
 *     selection, so it paints instantly (no second fetch).
 *   - on error → show a retry block. "Try again" re-runs the mutation in place;
 *     "Retake" goes back to Step 3 (Styles) to change picks. Error copy reuses
 *     the StylePicker's 422/400/401 parse shape.
 *
 * CRITICAL (deferred-completion contract): this screen does NOT call
 * `completeOnboarding()`. `is_first_login` stays `true` through Loading /
 * Completed / Outro; only the Outro "See my outfit" tap completes onboarding.
 * `/generate` is idempotent, so a mid-flow relaunch re-enters cleanly.
 *
 * Visual (extraction §3.5): cream bg (#eee6df = figmaCaptionPillBg), no header.
 * "You selected" chips, Poppins H2 headline, helper + footer lines, and a set
 * of loading rows each with a rotating 24×24 `Icons.Loading` spinner.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { track } from '../../services/analytics';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { SelectedChips } from './SelectedChips';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import {
  generateStarterWardrobe,
  type GenerateStarterWardrobeResponse,
} from '../../services/v05Api';
import {
  LOADING_COPY,
  SELECTED_CHIPS_LEADIN,
  selectionChipLabels,
} from '../config';
import { AppStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'OnboardingLoading'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'OnboardingLoading'>;

interface ParsedGenerateError {
  title: string;
  message: string;
}

/** Mirror of StylePickerScreen.parseGenerateError (422/401/400 → friendly copy). */
const parseGenerateError = (err: unknown): ParsedGenerateError => {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (
      err as {
        response?: {
          status?: number;
          data?: { error?: string; message?: string };
        };
      }
    ).response;
    const status = response?.status;
    const errorCode = response?.data?.error ?? '';
    const message = response?.data?.message ?? '';

    if (status === 422 && errorCode.startsWith('pool_insufficient')) {
      return {
        title: 'Not enough items to build your wardrobe',
        message:
          message ||
          "We couldn't find enough pieces matching your selections. Try a different combination.",
      };
    }
    if (status === 401) {
      return {
        title: 'Session expired',
        message: 'Please sign in again to continue.',
      };
    }
    if (status === 400) {
      return {
        title: 'Invalid selections',
        message: message || 'Please review your choices and try again.',
      };
    }
  }
  return {
    title: 'Something went wrong',
    message: "We couldn't generate your wardrobe. Please try again.",
  };
};

/** Single loading row: rotating spinner + label. */
const LoadingRow: React.FC<{ label: string }> = ({ label }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingRow}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Icons.Loading
          width={24}
          height={24}
          color={theme.colors.uacTextSubtle200}
        />
      </Animated.View>
      <Text style={styles.loadingRowText}>{label}</Text>
    </View>
  );
};

export const OnboardingLoadingScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { selection } = route.params;
  const { completeOnboarding } = useAuth();
  const [isContinuing, setIsContinuing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      track('onboarding_step_viewed', {
        step_name: 'loading',
        step_index: 6,
      });
    }, []),
  );

  const generateMutation = useMutation<
    GenerateStarterWardrobeResponse,
    unknown,
    void
  >({
    mutationFn: () =>
      generateStarterWardrobe({
        wardrobe_direction: selection.wardrobe_direction,
        fit_preference: selection.fit_preference,
        style_preferences: selection.style_preferences,
      }),
    onSuccess: () => {
      track('onboarding_generated', {
        styles_selected: selection.style_preferences.length,
        wardrobe_direction: selection.wardrobe_direction,
        fit_preference: selection.fit_preference,
      });
      // DEFERRED COMPLETION: do NOT call completeOnboarding() here. `replace`
      // so a back gesture from Completed cannot return to Loading (generate
      // already ran). completeOnboarding fires only at the Outro CTA.
      navigation.replace('OnboardingCompleted', { selection });
    },
  });

  // Fire the generate exactly once on mount (Loading IS the in-flight call).
  const { mutate } = generateMutation;
  useEffect(() => {
    mutate();
  }, [mutate]);

  const handleRetake = useCallback(() => {
    // Back to Step 3 to change the picks.
    navigation.navigate('OnboardingStyles', {
      wardrobe_direction: selection.wardrobe_direction,
      fit_preference: selection.fit_preference,
    });
  }, [navigation, selection]);

  // Escape hatch when `/generate` keeps failing: complete onboarding via the
  // profile-update path (`is_first_login=false`) INDEPENDENT of the generate
  // call, so a generate failure never traps the user in onboarding on every
  // relaunch. Home degrades gracefully on an empty/partial wardrobe (it now
  // renders an "add items / try again" empty state instead of a blank screen),
  // and the starter wardrobe can be re-generated later. Completion flips
  // is_first_login → AppNavigator swaps to Home (unmounts this stack).
  const handleContinueAnyway = useCallback(async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    try {
      await completeOnboarding();
      track('onboarding_completed', {
        styles_selected: selection.style_preferences.length,
        wardrobe_direction: selection.wardrobe_direction,
        fit_preference: selection.fit_preference,
        generate_failed: true,
      });
    } catch (error) {
      // Completion itself failed (network) — keep the CTA tappable for retry.
      console.error('Failed to complete onboarding after generate error', error);
      setIsContinuing(false);
    }
  }, [completeOnboarding, isContinuing, selection]);

  const chips = selectionChipLabels(selection);
  const isError = generateMutation.isError;
  const parsed = isError ? parseGenerateError(generateMutation.error) : null;

  return (
    <SafeAreaView style={styles.container} testID="onboarding-loading-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chipsBlock}>
          <Text style={styles.leadIn}>{SELECTED_CHIPS_LEADIN}</Text>
          <SelectedChips labels={chips} testID="onboarding-loading-chips" />
          <Text style={styles.helper}>{LOADING_COPY.helper}</Text>
        </View>

        <Text style={styles.headline}>{LOADING_COPY.headline}</Text>
        <Text style={styles.footer}>{LOADING_COPY.footer}</Text>

        {parsed ? (
          <View style={styles.errorBlock} testID="onboarding-loading-error">
            <Text style={styles.errorTitle}>{parsed.title}</Text>
            <Text style={styles.errorMessage}>{parsed.message}</Text>
          </View>
        ) : (
          <View style={styles.rows} testID="onboarding-loading-view">
            {LOADING_COPY.rows.map(row => (
              <LoadingRow key={row} label={row} />
            ))}
          </View>
        )}
      </ScrollView>

      {parsed ? (
        <View style={styles.footerBar}>
          <PillButton
            title="Try again"
            variant="filled"
            onPress={() => generateMutation.mutate()}
            disabled={isContinuing}
            style={styles.cta}
            testID="onboarding-loading-retry"
          />
          {/* Non-trapping escape: complete onboarding and go to Home even if
              the starter-wardrobe generate keeps failing (it can be re-run
              later; Home handles an empty wardrobe gracefully). */}
          <PillButton
            title={LOADING_COPY.continueAnyway}
            variant="text"
            onPress={handleContinueAnyway}
            loading={isContinuing}
            disabled={isContinuing}
            style={styles.cta}
            testID="onboarding-loading-continue-anyway"
          />
          <PillButton
            title="Retake"
            variant="text"
            onPress={handleRetake}
            disabled={isContinuing}
            style={styles.cta}
            testID="onboarding-loading-retake"
          />
        </View>
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
  chipsBlock: {
    gap: theme.spacing.m,
  },
  leadIn: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  helper: {
    ...theme.typography.aliases.uacBodyXsRegular,
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
  rows: {
    gap: theme.spacing.m,
    marginTop: theme.spacing.l,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  loadingRowText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextSubtle200,
  },
  errorBlock: {
    marginTop: theme.spacing.l,
    gap: theme.spacing.s,
  },
  errorTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  errorMessage: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextSubtle200,
  },
  footerBar: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  cta: { alignSelf: 'stretch' },
});
