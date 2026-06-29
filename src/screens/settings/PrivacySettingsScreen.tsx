import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/layout/Header';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { SettingsToggleRow } from '../../components/settings/SettingsToggleRow';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
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

type Navigation = NativeStackNavigationProp<AppStackParamList, 'PrivacySettings'>;

export const PrivacySettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [aiDataSharingConsent, setAiDataSharingConsent] = useState(false);

  useEffect(() => {
    let mounted = true;
    hasAnalyticsConsent().then(g => mounted && setAnalyticsConsent(g));
    hasAiDataSharingConsent().then(g => mounted && setAiDataSharingConsent(g));
    return () => { mounted = false; };
  }, []);

  // Optimistic flip + rollback. Order matters: revoke fires the OFF event before
  // teardown; grant fires the ON event after the SDK is live (analytics.ts).
  const onAnalyticsToggle = (enabled: boolean) => {
    const prev = analyticsConsent;
    setAnalyticsConsent(enabled);
    if (!enabled) track('analytics_consent_changed', { granted: false });
    (enabled ? grantAnalyticsConsent : revokeAnalyticsConsent)()
      .then(() => { if (enabled) track('analytics_consent_changed', { granted: true }); })
      .catch(() => {
        setAnalyticsConsent(prev);
        showSettingsError(t('settings.toast_title'), t('settings.error_update_analytics'));
      });
  };

  const onAiToggle = (enabled: boolean) => {
    const prev = aiDataSharingConsent;
    setAiDataSharingConsent(enabled);
    (enabled ? grantAiDataSharingConsent : revokeAiDataSharingConsent)().catch(() => {
      setAiDataSharingConsent(prev);
      showSettingsError(t('settings.toast_title'), t('settings.error_update_ai_sharing'));
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.section_privacy_title')}
          background="transparent"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <SettingsToggleRow
            testID="settings-analytics-consent-toggle"
            accessibilityLabel={t('settings.a11y_toggle_analytics')}
            label={t('settings.share_analytics')}
            value={analyticsConsent}
            onValueChange={onAnalyticsToggle}
          />
          <SettingsToggleRow
            testID="settings-ai-data-sharing-toggle"
            accessibilityLabel={t('settings.a11y_toggle_ai_data')}
            label={t('settings.share_ai_data')}
            value={aiDataSharingConsent}
            onValueChange={onAiToggle}
          />
        </View>
      </BottomSheetSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
});
