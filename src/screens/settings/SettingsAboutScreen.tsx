import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SettingsScreenScaffold } from '../../components/settings/SettingsScreenScaffold';
import {
  SettingsRow,
  SettingsDivider,
} from '../../components/settings/SettingsRow';
import { UsageLimitSheet } from '../../components/features/UsageLimitSheet';
import { useUsageLimitGate } from '../../hooks/useUsageLimitGate';
import { AppStackParamList } from '../../types/navigation';
import type { LegalDocumentType } from '../../content/legal';
import { APP_VERSION } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'SettingsAbout'>;

/**
 * About sub-screen (Settings › About). App version plus the in-app legal docs
 * (Terms of Service / Privacy Policy — App Store blocker B5). In __DEV__ the
 * version row doubles as the hidden entry to the Design System reference.
 *
 * Also in __DEV__: a "Preview usage limit sheet" row (AU-442 QA reachability
 * aid — the real sheet only fires off a genuine backend `limit_reached`
 * usage response, which isn't fast to force for a visual check). Mirrors the
 * shipped `UsageLimitSheet` usage pattern verbatim
 * (`useUsageLimitGate` + `onUpgrade` → `NotifyMe`), so tapping "Upgrade to
 * Macgie+" inside the preview reaches `NotifyMeScreen` too — one trigger,
 * both surfaces. QA infra only, not shipped copy — no i18n.
 *
 * AU-442 designer gate Finding 1 (round 2): the sheet is rendered inside the
 * SAME single root `<View>` as the scaffold, not as an extra top-level
 * `<>` Fragment sibling. A Fragment here would make this screen's rendered
 * output TWO top-level host views under the native-stack `Screen` wrapper —
 * diverging from every real call site (`EnhanceImageScreen`, `WardrobeScreen`
 * via `useAddWardrobeItem`), which each nest `<UsageLimitSheet>` inside their
 * single root container. Matching that single-root shape here rules out any
 * native-stack transition/snapshot machinery reacting to this screen's
 * output differently than a real trigger site's.
 */
export const SettingsAboutScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const usageLimitPreview = useUsageLimitGate();

  // Open an in-app legal document. `legal_document_viewed` (source='settings')
  // is fired by LegalDocumentScreen's mount effect, so we only navigate here.
  const openLegalDocument = (documentType: LegalDocumentType) => {
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });
  };

  return (
    <View style={styles.root}>
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

        {__DEV__ && (
          <>
            <SettingsDivider />
            <SettingsRow
              testID="settings-dev-usage-limit-preview"
              label="Preview usage limit sheet (QA)"
              accessibilityLabel="Preview usage limit sheet"
              onPress={() => usageLimitPreview.open('see_on_me')}
            />
          </>
        )}
      </SettingsScreenScaffold>

      {/* AU-442 QA reachability aid — see class doc comment above. Nested
          inside the same root <View> as the scaffold above (not a Fragment
          sibling) so this screen keeps a single top-level host view, same as
          every real trigger site. */}
      {__DEV__ && (
        <UsageLimitSheet
          {...usageLimitPreview.sheetProps}
          onUpgrade={() => {
            // AU-442 designer gate Finding 1: navigate AFTER the sheet's
            // close animation settles, not synchronously — see
            // useUsageLimitGate.dismissThenNavigate doc comment.
            usageLimitPreview.dismissThenNavigate(() => {
              navigation.navigate('NotifyMe', {
                feature: usageLimitPreview.sheetProps.feature,
                source: 'settings_dev_preview',
              });
            });
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
