import Toast from 'react-native-toast-message';
import type { TFunction } from 'i18next';
import {
  DailyNotificationFrequency,
  DailyNotificationPeriod,
  UserMetadata,
  UserStyleDirection,
} from '../../types/auth';
import type { Language } from '../../translations';

/**
 * Shared, pure building blocks for the Settings architecture.
 *
 * The Settings IA is split across one parent screen (`SettingsScreen`) and
 * three sub-pages (Personalization / Privacy / About). Every screen derives its
 * state from the SAME source of truth — `user.user_metadata` via `AuthContext`
 * — so the pure resolvers, option builders, label maps and error helpers all
 * live here, free of React, ready to be shared by `useSettingsController` and
 * by the unit tests.
 */

// Native-name labels — render in their own script regardless of active locale
// (standard pattern for language pickers).
export const LANGUAGE_OPTIONS: Array<{ key: Language; label: string }> = [
  { key: 'en-EN', label: 'English' },
  { key: 'vi-VN', label: 'Tiếng Việt' },
  { key: 'fr-FR', label: 'Français' },
];

export const LANGUAGE_LABEL_MAP: Record<Language, string> = {
  'en-EN': 'English',
  'vi-VN': 'Tiếng Việt',
  'fr-FR': 'Français',
};

export type ResolvedSettingsState = {
  dailyNotification: {
    enabled: boolean;
    time: string;
    period: DailyNotificationPeriod;
    frequency: DailyNotificationFrequency;
  };
  styleDirection: UserStyleDirection;
};

export const APP_VERSION = '0.0.1';

export const DEFAULT_SETTINGS: ResolvedSettingsState = {
  dailyNotification: {
    enabled: true,
    time: '06:15',
    period: 'AM',
    frequency: 'weekdays',
  },
  styleDirection: 'stay_balanced',
};

// Display label/description resolved at render time from t() so they can't live
// as module-scope literals. Canonical `key` identifiers used by logic are
// preserved verbatim below.
export const buildDirectionOptions = (
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

// Repeat-schedule options. `custom` is surfaced for IA completeness but stays
// `disabled` until the data model + backend support per-weekday schedules —
// keeping the option here (not hidden) means the picker is ready to light it up
// without a structural change (scalability).
export type ScheduleOptionKey = DailyNotificationFrequency | 'custom';

export const buildFrequencyOptions = (
  t: TFunction,
): Array<{
  key: ScheduleOptionKey;
  label: string;
  description?: string;
  disabled?: boolean;
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
  {
    key: 'custom',
    label: t('settings.frequency_custom_label'),
    description: t('settings.frequency_custom_desc'),
    disabled: true,
  },
];

export const buildDirectionLabelMap = (
  t: TFunction,
): Record<UserStyleDirection, string> => ({
  stay_balanced: t('settings.direction_balanced_label'),
  more_relaxed: t('settings.direction_relaxed_label'),
  more_polished: t('settings.direction_polished_label'),
});

export const buildFrequencyLabelMap = (
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

export const getErrorStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | undefined)?.response?.status;

export const getErrorMessage = (error: unknown, fallback: string) => {
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

export const showSettingsError = (title: string, message: string) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 4000,
  });
};
