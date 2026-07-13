import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { SettingsScreenScaffold } from '../../components/settings/SettingsScreenScaffold';
import {
  SettingsRow,
  SettingsDivider,
} from '../../components/settings/SettingsRow';
import { SettingsSwitch } from '../../components/settings/SettingsSwitch';
import { AppStackParamList } from '../../types/navigation';
import {
  grantAnalyticsConsent,
  hasAnalyticsConsent,
  revokeAnalyticsConsent,
  track,
} from '../../services/analytics';
import {
  grantAiDataSharingConsent,
  hasAiDataSharingConsent,
  revokeAiDataSharingConsent,
} from '../../services/aiConsent';
import { showSettingsError } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'SettingsPrivacy'>;

/**
 * Privacy sub-screen (Settings › Privacy). Surfaces the two consent decisions
 * that gate what leaves the device: usage analytics (Mixpanel) and AI data
 * sharing (try-on photos → AI providers). Both are AsyncStorage-persisted
 * decisions owned by their service seams — these toggles are the only
 * production path that grants/revokes them.
 */
export const SettingsPrivacyScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();

  // Analytics consent (EU/CA opt-in). Mirrors the persisted decision in the
  // analytics seam; this toggle is the production path that grants/revokes it.
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  // AI data-sharing consent (B1). Revoking flips the persisted decision so the
  // next try-on photo upload re-prompts (Privacy Policy §6 withdraw right).
  const [aiDataSharingConsent, setAiDataSharingConsent] = useState(false);

  // Reflect the persisted analytics + AI-data-sharing decisions on mount.
  useEffect(() => {
    let isMounted = true;
    hasAnalyticsConsent().then(granted => {
      if (isMounted) {
        setAnalyticsConsent(granted);
      }
    });
    hasAiDataSharingConsent().then(granted => {
      if (isMounted) {
        setAiDataSharingConsent(granted);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Optimistic flip with rollback on failure. grant/revoke persist the decision
  // and bring the SDK up / tear it down.
  const handleAnalyticsConsentToggle = (enabled: boolean) => {
    const previousValue = analyticsConsent;
    setAnalyticsConsent(enabled);
    // Order matters: pre-consent track() is a no-op. Fire BEFORE revoke (event
    // lands while consent still active), AFTER grant (event lands with consent).
    if (!enabled) {
      track('analytics_consent_changed', { granted: false });
    }
    const persist = enabled ? grantAnalyticsConsent : revokeAnalyticsConsent;
    persist()
      .then(() => {
        if (enabled) {
          track('analytics_consent_changed', { granted: true });
        }
      })
      .catch(() => {
        setAnalyticsConsent(previousValue);
        showSettingsError(
          t('settings.toast_title'),
          t('settings.error_update_analytics'),
        );
      });
  };

  // B1: AI data-sharing consent toggle (Privacy Policy §6 withdraw right).
  // Optimistic flip with rollback; grant/revoke persist the decision and emit
  // ai_consent_granted / ai_consent_revoked from the service seam.
  const handleAiDataSharingToggle = (enabled: boolean) => {
    const previousValue = aiDataSharingConsent;
    setAiDataSharingConsent(enabled);
    const persist = enabled
      ? grantAiDataSharingConsent
      : revokeAiDataSharingConsent;
    persist().catch(() => {
      setAiDataSharingConsent(previousValue);
      showSettingsError(
        t('settings.toast_title'),
        t('settings.error_update_ai_sharing'),
      );
    });
  };

  return (
    <SettingsScreenScaffold
      title={t('settings.section_privacy')}
      headerVariant="back"
      onLeftPress={navigation.goBack}
      leftTestID="settings-privacy-back"
      leftAccessibilityLabel={t('settings.a11y_back')}
    >
      {/* Privacy Control — intro framing the two consent toggles below. */}
      <View style={styles.intro}>
        <Text style={styles.introTitle}>{t('settings.privacy_control')}</Text>
        <Text style={styles.introBody}>{t('settings.privacy_control_body')}</Text>
      </View>

      <SettingsDivider />

      <SettingsRow
        testID="settings-analytics-consent-row"
        label={t('settings.share_analytics')}
        trailing={
          <SettingsSwitch
            testID="settings-analytics-consent-toggle"
            accessibilityLabel={t('settings.a11y_toggle_analytics')}
            value={analyticsConsent}
            onValueChange={handleAnalyticsConsentToggle}
          />
        }
      />

      <SettingsDivider />

      <SettingsRow
        testID="settings-ai-data-sharing-row"
        label={t('settings.share_ai_data')}
        trailing={
          <SettingsSwitch
            testID="settings-ai-data-sharing-toggle"
            accessibilityLabel={t('settings.a11y_toggle_ai_data')}
            value={aiDataSharingConsent}
            onValueChange={handleAiDataSharingToggle}
          />
        }
      />
    </SettingsScreenScaffold>
  );
};

const styles = StyleSheet.create({
  intro: {
    paddingVertical: 8,
    gap: 4,
  },
  introTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.ds.color.ink,
  },
  introBody: {
    ...theme.typography.aliases.poppinsBodySmTight,
    color: theme.ds.color.warm500,
  },
});
