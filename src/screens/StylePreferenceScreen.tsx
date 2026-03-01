import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

const CONTENT_BY_GENDER: Record<GenderPreferenceValue, { title: string; subtitle: string }> = {
  womenswear: {
    title: 'Which fit makes you feel most confident?',
    subtitle: "This will be Auxi's starting point. You can switch up your style anytime.",
  },
  menswear: {
    title: 'Which fit feels right?',
    subtitle: 'This sets a starting point. You can update it later.',
  },
  mixed: {
    title: 'Which fit feels right?',
    subtitle: 'This sets a starting point. You can update it later.',
  },
};

export const StylePreferenceScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { completeOnboarding, isLoading } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState<StylePreferenceValue | null>(null);

  const selectedGender: GenderPreferenceValue = route.params?.gender || 'mixed';
  const content = useMemo(() => CONTENT_BY_GENDER[selectedGender], [selectedGender]);

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
          <View style={styles.textBlock}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          </View>

          <View style={styles.optionList}>
            {STYLE_OPTIONS.map((option) => {
              const selected = selectedStyle === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.82}
                  onPress={() => setSelectedStyle(option.value)}
                  style={[styles.optionItem, selected && styles.optionItemSelected]}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <PillButton
            title="Next"
            variant="filled"
            loading={isLoading}
            disabled={!selectedStyle}
            onPress={handleNext}
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
    justifyContent: 'flex-end',
    gap: 28,
  },
  textBlock: {
    gap: 8,
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
  optionList: {
    gap: 8,
  },
  optionItem: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: theme.colors.figmaDivider,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionItemSelected: {
    borderColor: theme.colors.figmaAction,
  },
  optionText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaAction,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaDivider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.figmaAction,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.figmaAction,
  },
});
