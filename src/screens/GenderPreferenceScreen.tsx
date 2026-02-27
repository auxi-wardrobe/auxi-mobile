import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { AppStackParamList, GenderPreferenceValue } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'GenderPreference'>;

const OPTIONS: Array<{ label: string; value: GenderPreferenceValue }> = [
  { label: 'Womenswear', value: 'womenswear' },
  { label: 'Menswear', value: 'menswear' },
  { label: 'Mixed', value: 'mixed' },
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
          <View style={styles.textBlock}>
            <Text style={styles.title}>Start with what you usually wear</Text>
            <Text style={styles.subtitle}>You can change this later.</Text>
          </View>

          <View style={styles.optionList}>
            {OPTIONS.map((option) => {
              const selected = selectedPreference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.82}
                  onPress={() => setSelectedPreference(option.value)}
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
            disabled={!selectedPreference}
            onPress={() => navigation.navigate('StylePreference', { gender: selectedPreference || undefined })}
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
