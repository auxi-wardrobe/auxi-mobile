/**
 * Locale codes supported by the app.
 *
 * Phase 01 (AU-242 UAC Foundation): resources are declared and ready,
 * but runtime i18n (i18next + locale persistence + device-locale detection)
 * is intentionally NOT wired here — it lands in Phase 04 alongside the
 * Language Settings screen, when the missing deps
 * (`i18next`, `react-i18next`, `react-native-localize`,
 * `@react-native-async-storage/async-storage`) are installed.
 *
 * Until then, screens that need copy import the JSON resource directly.
 */
export type Language = 'en-EN' | 'vi-VN' | 'fr-FR';

/** Typed shape for the `settings` translation namespace. */
export type SettingsTranslations = {
  direction_balanced_label: string;
  direction_balanced_desc: string;
  direction_relaxed_label: string;
  direction_relaxed_desc: string;
  direction_polished_label: string;
  direction_polished_desc: string;
  frequency_weekdays_label: string;
  frequency_weekdays_desc: string;
  frequency_everyday_label: string;
  toast_title: string;
  error_load: string;
  error_update_time: string;
  error_update_analytics: string;
  error_update_ai_sharing: string;
  error_update_direction: string;
  error_reset: string;
  title: string;
  daily_time: string;
  a11y_toggle_reminder: string;
  a11y_change_time: string;
  style_direction: string;
  privacy_control: string;
  share_analytics: string;
  a11y_toggle_analytics: string;
  share_ai_data: string;
  a11y_toggle_ai_data: string;
  terms_of_service: string;
  privacy_policy: string;
  manage_body_photo: string;
  delete_data: string;
  version: string;
  dark_mode: string;
  a11y_toggle_dark: string;
  dialog_direction_title: string;
  dialog_direction_body: string;
  update: string;
  dialog_time_title: string;
  dialog_delete_title: string;
  dialog_delete_body: string;
  language: string;
  a11y_change_language: string;
  dialog_language_title: string;
  error_update_language: string;
  notification_reset: string;
  a11y_notification_reset: string;
  notification_reset_toast_title: string;
  notification_reset_toast_body: string;
  notification_reset_undone_title: string;
  error_update_notification_reset: string;
  // IA-redesign section + reminder keys (AU-318)
  section_personalization: string;
  section_privacy: string;
  section_privacy_title: string;
  section_about: string;
  enable_daily_reminder: string;
  reminder_time: string;
  repeat_schedule: string;
  reset_to_default: string;
  delete_my_data: string;
  a11y_open_personalization: string;
  a11y_open_privacy: string;
  a11y_open_about: string;
};

export const SUPPORTED_LANGUAGES: Language[] = ['en-EN', 'vi-VN', 'fr-FR'];

export const DEFAULT_LANGUAGE: Language = 'en-EN';
