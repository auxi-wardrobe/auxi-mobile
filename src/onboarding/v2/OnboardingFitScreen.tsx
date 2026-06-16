/**
 * Onboarding V2 — Step 2/3: fit preference (Figma node 2849:8423 + branches).
 *
 * D8: ONE screen parameterised by `wardrobe_direction` (route param), not three
 * branch flows. D2: tiles show the UI label ("Regular") while the wire value
 * (`Classic Fit`) is what threads downstream — the label never reaches the API.
 *
 * Selection visuals (per Figma): the chosen tile is full-opacity with a 4px
 * dark border; the others dim to opacity 0.5. Continue (bottom-anchored) is
 * disabled until a fit is picked, then forwards `{wardrobe_direction,
 * fit_preference}` to Step 3.
 *
 * Tile artwork not yet supplied → `figmaCardSurface` placeholder (plan risk note).
 */
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStepHeader } from './OnboardingStepHeader';
import {
  OnboardingSelectionCard,
  OnboardingSelectionFigure,
} from '../../components/primitives/OnboardingSelectionCard';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import type { FitPreference } from '../../services/v05Api';
import { FIT_OPTIONS, STEP_COPY, fitTileArt } from '../config';
import { AppStackParamList } from '../../types/navigation';
import { track } from '../../services/analytics';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'OnboardingFit'>;
type ScreenRoute = RouteProp<AppStackParamList, 'OnboardingFit'>;

export const OnboardingFitScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { wardrobe_direction } = route.params;
  // Track the wire value (never the display label) so the contract value
  // is what threads downstream (D2).
  const [selected, setSelected] = useState<FitPreference | null>(null);
  const copy = STEP_COPY.step2;

  useFocusEffect(
    useCallback(() => {
      track('onboarding_step_viewed', {
        step_name: 'fit_preference',
        step_index: 4,
      });
    }, []),
  );

  const handleSelect = (fit: FitPreference) => {
    setSelected(fit);
    track('fit_preference_selected', { fit });
  };

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('OnboardingStyles', {
      wardrobe_direction,
      fit_preference: selected,
    });
  };

  const [primaryRow, secondaryRow] = [
    FIT_OPTIONS.slice(0, 2),
    FIT_OPTIONS.slice(2),
  ];

  const renderTile = (option: (typeof FIT_OPTIONS)[number], solo: boolean) => {
    const isSelected = selected === option.wireValue;
    // Once a fit is chosen, the un-chosen tiles dim (Figma Step-2 states).
    const isDimmed = selected !== null && !isSelected;
    // testID stays a stable single-word slug (slim/regular/relaxed) decoupled
    // from the display copy — the label now carries a " Fit" suffix to match
    // Figma, but Maestro selectors + the screen test must not churn with copy.
    const testSlug = option.label.toLowerCase().replace(/\s*fit$/, '');
    return (
      <TouchableOpacity
        key={option.wireValue}
        testID={`onboarding-fit-tile-${testSlug}`}
        accessibilityLabel={option.label}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        activeOpacity={0.85}
        onPress={() => handleSelect(option.wireValue)}
        style={solo ? styles.tileSolo : styles.tileFlex}
      >
        <OnboardingSelectionCard
          variant="v2"
          label={option.label}
          selected={isSelected}
          dimmed={isDimmed}
        >
          <OnboardingSelectionFigure
            source={fitTileArt(wardrobe_direction, option.wireValue)}
            inset
            resizeMode="contain"
          />
        </OnboardingSelectionCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-fit-screen">
      <View style={styles.content}>
        <OnboardingStepHeader
          step={2}
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
          testID="onboarding-fit-continue"
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
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  grid: { gap: theme.spacing.xs },
  gridRow: { flexDirection: 'row', gap: theme.spacing.xs },
  tileFlex: { flex: 1 },
  tileSolo: { width: '50%' },
  cta: { alignSelf: 'center', width: 327, borderRadius: theme.borderRadius.l },
});
