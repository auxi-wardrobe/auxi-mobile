import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
  BottomSheetSurface,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { Radio, RadioOptionList } from '../components/settings/RadioOptionList';
import { SettingsSwitch } from '../components/settings/SettingsSwitch';
import { Icons } from '../assets/icons';
import {
  DailyNotificationFrequency,
  DailyNotificationPeriod,
  User,
  UserMetadata,
  UserStyleDirection,
} from '../types/auth';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import {
  grantAnalyticsConsent,
  hasAnalyticsConsent,
  revokeAnalyticsConsent,
  track,
} from '../services/analytics';
import { setLanguage as setI18nLanguage } from '../i18n/init';
import type { Language } from '../translations';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;
type ActiveModal =
  | 'none'
  | 'direction'
  | 'changeTime'
  | 'deleteConfirm'
  | 'language';

// Native-name labels — render in their own script regardless of active locale
// (standard pattern for language pickers).
const LANGUAGE_OPTIONS: Array<{ key: Language; label: string }> = [
  { key: 'en-EN', label: 'English' },
  { key: 'vi-VN', label: 'Tiếng Việt' },
  { key: 'fr-FR', label: 'Français' },
];

const LANGUAGE_LABEL_MAP: Record<Language, string> = {
  'en-EN': 'English',
  'vi-VN': 'Tiếng Việt',
  'fr-FR': 'Français',
};

type ResolvedSettingsState = {
  dailyNotification: {
    enabled: boolean;
    time: string;
    period: DailyNotificationPeriod;
    frequency: DailyNotificationFrequency;
  };
  styleDirection: UserStyleDirection;
};

const APP_VERSION = '0.0.1';
const DEFAULT_SETTINGS: ResolvedSettingsState = {
  dailyNotification: {
    enabled: true,
    time: '06:15',
    period: 'AM',
    frequency: 'weekdays',
  },
  styleDirection: 'stay_balanced',
};

// Display label/description resolved at render time from t() (built via
// buildDirectionOptions / buildFrequencyOptions inside the component) so they
// can't live as module-scope literals. Canonical `key` identifiers used by
// logic are preserved verbatim below.
const buildDirectionOptions = (
  t: TFunction,
): Array<{ key: UserStyleDirection; label: string; description: string }> => [
  {
    key: 'stay_balanced',
    label: t('settings.direction_balanced_label'),
    description: t('settings.direction_balanced_desc'),
  },
  {
    key: 'more_relaxed',
    label: t('settings.direction_relaxed_label'),
    description: t('settings.direction_relaxed_desc'),
  },
  {
    key: 'more_polished',
    label: t('settings.direction_polished_label'),
    description: t('settings.direction_polished_desc'),
  },
];

const buildFrequencyOptions = (
  t: TFunction,
): Array<{
  key: DailyNotificationFrequency;
  label: string;
  description?: string;
}> => [
  {
    key: 'weekdays',
    label: t('settings.frequency_weekdays_label'),
    description: t('settings.frequency_weekdays_desc'),
  },
  {
    key: 'everydays',
    label: t('settings.frequency_everyday_label'),
  },
];

const buildDirectionLabelMap = (
  t: TFunction,
): Record<UserStyleDirection, string> => ({
  stay_balanced: t('settings.direction_balanced_label'),
  more_relaxed: t('settings.direction_relaxed_label'),
  more_polished: t('settings.direction_polished_label'),
});

const buildFrequencyLabelMap = (
  t: TFunction,
): Record<DailyNotificationFrequency, string> => ({
  weekdays: t('settings.frequency_weekdays_label'),
  everydays: t('settings.frequency_everyday_label'),
});

// Exported for unit tests — pure metadata → resolved-settings mapper with
// per-field fallback to DEFAULT_SETTINGS.
export const resolveSettings = (
  metadata?: UserMetadata | null,
): ResolvedSettingsState => ({
  dailyNotification: {
    enabled:
      metadata?.daily_notification?.enabled ??
      DEFAULT_SETTINGS.dailyNotification.enabled,
    time:
      metadata?.daily_notification?.time ??
      DEFAULT_SETTINGS.dailyNotification.time,
    period:
      metadata?.daily_notification?.period ??
      DEFAULT_SETTINGS.dailyNotification.period,
    frequency:
      metadata?.daily_notification?.frequency ??
      DEFAULT_SETTINGS.dailyNotification.frequency,
  },
  styleDirection: metadata?.style_direction ?? DEFAULT_SETTINGS.styleDirection,
});

const getErrorStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | undefined)?.response?.status;

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseData = (
    error as
      | {
          response?: {
            data?: {
              detail?: Array<{ msg?: string }>;
              message?: string;
            };
          };
        }
      | undefined
  )?.response?.data;

  return responseData?.detail?.[0]?.msg || responseData?.message || fallback;
};

const showSettingsError = (title: string, message: string) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 4000,
  });
};

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const {
    checkAuth,
    refreshUser,
    resetUserPreferences,
    updateCurrentUser,
    user,
  } = useAuth();
  const { open: openSidebar } = useSidebar();
  const [settings, setSettings] =
    useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [pendingDisplayDirection, setPendingDisplayDirection] =
    useState<UserStyleDirection>(DEFAULT_SETTINGS.styleDirection);
  const [pendingPeriod, setPendingPeriod] = useState<DailyNotificationPeriod>(
    DEFAULT_SETTINGS.dailyNotification.period,
  );
  const [pendingFrequency, setPendingFrequency] =
    useState<DailyNotificationFrequency>(
      DEFAULT_SETTINGS.dailyNotification.frequency,
    );
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  // Language picker mirrors the direction modal: pending value tracks the
  // radio selection until the user taps Update, then setLanguage commits.
  const currentLanguage = (i18n.language as Language) || 'en-EN';
  const [pendingLanguage, setPendingLanguage] =
    useState<Language>(currentLanguage);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  // Dark Mode: visual-only stub shipped disabled — no theming infra wired yet.
  const [darkModeStub] = useState(false);
  // Analytics consent (EU/CA opt-in). Mirrors the persisted decision in the
  // analytics seam; the Privacy-control toggle below is the production path
  // that grants/revokes it.
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const syncFromUser = useCallback((nextUser: User | null) => {
    const nextSettings = resolveSettings(nextUser?.user_metadata);
    setSettings(nextSettings);
    setPendingDisplayDirection(nextSettings.styleDirection);
    setPendingPeriod(nextSettings.dailyNotification.period);
    setPendingFrequency(nextSettings.dailyNotification.frequency);
  }, []);

  useEffect(() => {
    syncFromUser(user);
  }, [syncFromUser, user]);

  // Reflect the persisted analytics-consent decision in the toggle on mount.
  useEffect(() => {
    let isMounted = true;
    hasAnalyticsConsent().then(granted => {
      if (isMounted) {
        setAnalyticsConsent(granted);
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

  const currentDirectionLabel = useMemo(
    () => directionLabelMap[settings.styleDirection],
    [directionLabelMap, settings.styleDirection],
  );

  const currentFrequencyLabel = useMemo(
    () => frequencyLabelMap[settings.dailyNotification.frequency],
    [frequencyLabelMap, settings.dailyNotification.frequency],
  );

  const openDirectionModal = () => {
    setPendingDisplayDirection(settings.styleDirection);
    setActiveModal('direction');
  };

  const closeDirectionModal = () => {
    if (isSavingDirection) return;
    setPendingDisplayDirection(settings.styleDirection);
    setActiveModal('none');
  };

  const openChangeTimeModal = () => {
    setPendingPeriod(settings.dailyNotification.period);
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('changeTime');
  };

  const closeChangeTimeModal = () => {
    if (isSavingTime) return;
    setPendingPeriod(settings.dailyNotification.period);
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('none');
  };

  const closeDeleteModal = () => {
    if (isResettingPreferences) return;
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

  const handleReminderToggle = (enabled: boolean) => {
    const previousValue = settings.dailyNotification.enabled;

    track('notifications_toggle_changed', { enabled });

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

  // Optimistic flip with rollback on failure (mirrors handleReminderToggle).
  // grant/revoke persist the decision and bring the SDK up / tear it down.
  const handleAnalyticsConsentToggle = (enabled: boolean) => {
    const previousValue = analyticsConsent;
    setAnalyticsConsent(enabled);
    // Order matters: pre-consent track() is a no-op. Fire BEFORE revoke (event
    // lands while consent still active), AFTER grant (event lands with consent).
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
  };

  const applyDirection = async () => {
    if (isSavingDirection) return;

    setIsSavingDirection(true);
    try {
      await persistUserMetadata(
        {
          style_direction: pendingDisplayDirection,
        },
        t('settings.error_update_direction'),
      );
      track('style_direction_changed', {
        direction: pendingDisplayDirection,
      });
      setActiveModal('none');
    } catch {
      // persistUserMetadata already surfaced the error toast (and handled 401);
      // swallow the rethrow so the async onPress doesn't reject unhandled.
      // Keep the modal open so the user can retry.
    } finally {
      setIsSavingDirection(false);
    }
  };

  // Change-time dialog (Frame 3). Per CEO (Q12): the "07:30" time value is
  // READ-ONLY display; only AM/PM (period) + Weekdays/Everydays (frequency)
  // are interactive and persisted — mirrors the enabled-toggle persist path.
  const applyChangeTime = async () => {
    if (isSavingTime) return;

    setIsSavingTime(true);
    try {
      await persistUserMetadata(
        // Safe: backend deep-merges user_metadata (routers/auth.py _deep_merge) —
        // partial daily_notification patch preserves enabled/time. Only period +
        // frequency are sent (time is read-only display per CEO Q12).
        {
          daily_notification: {
            period: pendingPeriod,
            frequency: pendingFrequency,
          },
        },
        t('settings.error_update_time'),
      );
      setActiveModal('none');
    } catch {
      // persistUserMetadata already surfaced the error toast (and handled 401);
      // swallow the rethrow so the async onPress doesn't reject unhandled.
      // Keep the modal open so the user can retry.
    } finally {
      setIsSavingTime(false);
    }
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
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        {/* Header — hamburger-left + centered title only (no right icon, qa-ui C1). */}
        <View style={styles.header}>
          <TopIconButton
            testID="settings-menu-button"
            icon={<Icons.Menu width={24} height={24} />}
            onPress={openSidebar}
          />
          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={styles.title}>{t('settings.title')}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Daily Time block */}
          <View style={styles.group}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel}>{t('settings.daily_time')}</Text>
              <SettingsSwitch
                testID="settings-daily-toggle"
                accessibilityLabel={t('settings.a11y_toggle_reminder')}
                value={settings.dailyNotification.enabled}
                onValueChange={handleReminderToggle}
              />
            </View>

            <TouchableOpacity
              testID="settings-time-row"
              accessibilityLabel={t('settings.a11y_change_time')}
              activeOpacity={0.82}
              style={styles.timeRow}
              onPress={openChangeTimeModal}
            >
              <View style={styles.timeValueWrap}>
                <Text style={styles.timeValueMain} allowFontScaling={false}>
                  {settings.dailyNotification.time}
                </Text>
                <Text style={styles.timeValuePeriod} allowFontScaling={false}>
                  {settings.dailyNotification.period}
                </Text>
              </View>
              <Text style={styles.rowValue}>{currentFrequencyLabel}</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Style Direction row */}
          <TouchableOpacity
            testID="settings-style-direction-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={openDirectionModal}
          >
            <Text style={styles.rowLabel}>{t('settings.style_direction')}</Text>
            <Text style={styles.rowValue}>{currentDirectionLabel}</Text>
          </TouchableOpacity>

          <Divider />

          {/* Language row */}
          <TouchableOpacity
            testID="settings-language-row"
            accessibilityLabel={t('settings.a11y_change_language')}
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={openLanguageModal}
          >
            <Text style={styles.rowLabel}>{t('settings.language')}</Text>
            <Text style={styles.rowValue}>
              {LANGUAGE_LABEL_MAP[currentLanguage]}
            </Text>
          </TouchableOpacity>

          <Divider />

          {/* Privacy control group */}
          <View style={styles.sectionLabelWrap}>
            <Text style={styles.rowLabel}>{t('settings.privacy_control')}</Text>
          </View>

          <Divider />

          {/* Analytics consent (EU/CA opt-in). The only production path to
              grant/revoke — until granted, the Mixpanel SDK stays inert and
              every track() call no-ops (see services/analytics.ts). */}
          <View style={styles.rowHeader}>
            <Text style={styles.rowLabel}>{t('settings.share_analytics')}</Text>
            <SettingsSwitch
              testID="settings-analytics-consent-toggle"
              accessibilityLabel={t('settings.a11y_toggle_analytics')}
              value={analyticsConsent}
              onValueChange={handleAnalyticsConsentToggle}
            />
          </View>

          <Divider />

          <TouchableOpacity
            testID="settings-your-information-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            // TODO(settings): "Your information" screen not built yet — shipped as no-op per CEO scope; wire route when the screen exists.
            onPress={() => {}}
          >
            <Text style={styles.rowLabel}>
              {t('settings.your_information')}
            </Text>
            <Icons.ArrowRight
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            testID="settings-manage-body-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={() => navigation.navigate('Body', { mode: 'photoDetail' })}
          >
            <Text style={styles.rowLabel}>
              {t('settings.manage_body_photo')}
            </Text>
            <Icons.ArrowRight
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            testID="settings-delete-data-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={() => setActiveModal('deleteConfirm')}
          >
            {/* Main-list "Delete data" row is NEUTRAL (qa-ui C2) — not red. */}
            <Text style={styles.rowLabel}>{t('settings.delete_data')}</Text>
            <Icons.Delete
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>

          <Divider />

          {/* Version row. In __DEV__ builds it doubles as a hidden entry to the
              in-app Design System reference (tap to open). Appearance is
              unchanged; the TouchableOpacity wrapper is dev-only so prod users
              get the inert View. */}
          {__DEV__ ? (
            <TouchableOpacity
              style={styles.versionRow}
              testID="settings-version-devmenu"
              accessibilityLabel="Open Design System reference"
              onPress={() => navigation.navigate('DesignSystem')}
            >
              <Text style={styles.rowLabel}>
                {t('settings.version', { version: APP_VERSION })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.versionRow}>
              <Text style={styles.rowLabel}>
                {t('settings.version', { version: APP_VERSION })}
              </Text>
            </View>
          )}

          <Divider />

          {/* Dark Mode: non-functional stub — disabled + dimmed so users don't
              expect a theme change until theming infra lands. */}
          <View style={[styles.rowHeader, styles.disabledRow]}>
            <Text style={styles.rowLabel}>{t('settings.dark_mode')}</Text>
            <SettingsSwitch
              testID="settings-dark-mode-toggle"
              accessibilityLabel={t('settings.a11y_toggle_dark')}
              value={darkModeStub}
              disabled
            />
          </View>

          <Divider />
        </View>
      </BottomSheetSurface>

      {/* Style-direction dialog (Frame 2) */}
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
          selected={pendingDisplayDirection}
          onSelect={setPendingDisplayDirection}
          testIDPrefix="settings-direction-option"
        />
      </SettingsDialog>

      {/* Change-time dialog (Frame 3) — NEW */}
      <SettingsDialog
        visible={activeModal === 'changeTime'}
        onClose={closeChangeTimeModal}
        isBusy={isSavingTime}
        title={t('settings.dialog_time_title')}
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

        <RadioOptionList
          options={frequencyOptions}
          selected={pendingFrequency}
          onSelect={setPendingFrequency}
          testIDPrefix="settings-time-freq"
        />
      </SettingsDialog>

      {/* Delete-data dialog (Frame 4) */}
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
    </SafeAreaView>
  );
};

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurface,
  },
  sheet: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 45,
    paddingHorizontal: 22,
  },
  titleWrap: {
    position: 'absolute',
    left: 84,
    right: 84,
    top: 45,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  headerSpacer: {
    width: 45,
    height: 45,
  },
  content: {
    flex: 1,
    paddingTop: 112,
    paddingHorizontal: 27,
    paddingBottom: 24,
  },
  group: {
    paddingTop: 8,
  },
  rowHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 12,
  },
  timeValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeValueMain: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.figmaTextDark,
  },
  timeValuePeriod: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextBase,
    marginLeft: 8,
  },
  singleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  rowValue: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
  },
  sectionLabelWrap: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  versionRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
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
  // optionTitle is retained for the change-time AM/PM period stack, which
  // keeps its own bespoke layout (periodRow) outside RadioOptionList.
  optionTitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  disabledRow: {
    opacity: 0.5,
  },
});
