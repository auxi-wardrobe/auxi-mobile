/**
 * Enhance Image loading state ("Loading step 6") — the enhance copy poured
 * into the app-wide `AiLoadingSteps` body (mascot, headline, one progress
 * sentence per 2s slot, footer note, "Leave — notify me when ready"). Same
 * component the see-on-me loading states use, so the two AI waits are the same
 * screen with different words.
 *
 * Leaving is safe: the job finishes server-side and the Wardrobe
 * beautify-ready snackbar brings the user back to the result.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AiLoadingSteps } from '../../components/features/AiLoadingSteps';

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
  testID = 'enhance-loading',
}) => {
  const { t } = useTranslation();

  return (
    <AiLoadingSteps
      headline={t('wardrobe.enhance.loading_headline')}
      rows={ROW_KEYS.map(key => t(key))}
      footerText={t('wardrobe.enhance.loading_note')}
      ctaLabel={t('wardrobe.enhance.leave_notify')}
      onCta={onLeave}
      bottomInset={bottomInset}
      testID={testID}
      ctaTestID="enhance-leave-btn"
    />
  );
};
