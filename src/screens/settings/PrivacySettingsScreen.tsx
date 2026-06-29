import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { Header } from '../../components/layout/Header';
import { SettingsSwitch } from '../../components/settings/SettingsSwitch';
import {
  SettingsGroup,
  SettingsRow,
} from '../../components/settings/SettingsList';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import { useSettingsController } from './useSettingsController';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'PrivacySettings'
>;

// 6 · Privacy — "Privacy Control" groups the two consent toggles.
export const PrivacySettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const {
    analyticsConsent,
    handleAnalyticsConsentToggle,
    aiDataSharingConsent,
    handleAiDataSharingToggle,
  } = useSettingsController();

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.privacy')}
          background="transparent"
          leftTestID="privacy-back-button"
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup
            header={t('settings.privacy_control')}
            footer={t('settings.privacy_control_footer')}
          >
            {/* Analytics consent (EU/CA opt-in). The only production path to
                grant/revoke — until granted the Mixpanel SDK stays inert and
                every track() call no-ops (services/analytics.ts). */}
            <SettingsRow
              label={t('settings.share_analytics')}
              testID="settings-analytics-consent-row"
              right={
                <SettingsSwitch
                  testID="settings-analytics-consent-toggle"
                  accessibilityLabel={t('settings.a11y_toggle_analytics')}
                  value={analyticsConsent}
                  onValueChange={handleAnalyticsConsentToggle}
                />
              }
            />
            {/* AI data sharing (B1). When OFF, the next try-on re-prompts for
                consent before any photo is sent to our AI providers. */}
            <SettingsRow
              label={t('settings.share_ai_data')}
              testID="settings-ai-data-sharing-row"
              right={
                <SettingsSwitch
                  testID="settings-ai-data-sharing-toggle"
                  accessibilityLabel={t('settings.a11y_toggle_ai_data')}
                  value={aiDataSharingConsent}
                  onValueChange={handleAiDataSharingToggle}
                />
              }
            />
          </SettingsGroup>
        </ScrollView>
      </BottomSheetSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurface,
  },
  sheet: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
