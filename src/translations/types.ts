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

export const SUPPORTED_LANGUAGES: Language[] = ['en-EN', 'vi-VN', 'fr-FR'];

export const DEFAULT_LANGUAGE: Language = 'en-EN';
