import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MDialog } from '../design-system/lib';

type AiConsentDialogProps = {
  visible: boolean;
  /** Accept → grant consent + proceed with the AI action. */
  onAccept: () => void;
  /** Decline → persist decline + abort the AI action (app stays usable). */
  onDecline: () => void;
  /** Open the in-app Privacy Policy (LegalDocument, documentType 'privacy'). */
  onOpenPrivacyPolicy: () => void;
};

/**
 * AI data-sharing consent prompt — App Store blocker B1 (Guideline 5.1.1/5.1.2).
 *
 * Shown before the user's body/selfie + wardrobe photos are first sent to our
 * AI providers (Google Gemini + OpenAI) to generate a try-on result. Names the
 * recipients, links to the in-app Privacy Policy, and offers explicit
 * Accept / Decline.
 *
 * GH-364 Wave 1.5: migrated onto the design-system MDialog primitive (scrim,
 * card, motion, action row, tap-outside = decline). The privacy-policy link row
 * (B1 content — must remain) lives in MDialog's `children` slot, between the
 * body copy and the actions. testIDs are preserved verbatim:
 * `ai-consent-dialog`, `ai-consent-privacy-link`, `ai-consent-decline`,
 * `ai-consent-accept`.
 */
export const AiConsentDialog: React.FC<AiConsentDialogProps> = ({
  visible,
  onAccept,
  onDecline,
  onOpenPrivacyPolicy,
}) => {
  const { t } = useTranslation();

  return (
    <MDialog
      visible={visible}
      testID="ai-consent-dialog"
      title={t('aiConsent.title')}
      message={t('aiConsent.body')}
      confirmLabel={t('aiConsent.accept')}
      cancelLabel={t('aiConsent.decline')}
      onConfirm={onAccept}
      onCancel={onDecline}
      cancelTestID="ai-consent-decline"
      confirmTestID="ai-consent-accept"
    >
      <TouchableOpacity
        testID="ai-consent-privacy-link"
        accessibilityRole="link"
        accessibilityLabel={t('aiConsent.privacy_link')}
        activeOpacity={0.7}
        onPress={onOpenPrivacyPolicy}
        style={styles.linkRow}
      >
        <Text style={styles.linkText}>{t('aiConsent.privacy_link')}</Text>
      </TouchableOpacity>
    </MDialog>
  );
};

const styles = StyleSheet.create({
  linkRow: {
    marginBottom: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.xs,
  },
  linkText: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaAiSparkle,
  },
});
