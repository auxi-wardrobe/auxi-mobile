/**
 * Translation resource registry.
 *
 * Phase 01 (AU-242 UAC Foundation): expose JSON resources by locale code as
 * static imports. Runtime i18n bootstrap (i18next.init + locale persistence)
 * is deferred to Phase 04 when the Language Settings screen and its deps
 * (i18next, react-i18next, react-native-localize, async-storage) land.
 *
 * Why: the previous boilerplate `i18n.init()` block imported four packages
 * that aren't in package.json (i18next, react-i18next, intl-pluralrules, plus
 * an internal `@/hooks/language/schema` module that never existed). It was
 * never imported from App.tsx — fully dead code that nonetheless tripped
 * `tsc --noEmit`. KISS / YAGNI: clear the compile error now, ship the runtime
 * wiring with the screen that consumes it.
 */
import en from './en-EN.json';
import fr from './fr-FR.json';
import vi from './vi-VN.json';

import type { Language } from './types';

export const defaultNS = 'boilerplate';

export const resources = {
  'en-EN': en,
  'fr-FR': fr,
  'vi-VN': vi,
} as const satisfies Record<Language, unknown>;

export type TranslationResources = typeof resources;

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './types';
export type { Language } from './types';
