/**
 * Shared "Step n/N" label + segmented progress bar (Figma `Frame 2086` on the
 * See-on-me redesign; lifted from `src/onboarding/v2/OnboardingStepHeader.tsx`
 * per the redesign spec's reuse map). Deliberately does NOT render its own
 * back button — on See-on-me this sits BELOW the `StomHeader` top app-bar,
 * which already owns the back chevron + centered title. `onBack` stays
 * optional so a caller with no separate top bar (e.g. a future onboarding
 * migration) can still opt into the back-button row.
 *
 * Tokens: filled segment + back glyph = uacTextBase (#1d1f23); empty segment =
 * figmaCaptionPillBg (#eee6df); step label = figmaOnboardingStepLabel
 * (#9e968e), uacBodyXsRegular (Poppins 10/12).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TopIconButton } from '../primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

interface StepProgressHeaderProps {
  /** 1-based current step. Drives the filled segments. */
  step: number;
  /** Total number of segments (default 3 — every See-on-me/onboarding flow so far). */
  totalSteps?: number;
  /** "Step n/N" muted label. */
  stepLabel: string;
  /** Renders a back-chevron row above the segments when provided. */
  onBack?: () => void;
  testID?: string;
}

export const StepProgressHeader: React.FC<StepProgressHeaderProps> = ({
  step,
  totalSteps = 3,
  stepLabel,
  onBack,
  testID,
}) => (
  <View style={styles.container} testID={testID}>
    {onBack ? (
      <TopIconButton
        testID="step-progress-header-back"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.backButton}
        icon={<Icons.ChevronLeft width={20} height={20} />}
      />
    ) : null}
    <Text style={styles.stepLabel}>{stepLabel}</Text>
    <View style={styles.progressRow}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index < step ? styles.segmentFilled : styles.segmentEmpty,
          ]}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.s,
  },
  backButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.l,
    ...theme.ds.shadow.headerIcon,
  },
  progressRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  segment: {
    flex: 1,
    height: 2,
    borderRadius: theme.borderRadius.s,
  },
  segmentFilled: {
    backgroundColor: theme.colors.uacTextBase,
  },
  segmentEmpty: {
    backgroundColor: theme.colors.figmaCaptionPillBg,
  },
  stepLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
  },
});
