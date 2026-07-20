/**
 * See-on-me redesign — full-screen stepped shell for the 3 capture steps
 * (selfie / full body / body fit), replacing the old accumulating-transcript
 * layout (prompt bubbles + thumbnails stacking down the screen). Each step
 * now renders as its OWN full screen: `StomHeader` top app-bar (back +
 * centered "See on me" title) + `StepProgressHeader` ("Step n/3" + segments,
 * Figma `Frame 2086`) + the step's prompt copy/icon + its controls, with the
 * privacy footer pinned to the bottom.
 */
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { StepProgressHeader } from '../../components/layout/StepProgressHeader';
import { StomHeader, InlineError, PrivacyFooter } from './components';

interface StomStepLayoutProps {
  title: string;
  step: 1 | 2 | 3;
  stepLabel: string;
  onBack: () => void;
  /**
   * Legacy prompt-bubble slot (still used by step 3 / body shape). Steps 1
   * and 2 own a richer headline + bullet-tips block rendered as `children`
   * instead (see StepSelfie.tsx / StepFullBody.tsx `CaptureStepIntro`), so
   * this is omitted for them.
   */
  promptText?: string;
  promptIcon?: React.ReactNode;
  photoError?: string | null;
  photoErrorTestID?: string;
  privacyText: string;
  testID?: string;
  children: React.ReactNode;
}

export const StomStepLayout: React.FC<StomStepLayoutProps> = ({
  title,
  step,
  stepLabel,
  onBack,
  promptText,
  promptIcon,
  photoError,
  photoErrorTestID,
  privacyText,
  testID,
  children,
}) => (
  <SafeAreaView style={styles.container} testID={testID}>
    <StomHeader title={title} onBack={onBack} />
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StepProgressHeader step={step} stepLabel={stepLabel} />

      {promptText ? (
        <View style={styles.promptBlock}>
          <Text style={styles.promptText}>{promptText}</Text>
          {promptIcon ? (
            <View style={styles.promptIcon}>{promptIcon}</View>
          ) : null}
        </View>
      ) : null}

      {photoError ? (
        <InlineError text={photoError} testID={photoErrorTestID} />
      ) : null}

      <View style={styles.controls}>{children}</View>
    </ScrollView>
    <View style={styles.footer}>
      <PrivacyFooter text={privacyText} />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },
  promptBlock: {
    gap: theme.spacing.m,
    alignItems: 'flex-start',
  },
  promptText: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.uacTextBase,
  },
  promptIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    gap: theme.spacing.l,
  },
  footer: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
  },
});
