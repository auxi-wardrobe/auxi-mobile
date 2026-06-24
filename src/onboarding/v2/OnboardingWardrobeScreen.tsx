/**
 * Onboarding V2 — Step 1/3: wardrobe direction (Figma node 2849:8339).
 *
 * Tile grid (2-up Womenswear/Menswear + solo Mixed), each a 3:4 v2 selection
 * card. Selecting a tile enables the bottom-anchored Continue (Figma shows a
 * disabled grey CTA until a pick is made — unlike legacy tap=navigate).
 * Continue forwards `{wardrobe_direction}` to Step 2.
 *
 * Copy/labels come from `onboarding/config`; no inline strings. Tile artwork
 * is not yet supplied by the CEO → tiles render on the `figmaCardSurface`
 * placeholder bg (plan risk note), wire art in when delivered.
 */
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStepHeader } from './OnboardingStepHeader';
import {
  OnboardingSelectionCard,
  OnboardingSelectionFigure,
} from '../../components/primitives/OnboardingSelectionCard';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import type { WardrobeDirection } from '../../services/v05Api';
import { STEP_COPY, WARDROBE_OPTIONS, wardrobeTileArt } from '../config';
import { AppStackParamList } from '../../types/navigation';
import { track } from '../../services/analytics';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'OnboardingWardrobe'
>;

export const OnboardingWardrobeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [selected, setSelected] = useState<WardrobeDirection | null>(null);
  const copy = STEP_COPY.step1;

  useFocusEffect(
    useCallback(() => {
      track('onboarding_step_viewed', {
        step_name: 'wardrobe_direction',
        step_index: 3,
      });
    }, []),
  );

  const handleSelect = (direction: WardrobeDirection) => {
    setSelected(direction);
    track('wardrobe_direction_selected', { direction });
  };

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('OnboardingFit', { wardrobe_direction: selected });
  };

  // Row 1 = first two options side-by-side; row 2 = remaining (solo) tile.
  const [primaryRow, secondaryRow] = [
    WARDROBE_OPTIONS.slice(0, 2),
    WARDROBE_OPTIONS.slice(2),
  ];

  const renderTile = (
    option: (typeof WARDROBE_OPTIONS)[number],
    solo: boolean,
  ) => {
    const isSelected = selected === option.value;
    return (
      <TouchableOpacity
        key={option.value}
        testID={`onboarding-wardrobe-tile-${option.value.toLowerCase()}`}
        accessibilityLabel={option.label}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        activeOpacity={0.85}
        onPress={() => handleSelect(option.value)}
        style={solo ? styles.tileSolo : styles.tileFlex}
      >
        <OnboardingSelectionCard
          variant="v2"
          label={option.label}
          selected={isSelected}
        >
          <OnboardingSelectionFigure
            source={wardrobeTileArt(option.value)}
            inset
            resizeMode="contain"
          />
        </OnboardingSelectionCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-wardrobe-screen">
      <View style={styles.content}>
        <OnboardingStepHeader
          step={1}
          stepLabel={copy.stepLabel}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.body}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              {primaryRow.map(option => renderTile(option, false))}
            </View>
            <View style={styles.gridRow}>
              {secondaryRow.map(option => renderTile(option, true))}
            </View>
          </View>
        </View>
        <PillButton
          title="Continue"
          variant="filled"
          disabled={!selected}
          onPress={handleContinue}
          style={styles.cta}
          testID="onboarding-wardrobe-continue"
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
    paddingBottom: theme.spacing.xl,
  },
  body: { flex: 1, paddingTop: theme.spacing.xl, gap: theme.spacing.xl },
  textBlock: { gap: theme.spacing.xs, alignItems: 'center' },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  grid: { gap: theme.spacing.xs },
  gridRow: { flexDirection: 'row', gap: theme.spacing.xs },
  tileFlex: { flex: 1 },
  tileSolo: { width: '50%' },
  cta: { alignSelf: 'center', width: 327, borderRadius: theme.borderRadius.l },
});
