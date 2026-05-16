/**
 * Fit-preference picker (V05 onboarding step 2 — AU-249).
 *
 * Despite the legacy `StylePreference` route name, this screen has
 * always shown three FIT options (Slim / Classic / Relaxed) — kept the
 * route name to avoid type churn across the app, but the screen now
 * forwards the V05 `fit_preference` contract value (`Slim Fit` /
 * `Classic Fit` / `Relaxed Fit`) to the new `StylePicker` route.
 *
 * The screen also still writes a derived `style_direction` to user
 * metadata via `completeOnboarding` is NOT called here anymore — it
 * fires after V05 generation succeeds on `StylePickerScreen`. This
 * preserves the user's `is_first_login=true` state until the wardrobe
 * is materialised, so a mid-flow drop-out doesn't strand them on Home
 * with an empty wardrobe.
 *
 * Figma reference: card-grid layout established in the new onboarding
 * section. 909:* node IDs are stale post-2026-03-01 (see doc
 * `auxi/docs_agent/FIGMA_SCREEN_MAP.md`).
 */
import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  OnboardingSelectionCard,
  OnboardingSelectionFigure,
} from '../components/primitives/OnboardingSelectionCard';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import type { FitPreference, WardrobeDirection } from '../services/v05Api';
import { AppStackParamList, GenderPreferenceValue } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'StylePreference'>;
type ScreenRoute = RouteProp<AppStackParamList, 'StylePreference'>;
type StylePreferenceValue = 'slim' | 'classic' | 'relaxed';

interface FitOption {
  label: string;
  value: StylePreferenceValue;
  // V05 contract value — exact match for backend literal allowlist.
  v05Value: FitPreference;
}

const STYLE_OPTIONS: FitOption[] = [
  { label: 'Slim fit', value: 'slim', v05Value: 'Slim Fit' },
  { label: 'Classic fit', value: 'classic', v05Value: 'Classic Fit' },
  { label: 'Relaxed fit', value: 'relaxed', v05Value: 'Relaxed Fit' },
];

const DIRECTION_TO_LEGACY_GENDER: Record<WardrobeDirection, GenderPreferenceValue> = {
  Womenswear: 'womenswear',
  Menswear: 'menswear',
  Mixed: 'mixed',
};

const STYLE_ART_BY_GENDER: Record<GenderPreferenceValue, Record<StylePreferenceValue, number>> = {
  womenswear: {
    slim: require('../assets/images/women_slim_fit.png'),
    classic: require('../assets/images/women_classic_fit.png'),
    relaxed: require('../assets/images/women_relaxed_fit.png'),
  },
  menswear: {
    slim: require('../assets/images/men_slim_fit.png'),
    classic: require('../assets/images/men_classic_fit.png'),
    relaxed: require('../assets/images/men_relaxed_fit.png'),
  },
  mixed: {
    slim: require('../assets/images/women_slim_fit.png'),
    classic: require('../assets/images/women_classic_fit.png'),
    relaxed: require('../assets/images/women_relaxed_fit.png'),
  },
};

const CONTENT_BY_GENDER: Record<GenderPreferenceValue, { title: string; subtitle: string }> = {
  womenswear: {
    title: 'Which fit makes you feel most confident?',
    subtitle: "This will be Auxi's starting point. You can switch up your style anytime.",
  },
  menswear: {
    title: 'Which fit feels right?',
    subtitle: 'This sets a starting point.',
  },
  mixed: {
    title: 'Which fit makes you feel most confident?',
    subtitle: "This will be Auxi's starting point. You can switch up your style anytime.",
  },
};

export const StylePreferenceScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const [selectedStyle, setSelectedStyle] = useState<FitOption | null>(null);

  // V05 contract value flows through the entire onboarding chain.
  const wardrobeDirection: WardrobeDirection =
    route.params?.wardrobe_direction ?? 'Mixed';
  // Legacy lowercase value drives the per-gender art mapping.
  const selectedGender: GenderPreferenceValue =
    route.params?.gender ?? DIRECTION_TO_LEGACY_GENDER[wardrobeDirection];

  const content = useMemo(() => CONTENT_BY_GENDER[selectedGender], [selectedGender]);
  const styleArt = useMemo(() => STYLE_ART_BY_GENDER[selectedGender], [selectedGender]);

  const handleNext = () => {
    if (!selectedStyle) return;
    navigation.navigate('StylePicker', {
      wardrobe_direction: wardrobeDirection,
      fit_preference: selectedStyle.v05Value,
    });
  };

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
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>
            </View>

            <View style={styles.optionGrid}>
              <View style={styles.optionRow}>
                {STYLE_OPTIONS.slice(0, 2).map((option) => {
                  const isSelected = selectedStyle?.value === option.value;
                  const dimmed = !!selectedStyle && !isSelected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      testID={`onboarding-fit-${option.value}`}
                      accessibilityLabel={option.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      activeOpacity={0.9}
                      onPress={() => setSelectedStyle(option)}
                      style={styles.topOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={isSelected}
                        dimmed={dimmed}
                      >
                        <OnboardingSelectionFigure
                          source={styleArt[option.value]}
                          imageStyle={styles.optionFigureImage}
                        />
                      </OnboardingSelectionCard>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.optionRow}>
                {STYLE_OPTIONS.slice(2).map((option) => {
                  const isSelected = selectedStyle?.value === option.value;
                  const dimmed = !!selectedStyle && !isSelected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      testID={`onboarding-fit-${option.value}`}
                      accessibilityLabel={option.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      activeOpacity={0.9}
                      onPress={() => setSelectedStyle(option)}
                      style={styles.bottomOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={isSelected}
                        dimmed={dimmed}
                      >
                        <OnboardingSelectionFigure
                          source={styleArt[option.value]}
                          imageStyle={styles.optionFigureImage}
                        />
                      </OnboardingSelectionCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <PillButton
            title="Next"
            variant="filled"
            disabled={!selectedStyle}
            onPress={handleNext}
            style={styles.ctaButton}
            testID="onboarding-fit-next"
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
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  optionGrid: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 4,
  },
  topOptionPressable: {
    flex: 1,
  },
  bottomOptionPressable: {
    width: '49.45%',
  },
  optionFigureImage: {
    transform: [{ scale: 1.3 }, { translateY: 18 }],
  },
  ctaButton: {
    width: 327,
    alignSelf: 'center',
  },
});
