import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { SettingsScreenScaffold } from '../../components/settings/SettingsScreenScaffold';
import {
  SettingsRow,
  SettingsDivider,
} from '../../components/settings/SettingsRow';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { RadioOptionList } from '../../components/settings/RadioOptionList';
import { User, UserStyleDirection } from '../../types/auth';
import { AppStackParamList } from '../../types/navigation';
import { track } from '../../services/analytics';
import { setLanguage as setI18nLanguage } from '../../i18n/init';
import type { Language } from '../../translations';
import {
  DEFAULT_SETTINGS,
  LANGUAGE_LABEL_MAP,
  LANGUAGE_OPTIONS,
  buildDirectionLabelMap,
  buildDirectionOptions,
  resolveSettings,
  showSettingsError,
  usePersistUserMetadata,
} from './settingsShared';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'SettingsPersonalization'
>;
type ActiveModal = 'none' | 'direction' | 'language';

/**
 * Personalization sub-screen (Settings › Personalization). Groups the
 * "how Auxi feels to me" controls: style direction, app language, and the entry
 * point to managing body photos.
 */
export const SettingsPersonalizationScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const persistUserMetadata = usePersistUserMetadata();

  const [styleDirection, setStyleDirection] = useState<UserStyleDirection>(
    DEFAULT_SETTINGS.styleDirection,
  );
  const [pendingDirection, setPendingDirection] = useState<UserStyleDirection>(
    DEFAULT_SETTINGS.styleDirection,
  );
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingDirection, setIsSavingDirection] = useState(false);

  const currentLanguage = (i18n.language as Language) || 'en-EN';
  const [pendingLanguage, setPendingLanguage] =
    useState<Language>(currentLanguage);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  const syncFromUser = useCallback((nextUser: User | null) => {
    const next = resolveSettings(nextUser?.user_metadata).styleDirection;
    setStyleDirection(next);
    setPendingDirection(next);
  }, []);

  useEffect(() => {
    syncFromUser(user);
  }, [syncFromUser, user]);

  const directionOptions = useMemo(() => buildDirectionOptions(t), [t]);
  const directionLabelMap = useMemo(() => buildDirectionLabelMap(t), [t]);
  const currentDirectionLabel = directionLabelMap[styleDirection];

  const openDirectionModal = () => {
    setPendingDirection(styleDirection);
    setActiveModal('direction');
  };

  const closeDirectionModal = () => {
    if (isSavingDirection) return;
    setPendingDirection(styleDirection);
    setActiveModal('none');
  };

  const openLanguageModal = () => {
    setPendingLanguage(currentLanguage);
    setActiveModal('language');
  };

  const closeLanguageModal = () => {
    if (isSavingLanguage) return;
    setPendingLanguage(currentLanguage);
    setActiveModal('none');
  };

  const applyDirection = async () => {
    if (isSavingDirection) return;

    setIsSavingDirection(true);
    try {
      const updatedUser = await persistUserMetadata(
        { style_direction: pendingDirection },
        t('settings.error_update_direction'),
      );
      syncFromUser(updatedUser);
      track('style_direction_changed', { direction: pendingDirection });
      setActiveModal('none');
    } catch {
      // Error toast + 401 handled upstream; keep the modal open for retry.
    } finally {
      setIsSavingDirection(false);
    }
  };

  const applyLanguage = async () => {
    if (isSavingLanguage) return;
    if (pendingLanguage === currentLanguage) {
      setActiveModal('none');
      return;
    }
    setIsSavingLanguage(true);
    try {
      await setI18nLanguage(pendingLanguage);
      track('settings_language_changed', { locale: pendingLanguage });
      setActiveModal('none');
    } catch {
      showSettingsError(
        t('settings.toast_title'),
        t('settings.error_update_language'),
      );
    } finally {
      setIsSavingLanguage(false);
    }
  };

  return (
    <>
      <SettingsScreenScaffold
        title={t('settings.section_personalization')}
        headerVariant="back"
        onLeftPress={navigation.goBack}
        leftTestID="settings-personalization-back"
        leftAccessibilityLabel={t('settings.a11y_back')}
      >
        <SettingsRow
          testID="settings-style-direction-row"
          label={t('settings.style_direction')}
          value={currentDirectionLabel}
          chevron
          onPress={openDirectionModal}
        />

        <SettingsDivider />

        <SettingsRow
          testID="settings-language-row"
          label={t('settings.language')}
          accessibilityLabel={t('settings.a11y_change_language')}
          value={LANGUAGE_LABEL_MAP[currentLanguage]}
          chevron
          onPress={openLanguageModal}
        />

        <SettingsDivider />

        <SettingsRow
          testID="settings-manage-body-row"
          label={t('settings.manage_body_photo')}
          chevron
          onPress={() => navigation.navigate('Body', { mode: 'photoLibrary' })}
        />
      </SettingsScreenScaffold>

      {/* Style-direction dialog */}
      <SettingsDialog
        visible={activeModal === 'direction'}
        onClose={closeDirectionModal}
        isBusy={isSavingDirection}
        title={t('settings.dialog_direction_title')}
        body={t('settings.dialog_direction_body')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyDirection}
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

      {/* Language picker dialog */}
      <SettingsDialog
        visible={activeModal === 'language'}
        onClose={closeLanguageModal}
        isBusy={isSavingLanguage}
        title={t('settings.dialog_language_title')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyLanguage}
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
    </>
  );
};
