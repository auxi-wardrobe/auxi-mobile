import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SettingsScreenScaffold } from '../../components/settings/SettingsScreenScaffold';
import {
  SettingsRow,
  SettingsDivider,
} from '../../components/settings/SettingsRow';
import { AppStackParamList } from '../../types/navigation';
import type { LegalDocumentType } from '../../content/legal';
import { APP_VERSION } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'SettingsAbout'>;

/**
 * About sub-screen (Settings › About). App version plus the in-app legal docs
 * (Terms of Service / Privacy Policy — App Store blocker B5). In __DEV__ the
 * version row doubles as the hidden entry to the Design System reference.
 */
export const SettingsAboutScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();

  // Open an in-app legal document. `legal_document_viewed` (source='settings')
  // is fired by LegalDocumentScreen's mount effect, so we only navigate here.
  const openLegalDocument = (documentType: LegalDocumentType) => {
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });
  };

  return (
    <SettingsScreenScaffold
      title={t('settings.section_about')}
      headerVariant="back"
      onLeftPress={navigation.goBack}
      leftTestID="settings-about-back"
      leftAccessibilityLabel={t('settings.a11y_back')}
    >
      {/* Version row. In __DEV__ builds it doubles as a hidden entry to the
          in-app Design System reference (tap to open). Appearance is unchanged;
          the onPress is dev-only so prod users get an inert row. */}
      <SettingsRow
        testID={__DEV__ ? 'settings-version-devmenu' : 'settings-version'}
        label={t('settings.version', { version: APP_VERSION })}
        accessibilityLabel={
          __DEV__ ? 'Open Design System reference' : undefined
        }
        onPress={
          __DEV__ ? () => navigation.navigate('DesignSystem') : undefined
        }
      />

      <SettingsDivider />

      <SettingsRow
        testID="settings-terms-of-service-row"
        label={t('settings.terms_of_service')}
        accessibilityLabel={t('settings.terms_of_service')}
        chevron
        onPress={() => openLegalDocument('terms')}
      />

      <SettingsDivider />

      <SettingsRow
        testID="settings-privacy-policy-row"
        label={t('settings.privacy_policy')}
        accessibilityLabel={t('settings.privacy_policy')}
        chevron
        onPress={() => openLegalDocument('privacy')}
      />
    </SettingsScreenScaffold>
  );
};
