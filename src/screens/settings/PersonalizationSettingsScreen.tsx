import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { Header } from '../../components/layout/Header';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { RadioOptionList } from '../../components/settings/RadioOptionList';
import {
  SettingsGroup,
  SettingsRow,
} from '../../components/settings/SettingsList';
import { UserStyleDirection } from '../../types/auth';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import { useSettingsController } from './useSettingsController';
import { LANGUAGE_LABEL_MAP, LANGUAGE_OPTIONS } from './settingsShared';
import type { Language } from '../../translations';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'PersonalizationSettings'
>;
type ActiveModal = 'none' | 'direction' | 'language';

// 5 · Personalization — Style Direction, Language, Manage Body Photo.
export const PersonalizationSettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const {
    settings,
    directionOptions,
    currentDirectionLabel,
    applyDirection,
    isSavingDirection,
    currentLanguage,
    applyLanguage,
    isSavingLanguage,
  } = useSettingsController();

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [pendingDirection, setPendingDirection] = useState<UserStyleDirection>(
    settings.styleDirection,
  );
  const [pendingLanguage, setPendingLanguage] =
    useState<Language>(currentLanguage);

  const openDirectionModal = () => {
    setPendingDirection(settings.styleDirection);
    setActiveModal('direction');
  };

  const openLanguageModal = () => {
    setPendingLanguage(currentLanguage);
    setActiveModal('language');
  };

  const closeModal = () => {
    if (isSavingDirection || isSavingLanguage) return;
    setActiveModal('none');
  };

  const onApplyDirection = async () => {
    const ok = await applyDirection(pendingDirection);
    if (ok) setActiveModal('none');
  };

  const onApplyLanguage = async () => {
    const ok = await applyLanguage(pendingLanguage);
    if (ok) setActiveModal('none');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.personalization')}
          background="transparent"
          leftTestID="personalization-back-button"
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup>
            <SettingsRow
              label={t('settings.style_direction')}
              value={currentDirectionLabel}
              chevron
              testID="settings-style-direction-row"
              onPress={openDirectionModal}
            />
            <SettingsRow
              label={t('settings.language')}
              value={LANGUAGE_LABEL_MAP[currentLanguage]}
              chevron
              testID="settings-language-row"
              accessibilityLabel={t('settings.a11y_change_language')}
              onPress={openLanguageModal}
            />
            <SettingsRow
              label={t('settings.manage_body_photo')}
              chevron
              testID="settings-manage-body-row"
              onPress={() =>
                navigation.navigate('Body', { mode: 'photoDetail' })
              }
            />
          </SettingsGroup>
        </ScrollView>
      </BottomSheetSurface>

      <SettingsDialog
        visible={activeModal === 'direction'}
        onClose={closeModal}
        isBusy={isSavingDirection}
        title={t('settings.dialog_direction_title')}
        body={t('settings.dialog_direction_body')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={onApplyDirection}
        cancelTestID="settings-direction-cancel"
        primaryTestID="settings-direction-update"
      >
        <RadioOptionList
          options={directionOptions}
          selected={pendingDirection}
          onSelect={setPendingDirection}
          testIDPrefix="settings-direction-option"
        />
      </SettingsDialog>

      <SettingsDialog
        visible={activeModal === 'language'}
        onClose={closeModal}
        isBusy={isSavingLanguage}
        title={t('settings.dialog_language_title')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={onApplyLanguage}
        cancelTestID="settings-language-cancel"
        primaryTestID="settings-language-update"
      >
        <RadioOptionList
          options={LANGUAGE_OPTIONS}
          selected={pendingLanguage}
          onSelect={setPendingLanguage}
          testIDPrefix="settings-language-option"
        />
      </SettingsDialog>
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
