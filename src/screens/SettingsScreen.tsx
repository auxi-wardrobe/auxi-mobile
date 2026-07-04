import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { toast } from '../components/design-system/lib';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ensurePushPermissionAndRegister } from '../services/notificationService';
import { useSidebar } from '../context/SidebarContext';
import { SettingsScreenScaffold } from '../components/settings/SettingsScreenScaffold';
import { SettingsRow, SettingsDivider } from '../components/settings/SettingsRow';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { Radio, RadioOptionList } from '../components/settings/RadioOptionList';
import { SettingsSwitch } from '../components/settings/SettingsSwitch';
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

  const reminderEnabled = settings.dailyNotification.enabled;
  const timeValue = `${settings.dailyNotification.time} ${settings.dailyNotification.period}`;
  const currentFrequencyLabel =
    frequencyLabelMap[settings.dailyNotification.frequency];

  const openChangeTimeModal = () => {
    setPendingPeriod(settings.dailyNotification.period);
    setActiveModal('changeTime');
  };

  const closeChangeTimeModal = () => {
    if (isSavingTime) return;
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

  // Reminder-time dialog. Per CEO (Q12) the "06:15" time value is READ-ONLY
  // display; only AM/PM (period) is interactive here — Weekdays/Everydays moved
  // to its own "Repeat Schedule" row.
  const applyChangeTime = async () => {
    if (isSavingTime) return;

    setIsSavingTime(true);
    try {
      await persistUserMetadata(
        // Backend deep-merges user_metadata (routers/auth.py _deep_merge), so a
        // partial daily_notification patch preserves enabled/time/frequency.
        {
          daily_notification: {
            period: pendingPeriod,
          },
        },
        t('settings.error_update_time'),
      );
      track('notifications_schedule_changed', {
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
        leftAccessibilityLabel={t('settings.a11y_open_menu')}
      >
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
        <TouchableOpacity
          testID="settings-notification-reset"
          accessibilityLabel={t('settings.a11y_notification_reset')}
          activeOpacity={0.82}
          disabled={isResettingNotifications}
          style={[
            styles.resetRow,
            isResettingNotifications && styles.disabledRow,
          ]}
          onPress={handleResetNotifications}
        >
          <Text style={styles.resetLabel}>{t('settings.notification_reset')}</Text>
        </TouchableOpacity>

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
            <Icons.Delete
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          }
          onPress={() => setActiveModal('deleteConfirm')}
        />
      </SettingsScreenScaffold>

      {/* Reminder-time dialog — read-only time + AM/PM period */}
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
          {/* Time value is READ-ONLY display (CEO Q12) — no editor. */}
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
  // AU-316 RST-1: calm/lightweight reset link — muted greige, left-aligned,
  // 44px tap target. Visually subordinate to the primary settings rows.
  resetRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  resetLabel: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaOnboardingStepLabel,
  },
  sectionGap: {
    height: 16,
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
  disabledRow: {
    opacity: 0.5,
  },
});
