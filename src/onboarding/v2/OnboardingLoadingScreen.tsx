/**
 * Onboarding V2 — Loading (Figma node 2849:8477).
 *
 * D10: Loading IS the in-flight `/generate` call — a real async wait, not a
 * timed splash. This screen OWNS the mutation (moved out of the Styles screen
 * per the Phase 4 reconciliation). It fires `POST /v05/onboarding/generate`
 * once on mount with the selection threaded through route params and:
 *   - on success → after a minimum-visible floor it CROSSFADES IN PLACE into
 *     the completion state (no navigation): the loading copy/rows fade out and
 *     the "more you use Macgie…" message + Next/Retake CTAs fade in. This
 *     screen absorbs the former standalone OnboardingCompleted screen.
 *     Next → Outro; Retake → Step 1 (Wardrobe) to start over.
 *   - on error → show a retry block. "Try again" re-runs the mutation in place;
 *     "Retake" goes back to Step 3 (Styles) to change picks. Error copy reuses
 *     the StylePicker's 422/400/401 parse shape.
 *
 * CRITICAL (deferred-completion contract): this screen does NOT call
 * `completeOnboarding()`. `is_first_login` stays `true` through the loading +
 * completion states and Outro; only the Outro "See my outfit" tap completes
 * onboarding. `/generate` is idempotent, so a mid-flow relaunch re-enters
 * cleanly.
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
import { track } from '../../services/analytics';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { SelectedChips } from './SelectedChips';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import {
  generateStarterWardrobe,
  type GenerateStarterWardrobeResponse,
} from '../../services/v05Api';
import {
  COMPLETED_COPY,
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

// Minimum time the loading state stays on screen before advancing to Completed,
// so the "building your wardrobe" moment is perceptible even when /generate
// resolves almost instantly (cached responses, or the mocked web-preview
// backend). Generation in production takes longer and exceeds this floor.
const MIN_VISIBLE_MS = 1800;

// Subtle upward drift (px) for the completion message as it fades in.
const COMPLETED_RISE_PX = 8;

export const OnboardingLoadingScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { selection } = route.params;
  const reduced = useReducedMotion();

  // Loading → Completed crossfade lives ON this screen (no navigation). After
  // the MIN_VISIBLE_MS floor, the loading copy/rows fade out and the completion
  // message + CTAs fade in. `phase` swaps the content once the fade-out
  // finishes so the two states never overlap in layout.
  const [phase, setPhase] = useState<'loading' | 'completed'>('loading');
  const mountedAt = useRef(Date.now()).current;
  const mounted = useRef(true);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const completedOpacity = useRef(new Animated.Value(0)).current;
  const completedShift = useRef(new Animated.Value(COMPLETED_RISE_PX)).current;
  useEffect(
    () => () => {
      mounted.current = false;
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
    },
    [],
  );

  // Crossfade into the completion state. Also fires the 'completed' step view
  // (step_index 7) the standalone OnboardingCompleted screen used to own.
  const revealCompleted = useCallback(() => {
    if (!mounted.current) {
      return;
    }
    track('onboarding_step_viewed', { step_name: 'completed', step_index: 7 });
    if (reduced) {
      loadingOpacity.setValue(0);
      completedShift.setValue(0);
      completedOpacity.setValue(1);
      setPhase('completed');
      return;
    }
    Animated.timing(loadingOpacity, {
      toValue: 0,
      duration: motion.duration.normal,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !mounted.current) {
        return;
      }
      setPhase('completed');
      Animated.parallel([
        Animated.timing(completedOpacity, {
          toValue: 1,
          duration: motion.duration.medium,
          easing: motion.easing.enter,
          useNativeDriver: true,
        }),
        Animated.timing(completedShift, {
          toValue: 0,
          duration: motion.duration.medium,
          easing: motion.easing.enter,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [reduced, loadingOpacity, completedOpacity, completedShift]);

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
      // DEFERRED COMPLETION: do NOT call completeOnboarding() here — that fires
      // only at the Outro CTA. Honor the minimum-visible floor, then crossfade
      // into the completion state in place (no navigation).
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt));
      transitionTimer.current = setTimeout(revealCompleted, remaining);
    },
  });

  // Fire the generate exactly once on mount (Loading IS the in-flight call).
  const { mutate } = generateMutation;
  useEffect(() => {
    mutate();
  }, [mutate]);

  // Error-path retake → back to Step 3 to change the picks.
  const handleErrorRetake = useCallback(() => {
    navigation.navigate('OnboardingStyles', {
      wardrobe_direction: selection.wardrobe_direction,
      fit_preference: selection.fit_preference,
    });
  }, [navigation, selection]);

  // Completion retake → restart onboarding from Step 1 (Wardrobe).
  const handleRetake = useCallback(() => {
    navigation.navigate('OnboardingWardrobe');
  }, [navigation]);

  const chips = selectionChipLabels(selection);
  const isError = generateMutation.isError;
  const parsed = isError ? parseGenerateError(generateMutation.error) : null;
  const isCompleted = phase === 'completed';

  return (
    <SafeAreaView style={styles.container} testID="onboarding-loading-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chipsBlock}>
          <Text style={styles.leadIn}>{SELECTED_CHIPS_LEADIN}</Text>
          <SelectedChips labels={chips} testID="onboarding-loading-chips" />
        </View>

        {isCompleted ? (
          <Animated.View
            testID="onboarding-completed-screen"
            style={[
              styles.completedBlock,
              {
                opacity: completedOpacity,
                transform: [{ translateY: completedShift }],
              },
            ]}
          >
            <Text style={styles.headline}>{COMPLETED_COPY.headline}</Text>
          </Animated.View>
        ) : (
          <Animated.View
            style={[styles.loadingBlock, { opacity: loadingOpacity }]}
          >
            <Text style={styles.helper}>{LOADING_COPY.helper}</Text>
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
          </Animated.View>
        )}
      </ScrollView>

      {isCompleted ? (
        <Animated.View style={[styles.footerBar, { opacity: completedOpacity }]}>
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
        </Animated.View>
      ) : parsed ? (
        <View style={styles.footerBar}>
          <PillButton
            title="Try again"
            variant="filled"
            onPress={() => generateMutation.mutate()}
            style={styles.cta}
            testID="onboarding-loading-retry"
          />
          <PillButton
            title="Retake"
            variant="text"
            onPress={handleErrorRetake}
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
  loadingBlock: {
    gap: theme.spacing.m,
  },
  completedBlock: {
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
