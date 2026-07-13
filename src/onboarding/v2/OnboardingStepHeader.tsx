/**
 * Onboarding V2 — shared back-only header + "Step n/3" label + 3-segment
 * progress bar (Figma node 2849:8331, `header` h107 + `Frame 2042`).
 *
 * D8: ONE parameterised header for all three steps. qa-ui Note 4 — the
 * womenswear/mixed fit artboards use a bare Top-bar instead of the shared
 * header; we deliberately collapse to this single header rather than
 * replicate that artboard inconsistency.
 *
 * Tokens: filled segment + back glyph = uacTextBase (#1d1f23, border/neutral/base);
 * empty segment = figmaCaptionPillBg (#eee6df) faint greige; step label =
 * figmaOnboardingStepLabel (#9e968e). poppinsCaptionXxs (Inter 10/12) for the label.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

interface OnboardingStepHeaderProps {
  /** 1-based current step (1, 2 or 3). Drives the filled segments. */
  step: 1 | 2 | 3;
  /** "Step n/3" muted label (sourced from config STEP_COPY). */
  stepLabel: string;
  onBack: () => void;
  testID?: string;
}

const TOTAL_SEGMENTS = 3;

export const OnboardingStepHeader: React.FC<OnboardingStepHeaderProps> = ({
  step,
  stepLabel,
  onBack,
  testID,
}) => (
  <View style={styles.container} testID={testID}>
    <TopIconButton
      testID="onboarding-step-back"
      accessibilityLabel="Go back"
      onPress={onBack}
      style={styles.backButton}
      icon={<Icons.ChevronLeft width={20} height={20} />}
    />
    <Text style={styles.stepLabel}>{stepLabel}</Text>
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => (
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
