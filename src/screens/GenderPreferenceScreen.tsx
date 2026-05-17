/**
 * Wardrobe-direction picker (V05 onboarding step 1 — AU-249).
 *
 * Chat-style radio list UI (Figma node 392:1959).
 *
 * Emits the V05 contract value (`Menswear` / `Womenswear` / `Mixed` —
 * `services/v05Api.ts#WardrobeDirection`) AND the legacy lowercase
 * `GenderPreferenceValue` so the existing fit-art mapping in
 * `StylePreferenceScreen` continues to work.
 *
 * Tapping a row selects it AND immediately navigates forward — no
 * separate "Next" button.
 */
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import type { WardrobeDirection } from '../services/v05Api';
import { AppStackParamList, GenderPreferenceValue } from '../types/navigation';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'GenderPreference'
>;

interface DirectionOption {
  label: string;
  value: WardrobeDirection;
  legacyValue: GenderPreferenceValue;
}

const OPTIONS: DirectionOption[] = [
  { label: 'Womenswear', value: 'Womenswear', legacyValue: 'womenswear' },
  { label: 'Menswear', value: 'Menswear', legacyValue: 'menswear' },
  { label: 'Mixed / Gender-neutral', value: 'Mixed', legacyValue: 'mixed' },
];

export const GenderPreferenceScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [selected, setSelected] = useState<DirectionOption | null>(null);

  const handleSelect = (option: DirectionOption) => {
    setSelected(option);
    navigation.navigate('StylePreference', {
      gender: option.legacyValue,
      wardrobe_direction: option.value,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ── Top bar ─────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TopIconButton
            onPress={() => navigation.goBack()}
            icon={<Text style={styles.backGlyph}>‹</Text>}
          />
        </View>

        {/* ── AI message bubble ────────────────────────────── */}
        <View style={styles.bubbleWrapper}>
          <Text style={styles.bubbleText}>
            {'Hi there! ✨ Which type of clothing do you usually wear?'}
          </Text>
        </View>

        {/* ── Radio rows ──────────────────────────────────── */}
        <View style={styles.radioList}>
          {OPTIONS.map(option => {
            const isSelected = selected?.value === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`gender-option-${option.legacyValue}`}
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.88}
                onPress={() => handleSelect(option)}
                style={[styles.radioRow, isSelected && styles.radioRowSelected]}
              >
                <Text
                  style={[
                    styles.radioLabel,
                    isSelected && styles.radioLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {/* Trailing radio indicator */}
                <View
                  style={[
                    styles.radioCircleOuter,
                    isSelected && styles.radioCircleOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioCircleInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const SELECTED_BG = theme.colors.figmaAction;
const UNSELECTED_BG = theme.colors.figmaIconSurface;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f8', // Figma: --light-surface, onboarding bg differs from app figmaBackground (#f2efec)
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 28,
  },

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  /* ── AI bubble ── */
  bubbleWrapper: {
    marginTop: 24,
    marginBottom: 24,
  },
  bubbleText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaText,
  },
  /* ── Radio list ── */
  radioList: {
    gap: 10,
  },
  radioRow: {
    height: 56,
    borderRadius: 32,
    backgroundColor: UNSELECTED_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  radioRowSelected: {
    backgroundColor: SELECTED_BG,
  },
  radioLabel: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaText,
  },
  radioLabelSelected: {
    color: '#ffffff',
  },

  /* Trailing radio indicator */
  radioCircleOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.figmaText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleOuterSelected: {
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
});
