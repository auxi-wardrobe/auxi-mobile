import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MButton, MRadioMenu, toast } from '../components/design-system/lib';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ensurePushPermissionAndRegister } from '../services/notificationService';
import { useSidebar } from '../context/SidebarContext';
import { SettingsScreenScaffold } from '../components/settings/SettingsScreenScaffold';
import { SettingsProfileHeader } from '../components/settings/SettingsProfileHeader';
import {
  SettingsRow,
  SettingsDivider,
} from '../components/settings/SettingsRow';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { RadioOptionList } from '../components/settings/RadioOptionList';
import { SettingsSwitch } from '../components/settings/SettingsSwitch';
import { TimeStepper } from '../components/settings/TimeStepper';
import { Icons } from '../assets/icons';
import {
  DailyNotificationFrequency,
  DailyNotificationPeriod,
  User,
  UserMetadata,
} from '../types/auth';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import { track } from '../services/analytics';
import { isFreeUser } from '../services/subscription';
import { GradientPillButton } from '../components/upgrade/GradientPillButton';
import {
  DEFAULT_SETTINGS,
  ResolvedSettingsState,
  buildFrequencyLabelMap,
  buildFrequencyOptions,
  getErrorMessage,
  getErrorStatus,
  resolveSettings,
  showSettingsError,
  usePersistUserMetadata,
} from './settings/settingsShared';

