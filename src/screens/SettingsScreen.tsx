import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { toast, MListRow } from '../components/design-system/lib';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BottomSheetSurface } from '../components/primitives/FigmaPrimitives';
import { Header } from '../components/layout/Header';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { RadioOptionList } from '../components/settings/RadioOptionList';
import { SettingsToggleRow } from '../components/settings/SettingsToggleRow';
import { DailyNotificationFrequency, User } from '../types/auth';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import { track } from '../services/analytics';
import {
  DEFAULT_SETTINGS,
  ResolvedSettingsState,
  buildFrequencyLabelMap,
  buildFrequencyOptions,
  resolveSettings,
  getErrorMessage,
  getErrorStatus,
  showSettingsError,
  usePersistUserMetadata,
} from './settings/settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;
type ActiveModal = 'none' | 'frequency' | 'deleteConfirm';

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { checkAuth, refreshUser, resetUserPreferences, user } = useAuth();
  const { open: openSidebar } = useSidebar();
  const persist = usePersistUserMetadata();

  const [settings, setSettings] =
    useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [pendingFrequency, setPendingFrequency] =
    useState<DailyNotificationFrequency>(DEFAULT_SETTINGS.dailyNotification.frequency);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingFrequency, setIsSavingFrequency] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  const [isResettingNotifications, setIsResettingNotifications] = useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFromUser = useCallback((nextUser: User | null) => {
    const next = resolveSettings(nextUser?.user_metadata);
    setSettings(next);
    setPendingFrequency(next.dailyNotification.frequency);
  }, []);

  useEffect(() => syncFromUser(user), [syncFromUser, user]);

  useEffect(() => {
    let mounted = true;
    refreshUser()
      .then(u => { if (mounted) syncFromUser(u); })
      .catch(async error => {
        showSettingsError(t('settings.toast_title'), getErrorMessage(error, t('settings.error_load')));
        if (getErrorStatus(error) === 401) await checkAuth();
      });
    return () => {
      mounted = false;
      if (reminderSaveTimeoutRef.current) clearTimeout(reminderSaveTimeoutRef.current);
    };
  }, [checkAuth, refreshUser, syncFromUser, t]);

  const frequencyOptions = useMemo(() => buildFrequencyOptions(t), [t]);
  const frequencyLabelMap = useMemo(() => buildFrequencyLabelMap(t), [t]);
  const currentFrequencyLabel = frequencyLabelMap[settings.dailyNotification.frequency];

  // Debounced optimistic toggle persist with rollback (unchanged behavior).
  const handleReminderToggle = (enabled: boolean) => {
    const prev = settings.dailyNotification.enabled;
    track('notifications_toggle_changed', { enabled });
    setSettings(c => ({ ...c, dailyNotification: { ...c.dailyNotification, enabled } }));
    if (reminderSaveTimeoutRef.current) clearTimeout(reminderSaveTimeoutRef.current);
    reminderSaveTimeoutRef.current = setTimeout(() => {
      persist({ daily_notification: { enabled } }, t('settings.error_update_time'))
        .then(syncFromUser)
        .catch(() =>
          setSettings(c => ({ ...c, dailyNotification: { ...c.dailyNotification, enabled: prev } })),
        );
    }, 500);
  };

  const applyFrequency = async () => {
    if (isSavingFrequency) return;
    setIsSavingFrequency(true);
    try {
      const updated = await persist(
        { daily_notification: { frequency: pendingFrequency } },
        t('settings.error_update_time'),
      );
      syncFromUser(updated);
      track('notifications_schedule_changed', { frequency: pendingFrequency });
      setActiveModal('none');
    } catch {
      // persist toasted + handled 401; keep dialog open for retry.
    } finally {
      setIsSavingFrequency(false);
    }
  };

  const undoNotificationReset = (prev: ResolvedSettingsState['dailyNotification']) => {
    setSettings(c => ({ ...c, dailyNotification: { ...prev } }));
    toast.show({ type: 'info', text1: t('settings.notification_reset_undone_title'), position: 'bottom', visibilityTime: 2500 });
    track('notifications_reset_undone', { frequency: prev.frequency });
    persist({ daily_notification: { ...prev } }, t('settings.error_update_notification_reset'))
      .then(syncFromUser)
      .catch(() => {});
  };

  const handleResetNotifications = () => {
    if (isResettingNotifications) return;
    const prev = settings.dailyNotification;
    const defaults = DEFAULT_SETTINGS.dailyNotification;
    setIsResettingNotifications(true);
    setSettings(c => ({ ...c, dailyNotification: { ...defaults } }));
    persist({ daily_notification: { ...defaults } }, t('settings.error_update_notification_reset'))
      .then(updated => {
        syncFromUser(updated);
        track('notifications_reset', { frequency: defaults.frequency });
        toast.show({
          type: 'info',
          text1: t('settings.notification_reset_toast_title'),
          text2: t('settings.notification_reset_toast_body'),
          position: 'bottom',
          visibilityTime: 5000,
          onPress: () => undoNotificationReset(prev),
        });
      })
      .catch(() => setSettings(c => ({ ...c, dailyNotification: { ...prev } })))
      .finally(() => setIsResettingNotifications(false));
  };

  const handleResetPreferences = async () => {
    if (isResettingPreferences) return;
    setIsResettingPreferences(true);
    try {
      const updated = await resetUserPreferences();
      if (!updated.is_first_login) { syncFromUser(updated); setActiveModal('none'); }
    } catch (error) {
      showSettingsError(t('settings.toast_title'), getErrorMessage(error, t('settings.error_reset')));
      if (getErrorStatus(error) === 401) await checkAuth();
    } finally {
      setIsResettingPreferences(false);
    }
  };

  const openSection = (
    section: 'personalization' | 'privacy' | 'about',
    route: 'PersonalizationSettings' | 'PrivacySettings' | 'AboutSettings',
  ) => {
    track('settings_section_opened', { section });
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.MenuTitle
          title={t('settings.title')}
          background="transparent"
          leftTestID="settings-menu-button"
          onBack={openSidebar}
        />
        <View style={styles.content}>
          {/* Daily Reminder */}
          <SettingsToggleRow
            testID="settings-daily-toggle"
            accessibilityLabel={t('settings.a11y_toggle_reminder')}
            label={t('settings.enable_daily_reminder')}
            value={settings.dailyNotification.enabled}
            onValueChange={handleReminderToggle}
          />
          <MListRow
            testID="settings-reminder-time-row"
            label={t('settings.reminder_time')}
            value={`${settings.dailyNotification.time} ${settings.dailyNotification.period}`}
          />
          <MListRow
            testID="settings-repeat-schedule-row"
            label={t('settings.repeat_schedule')}
            value={currentFrequencyLabel}
            chevron
            onPress={() => {
              setPendingFrequency(settings.dailyNotification.frequency);
              setActiveModal('frequency');
            }}
          />
          <MListRow
            testID="settings-notification-reset"
            label={t('settings.reset_to_default')}
            accessibilityLabel={t('settings.a11y_notification_reset')}
            onPress={isResettingNotifications ? undefined : handleResetNotifications}
          />

          <View style={styles.sectionGap} />

          {/* Groups */}
          <MListRow
            testID="settings-personalization-row"
            label={t('settings.section_personalization')}
            accessibilityLabel={t('settings.a11y_open_personalization')}
            chevron
            onPress={() => openSection('personalization', 'PersonalizationSettings')}
          />
          <MListRow
            testID="settings-privacy-row"
            label={t('settings.section_privacy')}
            accessibilityLabel={t('settings.a11y_open_privacy')}
            chevron
            onPress={() => openSection('privacy', 'PrivacySettings')}
          />
          <MListRow
            testID="settings-about-row"
            label={t('settings.section_about')}
            accessibilityLabel={t('settings.a11y_open_about')}
            chevron
            onPress={() => openSection('about', 'AboutSettings')}
          />

          <View style={styles.sectionGap} />

          {/* Destructive */}
          <MListRow
            testID="settings-delete-data-row"
            label={t('settings.delete_my_data')}
            danger
            onPress={() => setActiveModal('deleteConfirm')}
          />
        </View>
      </BottomSheetSurface>

      {/* Repeat-schedule frequency picker (split out from the old change-time
          dialog; AM/PM editor removed per spec §3). */}
      <SettingsDialog
        visible={activeModal === 'frequency'}
        onClose={() => !isSavingFrequency && setActiveModal('none')}
        isBusy={isSavingFrequency}
        title={t('settings.repeat_schedule')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyFrequency}
        cancelTestID="settings-freq-cancel"
        primaryTestID="settings-freq-update"
      >
        <RadioOptionList
          options={frequencyOptions}
          selected={pendingFrequency}
          onSelect={setPendingFrequency}
          testIDPrefix="settings-freq"
        />
      </SettingsDialog>

      {/* Delete-data confirm */}
      <SettingsDialog
        visible={activeModal === 'deleteConfirm'}
        onClose={() => !isResettingPreferences && setActiveModal('none')}
        isBusy={isResettingPreferences}
        title={t('settings.dialog_delete_title')}
        body={t('settings.dialog_delete_body')}
        primaryLabel="Delete"
        primaryVariant="danger"
        onPrimary={handleResetPreferences}
        cancelTestID="settings-delete-cancel"
        primaryTestID="settings-delete-confirm"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
  sectionGap: { height: 24 },
});
