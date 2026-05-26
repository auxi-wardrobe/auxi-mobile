/**
 * Style-tag picker (V05 onboarding step 3 — AU-249).
 *
 * Final onboarding step. Collects 2-3 style preferences from the V05
 * five-vocabulary set (Minimal / Casual / Soft / Bold / Formal),
 * preserves selection ORDER (rank 1 = weight 1.0, rank 2 = 0.7,
 * rank 3 = 0.4 — see `wardrobe-backend/docs/WARDROBE_GENERATION_SPEC.md`
 * §3), then calls `generateStarterWardrobe` and on success flips the
 * user past `is_first_login` so the AppNavigator switches to the Home
 * stack.
 *
 * Loading + error states render in-place; on 422
 * `pool_insufficient:*` we surface a retry CTA. There is no Figma node
 * for this screen yet — designed to match the established onboarding
 * visual language (PillButton, theme tokens, Manrope/Playfair).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { track } from '../services/analytics';
import {
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import {
  STYLE_TAGS,
  StyleTag,
  generateStarterWardrobe,
  type GenerateStarterWardrobeResponse,
} from '../services/v05Api';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'StylePicker'>;
type ScreenRoute = RouteProp<AppStackParamList, 'StylePicker'>;

const MIN_SELECTION = 2;
const MAX_SELECTION = 3;

interface StyleTileProps {
  label: StyleTag;
  rank: number | null; // 1-based when selected, null otherwise
  disabled: boolean;
  onPress: () => void;
}

const StyleTile: React.FC<StyleTileProps> = ({
  label,
  rank,
  disabled,
  onPress,
}) => {
  const isSelected = rank !== null;
  return (
    <TouchableOpacity
      testID={`onboarding-style-tile-${label.toLowerCase()}`}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.tile,
        isSelected && styles.tileSelected,
        disabled && !isSelected && styles.tileDisabled,
      ]}
    >
      <Text style={[styles.tileLabel, isSelected && styles.tileLabelSelected]}>
        {label}
      </Text>
      {isSelected ? (
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText}>{rank}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

interface ParsedError {
  title: string;
  message: string;
  isPoolError: boolean;
}

const parseGenerateError = (err: unknown): ParsedError => {
  // axios error with response payload
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
    const data = response?.data;
    const errorCode = data?.error ?? '';
    const message = data?.message ?? '';

    if (status === 422 && errorCode.startsWith('pool_insufficient')) {
      return {
        title: 'Not enough items to build your wardrobe',
        message:
          message ||
          "We couldn't find enough pieces matching your selections. Try a different combination.",
        isPoolError: true,
      };
    }
    if (status === 401) {
      return {
        title: 'Session expired',
        message: 'Please sign in again to continue.',
        isPoolError: false,
      };
    }
    if (status === 400) {
      return {
        title: 'Invalid selections',
        message: message || 'Please review your choices and try again.',
        isPoolError: false,
      };
    }
  }
  return {
    title: 'Something went wrong',
    message: "We couldn't generate your wardrobe. Please try again.",
    isPoolError: false,
  };
};

export const StylePickerScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { completeOnboarding } = useAuth();
  const { wardrobe_direction, fit_preference } = route.params;

  // ranked = ordered selection; index 0 has rank 1 (highest weight).
  const [ranked, setRanked] = useState<StyleTag[]>([]);

  const generateMutation = useMutation<
    GenerateStarterWardrobeResponse,
    unknown,
    StyleTag[]
  >({
    mutationFn: style_preferences =>
      generateStarterWardrobe({
        wardrobe_direction,
        fit_preference,
        style_preferences,
      }),
    onSuccess: async (_data, style_preferences) => {
      // Flip is_first_login=false so the AppNavigator switches to the
      // Home stack. Wardrobe items are already persisted server-side.
      try {
        await completeOnboarding();
        // Activation milestone — a new user finished required setup.
        track('onboarding_completed', {
          styles_selected: style_preferences.length,
          wardrobe_direction,
          fit_preference,
        });
      } catch (err) {
        // If completeOnboarding fails the user is stranded on this
        // screen but the wardrobe IS materialised. Log + let them retry
        // — re-running generateStarterWardrobe is idempotent (server
        // hard-deletes prior auto-clones first).
        console.error(
          'Failed to complete onboarding after V05 generation',
          err,
        );
      }
    },
  });

  const togglePick = useCallback((tag: StyleTag) => {
    setRanked(prev => {
      const idx = prev.indexOf(tag);
      if (idx >= 0) {
        // Deselect: collapse the rank order.
        return prev.filter(t => t !== tag);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, tag];
    });
  }, []);

  const isReady =
    ranked.length >= MIN_SELECTION && ranked.length <= MAX_SELECTION;
  const isLoading = generateMutation.isPending;
  const error = generateMutation.isError
    ? parseGenerateError(generateMutation.error)
    : null;

  const helperCopy = useMemo(() => {
    if (ranked.length === 0)
      return `Pick ${MIN_SELECTION}-${MAX_SELECTION} that feel like you.`;
    if (ranked.length < MIN_SELECTION)
      return `Pick ${MIN_SELECTION - ranked.length} more.`;
    if (ranked.length === MAX_SELECTION)
      return "Looks great. Tap Continue when you're ready.";
    return 'Add one more or continue.';
  }, [ranked.length]);

  const handleContinue = () => {
    if (!isReady || isLoading) return;
    generateMutation.mutate(ranked);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} testID="onboarding-style-loading">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.figmaAction} />
          <View style={styles.loadingTextBlock}>
            <Text style={styles.loadingTitle}>Picking pieces for you</Text>
            <Text style={styles.loadingSubtitle}>
              Building a starter wardrobe from your choices.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopIconButton
          onPress={() => navigation.goBack()}
          icon={<Text style={styles.backGlyph}>‹</Text>}
        />

        <View style={styles.mainBlock}>
          <View style={styles.selectionContent}>
            <View style={styles.textBlock}>
              <Text style={styles.title}>Which words feel most like you?</Text>
              <Text style={styles.subtitle}>{helperCopy}</Text>
            </View>

            <View style={styles.tileGrid} testID="onboarding-style-grid">
              {STYLE_TAGS.map(tag => {
                const idx = ranked.indexOf(tag);
                const rank = idx >= 0 ? idx + 1 : null;
                const limitReached =
                  ranked.length >= MAX_SELECTION && rank === null;

                return (
                  <StyleTile
                    key={tag}
                    label={tag}
                    rank={rank}
                    disabled={limitReached}
                    onPress={() => togglePick(tag)}
                  />
                );
              })}
            </View>

            {error ? (
              <View style={styles.errorBlock} testID="onboarding-style-error">
                <Text style={styles.errorTitle}>{error.title}</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
              </View>
            ) : null}
          </View>

          <PillButton
            title={error?.isPoolError ? 'Try again' : 'Continue'}
            variant="filled"
            disabled={!isReady}
            onPress={handleContinue}
            style={styles.ctaButton}
            testID="onboarding-style-continue"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 28,
  },
  backGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  mainBlock: {
    flex: 1,
    paddingTop: 36,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  selectionContent: {
    gap: 32,
  },
  textBlock: {
    gap: 4,
  },
  title: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  tile: {
    minWidth: 100,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaDivider,
    backgroundColor: theme.colors.figmaSurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  tileSelected: {
    backgroundColor: theme.colors.figmaAction,
    borderColor: theme.colors.figmaAction,
  },
  tileDisabled: {
    opacity: 0.45,
  },
  tileLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  tileLabelSelected: {
    color: theme.colors.white,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    lineHeight: 14,
    color: theme.colors.figmaAction,
  },
  errorBlock: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    gap: theme.spacing.xs,
  },
  errorTitle: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  errorMessage: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  ctaButton: {
    width: 327,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.l,
  },
  loadingTextBlock: {
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  loadingTitle: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  loadingSubtitle: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
