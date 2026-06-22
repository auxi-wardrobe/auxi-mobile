/**
 * AU-242 Phase 04 — Batch D · Screen 02 (Language Settings).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/02-language-settings.md
 *
 * M3 list pattern: header back, two list items (English / Tiếng Việt)
 * with leading flag glyph + content text + trailing radio. Selecting a
 * row calls `setLanguage(code)` which delegates to
 * `i18next.changeLanguage`; the foundation's `i18n/init.ts` persists
 * the choice to AsyncStorage via the `languageChanged` event.
 *
 * Per spec, the screen ships English + Vietnamese only. The french
 * locale is present in the JSON resources but not surfaced here until
 * product opts in (parity with Welcome's `language_button`).
 *
 * Flag glyphs are rendered as Unicode regional-indicator characters
 * rather than dedicated SVG assets — keeps the batch independent of
 * asset additions in other batches. Cleanup phase can swap to the
 * Figma flag.eng / flag-vn SVGs once those assets land.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  getCurrentLanguage,
  setLanguage as setI18nLanguage,
} from '../../i18n/init';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';
import type { Language } from '../../translations';
import { theme } from '../../theme/theme';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'LanguageSettings'
>;

interface LanguageOption {
  code: Language;
  flag: string;
  labelKey:
    | 'uac.language_settings.english'
    | 'uac.language_settings.vietnamese';
  testID: string;
}

// Per spec: ship en + vi only. fr-FR is resource-only for now.
const OPTIONS: LanguageOption[] = [
  {
    code: 'en-EN',
    flag: '\u{1F1EC}\u{1F1E7}', // 🇬🇧
    labelKey: 'uac.language_settings.english',
    testID: 'language-settings-row-en',
  },
  {
    code: 'vi-VN',
    flag: '\u{1F1FB}\u{1F1F3}', // 🇻🇳
    labelKey: 'uac.language_settings.vietnamese',
    testID: 'language-settings-row-vi',
  },
];

export const LanguageSettingsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { t, i18n } = useTranslation();

  // Track selection locally so the UI reflects the change immediately;
  // i18n's `languageChanged` event also fires and re-renders consumers,
  // but local state guarantees the radio updates even before the event
  // round-trips.
  const [selected, setSelected] = useState<Language>(
    () => (i18n.language as Language) || getCurrentLanguage(),
  );

  const handleSelect = (code: Language) => {
    if (code === selected) return; // idempotent — already selected
    setSelected(code);
    // Auth-tier locale switch — the screen lives in the auth stack so
    // every selection here is by definition pre-auth. Locale value is
    // already in the lowercase-hyphen shape Mixpanel expects
    // (`en-EN`, `vi-VN`); pass through verbatim.
    track('auth_language_changed', { locale: code });
    // Fire-and-forget: `setLanguage` resolves asynchronously, but the
    // i18next event loop notifies subscribed consumers as soon as the
    // internal `changeLanguage` resolves. AsyncStorage persistence
    // happens in init.ts's `languageChanged` handler.
    setI18nLanguage(code).catch(err => {
      // Best-effort — keep the radio in sync even if persistence
      // fails; init.ts already logs the underlying error.
      console.warn('[LanguageSettings] setLanguage failed', err);
    });
  };

  const title = useMemo(() => t('uac.language_settings.title') as string, [t]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header} testID="language-settings-header">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('uac.common.back') as string}
          testID="language-settings-back"
          onPress={() => navigation.goBack()}
          style={styles.headerBackHit}
          hitSlop={8}
        >
          <Text style={styles.headerBackChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} testID="language-settings-title">
          {title}
        </Text>
        {/* Trailing 47x47 placeholder — preserves spec layout symmetry */}
        <View style={styles.headerTrailingSlot} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {OPTIONS.map(opt => {
          const isSelected = opt.code === selected;
          return (
            <View key={opt.code}>
              <Pressable
                testID={opt.testID}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t(opt.labelKey) as string}
                onPress={() => handleSelect(opt.code)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={styles.flagGlyph}>{opt.flag}</Text>
                <Text
                  style={[
                    styles.label,
                    opt.code === 'vi-VN' && styles.labelVietnamese,
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
                <View
                  style={styles.radioOuter}
                  testID={
                    isSelected
                      ? `${opt.testID}-radio-selected`
                      : `${opt.testID}-radio`
                  }
                >
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
              <View style={styles.divider} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  header: {
    height: theme.spacing.uacHeaderHeight,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: theme.spacing.uacDimension16,
  },
  headerBackHit: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackChevron: {
    fontSize: 32,
    lineHeight: 32,
    color: theme.colors.uacTextBase,
  },
  headerTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    flex: 1,
    textAlign: 'center',
  },
  headerTrailingSlot: {
    width: 47,
    height: 47,
  },
  body: {
    paddingTop: theme.spacing.uacDimension16,
    paddingBottom: theme.spacing.uacDimension24,
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  row: {
    minHeight: theme.spacing.uacListItemMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension16,
    paddingVertical: theme.spacing.uacDimension8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  flagGlyph: {
    fontSize: 22,
    lineHeight: 28,
  },
  label: {
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextBase,
    flex: 1,
  },
  labelVietnamese: {
    // Noto-Sans is bundled per foundation (fonts vendored); fall back to
    // System if the family alias isn't registered (smoke-test safety).
    fontFamily: 'Poppins-Regular',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.uacRadioPill,
    borderWidth: 2,
    borderColor: theme.colors.uacTextBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: theme.borderRadius.uacRadioPill,
    backgroundColor: theme.colors.uacTextBase,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.uacBorderBold200,
    opacity: 0.2,
    marginLeft: 40, // M3 middle-inset (leading icon width 24 + gap 16)
  },
});

export default LanguageSettingsScreen;