// Re-export the pure mapper so existing unit tests (and any external importer)
// keep resolving it from the main screen module.
export { resolveSettings } from './settings/settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;
type ActiveModal = 'none' | 'changeTime' | 'schedule' | 'deleteConfirm';

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { checkAuth, refreshUser, resetUserPreferences, user } = useAuth();
  const { open: openSidebar } = useSidebar();
  const persistUserMetadataRaw = usePersistUserMetadata();

  const [settings, setSettings] =
    useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [pendingTime, setPendingTime] = useState<string>(
    DEFAULT_SETTINGS.dailyNotification.time,
  );
  const [pendingPeriod, setPendingPeriod] = useState<DailyNotificationPeriod>(
    DEFAULT_SETTINGS.dailyNotification.period,
  );
  const [pendingFrequency, setPendingFrequency] =
    useState<DailyNotificationFrequency>(
      DEFAULT_SETTINGS.dailyNotification.frequency,
    );
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  // AU-316 RST-1: notification-scoped reset (separate from the account-wide
  // "Delete My Data" reset). Disables the reset link while a persist is in flight.
  const [isResettingNotifications, setIsResettingNotifications] =
    useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const syncFromUser = useCallback((nextUser: User | null) => {
    const nextSettings = resolveSettings(nextUser?.user_metadata);
    setSettings(nextSettings);
    setPendingTime(nextSettings.dailyNotification.time);
    setPendingPeriod(nextSettings.dailyNotification.period);
    setPendingFrequency(nextSettings.dailyNotification.frequency);
  }, []);

  useEffect(() => {
    syncFromUser(user);
  }, [syncFromUser, user]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const refreshedUser = await refreshUser();
        if (isMounted) {
          syncFromUser(refreshedUser);
        }
      } catch (error) {
        const message = getErrorMessage(error, t('settings.error_load'));
        showSettingsError(t('settings.toast_title'), message);
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      if (reminderSaveTimeoutRef.current) {
        clearTimeout(reminderSaveTimeoutRef.current);
      }
    };
  }, [checkAuth, refreshUser, syncFromUser, t]);

  // Persist + optimistic sync from the server echo. Rethrows so callers roll back.
  const persistUserMetadata = useCallback(
    async (patch: UserMetadata, fallbackMessage: string) => {
      const updatedUser = await persistUserMetadataRaw(patch, fallbackMessage);
      syncFromUser(updatedUser);
      return updatedUser;
    },
    [persistUserMetadataRaw, syncFromUser],
  );

  const frequencyOptions = useMemo(() => buildFrequencyOptions(t), [t]);
  const frequencyLabelMap = useMemo(() => buildFrequencyLabelMap(t), [t]);

  const isFree = isFreeUser(user);
  const reminderEnabled = settings.dailyNotification.enabled;
  const timeValue = `${settings.dailyNotification.time} ${settings.dailyNotification.period}`;
  const currentFrequencyLabel =
    frequencyLabelMap[settings.dailyNotification.frequency];

  const openChangeTimeModal = () => {
    setPendingTime(settings.dailyNotification.time);
    setPendingPeriod(settings.dailyNotification.period);
    setActiveModal('changeTime');
  };

  const closeChangeTimeModal = () => {
    if (isSavingTime) return;
    setPendingTime(settings.dailyNotification.time);
    setPendingPeriod(settings.dailyNotification.period);
    setActiveModal('none');
  };

  const openScheduleModal = () => {
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('schedule');
  };

  const closeScheduleModal = () => {
    if (isSavingSchedule) return;
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('none');
  };

  const closeDeleteModal = () => {
    if (isResettingPreferences) return;
    setActiveModal('none');
  };

  const handleReminderToggle = (enabled: boolean) => {
    const previousValue = settings.dailyNotification.enabled;

    track('notifications_toggle_changed', { enabled });

    // Turning reminders ON: ensure OS permission + a registered FCM token exist
    // (login already registers, but the user may have declined then). If they
    // decline, guide them to OS Settings — the `enabled` flag still persists;
    // the server simply has no token to deliver to. Fire-and-forget.
    if (enabled) {
      ensurePushPermissionAndRegister().then(granted => {
        if (!granted) {
          toast.show({
            type: 'info',
            text1: t('settings.push_permission_needed_title'),
            text2: t('settings.push_permission_needed_body'),
            position: 'bottom',
            visibilityTime: 5000,
            onPress: () => {
              Linking.openSettings().catch(() => {});
            },
          });
        }
      });
    }

    setSettings(current => ({
      ...current,
      dailyNotification: {
        ...current.dailyNotification,
        enabled,
      },
    }));

    if (reminderSaveTimeoutRef.current) {
      clearTimeout(reminderSaveTimeoutRef.current);
    }

    reminderSaveTimeoutRef.current = setTimeout(() => {
      persistUserMetadata(
        {
          daily_notification: {
            enabled,
          },
        },
        t('settings.error_update_time'),
      ).catch(() => {
        setSettings(current => ({
          ...current,
          dailyNotification: {
            ...current.dailyNotification,
            enabled: previousValue,
          },
        }));
      });
    }, 500);
  };

  const applyChangeTime = async () => {
    if (isSavingTime) return;

    setIsSavingTime(true);
    try {
      await persistUserMetadata(
        // Backend deep-merges user_metadata (routers/auth.py _deep_merge), so a
        // partial daily_notification patch preserves enabled/frequency.
        {
          daily_notification: {
            time: pendingTime,
            period: pendingPeriod,
          },
        },
        t('settings.error_update_time'),
      );
      track('notifications_schedule_changed', {
        time: pendingTime,
        period: pendingPeriod,
        frequency: settings.dailyNotification.frequency,
      });
      setActiveModal('none');
    } catch {
      // persistUserMetadata already surfaced the error toast (and handled 401);
      // swallow the rethrow so the async onPress doesn't reject unhandled.
      // Keep the modal open so the user can retry.
    } finally {
      setIsSavingTime(false);
    }
  };

  // Repeat-schedule dialog — Weekdays / Everydays cadence (its own row in the IA).
  const applyChangeSchedule = async () => {
    if (isSavingSchedule) return;

    setIsSavingSchedule(true);
    try {
      await persistUserMetadata(
        {
          daily_notification: {
            frequency: pendingFrequency,
          },
        },
        t('settings.error_update_time'),
      );
      track('notifications_schedule_changed', {
        period: settings.dailyNotification.period,
        frequency: pendingFrequency,
      });
      setActiveModal('none');
    } catch {
      // Error toast + 401 handled upstream; keep the modal open for retry.
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // AU-316 RST-1: restore the captured previous notification settings (undo
  // path). Optimistic state update + persist, mirroring the reset path so an
  // undo is itself resilient. Fire-and-forget from the snackbar onPress.
  const undoNotificationReset = (
    previous: ResolvedSettingsState['dailyNotification'],
  ) => {
    setSettings(current => ({
      ...current,
      dailyNotification: { ...previous },
    }));
    toast.show({
      type: 'info',
      text1: t('settings.notification_reset_undone_title'),
      position: 'bottom',
      visibilityTime: 2500,
    });
    track('notifications_reset_undone', {
      period: previous.period,
      frequency: previous.frequency,
    });
    persistUserMetadata(
      {
        daily_notification: {
          enabled: previous.enabled,
          time: previous.time,
          period: previous.period,
          frequency: previous.frequency,
        },
      },
      t('settings.error_update_notification_reset'),
    ).catch(() => {
      // Error toast + 401 handled upstream; the next user refresh reconciles.
    });
  };

  // AU-316 RST-1: notification-scoped "Reset to Default". Restores the
  // daily-notification block to DEFAULT_SETTINGS (single source of truth, so
  // reset == first-run default) with an undo snackbar.
  const handleResetNotifications = () => {
    if (isResettingNotifications) return;

    const previous = settings.dailyNotification;
    const defaults = DEFAULT_SETTINGS.dailyNotification;

    setIsResettingNotifications(true);
    setSettings(current => ({
      ...current,
      dailyNotification: { ...defaults },
    }));

    persistUserMetadata(
      {
        daily_notification: {
          enabled: defaults.enabled,
          time: defaults.time,
          period: defaults.period,
          frequency: defaults.frequency,
        },
      },
      t('settings.error_update_notification_reset'),
    )
      .then(() => {
        track('notifications_reset', {
          period: defaults.period,
          frequency: defaults.frequency,
        });
        toast.show({
          type: 'info',
          text1: t('settings.notification_reset_toast_title'),
          text2: t('settings.notification_reset_toast_body'),
          position: 'bottom',
          visibilityTime: 5000,
          onPress: () => {
            undoNotificationReset(previous);
          },
        });
      })
      .catch(() => {
        setSettings(current => ({
          ...current,
          dailyNotification: { ...previous },
        }));
      })
      .finally(() => {
        setIsResettingNotifications(false);
      });
  };

  const handleResetPreferences = async () => {
    if (isResettingPreferences) return;

    setIsResettingPreferences(true);
    try {
      const updatedUser = await resetUserPreferences();
      if (!updatedUser.is_first_login) {
        syncFromUser(updatedUser);
        setActiveModal('none');
      }
    } catch (error) {
      const message = getErrorMessage(error, t('settings.error_reset'));
      showSettingsError(t('settings.toast_title'), message);
      if (getErrorStatus(error) === 401) {
        await checkAuth();
      }
    } finally {
      setIsResettingPreferences(false);
    }
  };

  return (
    <>
      <SettingsScreenScaffold
        title={t('settings.title')}
        headerVariant="menu"
        onLeftPress={openSidebar}
        leftTestID="settings-menu-button"
      >
        {/* ── Profile ────────────────────────────────────────────────────── */}
        <SettingsProfileHeader
          email={user?.email}
          showFreeRing={isFree}
        />

        {/* Macgie+ upgrade entry — free users only. The 2px avatar ring above
            indicates the free plan; this pill opens the paywall. */}
        {isFree ? (
          <>
            <GradientPillButton
              testID="settings-upgrade-button"
              accessibilityLabel={t('upgrade.cta')}
              onPress={() => {
                track('upgrade_entry_tapped', { source: 'settings' });
                navigation.navigate('Upgrade');
              }}
            >
              {t('upgrade.cta')}
            </GradientPillButton>
            <View style={styles.sectionGap} />
          </>
        ) : null}

        {/* ── Daily reminder ─────────────────────────────────────────────── */}
        <SettingsRow
          testID="settings-daily-toggle-row"
          label={t('settings.enable_daily_reminder')}
          trailing={
            <SettingsSwitch
              testID="settings-daily-toggle"
              accessibilityLabel={t('settings.a11y_toggle_reminder')}
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
            />
          }
        />

        <SettingsDivider />

        <SettingsRow
          testID="settings-time-row"
          label={t('settings.reminder_time')}
          accessibilityLabel={t('settings.a11y_change_time')}
          value={timeValue}
          chevron
          disabled={!reminderEnabled}
          onPress={openChangeTimeModal}
        />

        <SettingsDivider />

        <SettingsRow
          testID="settings-schedule-row"
          label={t('settings.repeat_schedule')}
          accessibilityLabel={t('settings.a11y_change_schedule')}
          value={currentFrequencyLabel}
          chevron
          disabled={!reminderEnabled}
          onPress={openScheduleModal}
        />

        {/* AU-316 RST-1: notification-scoped reset link (distinct from the
            account-wide "Delete My Data" row). Lightweight text affordance. */}
        <MButton
          variant="text"
          size="sm"
          testID="settings-notification-reset"
          accessibilityLabel={t('settings.a11y_notification_reset')}
          disabled={isResettingNotifications}
          onPress={handleResetNotifications}
        >
          {t('settings.notification_reset')}
        </MButton>

        <View style={styles.sectionGap} />

        {/* ── Grouped sections ───────────────────────────────────────────── */}
        <SettingsRow
          testID="settings-personalization-row"
          label={t('settings.section_personalization')}
          accessibilityLabel={t('settings.a11y_open_personalization')}
          chevron
          onPress={() => navigation.navigate('SettingsPersonalization')}
        />

        <SettingsDivider />

        <SettingsRow
          testID="settings-privacy-row"
          label={t('settings.section_privacy')}
          accessibilityLabel={t('settings.a11y_open_privacy')}
          chevron
          onPress={() => navigation.navigate('SettingsPrivacy')}
        />

        <SettingsDivider />

        <SettingsRow
          testID="settings-about-row"
          label={t('settings.section_about')}
          accessibilityLabel={t('settings.a11y_open_about')}
          chevron
          onPress={() => navigation.navigate('SettingsAbout')}
        />

        <View style={styles.sectionGap} />

        {/* ── Account ────────────────────────────────────────────────────── */}
        <SettingsRow
          testID="settings-delete-data-row"
          label={t('settings.delete_my_data')}
          // Main-list "Delete My Data" row is NEUTRAL (qa-ui C2) — not red.
          trailing={
            <Icons.Delete width={24} height={24} color={theme.ds.color.ink} />
          }
          onPress={() => setActiveModal('deleteConfirm')}
        />
      </SettingsScreenScaffold>

      {/* Reminder-time dialog — editable time + AM/PM period */}
      <SettingsDialog
        visible={activeModal === 'changeTime'}
        onClose={closeChangeTimeModal}
        isBusy={isSavingTime}
        title={t('settings.reminder_time')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyChangeTime}
        cancelTestID="settings-time-cancel"
        primaryTestID="settings-time-update"
      >
        <View style={styles.timeDialogRow}>
          <TimeStepper
            value={pendingTime}
            onChange={setPendingTime}
            testIDPrefix="settings-time"
            hourUpA11yLabel={t('settings.a11y_time_hour_up')}
            hourDownA11yLabel={t('settings.a11y_time_hour_down')}
            minuteUpA11yLabel={t('settings.a11y_time_minute_up')}
            minuteDownA11yLabel={t('settings.a11y_time_minute_down')}
          />

          <MRadioMenu
            options={(['AM', 'PM'] as DailyNotificationPeriod[]).map(
              period => ({
                value: period,
                label: period,
                testID: `settings-time-period-${period.toLowerCase()}`,
              }),
            )}
            value={pendingPeriod}
            onChange={value =>
              setPendingPeriod(value as DailyNotificationPeriod)
            }
            testID="settings-time-period"
            style={styles.periodPicker}
          />
        </View>
      </SettingsDialog>

      {/* Repeat-schedule dialog — Weekdays / Everydays */}
      <SettingsDialog
        visible={activeModal === 'schedule'}
        onClose={closeScheduleModal}
        isBusy={isSavingSchedule}
        title={t('settings.dialog_schedule_title')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyChangeSchedule}
        cancelTestID="settings-schedule-cancel"
        primaryTestID="settings-schedule-update"
      >
        <RadioOptionList
          options={frequencyOptions}
          selected={pendingFrequency}
          onSelect={setPendingFrequency}
          testIDPrefix="settings-schedule-freq"
        />
      </SettingsDialog>

      {/* Delete-data dialog */}
      <SettingsDialog
        visible={activeModal === 'deleteConfirm'}
        onClose={closeDeleteModal}
        isBusy={isResettingPreferences}
        title={t('settings.dialog_delete_title')}
        body={t('settings.dialog_delete_body')}
        primaryLabel="Delete"
        primaryVariant="danger"
        onPrimary={handleResetPreferences}
        cancelTestID="settings-delete-cancel"
        primaryTestID="settings-delete-confirm"
      />
    </>
  );
};

const styles = StyleSheet.create({
  sectionGap: {
    height: 16,
  },
  timeDialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  periodPicker: { width: 110 },
});
