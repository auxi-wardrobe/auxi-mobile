/**
 * AU-242 Phase 04 — i18next runtime bootstrap.
 *
 * Phase 01 declared the locale resources (`src/translations/`) and types
 * but deferred the runtime wiring because the deps weren't in
 * package.json yet. Phase 04 installs i18next + react-i18next +
 * intl-pluralrules + react-native-localize + AsyncStorage and finally
 * boots the i18n layer here.
 *
 * Lifecycle:
 *   1. App.tsx awaits `initI18n()` BEFORE rendering the navigation
 *      tree. This guarantees `t(...)` returns real strings on first
 *      paint instead of bare keys.
 *   2. We look up the persisted locale in AsyncStorage. If absent, we
 *      fall back to the device locale (via `react-native-localize`)
 *      filtered to our supported list.
 *   3. The chosen locale is persisted on every change via the
 *      `languageChanged` event, so the next cold start skips device
 *      detection.
 *
 * Caller surface:
 *   - `initI18n()` — one-shot, idempotent (resolves the cached `i18next`
 *     instance on subsequent calls).
 *   - `setLanguage(locale)` — used by the Language Settings screen
 *     (phase 04 batch B). Wraps `i18next.changeLanguage` so screens
 *     don't import i18next directly.
 *   - `getCurrentLanguage()` — read accessor for non-React code.
 *
 * KISS: no namespace splitting, no lazy resource loading. All locales
 * are bundled (already imported via `src/translations/index.ts`), so
 * the cold-start cost is JSON parse only.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import 'intl-pluralrules';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  resources,
  defaultNS,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type Language,
} from '../translations';

const STORAGE_KEY = '@auxi/language';

const isSupportedLanguage = (value: string | null | undefined): value is Language =>
  !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/**
 * Best-match between the device's preferred locales and our supported
 * set. `getLocales()` returns entries like
 * `{ languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB' }`.
 * We try (a) exact language tag, (b) language code prefix match, then
 * fall back to DEFAULT_LANGUAGE.
 */
const detectDeviceLanguage = (): Language => {
  try {
    const deviceLocales = getLocales();
    for (const loc of deviceLocales) {
      // Exact tag (e.g. 'vi-VN')
      if (isSupportedLanguage(loc.languageTag)) {
        return loc.languageTag;
      }
      // Prefix match ('vi' → 'vi-VN')
      const match = SUPPORTED_LANGUAGES.find((sup) =>
        sup.toLowerCase().startsWith(loc.languageCode.toLowerCase()),
      );
      if (match) return match;
    }
  } catch (err) {
    console.warn('[i18n] device locale detection failed', err);
  }
  return DEFAULT_LANGUAGE;
};

const readPersistedLanguage = async (): Promise<Language | null> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch (err) {
    console.warn('[i18n] AsyncStorage read failed', err);
    return null;
  }
};

const persistLanguage = async (lng: string): Promise<void> => {
  if (!isSupportedLanguage(lng)) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lng);
  } catch (err) {
    console.warn('[i18n] AsyncStorage write failed', err);
  }
};

let initPromise: Promise<typeof i18n> | null = null;

/**
 * Initialise i18next exactly once. Safe to await from multiple
 * callers — they share the same promise.
 */
export const initI18n = (): Promise<typeof i18n> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const persisted = await readPersistedLanguage();
    const initialLanguage: Language = persisted ?? detectDeviceLanguage();

    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      defaultNS,
      ns: [defaultNS],
      interpolation: {
        escapeValue: false, // React already escapes
      },
      returnNull: false,
      compatibilityJSON: 'v4',
    });

    i18n.on('languageChanged', (lng) => {
      persistLanguage(lng).catch(() => {
        // already logged inside persistLanguage; swallow here so the
        // event handler doesn't reject the unhandled-promise channel.
      });
    });

    return i18n;
  })();

  return initPromise;
};

/**
 * Change the active language and persist the selection.
 * Used by the Language Settings screen.
 */
export const setLanguage = async (locale: Language): Promise<void> => {
  if (!isSupportedLanguage(locale)) return;
  await i18n.changeLanguage(locale);
};

/**
 * Synchronous accessor for the current language. Returns
 * DEFAULT_LANGUAGE until `initI18n()` resolves.
 */
export const getCurrentLanguage = (): Language => {
  const lng = i18n.language;
  return isSupportedLanguage(lng) ? lng : DEFAULT_LANGUAGE;
};

export { i18n };
