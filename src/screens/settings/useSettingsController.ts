import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ensurePushPermissionAndRegister } from '../../services/notificationService';
import {
  DailyNotificationFrequency,
  DailyNotificationPeriod,
  User,
  UserMetadata,
  UserStyleDirection,
} from '../../types/auth';
import {
  grantAnalyticsConsent,
  hasAnalyticsConsent,
  revokeAnalyticsConsent,
  track,
} from '../../services/analytics';
import {
  grantAiDataSharingConsent,
  hasAiDataSharingConsent,
  revokeAiDataSharingConsent,
} from '../../services/aiConsent';
import { setLanguage as setI18nLanguage } from '../../i18n/init';
import type { Language } from '../../translations';
import {
  buildDirectionLabelMap,
  buildDirectionOptions,
  buildFrequencyLabelMap,
  buildFrequencyOptions,
  DEFAULT_SETTINGS,
  getErrorMessage,
  getErrorStatus,
  resolveSettings,
  ResolvedSettingsState,
  showSettingsError,
} from './settingsShared';

/**
 * useSettingsController — the single owner of Settings state + side effects,
 * shared by the parent `SettingsScreen` and its sub-pages
 * (Personalization / Privacy / About).
 *
 * Source of truth is `AuthContext` (`user.user_metadata`) plus the consent
 * service seams — there is no new store (the repo's "no Redux/Zustand" rule).
 * Each screen instantiates the hook and reads only the slice it renders; every
 * instance stays in lockstep because they all sync from the same `user`.
 *
 * Modal/open-close UI state intentionally lives in the screens, not here — the
 * hook exposes the async *actions* (apply…/handle…) and the resolved data.
 */
