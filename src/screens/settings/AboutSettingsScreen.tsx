import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { Header } from '../../components/layout/Header';
import {
  SettingsGroup,
  SettingsRow,
} from '../../components/settings/SettingsList';
import { AppStackParamList } from '../../types/navigation';
import type { LegalDocumentType } from '../../content/legal';
import { theme } from '../../theme/theme';
import { APP_VERSION } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'AboutSettings'>;

// 7 · About — Version, Terms of Service, Privacy Policy.
export const AboutSettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();

  // Open an in-app legal document (Terms / Privacy). `legal_document_viewed`
  // (source='settings') is fired by LegalDocumentScreen's mount effect, so we
  // only navigate here — no double-count.
  const openLegalDocument = (documentType: LegalDocumentType) => {
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.about')}
          background="transparent"
          leftTestID="about-back-button"
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup>
            {/* Version row. In __DEV__ builds it doubles as a hidden entry to
                the in-app Design System reference (tap to open). In prod it is
                an inert info row. */}
            <SettingsRow
              label={t('settings.version_label')}
              value={APP_VERSION}
              testID={__DEV__ ? 'settings-version-devmenu' : 'settings-version-row'}
              accessibilityLabel={
                __DEV__ ? 'Open Design System reference' : undefined
              }
              onPress={
                __DEV__
                  ? () => navigation.navigate('DesignSystem')
                  : undefined
              }
            />
            <SettingsRow
              label={t('settings.terms_of_service')}
              chevron
              testID="settings-terms-of-service-row"
              accessibilityLabel={t('settings.terms_of_service')}
              onPress={() => openLegalDocument('terms')}
            />
            <SettingsRow
              label={t('settings.privacy_policy')}
              chevron
              testID="settings-privacy-policy-row"
              accessibilityLabel={t('settings.privacy_policy')}
              onPress={() => openLegalDocument('privacy')}
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
