/**
 * Enhance Image loading state ("Loading step 6") — the full-body loading
 * design that replaces the old dimmed-original + inline-mascot overlay.
 *
 * Shape: mascot, headline, three progress rows, a footer note and the
 * "Leave — notify me when ready" escape hatch. Same family as the see-on-me
 * loading screens (StomLoadingScreen), so the row mechanics come from the
 * shared `useStaggeredReveal`: each sentence owns a 2s slot — row 0 spins from
 * t=0 and checks at 2s as row 1 appears, row 1 checks at 4s, row 2 checks at
 * 6s. That timer is cosmetic; the real beautify poll runs independently and
 * the rows simply stay checked if the job takes longer (which is exactly what
 * the footer note and the leave CTA are there for).
 *
 * The CTA is deliberately NOT gated behind a minimum wait (unlike see-on-me):
 * leaving mid-generation has always been available on this screen via the
 * header back button, and the job finishes server-side either way.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import { SpinnerIcon } from '../../components/atoms/SpinnerIcon';
import { MacgieLoader } from '../../components/macgie';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { useStaggeredReveal } from '../../hooks/useStaggeredReveal';
import { theme } from '../../theme/theme';

/** One sentence every 2s → 6s for the three rows (design note). */
export const ENHANCE_STEP_MS = 2000;

const MASCOT_SIZE = 80;

// Indexed keys rather than `returnObjects` on an array, matching
// StomStepScreen — keeps `t()` returning a plain string, no i18next typing
// gymnastics.
const ROW_KEYS = [
  'wardrobe.enhance.loading_rows.0',
  'wardrobe.enhance.loading_rows.1',
  'wardrobe.enhance.loading_rows.2',
] as const;

interface EnhanceLoadingViewProps {
  /** Leaves the screen with the job still running server-side. */
  onLeave: () => void;
  /** Safe-area bottom inset, so the CTA clears the home indicator. */
  bottomInset: number;
  testID?: string;
}

export const EnhanceLoadingView: React.FC<EnhanceLoadingViewProps> = ({
  onLeave,
  bottomInset,
  testID = 'enhance-loading-overlay',
}) => {
  const { t } = useTranslation();
  const { visibleCount, completedCount } = useStaggeredReveal(ROW_KEYS.length, {
    stepMs: ENHANCE_STEP_MS,
  });

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.body}>
        <MacgieLoader
          testID="enhance-loading-macgie"
          size={MASCOT_SIZE}
          style={styles.mascot}
        />
        <Text style={styles.headline}>
          {t('wardrobe.enhance.loading_headline')}
        </Text>

        <View style={styles.rows} testID="enhance-loading-rows">
          {ROW_KEYS.map((key, index) => {
            if (index >= visibleCount) {
              return null;
            }
            const done = index < completedCount;
            return (
              <View
                key={key}
                style={styles.row}
                testID={`enhance-loading-row-${index}`}
              >
                {done ? (
                  <Icons.CheckCircle
                    width={24}
                    height={24}
                    color={theme.colors.figmaToggleOn}
                  />
                ) : (
                  <SpinnerIcon />
                )}
                <Text style={styles.rowText}>{t(key)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        <Text style={styles.note}>{t('wardrobe.enhance.loading_note')}</Text>
        <PillButton
          testID="enhance-leave-btn"
          accessibilityLabel={t('wardrobe.enhance.leave_notify')}
          variant="outline"
          title={t('wardrobe.enhance.leave_notify')}
          style={styles.leaveButton}
          onPress={onLeave}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.l,
  },
  body: {
    flex: 1,
    paddingTop: theme.spacing.xxl,
  },
  // MacgieLoader's default `fullScreen` variant sets `flex: 1` (it fills its
  // parent when used alone) — override to `flex: 0` so it's one item in this
  // column. `alignItems: 'center'` (kept from fullScreen) still centres it.
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
  rows: {
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
  footer: {
    gap: theme.spacing.m,
  },
  note: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  leaveButton: {
    borderRadius: theme.borderRadius.uacButtonCta,
  },
});
