/**
 * Onboarding V2 — Step 3/3: style picks (Figma node 2849:9883).
 *
 * D7: max 2 ranked picks shown with numbered pin badges (D6, View+number).
 * Ranked order lives in local `useState` (no store — auxi "no Zustand" rule).
 *
 * The backend requires `style_preferences` to hold 2-3 entries (count outside
 * that → 400); with MAX_STYLE_PICKS = 2 the user must pick exactly 2, so the
 * sticky "(n/2) Next" bar enables only at 2 picks.
 *
 * NOTE (Phase 4 reconciliation): this screen NO LONGER owns the `/generate`
 * mutation. Per the Figma flow, Loading is a real full-screen step that owns
 * the in-flight call (D10). Next now `navigate`s to `OnboardingLoading`
 * carrying the full selection; that screen fires `/generate` and auto-advances
 * to Completed on success (or surfaces a retry / Retake on error). The
 * deferred-completion contract is unchanged — `completeOnboarding()` still
 * runs only at the Outro CTA, never here.
 *
 * Sticky bar: Figma uses backdrop-blur 2 over a translucent white surface; no
 * BlurView dependency is present, so we use the low-fi solid translucent
 * fallback (`figmaOnboardingStickyBarBg` = rgba(255,255,255,0.6)) — flag for
 * qa-ui Pass 2/3.
 */
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStepHeader } from './OnboardingStepHeader';
import {
  OnboardingSelectionCard,
  OnboardingSelectionFigure,
} from '../../components/primitives/OnboardingSelectionCard';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { StyleTag } from '../../services/v05Api';
import {
  MAX_STYLE_PICKS,
  STEP_COPY,
  STYLE_OPTIONS,
  styleTileArt,
} from '../config';
import { AppStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'OnboardingStyles'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'OnboardingStyles'>;

export const OnboardingStylesScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { wardrobe_direction, fit_preference } = route.params;
  const copy = STEP_COPY.step3;

  // ranked = ordered selection; index 0 has rank 1 (highest weight).
  const [ranked, setRanked] = useState<StyleTag[]>([]);

  const togglePick = useCallback((tag: StyleTag) => {
    setRanked(prev => {
      const idx = prev.indexOf(tag);
      if (idx >= 0) return prev.filter(t => t !== tag);
      if (prev.length >= MAX_STYLE_PICKS) return prev;
      return [...prev, tag];
    });
  }, []);

  // Backend accepts 2-3 picks; with MAX = 2 the valid count is exactly 2.
  const isReady = ranked.length === MAX_STYLE_PICKS;

  const handleNext = () => {
    if (!isReady) return;
    // Hand the full selection to the Loading screen, which owns /generate (D10).
    navigation.navigate('OnboardingLoading', {
      selection: {
        wardrobe_direction,
        fit_preference,
        style_preferences: ranked,
      },
    });
  };

  // Build the 2-per-row grid from STYLE_OPTIONS (any trailing odd tile sits solo).
  const rows: (typeof STYLE_OPTIONS)[] = [];
  for (let i = 0; i < STYLE_OPTIONS.length; i += 2) {
    rows.push(STYLE_OPTIONS.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.container} testID="onboarding-styles-screen">
      <View style={styles.content}>
        <OnboardingStepHeader
          step={3}
          stepLabel={copy.stepLabel}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.textBlock}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          testID="onboarding-styles-grid"
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map(option => {
                const idx = ranked.indexOf(option.value);
                const rank = idx >= 0 ? idx + 1 : undefined;
                const isSelected = rank !== undefined;
                const limitReached =
                  ranked.length >= MAX_STYLE_PICKS && !isSelected;
                const solo = row.length === 1;
                return (
                  <TouchableOpacity
                    key={option.value}
                    testID={`onboarding-style-tile-${option.value.toLowerCase()}`}
                    accessibilityLabel={option.label}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                      disabled: limitReached,
                    }}
                    activeOpacity={0.85}
                    disabled={limitReached}
                    onPress={() => togglePick(option.value)}
                    style={solo ? styles.tileSolo : styles.tileFlex}
                  >
                    <OnboardingSelectionCard
                      variant="v2"
                      label={option.label}
                      selected={isSelected}
                      dimmed={limitReached}
                      pinNumber={rank}
                    >
                      <OnboardingSelectionFigure
                        source={styleTileArt(option.value)}
                        inset
                        resizeMode="contain"
                      />
                    </OnboardingSelectionCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.stickyBar}>
        <PillButton
          title={`(${ranked.length}/${MAX_STYLE_PICKS}) Next`}
          variant="outline"
          disabled={!isReady}
          onPress={handleNext}
          trailing={<Icons.ChevronRight width={24} height={24} />}
          style={styles.stickyCta}
          testID="onboarding-style-next"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.uacBackgroundNeutral50 },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
  textBlock: {
    gap: theme.spacing.xs,
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  grid: { gap: theme.spacing.xs, paddingBottom: theme.spacing.xxl },
  gridRow: { flexDirection: 'row', gap: theme.spacing.xs },
  tileFlex: { flex: 1 },
  tileSolo: { width: '50%' },
  // Sticky translucent bar anchored to the bottom (backdrop-blur fallback).
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.figmaOnboardingStickyBarBg,
  },
  stickyCta: {
    alignSelf: 'center',
    width: 327,
    borderRadius: theme.borderRadius.l,
  },
});
