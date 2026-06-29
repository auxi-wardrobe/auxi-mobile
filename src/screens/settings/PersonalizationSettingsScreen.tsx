import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MListRow } from '../../components/design-system/lib';
import { Header } from '../../components/layout/Header';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { RadioOptionList } from '../../components/settings/RadioOptionList';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { setLanguage as setI18nLanguage } from '../../i18n/init';
import type { Language } from '../../translations';
import { UserStyleDirection } from '../../types/auth';
import {
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
  'PersonalizationSettings'
>;
type ActiveModal = 'none' | 'direction' | 'language';

export const PersonalizationSettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const persist = usePersistUserMetadata();

  const styleDirection = resolveSettings(user?.user_metadata).styleDirection;
  const currentLanguage = (i18n.language as Language) || 'en-EN';

  const [pendingDirection, setPendingDirection] =
    useState<UserStyleDirection>(styleDirection);
  const [pendingLanguage, setPendingLanguage] =
    useState<Language>(currentLanguage);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  useEffect(() => setPendingDirection(styleDirection), [styleDirection]);

  const directionOptions = useMemo(() => buildDirectionOptions(t), [t]);
  const directionLabelMap = useMemo(() => buildDirectionLabelMap(t), [t]);

  const applyDirection = async () => {
    if (isSavingDirection) return;
    setIsSavingDirection(true);
    try {
      await persist({ style_direction: pendingDirection }, t('settings.error_update_direction'));
      track('style_direction_changed', { direction: pendingDirection });
      setActiveModal('none');
    } catch {
      // persist already toasted + handled 401; keep dialog open for retry.
    } finally {
      setIsSavingDirection(false);
    }
  };

  const applyLanguage = async () => {
    if (isSavingLanguage) return;
    if (pendingLanguage === currentLanguage) { setActiveModal('none'); return; }
    setIsSavingLanguage(true);
    try {
      await setI18nLanguage(pendingLanguage);
      track('settings_language_changed', { locale: pendingLanguage });
      setActiveModal('none');
    } catch {
      showSettingsError(t('settings.toast_title'), t('settings.error_update_language'));
    } finally {
      setIsSavingLanguage(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.section_personalization')}
          background="transparent"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <MListRow
            testID="personalization-style-direction-row"
            label={t('settings.style_direction')}
            value={directionLabelMap[styleDirection]}
            chevron
            onPress={() => { setPendingDirection(styleDirection); setActiveModal('direction'); }}
          />
          <MListRow
            testID="personalization-language-row"
            label={t('settings.language')}
            value={LANGUAGE_LABEL_MAP[currentLanguage]}
            chevron
            accessibilityLabel={t('settings.a11y_change_language')}
            onPress={() => { setPendingLanguage(currentLanguage); setActiveModal('language'); }}
          />
          <MListRow
            testID="personalization-manage-body-row"
            label={t('settings.manage_body_photo')}
            chevron
            onPress={() => navigation.navigate('Body', { mode: 'photoDetail' })}
          />
        </View>
      </BottomSheetSurface>

      <SettingsDialog
        visible={activeModal === 'direction'}
        onClose={() => !isSavingDirection && setActiveModal('none')}
        isBusy={isSavingDirection}
        title={t('settings.dialog_direction_title')}
        body={t('settings.dialog_direction_body')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyDirection}
        cancelTestID="personalization-direction-cancel"
        primaryTestID="personalization-direction-update"
      >
        <RadioOptionList
          options={directionOptions}
          selected={pendingDirection}
          onSelect={setPendingDirection}
          testIDPrefix="personalization-direction-option"
        />
      </SettingsDialog>

      <SettingsDialog
        visible={activeModal === 'language'}
        onClose={() => !isSavingLanguage && setActiveModal('none')}
        isBusy={isSavingLanguage}
        title={t('settings.dialog_language_title')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyLanguage}
        cancelTestID="personalization-language-cancel"
        primaryTestID="personalization-language-update"
      >
        <RadioOptionList
          options={LANGUAGE_OPTIONS}
          selected={pendingLanguage}
          onSelect={setPendingLanguage}
          testIDPrefix="personalization-language-option"
        />
      </SettingsDialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
});
