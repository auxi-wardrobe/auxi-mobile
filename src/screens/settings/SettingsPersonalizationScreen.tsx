import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
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
import {
  User,
  UserStyleDirection,
  UserWardrobeDirection,
} from '../../types/auth';
import { AppStackParamList } from '../../types/navigation';
import { track } from '../../services/analytics';
import { resetV05Session } from '../../services/v05Api';
import { wardrobeKeys } from '../../services/wardrobeService';
import { DISCOVERY_QUERY_KEY } from '../../hooks/useDiscovery';
import { setLanguage as setI18nLanguage } from '../../i18n/init';
import type { Language } from '../../translations';
import {
  DEFAULT_SETTINGS,
  LANGUAGE_LABEL_MAP,
  LANGUAGE_OPTIONS,
  buildDirectionLabelMap,
  buildDirectionOptions,
  buildWardrobeOptions,
  getErrorMessage,
  resolveSettings,
  resolveWardrobeDirection,
  showSettingsError,
  usePersistUserMetadata,
} from './settingsShared';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'SettingsPersonalization'
>;
type ActiveModal = 'none' | 'direction' | 'language' | 'wardrobe';

/**
 * Personalization sub-screen (Settings › Personalization). Groups the
 * "how Auxi feels to me" controls: wardrobe (Menswear / Womenswear — plan
 * 260923), style direction, app language, and the entry point to managing
 * body photos.
 */
export const SettingsPersonalizationScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { user, updateWardrobeDirection } = useAuth();
  const queryClient = useQueryClient();
  const persistUserMetadata = usePersistUserMetadata();

  const wardrobeDirection = resolveWardrobeDirection(user?.user_metadata);
  const [pendingWardrobe, setPendingWardrobe] =
    useState<UserWardrobeDirection | null>(wardrobeDirection);
  const [isSavingWardrobe, setIsSavingWardrobe] = useState(false);
  const wardrobeOptions = useMemo(() => buildWardrobeOptions(t), [t]);
  const wardrobeLabel =
    wardrobeOptions.find(o => o.key === wardrobeDirection)?.label ??
    t('settings.wardrobe_not_set');

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

  const openWardrobeModal = () => {
    setPendingWardrobe(wardrobeDirection);
    setActiveModal('wardrobe');
  };

  const closeWardrobeModal = () => {
    if (isSavingWardrobe) return;
    setActiveModal('none');
  };

  const applyWardrobe = async () => {
    if (isSavingWardrobe || !pendingWardrobe) return;
    if (pendingWardrobe === wardrobeDirection) {
      setActiveModal('none');
      return;
    }
    setIsSavingWardrobe(true);
    try {
      await updateWardrobeDirection(pendingWardrobe);
      track('wardrobe_direction_changed', {
        ...(wardrobeDirection
          ? { from: wardrobeDirection.toLowerCase() }
          : {}),
        to: pendingWardrobe.toLowerCase(),
      });
      // The server re-seeded the starter items and the Discovery feed is
      // gender-filtered — refetch both, and drop the V05 session so the next
      // suggestion builds against the new wardrobe.
      resetV05Session();
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
      queryClient.invalidateQueries({ queryKey: [DISCOVERY_QUERY_KEY] });
      setActiveModal('none');
    } catch (error) {
      showSettingsError(
        t('settings.toast_title'),
        getErrorMessage(error, t('settings.error_update_wardrobe')),
      );
    } finally {
      setIsSavingWardrobe(false);
    }
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
          testID="settings-wardrobe-row"
          label={t('settings.wardrobe_direction')}
          accessibilityLabel={t('settings.a11y_change_wardrobe')}
          value={wardrobeLabel}
          chevron
          onPress={openWardrobeModal}
        />

        <SettingsDivider />

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

      {/* Wardrobe (Menswear / Womenswear) dialog — plan 260923 */}
      <SettingsDialog
        visible={activeModal === 'wardrobe'}
        onClose={closeWardrobeModal}
        isBusy={isSavingWardrobe}
        title={t('settings.dialog_wardrobe_title')}
        body={t('settings.dialog_wardrobe_body')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyWardrobe}
        cancelTestID="settings-wardrobe-cancel"
        primaryTestID="settings-wardrobe-update"
      >
        <RadioOptionList
          options={wardrobeOptions}
          selected={pendingWardrobe}
          onSelect={setPendingWardrobe}
          testIDPrefix="settings-wardrobe-option"
        />
      </SettingsDialog>

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
