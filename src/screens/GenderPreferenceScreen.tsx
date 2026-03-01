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
import { AppStackParamList, GenderPreferenceValue } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'GenderPreference'>;

const OPTIONS: Array<{
  label: string;
  value: GenderPreferenceValue;
  image: number;
}> = [
  {
    label: 'Womenswear',
    value: 'womenswear',
    image: require('../assets/images/women_slim_fit.png'),
  },
  {
    label: 'Menswear',
    value: 'menswear',
    image: require('../assets/images/men_classic_fit.png'),
  },
  {
    label: 'Mixed',
    value: 'mixed',
    image: require('../assets/images/men_relaxed_fit.png'),
  },
];

export const GenderPreferenceScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [selectedPreference, setSelectedPreference] = useState<GenderPreferenceValue | null>(null);

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
                  const selected = selectedPreference === option.value;
                  const dimmed = !!selectedPreference && !selected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.9}
                      onPress={() => setSelectedPreference(option.value)}
                      style={styles.topOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={selected}
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
                  const selected = selectedPreference === option.value;
                  const dimmed = !!selectedPreference && !selected;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.9}
                      onPress={() => setSelectedPreference(option.value)}
                      style={styles.bottomOptionPressable}
                    >
                      <OnboardingSelectionCard
                        label={option.label}
                        selected={selected}
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
            disabled={!selectedPreference}
            onPress={() => navigation.navigate('StylePreference', { gender: selectedPreference || undefined })}
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
    transform: [{ scale: 1.36 }, { translateY: 26 }],
  },
  ctaButton: {
    width: 327,
    alignSelf: 'center',
  },
});