export const useSettingsController = () => {
  const { t, i18n } = useTranslation();
  const {
    checkAuth,
    refreshUser,
    resetUserPreferences,
    updateCurrentUser,
    user,
  } = useAuth();

  const [settings, setSettings] =
    useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  // AU-316 RST-1: notification-scoped reset (separate from the account-wide
  // "Delete data" reset). Disables the reset link while a persist is in flight.
  const [isResettingNotifications, setIsResettingNotifications] =
    useState(false);
  const currentLanguage = (i18n.language as Language) || 'en-EN';
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  // Analytics consent (EU/CA opt-in). Mirrors the persisted decision in the
  // analytics seam; the Privacy page's toggle grants/revokes it.
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  // AI data-sharing consent (B1). Revoking flips the persisted decision so the
  // next try-on photo upload re-prompts (Privacy Policy §6 withdraw right).
  const [aiDataSharingConsent, setAiDataSharingConsent] = useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const syncFromUser = useCallback((nextUser: User | null) => {
    setSettings(resolveSettings(nextUser?.user_metadata));
  }, []);

  useEffect(() => {
    syncFromUser(user);
  }, [syncFromUser, user]);

  // Reflect the persisted analytics + AI-data-sharing consent decisions in
  // their toggles on mount.
  useEffect(() => {
    let isMounted = true;
    hasAnalyticsConsent().then(granted => {
      if (isMounted) {
        setAnalyticsConsent(granted);
      }
    });
    hasAiDataSharingConsent().then(granted => {
      if (isMounted) {
        setAiDataSharingConsent(granted);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const persistUserMetadata = useCallback(
    async (patch: UserMetadata, fallbackMessage: string) => {
      try {
        const updatedUser = await updateCurrentUser({ user_metadata: patch });
        syncFromUser(updatedUser);
        return updatedUser;
      } catch (error) {
        const message = getErrorMessage(error, fallbackMessage);
        showSettingsError(t('settings.toast_title'), message);
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        }
        throw error;
      }
    },
    [checkAuth, syncFromUser, t, updateCurrentUser],
  );

  const directionOptions = useMemo(() => buildDirectionOptions(t), [t]);
  const frequencyOptions = useMemo(() => buildFrequencyOptions(t), [t]);
  const directionLabelMap = useMemo(() => buildDirectionLabelMap(t), [t]);
  const frequencyLabelMap = useMemo(() => buildFrequencyLabelMap(t), [t]);

  const currentDirectionLabel = directionLabelMap[settings.styleDirection];
  const currentFrequencyLabel =
    frequencyLabelMap[settings.dailyNotification.frequency];

  const handleReminderToggle = useCallback(
    (enabled: boolean) => {
      const previousValue = settings.dailyNotification.enabled;

      track('notifications_toggle_changed', { enabled });

      // Turning reminders ON: ensure OS permission + a registered FCM token
      // exist. If the user declines, guide them to OS Settings — the `enabled`
      // flag still persists; the server simply has no token to deliver to.
      if (enabled) {
        ensurePushPermissionAndRegister().then(granted => {
          if (!granted) {
            Toast.show({
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
    },
    [persistUserMetadata, settings.dailyNotification.enabled, t],
  );

  // Optimistic flip with rollback on failure (mirrors handleReminderToggle).
  const handleAnalyticsConsentToggle = useCallback(
    (enabled: boolean) => {
      const previousValue = analyticsConsent;
      setAnalyticsConsent(enabled);
      // Order matters: pre-consent track() is a no-op. Fire BEFORE revoke (event
      // lands while consent active), AFTER grant (event lands with consent).
      if (!enabled) {
        track('analytics_consent_changed', { granted: false });
      }
      const persist = enabled ? grantAnalyticsConsent : revokeAnalyticsConsent;
      persist()
        .then(() => {
          if (enabled) {
            track('analytics_consent_changed', { granted: true });
          }
        })
        .catch(() => {
          setAnalyticsConsent(previousValue);
          showSettingsError(
            t('settings.toast_title'),
            t('settings.error_update_analytics'),
          );
        });
    },
    [analyticsConsent, t],
  );

  // B1: AI data-sharing consent toggle (Privacy Policy §6 withdraw right).
  const handleAiDataSharingToggle = useCallback(
    (enabled: boolean) => {
      const previousValue = aiDataSharingConsent;
      setAiDataSharingConsent(enabled);
      const persist = enabled
        ? grantAiDataSharingConsent
        : revokeAiDataSharingConsent;
      persist().catch(() => {
        setAiDataSharingConsent(previousValue);
        showSettingsError(
          t('settings.toast_title'),
          t('settings.error_update_ai_sharing'),
        );
      });
    },
    [aiDataSharingConsent, t],
  );

  const applyDirection = useCallback(
    async (direction: UserStyleDirection): Promise<boolean> => {
      if (isSavingDirection) return false;

      setIsSavingDirection(true);
      try {
        await persistUserMetadata(
          { style_direction: direction },
          t('settings.error_update_direction'),
        );
        track('style_direction_changed', { direction });
        return true;
      } catch {
        // persistUserMetadata already surfaced the error toast (+ handled 401).
        return false;
      } finally {
        setIsSavingDirection(false);
      }
    },
    [isSavingDirection, persistUserMetadata, t],
  );

  // Reminder Time / Repeat Schedule persist. Per CEO (Q12) the "06:15" time
  // value is READ-ONLY display; only AM/PM (period) + Weekdays/Everydays
  // (frequency) are interactive. The backend deep-merges user_metadata, so a
  // partial daily_notification patch preserves enabled/time.
  const saveReminderSchedule = useCallback(
    async (patch: {
      period?: DailyNotificationPeriod;
      frequency?: DailyNotificationFrequency;
    }): Promise<boolean> => {
      if (isSavingSchedule) return false;

      setIsSavingSchedule(true);
      try {
        await persistUserMetadata(
          { daily_notification: patch },
          t('settings.error_update_time'),
        );
        // AU-316: the cadence/period change had no event (tracking-plan §6.1).
        track('notifications_schedule_changed', {
          period: patch.period ?? settings.dailyNotification.period,
          frequency: patch.frequency ?? settings.dailyNotification.frequency,
        });
        return true;
      } catch {
        return false;
      } finally {
        setIsSavingSchedule(false);
      }
    },
    [
      isSavingSchedule,
      persistUserMetadata,
      settings.dailyNotification.frequency,
      settings.dailyNotification.period,
      t,
    ],
  );

  // AU-316 RST-1: restore the captured previous notification settings (undo).
  const undoNotificationReset = useCallback(
    (previous: ResolvedSettingsState['dailyNotification']) => {
      setSettings(current => ({
        ...current,
        dailyNotification: { ...previous },
      }));
      Toast.show({
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
        // persistUserMetadata already toasted (+ handled 401); the eventual
        // user refresh reconciles the source of truth.
      });
    },
    [persistUserMetadata, t],
  );

  // AU-316 RST-1: notification-scoped "Reset to default setting". Restores the
  // daily-notification block to DEFAULT_SETTINGS with an undo snackbar.
  const handleResetNotifications = useCallback(() => {
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
        Toast.show({
          type: 'info',
          text1: t('settings.notification_reset_toast_title'),
          text2: t('settings.notification_reset_toast_body'),
          position: 'bottom',
          visibilityTime: 5000,
          onPress: () => {
            Toast.hide();
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
  }, [
    isResettingNotifications,
    persistUserMetadata,
    settings.dailyNotification,
    t,
    undoNotificationReset,
  ]);

  const applyLanguage = useCallback(
    async (language: Language): Promise<boolean> => {
      if (isSavingLanguage) return false;
      if (language === currentLanguage) return true;

      setIsSavingLanguage(true);
      try {
        await setI18nLanguage(language);
        track('settings_language_changed', { locale: language });
        return true;
      } catch {
        showSettingsError(
          t('settings.toast_title'),
          t('settings.error_update_language'),
        );
        return false;
      } finally {
        setIsSavingLanguage(false);
      }
    },
    [currentLanguage, isSavingLanguage, t],
  );

  // Account-wide "Delete my data" → reset preferences to day one.
  const handleResetPreferences = useCallback(async (): Promise<boolean> => {
    if (isResettingPreferences) return false;

    setIsResettingPreferences(true);
    try {
      const updatedUser = await resetUserPreferences();
      if (!updatedUser.is_first_login) {
        syncFromUser(updatedUser);
        return true;
      }
      return false;
    } catch (error) {
      const message = getErrorMessage(error, t('settings.error_reset'));
      showSettingsError(t('settings.toast_title'), message);
      if (getErrorStatus(error) === 401) {
        await checkAuth();
      }
      return false;
    } finally {
      setIsResettingPreferences(false);
    }
  }, [checkAuth, isResettingPreferences, resetUserPreferences, syncFromUser, t]);

  return {
    settings,
    // labels + options
    directionOptions,
    frequencyOptions,
    directionLabelMap,
    frequencyLabelMap,
    currentDirectionLabel,
    currentFrequencyLabel,
    // daily reminder
    handleReminderToggle,
    saveReminderSchedule,
    isSavingSchedule,
    handleResetNotifications,
    isResettingNotifications,
    // personalization
    applyDirection,
    isSavingDirection,
    currentLanguage,
    applyLanguage,
    isSavingLanguage,
    // privacy
    analyticsConsent,
    handleAnalyticsConsentToggle,
    aiDataSharingConsent,
    handleAiDataSharingToggle,
    // delete my data
    handleResetPreferences,
    isResettingPreferences,
  };
};
