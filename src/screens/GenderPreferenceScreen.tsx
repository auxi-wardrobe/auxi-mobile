/**
 * Wardrobe-direction picker (V05 onboarding step 1 — AU-249).
 *
 * Emits the V05 contract value (`Menswear` / `Womenswear` / `Mixed` —
 * `services/v05Api.ts#WardrobeDirection`) AND the legacy lowercase
 * `GenderPreferenceValue` so the existing fit-art mapping in
 * `StylePreferenceScreen` continues to work.
 *
 * Figma reference: card-grid layout established in the new onboarding
 * section (`470:1122` overview); per-screen 909:* node IDs in
 * `auxi/docs_agent/FIGMA_SCREEN_MAP.md` are stale post-2026-03-01 and
 * could not be re-verified during this implementation. Kept the proven
 * card layout from the prior implementation (parity-checklist Pass).
 */
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  OnboardingSelectionCard,
  OnboardingSelectionFigure,
} from '../components/primitives/OnboardingSelectionCard';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import type { WardrobeDirection } from '../services/v05Api';
import { AppStackParamList, GenderPreferenceValue } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'GenderPreference'>;

interface DirectionOption {
  label: string;
  // V05 contract value (capitalised, with "Mixed" as-is).
  value: WardrobeDirection;
  // Legacy lowercase mirror used by the fit screen for art keying.
  legacyValue: GenderPreferenceValue;
  image: number;
}

const OPTIONS: DirectionOption[] = [
  {
    label: 'Womenswear',
    value: 'Womenswear',
    legacyValue: 'womenswear',
    image: require('../assets/images/women_slim_fit.png'),
  },
  {
    label: 'Menswear',
    value: 'Menswear',
    legacyValue: 'menswear',
    image: require('../assets/images/men_classic_fit.png'),
  },
  {
    label: 'Mixed',
    value: 'Mixed',
    legacyValue: 'mixed',
    image: require('../assets/images/men_relaxed_fit.png'),
  },
];

export const GenderPreferenceScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [selected, setSelected] = useState<DirectionOption | null>(null);

  const handleNext = () => {
    if (!selected) return;
    navigation.navigate('StylePreference', {
      gender: selected.legacyValue,
      wardrobe_direction: selected.value,
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
              <Text style={styles.title}>Start with what you usually wear</Text>
              <Text style={styles.subtitle}>You can change this later.</Text>
            </View>

            <View style={styles.optionGrid}>
              <View style={styles.optionRow}>
                {OPTIONS.slice(0, 2).map((option) => {
                  const isSelected = selected?.value === option.value;
                  const dimmed = !!selected && !isSelected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      testID={`onboarding-direction-${option.legacyValue}`}
                      accessibilityLabel={option.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      activeOpacity={0.9}
                      onPress={() => setSelected(option)}
                      style={styles.topOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={isSelected}
                        dimmed={dimmed}
                      >
                        <OnboardingSelectionFigure
                          source={option.image}
                          imageStyle={styles.optionFigureImage}
                        />
                      </OnboardingSelectionCard>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.optionRow}>
                {OPTIONS.slice(2).map((option) => {
                  const isSelected = selected?.value === option.value;
                  const dimmed = !!selected && !isSelected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      testID={`onboarding-direction-${option.legacyValue}`}
                      accessibilityLabel={option.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      activeOpacity={0.9}
                      onPress={() => setSelected(option)}
                      style={styles.bottomOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={isSelected}
                        dimmed={dimmed}
                      >
                        <OnboardingSelectionFigure
                          source={option.image}
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
            disabled={!selected}
            onPress={handleNext}
            style={styles.ctaButton}
            testID="onboarding-direction-next"
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
    transform: [{ scale: 1.36 }, { translateY: 26 }],
  },
  ctaButton: {
    width: 327,
    alignSelf: 'center',
  },
});
