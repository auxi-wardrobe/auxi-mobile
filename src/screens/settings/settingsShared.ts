import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { toast } from '../../components/design-system/lib';
import { useAuth } from '../../context/AuthContext';
import {
  DailyNotificationFrequency,
  DailyNotificationPeriod,
  User,
  UserMetadata,
  UserStyleDirection,
} from '../../types/auth';
import type { Language } from '../../translations';

export const APP_VERSION = '0.0.1';

export type ResolvedSettingsState = {
  dailyNotification: {
    enabled: boolean;
    time: string;
    period: DailyNotificationPeriod;
    frequency: DailyNotificationFrequency;
  };
  styleDirection: UserStyleDirection;
};

export const DEFAULT_SETTINGS: ResolvedSettingsState = {
  dailyNotification: {
    enabled: true,
    time: '06:15',
    period: 'AM',
    frequency: 'weekdays',
  },
  styleDirection: 'stay_balanced',
};

// Native-name labels — render in their own script regardless of active locale.
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

export const buildFrequencyOptions = (
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
  { key: 'everydays', label: t('settings.frequency_everyday_label') },
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

// Pure metadata → resolved-settings mapper with per-field fallback.
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
      | { response?: { data?: { detail?: Array<{ msg?: string }>; message?: string } } }
      | undefined
  )?.response?.data;
  return responseData?.detail?.[0]?.msg || responseData?.message || fallback;
};

export const showSettingsError = (title: string, message: string) => {
  toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 4000,
  });
};

// Shared persist seam. Calls updateCurrentUser; on failure toasts + handles 401
// then rethrows so the caller can roll back. The CALLER syncs the returned user
// into its own state slice.
export const usePersistUserMetadata = () => {
  const { checkAuth, updateCurrentUser } = useAuth();
  const { t } = useTranslation();
  return useCallback(
    async (patch: UserMetadata, fallbackMessage: string): Promise<User> => {
      try {
        return await updateCurrentUser({ user_metadata: patch });
      } catch (error) {
        showSettingsError(
          t('settings.toast_title'),
          getErrorMessage(error, fallbackMessage),
        );
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        }
        throw error;
      }
    },
    [checkAuth, t, updateCurrentUser],
  );
};
