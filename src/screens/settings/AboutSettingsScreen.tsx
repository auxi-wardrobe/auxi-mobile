import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MListRow } from '../../components/design-system/lib';
import { Header } from '../../components/layout/Header';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import type { LegalDocumentType } from '../../content/legal';
import { APP_VERSION } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'AboutSettings'>;

export const AboutSettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();

  const openLegal = (documentType: LegalDocumentType) =>
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.section_about')}
          background="transparent"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <MListRow
            testID="about-version-row"
            label={t('settings.version', { version: APP_VERSION })}
            // __DEV__ only: doubles as the hidden Design System reference entry.
            onPress={__DEV__ ? () => navigation.navigate('DesignSystem') : undefined}
          />
          <MListRow
            testID="settings-terms-of-service-row"
            label={t('settings.terms_of_service')}
            chevron
            onPress={() => openLegal('terms')}
          />
          <MListRow
            testID="settings-privacy-policy-row"
            label={t('settings.privacy_policy')}
            chevron
            onPress={() => openLegal('privacy')}
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
