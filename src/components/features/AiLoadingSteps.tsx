/**
 * AiLoadingSteps — the app's one long-wait AI loading screen body, shared by
 * every "Macgie is working on it" surface: See-on-me's two loading states
 * (Figma "Loading step 3" / "loading to see result") and Enhance Image's
 * ("Loading step 6"). One component so the family can't drift apart again:
 * the mascot, the headline, the progress sentences and the escape hatch all
 * come from here; callers supply only copy and where "leave" goes.
 *
 * Row mechanics (`useStaggeredReveal`): each sentence owns a `stepMs` slot —
 * it appears spinning and checks off when its slot ends, so three sentences
 * take 3 × stepMs (6s at the default) and four take 8s. That timer is
 * cosmetic; the real job runs independently and the rows simply stay checked
 * if it takes longer — which is exactly what the footer note and the CTA are
 * there for.
 *
 * The CTA stays inert until the sequence has played out (and never less than
 * MIN_CTA_MS): leaving is offered as the wait turns long, not as a first
 * reflex. It never gates the job — leaving keeps it running server-side. Pass
 * `ctaGated={false}` on a screen where this button is the only exit.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { SpinnerIcon } from '../atoms/SpinnerIcon';
import { MacgieLoader } from '../macgie';
import { PillButton } from '../primitives/FigmaPrimitives';
import { useStaggeredReveal } from '../../hooks/useStaggeredReveal';
import { theme } from '../../theme/theme';

/** One sentence every 2s (design note on the loading frames). */
export const AI_LOADING_STEP_MS = 2000;

/** Floor under the CTA, even for a short row list. */
const MIN_CTA_MS = 7000;

const CHECK_SIZE = 24;

interface AiLoadingStepsProps {
  headline: string;
  /** Progress sentences, revealed one per `stepMs` slot. */
  rows: string[];
  /** Two-line note under the rows ("This can take longer than expected…"). */
  footerText: string;
  /** Escape hatch: "Leave — notify me when ready". */
  ctaLabel: string;
  onCta: () => void;
  /** Safe-area allowance below the CTA. */
  bottomInset?: number;
  /**
   * Whether the CTA waits out the sequence before it becomes pressable
   * (default). Pass false only where this button is the ONLY way off the
   * screen — a gate there would trap the user, not slow them down.
   */
  ctaGated?: boolean;
  stepMs?: number;
  /** Root testID; the mascot and rows derive theirs from it. */
  testID?: string;
  ctaTestID?: string;
}

export const AiLoadingSteps: React.FC<AiLoadingStepsProps> = ({
  headline,
  rows,
  footerText,
  ctaLabel,
  onCta,
  bottomInset = theme.spacing.xl,
  ctaGated = true,
  stepMs = AI_LOADING_STEP_MS,
  testID = 'ai-loading',
  ctaTestID = 'ai-loading-cta',
}) => {
  const { visibleCount, completedCount, ctaEnabled } = useStaggeredReveal(
    rows.length,
    { stepMs, minCtaMs: Math.max(MIN_CTA_MS, rows.length * stepMs) },
  );

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MacgieLoader testID={`${testID}-mascot`} style={styles.mascot} />
        <Text style={styles.headline}>{headline}</Text>

        <View style={styles.rows} testID={`${testID}-rows`}>
          {rows.map((row, index) => {
            if (index >= visibleCount) {
              return null;
            }
            // A revealed row is still running until its own slot ends — so the
            // last sentence spins right up to the end of the sequence.
            const done = index < completedCount;
            return (
              <View
                key={row}
                style={styles.row}
                testID={`${testID}-row-${index}`}
              >
                {done ? (
                  <Icons.CheckCircle
                    width={CHECK_SIZE}
                    height={CHECK_SIZE}
                    color={theme.colors.figmaToggleOn}
                  />
                ) : (
                  <SpinnerIcon size={CHECK_SIZE} />
                )}
                <Text style={styles.rowText}>{row}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.note}>{footerText}</Text>
      </ScrollView>

      <View style={[styles.ctaBlock, { paddingBottom: bottomInset }]}>
        <PillButton
          testID={ctaTestID}
          accessibilityLabel={ctaLabel}
          title={ctaLabel}
          variant="outline"
          style={styles.cta}
          disabled={ctaGated && !ctaEnabled}
          onPress={onCta}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.l,
    alignItems: 'center',
  },
  // MacgieLoader's default `fullScreen` variant sets `flex: 1` (it fills its
  // parent when used alone, as in GeneratingView) — override to `flex: 0`
  // since it's one item among several in this column.
  mascot: {
    flex: 0,
    paddingHorizontal: 0,
  },
  headline: {
    ...theme.typography.aliases.interH5Bold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    marginTop: theme.spacing.l,
  },
  // Rows are a left-aligned block inside the centred column: the checks line
  // up under each other, which they wouldn't if each row were centred.
  rows: {
    alignSelf: 'stretch',
    gap: theme.spacing.l,
    marginTop: theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  rowText: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
  note: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  ctaBlock: {
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.m,
  },
  cta: {
    borderRadius: theme.borderRadius.uacButtonCta,
  },
});

export default AiLoadingSteps;
