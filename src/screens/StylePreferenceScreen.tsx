import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  OnboardingSelectionCard,
  OnboardingSelectionFigure,
} from '../components/primitives/OnboardingSelectionCard';
import { useAuth } from '../context/AuthContext';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { UserStyleDirection } from '../types/auth';
import { AppStackParamList, GenderPreferenceValue } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'StylePreference'>;
type ScreenRoute = RouteProp<AppStackParamList, 'StylePreference'>;
type StylePreferenceValue = 'slim' | 'classic' | 'relaxed';

const STYLE_OPTIONS: Array<{ label: string; value: StylePreferenceValue }> = [
  { label: 'Slim fit', value: 'slim' },
  { label: 'Classic fit', value: 'classic' },
  { label: 'Relaxed fit', value: 'relaxed' },
];

const STYLE_DIRECTION_BY_PREFERENCE: Record<StylePreferenceValue, UserStyleDirection> = {
  slim: 'more_polished',
  classic: 'stay_balanced',
  relaxed: 'more_relaxed',
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
  const { completeOnboarding, isLoading } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState<StylePreferenceValue | null>(null);

  const selectedGender: GenderPreferenceValue = route.params?.gender || 'mixed';
  const content = useMemo(() => CONTENT_BY_GENDER[selectedGender], [selectedGender]);
  const styleArt = useMemo(() => STYLE_ART_BY_GENDER[selectedGender], [selectedGender]);

  const handleNext = async () => {
    if (!selectedStyle) return;
    try {
      await completeOnboarding({
        user_metadata: {
          style_direction: STYLE_DIRECTION_BY_PREFERENCE[selectedStyle],
        },
      });
    } catch (error) {
      console.error('Failed to save preference', error);
    }
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
                  const selected = selectedStyle === option.value;
                  const dimmed = !!selectedStyle && !selected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.9}
                      onPress={() => setSelectedStyle(option.value)}
                      style={styles.topOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={selected}
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
                  const selected = selectedStyle === option.value;
                  const dimmed = !!selectedStyle && !selected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.9}
                      onPress={() => setSelectedStyle(option.value)}
                      style={styles.bottomOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={selected}
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
            loading={isLoading}
            disabled={!selectedStyle}
            onPress={handleNext}
            style={styles.ctaButton}
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
