import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

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
 * Accept / Decline. Reuses the SettingsDialog visual language (Modal → overlay
 * → card) so it sits on-system without a new primitive.
 */
export const AiConsentDialog: React.FC<AiConsentDialogProps> = ({
  visible,
  onAccept,
  onDecline,
  onOpenPrivacyPolicy,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDecline}
    >
      {/* Tap-outside = decline (no silent send). */}
      <TouchableWithoutFeedback onPress={onDecline}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="ai-consent-dialog">
              <Text style={styles.title}>{t('aiConsent.title')}</Text>
              <Text style={styles.body}>{t('aiConsent.body')}</Text>

              <TouchableOpacity
                testID="ai-consent-privacy-link"
                accessibilityRole="link"
                accessibilityLabel={t('aiConsent.privacy_link')}
                activeOpacity={0.7}
                onPress={onOpenPrivacyPolicy}
                style={styles.linkRow}
              >
                <Text style={styles.linkText}>
                  {t('aiConsent.privacy_link')}
                </Text>
              </TouchableOpacity>

              {/* Stacked vertically: primary Accept on top, Decline below. */}
              <View style={styles.actions}>
                <TouchableOpacity
                  testID="ai-consent-accept"
                  accessibilityRole="button"
                  accessibilityLabel={t('aiConsent.accept')}
                  activeOpacity={0.82}
                  style={[styles.action, styles.primaryAction]}
                  onPress={onAccept}
                >
                  <Text style={styles.primaryActionLabel}>
                    {t('aiConsent.accept')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="ai-consent-decline"
                  accessibilityRole="button"
                  accessibilityLabel={t('aiConsent.decline')}
                  activeOpacity={0.82}
                  style={[styles.action, styles.textAction]}
                  onPress={onDecline}
                >
                  <Text style={styles.textActionLabel}>
                    {t('aiConsent.decline')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.dialogScrim,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel,
    paddingTop: theme.spacing.uacDimension24,
    paddingHorizontal: theme.spacing.uacDimension24,
    paddingBottom: theme.spacing.uacDimension24,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  body: {
    ...theme.typography.aliases.interBody,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.m,
  },
  linkRow: {
    marginTop: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.xs,
  },
  linkText: {
    ...theme.typography.aliases.interButton,
    color: theme.colors.figmaAiSparkle,
  },
  actions: {
    flexDirection: 'column',
    gap: theme.spacing.s,
    marginTop: theme.spacing.uacDimension12,
  },
  action: {
    alignSelf: 'stretch',
    height: theme.spacing.uacButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAction: {
    borderRadius: theme.borderRadius.uacRadioPill,
  },
  primaryAction: {
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
  },
  textActionLabel: {
    ...theme.typography.aliases.interButton,
    color: theme.colors.uacTextBase,
  },
  primaryActionLabel: {
    ...theme.typography.aliases.interButton,
    color: theme.colors.figmaPrimaryButtonText,
  },
});
