import React, { useCallback } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { AI_REPORT_EMAIL } from '../../config/aiConsent';

type AiSurface = 'tryon' | 'recommendation';

/**
 * Opens the prefilled AI-content report mailto. Subject/body are static,
 * localized, and carry NO user data (no ids, photos, or free text) — only a
 * generic flag the user can edit. Shared by the inline disclosure and the
 * home black info snackbar so the Report action behaves identically.
 */
export const useAiReport = (surface: AiSurface) => {
  const { t } = useTranslation();
  return useCallback(() => {
    track('ai_content_reported', { surface });
    const subject = encodeURIComponent(t('aiDisclosure.report_subject'));
    const body = encodeURIComponent(t('aiDisclosure.report_body'));
    const url = `mailto:${AI_REPORT_EMAIL}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      /* No mail client / cannot open — fail silently; the label still stands. */
    });
  }, [surface, t]);
};

type AiContentDisclosureProps = {
  /** Which AI output this labels — drives the ai_content_reported property. */
  surface: AiSurface;
  testID?: string;
};

/**
 * AI-generated disclosure + Report affordance — App Store blocker B2
 * (Apple 2026 AI rules). Shows a short "AI-generated" label on AI output and a
 * Report action that opens a prefilled support mailto. Backend-free, no PII in
 * the mailto body (generic text only). Reused on the try-on result and the
 * recommendation surface.
 */
export const AiContentDisclosure: React.FC<AiContentDisclosureProps> = ({
  surface,
  testID,
}) => {
  const { t } = useTranslation();
  const handleReport = useAiReport(surface);

  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label} numberOfLines={1}>
        {t('aiDisclosure.label')}
      </Text>
      <TouchableOpacity
        testID={`ai-report-${surface}`}
        accessibilityRole="button"
        accessibilityLabel={t('aiDisclosure.report')}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={handleReport}
      >
        <Text style={styles.reportText}>{t('aiDisclosure.report')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  label: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextSubtle200,
    flexShrink: 1,
  },
  reportText: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaAiSparkle,
  },
});
