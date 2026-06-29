import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '../context/SidebarContext';
import { BottomSheetSurface } from '../components/primitives/FigmaPrimitives';
import { Header } from '../components/layout/Header';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { Radio, RadioOptionList } from '../components/settings/RadioOptionList';
import { SettingsSwitch } from '../components/settings/SettingsSwitch';
import { SettingsGroup, SettingsRow } from '../components/settings/SettingsList';
import { DailyNotificationPeriod } from '../types/auth';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import { useSettingsController } from './settings/useSettingsController';
import type { ScheduleOptionKey } from './settings/settingsShared';

// Re-exported for the unit tests + sub-pages that import the pure resolver.
export { resolveSettings } from './settings/settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;
type ActiveModal = 'none' | 'reminderTime' | 'repeatSchedule' | 'deleteConfirm';

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { open: openSidebar } = useSidebar();
  const {
    settings,
    frequencyOptions,
    currentFrequencyLabel,
    handleReminderToggle,
    saveReminderSchedule,
    isSavingSchedule,
    handleResetNotifications,
    isResettingNotifications,
    handleResetPreferences,
    isResettingPreferences,
  } = useSettingsController();

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [pendingPeriod, setPendingPeriod] = useState<DailyNotificationPeriod>(
    settings.dailyNotification.period,
  );
  const [pendingFrequency, setPendingFrequency] = useState(
    settings.dailyNotification.frequency,
  );

  const openReminderTimeModal = () => {
    setPendingPeriod(settings.dailyNotification.period);
    setActiveModal('reminderTime');
  };

  const openRepeatScheduleModal = () => {
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('repeatSchedule');
  };

  const closeModal = () => {
    if (isSavingSchedule || isResettingPreferences) return;
    setActiveModal('none');
  };

  const applyReminderTime = async () => {
    const ok = await saveReminderSchedule({ period: pendingPeriod });
    if (ok) setActiveModal('none');
  };

  const applyRepeatSchedule = async () => {
    const ok = await saveReminderSchedule({ frequency: pendingFrequency });
    if (ok) setActiveModal('none');
  };

  const applyDelete = async () => {
    const ok = await handleResetPreferences();
    if (ok) setActiveModal('none');
  };

  const onSelectSchedule = (key: ScheduleOptionKey) => {
    // `custom` is disabled in the picker; guard keeps pendingFrequency valid.
    if (key === 'custom') return;
    setPendingFrequency(key);
  };

  const reminderTimeValue = `${settings.dailyNotification.time} ${settings.dailyNotification.period}`;

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        {/* Canonical header — hamburger-left + centred title only. */}
        <Header.MenuTitle
          title={t('settings.title')}
          background="transparent"
          leftTestID="settings-menu-button"
          onBack={openSidebar}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 1–4 · Daily Reminder */}
          <SettingsGroup header={t('settings.section_daily_reminder')}>
            <SettingsRow
              label={t('settings.enable_daily_reminder')}
              testID="settings-daily-toggle-row"
              right={
                <SettingsSwitch
                  testID="settings-daily-toggle"
                  accessibilityLabel={t('settings.a11y_toggle_reminder')}
                  value={settings.dailyNotification.enabled}
                  onValueChange={handleReminderToggle}
                />
              }
            />
            <SettingsRow
              label={t('settings.reminder_time')}
              value={reminderTimeValue}
              chevron
              testID="settings-time-row"
              accessibilityLabel={t('settings.a11y_change_time')}
              onPress={openReminderTimeModal}
            />
            <SettingsRow
              label={t('settings.repeat_schedule')}
              value={currentFrequencyLabel}
              chevron
              testID="settings-schedule-row"
              accessibilityLabel={t('settings.a11y_repeat_schedule')}
              onPress={openRepeatScheduleModal}
            />
            <SettingsRow
              label={t('settings.notification_reset')}
              testID="settings-notification-reset"
              accessibilityLabel={t('settings.a11y_notification_reset')}
              disabled={isResettingNotifications}
              onPress={handleResetNotifications}
            />
          </SettingsGroup>

          {/* 5–7 · Drill-down sub-pages */}
          <SettingsGroup>
            <SettingsRow
              label={t('settings.personalization')}
              chevron
              testID="settings-personalization-row"
              onPress={() => navigation.navigate('PersonalizationSettings')}
            />
            <SettingsRow
              label={t('settings.privacy')}
              chevron
              testID="settings-privacy-row"
              onPress={() => navigation.navigate('PrivacySettings')}
            />
            <SettingsRow
              label={t('settings.about')}
              chevron
              testID="settings-about-row"
              onPress={() => navigation.navigate('AboutSettings')}
            />
          </SettingsGroup>

          {/* 8 · Delete my data (destructive) */}
          <SettingsGroup>
            <SettingsRow
              label={t('settings.delete_my_data')}
              danger
              testID="settings-delete-data-row"
              onPress={() => setActiveModal('deleteConfirm')}
            />
          </SettingsGroup>
        </ScrollView>
      </BottomSheetSurface>

      {/* Reminder Time dialog — AM/PM (time digits read-only, CEO Q12). */}
      <SettingsDialog
        visible={activeModal === 'reminderTime'}
        onClose={closeModal}
        isBusy={isSavingSchedule}
        title={t('settings.reminder_time')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyReminderTime}
        cancelTestID="settings-time-cancel"
        primaryTestID="settings-time-update"
      >
        <View style={styles.timeDialogRow}>
          <Text style={styles.timeDialogValue} allowFontScaling={false}>
            {settings.dailyNotification.time.replace(':', ' : ')}
          </Text>

          <View style={styles.periodStack}>
            {(['AM', 'PM'] as DailyNotificationPeriod[]).map(period => (
              <TouchableOpacity
                key={period}
                testID={`settings-time-period-${period.toLowerCase()}`}
                activeOpacity={0.82}
                style={styles.periodRow}
                onPress={() => setPendingPeriod(period)}
              >
                <Text style={styles.optionTitle}>{period}</Text>
                <Radio selected={pendingPeriod === period} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SettingsDialog>

      {/* Repeat Schedule dialog — Weekdays / Everyday / Custom. */}
      <SettingsDialog
        visible={activeModal === 'repeatSchedule'}
        onClose={closeModal}
        isBusy={isSavingSchedule}
        title={t('settings.repeat_schedule')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyRepeatSchedule}
        cancelTestID="settings-schedule-cancel"
        primaryTestID="settings-schedule-update"
      >
        <RadioOptionList
          options={frequencyOptions}
          selected={pendingFrequency}
          onSelect={onSelectSchedule}
          testIDPrefix="settings-schedule-freq"
        />
      </SettingsDialog>

      {/* Delete-data dialog */}
      <SettingsDialog
        visible={activeModal === 'deleteConfirm'}
        onClose={closeModal}
        isBusy={isResettingPreferences}
        title={t('settings.dialog_delete_title')}
        body={t('settings.dialog_delete_body')}
        primaryLabel="Delete"
        primaryVariant="danger"
        onPrimary={applyDelete}
        cancelTestID="settings-delete-cancel"
        primaryTestID="settings-delete-confirm"
      />
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
  timeDialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timeDialogValue: {
    ...theme.typography.aliases.uacH1Bold,
    color: theme.colors.uacTextBase,
  },
  periodStack: {
    gap: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minWidth: 80,
  },
  optionTitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
});
