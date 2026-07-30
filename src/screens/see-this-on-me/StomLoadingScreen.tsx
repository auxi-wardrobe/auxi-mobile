/**
 * See-on-me redesign (B1) — the two full-screen loading states ("Loading step
 * 3" Figma 4814:11737, 3 rows; "loading to see result" Figma 4814:13137, 4
 * rows). Both are the app-wide `AiLoadingSteps` body (mascot, headline,
 * staggered progress sentences, footer note, leave CTA) under the see-on-me
 * app bar — the same component Enhance Image's loading state uses, so the two
 * flows can't drift apart.
 *
 * Used for the NON-errored branches of the shapes/render loading steps; the
 * error branches keep `GeneratingView` (error copy + retry), unchanged.
 */
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { AiLoadingSteps } from '../../components/features/AiLoadingSteps';
import { StomHeader } from './components';

interface StomLoadingScreenProps {
  /** See-on-me top app-bar title (e.g. t('seeThisOnMe.title')). */
  title: string;
  headline: string;
  rows: string[];
  /**
   * Single 2-line caption (Figma 4814:11737 / 4814:13137): "This can take
   * longer than expected." / "You can leave – we'll let you know the second
   * it's ready." Bug fix: this used to be duplicated with a second,
   * near-identical `quitHint` caption below the quit CTA — removed.
   */
  footerText: string;
  quitLabel: string;
  onBack: () => void;
  onQuit: () => void;
  testID?: string;
}

export const StomLoadingScreen: React.FC<StomLoadingScreenProps> = ({
  title,
  headline,
  rows,
  footerText,
  quitLabel,
  onBack,
  onQuit,
  testID = 'stom-loading',
}) => (
  <SafeAreaView style={styles.container} testID={testID}>
    <StomHeader title={title} onBack={onBack} />
    <AiLoadingSteps
      headline={headline}
      rows={rows}
      footerText={footerText}
      ctaLabel={quitLabel}
      onCta={onQuit}
      testID={`${testID}-steps`}
      ctaTestID="stom-quit-generating"
    />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
});
