# Settings IA Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the auxi Settings screen from one flat 1134-line page into a short root page (daily-reminder block + 3 drill-down groups + Delete) plus three focused sub-screens (Personalization / Privacy / About), all built from the `MListRow` design-system primitive.

**Architecture:** Root `SettingsScreen` keeps the reminder block inline and renders nav rows that push three new sub-screens registered on the existing native stack. Shared pure helpers + a persist hook live in `settingsShared.ts` (DRY); each screen owns only its own state slice (no shared store — auxi "no Zustand" rule). All non-toggle rows migrate to `MListRow`; toggles use a new thin `SettingsToggleRow`.

**Tech Stack:** React Native 0.83 · React 19 · TypeScript · React Navigation 7 (native-stack) · react-i18next · jest + react-test-renderer.

**Spec:** `plans/260629-1842-settings-ia-redesign/spec.md`

## Global Constraints

- **Scope = IA reorganization only.** No new reminder behavior: Reminder Time is **read-only** (displays `time + period`, e.g. "06:15 AM"); Repeat Schedule is **Weekdays/Everyday only** (no "Custom").
- **Drop the AM/PM (period) editor** — it lived in the old combined change-time dialog; Reminder Time is now read-only display. The persisted `period` is still shown, never edited.
- **Drop the Dark Mode stub** and retire its i18n keys (`dark_mode`, `a11y_toggle_dark`).
- **No backend changes** — `user_metadata` shape is unchanged.
- **Design-system primitives:** non-toggle rows MUST use `MListRow` from `src/components/design-system/lib`; no new hand-rolled `TouchableOpacity` rows. Toggles use `SettingsToggleRow` (the one justified bespoke row — `MListRow` has no switch slot).
- **Keep `SettingsSwitch`** (do not swap to `MSwitch` in this pass).
- **Analytics:** event names are literal string constants, past-tense `object_verb`, snake_case props, no PII (`analytics-tracking-required` rule). Update `docs/analytics/mixpanel-tracking-plan.md` for any new event.
- **i18n:** every user-visible string is a `t('settings.*')` key present in all three locales (`en-EN`, `vi-VN`, `fr-FR`) and typed in `src/translations/types.ts`.
- **Verification gates (run before PR):** `npx tsc --noEmit`, `yarn lint`, `yarn jest`, `../scripts/auxi-lint-tokens.sh`, `scripts/auxi-lint-ds-primitives.sh` — all clean. Designer step-6.5 PASS + CEO sign-off on grouped visual treatment.
- **Test idiom (this repo):** no `@testing-library/react-native`. Drive the tree with `react-test-renderer`: query by `testID` via `root.findAll`, invoke `onPress`/`onValueChange` inside `act()`. `useAuth`, `toast`, navigation, and SVGs are mocked. With no i18next instance in tests, `t(key)` returns the **bare key** — assert on keys, not English copy.

---

### Task 0: Branch + reconcile

**Files:** none (git only)

- [ ] **Step 1:** Confirm working state. The current branch is `feat/ds-toast-b3-settings-cleanup` (in-flight settings cleanup). Decide with the reviewer: continue here or branch fresh.

Run: `cd auxi && git status && git log --oneline -5`
Expected: clean tree; note any uncommitted settings work that overlaps `SettingsScreen.tsx`.

- [ ] **Step 2:** Create the feature branch off the agreed base (default: current branch).

```bash
cd auxi && git checkout -b feature/settings-ia-redesign
```

- [ ] **Step 3:** Commit the spec + plan (currently uncommitted under `plans/260629-1842-settings-ia-redesign/`).

```bash
cd auxi && git add plans/260629-1842-settings-ia-redesign/
git commit -m "docs: settings IA redesign spec + plan"
```

---

### Task 1: Extract shared helpers — `settingsShared.ts`

Moves the pure logic + the persist hook out of the 1134-line screen so all four screens reuse one source.

**Files:**
- Create: `src/screens/settings/settingsShared.ts`
- Create: `src/screens/settings/__tests__/settingsShared.test.ts`
- Read for context: `src/screens/SettingsScreen.tsx:74-202` (the originals)

**Interfaces:**
- Produces: `ResolvedSettingsState` (type), `DEFAULT_SETTINGS`, `APP_VERSION`, `LANGUAGE_OPTIONS`, `LANGUAGE_LABEL_MAP`, `resolveSettings(metadata?) => ResolvedSettingsState`, `buildDirectionOptions(t)`, `buildDirectionLabelMap(t)`, `buildFrequencyOptions(t)`, `buildFrequencyLabelMap(t)`, `getErrorStatus(error)`, `getErrorMessage(error, fallback)`, `showSettingsError(title, message)`, and the hook `usePersistUserMetadata() => (patch: UserMetadata, fallbackMessage: string) => Promise<User>`.

- [ ] **Step 1: Write the failing test**

`src/screens/settings/__tests__/settingsShared.test.ts`:
```ts
import {
  DEFAULT_SETTINGS,
  getErrorMessage,
  resolveSettings,
} from '../settingsShared';

describe('resolveSettings', () => {
  it('null/undefined metadata → DEFAULT_SETTINGS', () => {
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('partial daily_notification → other fields fall back', () => {
    const r = resolveSettings({ daily_notification: { enabled: false } });
    expect(r.dailyNotification).toEqual({
      enabled: false,
      time: DEFAULT_SETTINGS.dailyNotification.time,
      period: DEFAULT_SETTINGS.dailyNotification.period,
      frequency: DEFAULT_SETTINGS.dailyNotification.frequency,
    });
    expect(r.styleDirection).toBe(DEFAULT_SETTINGS.styleDirection);
  });

  it('provided style_direction overrides default', () => {
    expect(
      resolveSettings({ style_direction: 'more_polished' }).styleDirection,
    ).toBe('more_polished');
  });
});

describe('getErrorMessage', () => {
  it('prefers detail[0].msg, then message, then fallback', () => {
    expect(
      getErrorMessage({ response: { data: { detail: [{ msg: 'bad' }] } } }, 'fb'),
    ).toBe('bad');
    expect(
      getErrorMessage({ response: { data: { message: 'nope' } } }, 'fb'),
    ).toBe('nope');
    expect(getErrorMessage(new Error('x'), 'fb')).toBe('fb');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/settingsShared.test.ts`
Expected: FAIL — cannot find module `../settingsShared`.

- [ ] **Step 3: Create `settingsShared.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/settingsShared.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
cd auxi && git add src/screens/settings/settingsShared.ts src/screens/settings/__tests__/settingsShared.test.ts
git commit -m "refactor(settings): extract shared helpers + persist hook"
```

---

### Task 2: i18n keys (all new keys, 3 locales + types)

Add every new key once so later screen tasks just reference them.

**Files:**
- Modify: `src/translations/en-EN.json` (the `settings` block, ~line 486)
- Modify: `src/translations/vi-VN.json` (same block)
- Modify: `src/translations/fr-FR.json` (same block)
- Modify: `src/translations/types.ts` (typed `settings` shape)

**Interfaces:**
- Produces i18n keys: `section_personalization`, `section_privacy`, `section_privacy_title`, `section_about`, `enable_daily_reminder`, `reminder_time`, `repeat_schedule`, `reset_to_default`, `delete_my_data`, `a11y_open_personalization`, `a11y_open_privacy`, `a11y_open_about`.

- [ ] **Step 1: Add keys to `en-EN.json`** (inside the `"settings": { … }` object)

```json
"section_personalization": "Personalization",
"section_privacy": "Privacy",
"section_privacy_title": "Privacy Control",
"section_about": "About",
"enable_daily_reminder": "Enable Daily Reminder",
"reminder_time": "Reminder Time",
"repeat_schedule": "Repeat Schedule",
"reset_to_default": "Reset to Default",
"delete_my_data": "Delete My Data",
"a11y_open_personalization": "Open personalization settings",
"a11y_open_privacy": "Open privacy settings",
"a11y_open_about": "Open about"
```

- [ ] **Step 2: Add the same keys to `vi-VN.json`**

```json
"section_personalization": "Cá nhân hóa",
"section_privacy": "Quyền riêng tư",
"section_privacy_title": "Kiểm soát quyền riêng tư",
"section_about": "Giới thiệu",
"enable_daily_reminder": "Bật nhắc nhở hằng ngày",
"reminder_time": "Giờ nhắc nhở",
"repeat_schedule": "Lịch lặp lại",
"reset_to_default": "Đặt lại mặc định",
"delete_my_data": "Xóa dữ liệu của tôi",
"a11y_open_personalization": "Mở cài đặt cá nhân hóa",
"a11y_open_privacy": "Mở cài đặt quyền riêng tư",
"a11y_open_about": "Mở giới thiệu"
```

- [ ] **Step 3: Add the same keys to `fr-FR.json`**

```json
"section_personalization": "Personnalisation",
"section_privacy": "Confidentialité",
"section_privacy_title": "Contrôle de confidentialité",
"section_about": "À propos",
"enable_daily_reminder": "Activer le rappel quotidien",
"reminder_time": "Heure du rappel",
"repeat_schedule": "Planning de répétition",
"reset_to_default": "Réinitialiser par défaut",
"delete_my_data": "Supprimer mes données",
"a11y_open_personalization": "Ouvrir les paramètres de personnalisation",
"a11y_open_privacy": "Ouvrir les paramètres de confidentialité",
"a11y_open_about": "Ouvrir à propos"
```

> Note: vi/fr values are first-pass; flag for CEO/native review in the PR.

- [ ] **Step 4: Add the keys to `types.ts`** under the `settings` interface (match the existing key style — `key: string;` lines).

- [ ] **Step 5: Verify type-check**

Run: `cd auxi && npx tsc --noEmit`
Expected: PASS (no missing-key type errors).

- [ ] **Step 6: Commit**

```bash
cd auxi && git add src/translations/
git commit -m "i18n(settings): add IA-redesign section + reminder keys"
```

---

### Task 3: `SettingsToggleRow` component

The one bespoke row (label + `SettingsSwitch`), since `MListRow` has no switch slot.

**Files:**
- Create: `src/components/settings/SettingsToggleRow.tsx`
- Create: `src/components/settings/__tests__/SettingsToggleRow.test.tsx`
- Read for context: `src/components/settings/SettingsSwitch.tsx`

**Interfaces:**
- Produces: `SettingsToggleRow` with props `{ label: string; value: boolean; onValueChange?: (v: boolean) => void; disabled?: boolean; testID: string; accessibilityLabel: string }`.

- [ ] **Step 1: Write the failing test**

`src/components/settings/__tests__/SettingsToggleRow.test.tsx`:
```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SettingsToggleRow } from '../SettingsToggleRow';

it('renders label and forwards toggle changes', () => {
  const onValueChange = jest.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <SettingsToggleRow
        label="Enable Daily Reminder"
        value={true}
        onValueChange={onValueChange}
        testID="row-reminder"
        accessibilityLabel="Toggle reminder"
      />,
    );
  });
  const sw = r.root.findAll(n => n.props?.testID === 'row-reminder')[0];
  expect(sw.props.value).toBe(true);
  act(() => sw.props.onValueChange(false));
  expect(onValueChange).toHaveBeenCalledWith(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd auxi && yarn jest src/components/settings/__tests__/SettingsToggleRow.test.tsx`
Expected: FAIL — cannot find module `../SettingsToggleRow`.

- [ ] **Step 3: Create the component**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { SettingsSwitch } from './SettingsSwitch';

type SettingsToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  testID: string;
  accessibilityLabel: string;
};

// Label + on-system SettingsSwitch. The only justified bespoke Settings row —
// MListRow has no trailing-switch slot. Mirrors the row metrics/divider of
// MListRow so it sits flush in a grouped list.
export const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  label,
  value,
  onValueChange,
  disabled,
  testID,
  accessibilityLabel,
}) => (
  <View style={[styles.row, disabled && styles.disabled]}>
    <Text style={styles.label}>{label}</Text>
    <SettingsSwitch
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaListDivider,
  },
  label: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  disabled: { opacity: 0.5 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd auxi && yarn jest src/components/settings/__tests__/SettingsToggleRow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd auxi && git add src/components/settings/SettingsToggleRow.tsx src/components/settings/__tests__/SettingsToggleRow.test.tsx
git commit -m "feat(settings): add SettingsToggleRow (label + SettingsSwitch)"
```

---

### Task 4: `PersonalizationSettingsScreen` + route

Style Direction (dialog) · Language (dialog) · Manage Body Photo (push). Owns the two dialogs migrated out of the root screen.

**Files:**
- Create: `src/screens/settings/PersonalizationSettingsScreen.tsx`
- Create: `src/screens/settings/__tests__/PersonalizationSettingsScreen.test.tsx`
- Modify: `src/types/navigation.ts` (add the three routes)
- Modify: `src/navigation/AppNavigator.tsx` (register screen + import)
- Read for context: `src/screens/SettingsScreen.tsx:330-411,494-516,918-1013`

**Interfaces:**
- Consumes: `usePersistUserMetadata`, `buildDirectionOptions/LabelMap`, `LANGUAGE_OPTIONS`, `LANGUAGE_LABEL_MAP`, `resolveSettings`, `showSettingsError` from `settingsShared`; `MListRow`; `SettingsDialog`; `RadioOptionList`; `Header.BackTitle`.
- Produces: route `PersonalizationSettings: undefined` in `AppStackParamList`.

- [ ] **Step 1: Add the route types** — in `src/types/navigation.ts`, inside `AppStackParamList`, after `Settings: undefined;`:

```ts
  PersonalizationSettings: undefined;
  PrivacySettings: undefined;
  AboutSettings: undefined;
```
(Add all three now so Tasks 5–6 don't re-touch this file.)

- [ ] **Step 2: Write the failing test**

`src/screens/settings/__tests__/PersonalizationSettingsScreen.test.tsx`:
```tsx
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { PersonalizationSettingsScreen } from '../PersonalizationSettingsScreen';
import { useAuth } from '../../../context/AuthContext';
import type { User } from '../../../types/auth';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const makeUser = (metadata?: User['user_metadata']): User => ({
  id: 1, email: 'q@a.app', created_at: '2026-01-01T00:00:00Z',
  is_active: true, is_first_login: false, user_metadata: metadata ?? null,
});
const one = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id)[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: makeUser({ style_direction: 'more_relaxed' }),
    updateCurrentUser: jest.fn().mockResolvedValue(makeUser()),
    refreshUser: jest.fn().mockResolvedValue(makeUser()),
    checkAuth: jest.fn().mockResolvedValue(undefined),
  });
});

it('Manage Body Photo row navigates to Body photoDetail', async () => {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<PersonalizationSettingsScreen />); });
  act(() => one(r.root, 'personalization-manage-body-row').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('Body', { mode: 'photoDetail' });
});

it('Style Direction row shows current value (label key in tests)', async () => {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<PersonalizationSettingsScreen />); });
  const row = one(r.root, 'personalization-style-direction-row');
  expect(row.props.value).toBe('settings.direction_relaxed_label');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/PersonalizationSettingsScreen.test.tsx`
Expected: FAIL — cannot find module `../PersonalizationSettingsScreen`.

- [ ] **Step 4: Create the screen**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MListRow } from '../../components/design-system/lib';
import { Header } from '../../components/layout/Header';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { RadioOptionList } from '../../components/settings/RadioOptionList';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { setLanguage as setI18nLanguage } from '../../i18n/init';
import type { Language } from '../../translations';
import { UserStyleDirection } from '../../types/auth';
import {
  LANGUAGE_LABEL_MAP,
  LANGUAGE_OPTIONS,
  buildDirectionLabelMap,
  buildDirectionOptions,
  resolveSettings,
  showSettingsError,
  usePersistUserMetadata,
} from './settingsShared';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'PersonalizationSettings'
>;
type ActiveModal = 'none' | 'direction' | 'language';

export const PersonalizationSettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const persist = usePersistUserMetadata();

  const styleDirection = resolveSettings(user?.user_metadata).styleDirection;
  const currentLanguage = (i18n.language as Language) || 'en-EN';

  const [pendingDirection, setPendingDirection] =
    useState<UserStyleDirection>(styleDirection);
  const [pendingLanguage, setPendingLanguage] =
    useState<Language>(currentLanguage);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  useEffect(() => setPendingDirection(styleDirection), [styleDirection]);

  const directionOptions = useMemo(() => buildDirectionOptions(t), [t]);
  const directionLabelMap = useMemo(() => buildDirectionLabelMap(t), [t]);

  const applyDirection = async () => {
    if (isSavingDirection) return;
    setIsSavingDirection(true);
    try {
      await persist({ style_direction: pendingDirection }, t('settings.error_update_direction'));
      track('style_direction_changed', { direction: pendingDirection });
      setActiveModal('none');
    } catch {
      // persist already toasted + handled 401; keep dialog open for retry.
    } finally {
      setIsSavingDirection(false);
    }
  };

  const applyLanguage = async () => {
    if (isSavingLanguage) return;
    if (pendingLanguage === currentLanguage) { setActiveModal('none'); return; }
    setIsSavingLanguage(true);
    try {
      await setI18nLanguage(pendingLanguage);
      track('settings_language_changed', { locale: pendingLanguage });
      setActiveModal('none');
    } catch {
      showSettingsError(t('settings.toast_title'), t('settings.error_update_language'));
    } finally {
      setIsSavingLanguage(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.section_personalization')}
          background="transparent"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <MListRow
            testID="personalization-style-direction-row"
            label={t('settings.style_direction')}
            value={directionLabelMap[styleDirection]}
            chevron
            onPress={() => { setPendingDirection(styleDirection); setActiveModal('direction'); }}
          />
          <MListRow
            testID="personalization-language-row"
            label={t('settings.language')}
            value={LANGUAGE_LABEL_MAP[currentLanguage]}
            chevron
            accessibilityLabel={t('settings.a11y_change_language')}
            onPress={() => { setPendingLanguage(currentLanguage); setActiveModal('language'); }}
          />
          <MListRow
            testID="personalization-manage-body-row"
            label={t('settings.manage_body_photo')}
            chevron
            onPress={() => navigation.navigate('Body', { mode: 'photoDetail' })}
          />
        </View>
      </BottomSheetSurface>

      <SettingsDialog
        visible={activeModal === 'direction'}
        onClose={() => !isSavingDirection && setActiveModal('none')}
        isBusy={isSavingDirection}
        title={t('settings.dialog_direction_title')}
        body={t('settings.dialog_direction_body')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyDirection}
        cancelTestID="personalization-direction-cancel"
        primaryTestID="personalization-direction-update"
      >
        <RadioOptionList
          options={directionOptions}
          selected={pendingDirection}
          onSelect={setPendingDirection}
          testIDPrefix="personalization-direction-option"
        />
      </SettingsDialog>

      <SettingsDialog
        visible={activeModal === 'language'}
        onClose={() => !isSavingLanguage && setActiveModal('none')}
        isBusy={isSavingLanguage}
        title={t('settings.dialog_language_title')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyLanguage}
        cancelTestID="personalization-language-cancel"
        primaryTestID="personalization-language-update"
      >
        <RadioOptionList
          options={LANGUAGE_OPTIONS}
          selected={pendingLanguage}
          onSelect={setPendingLanguage}
          testIDPrefix="personalization-language-option"
        />
      </SettingsDialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
});
```

- [ ] **Step 5: Run the screen test**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/PersonalizationSettingsScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Register the screen in `AppNavigator.tsx`**

Add import near the other screen imports:
```tsx
import { PersonalizationSettingsScreen } from '../screens/settings/PersonalizationSettingsScreen';
```
Add inside the authed stack, after `<Stack.Screen name="Settings" component={SettingsScreen} />`:
```tsx
<Stack.Screen
  name="PersonalizationSettings"
  component={PersonalizationSettingsScreen}
/>
```

- [ ] **Step 7: Type-check**

Run: `cd auxi && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd auxi && git add src/screens/settings/PersonalizationSettingsScreen.tsx \
  src/screens/settings/__tests__/PersonalizationSettingsScreen.test.tsx \
  src/types/navigation.ts src/navigation/AppNavigator.tsx
git commit -m "feat(settings): Personalization sub-screen + routes"
```

---

### Task 5: `PrivacySettingsScreen` + route

Two consent toggles + the consent-load effect, migrated out of the root.

**Files:**
- Create: `src/screens/settings/PrivacySettingsScreen.tsx`
- Create: `src/screens/settings/__tests__/PrivacySettingsScreen.test.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (register + import)
- Read for context: `src/screens/SettingsScreen.tsx:245-282,452-492,766-799`

**Interfaces:**
- Consumes: consent services (`hasAnalyticsConsent`/`grantAnalyticsConsent`/`revokeAnalyticsConsent`/`track` from `services/analytics`; `hasAiDataSharingConsent`/`grantAiDataSharingConsent`/`revokeAiDataSharingConsent` from `services/aiConsent`), `SettingsToggleRow`, `Header.BackTitle`, `showSettingsError`.
- Produces: route `PrivacySettings: undefined` (already added in Task 4 Step 1).

- [ ] **Step 1: Write the failing test**

`src/screens/settings/__tests__/PrivacySettingsScreen.test.tsx`:
```tsx
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { PrivacySettingsScreen } from '../PrivacySettingsScreen';
import {
  grantAnalyticsConsent,
  hasAnalyticsConsent,
  revokeAnalyticsConsent,
} from '../../../services/analytics';
import { hasAiDataSharingConsent } from '../../../services/aiConsent';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock('../../../services/analytics', () => ({
  hasAnalyticsConsent: jest.fn().mockResolvedValue(false),
  grantAnalyticsConsent: jest.fn().mockResolvedValue(undefined),
  revokeAnalyticsConsent: jest.fn().mockResolvedValue(undefined),
  track: jest.fn(),
}));
jest.mock('../../../services/aiConsent', () => ({
  hasAiDataSharingConsent: jest.fn().mockResolvedValue(false),
  grantAiDataSharingConsent: jest.fn().mockResolvedValue(undefined),
  revokeAiDataSharingConsent: jest.fn().mockResolvedValue(undefined),
}));

const one = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id)[0];
const flush = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

it('reflects persisted analytics consent + revokes on toggle off', async () => {
  (hasAnalyticsConsent as jest.Mock).mockResolvedValue(true);
  (hasAiDataSharingConsent as jest.Mock).mockResolvedValue(false);
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<PrivacySettingsScreen />); });
  await flush();
  expect(one(r.root, 'settings-analytics-consent-toggle').props.value).toBe(true);

  act(() => one(r.root, 'settings-analytics-consent-toggle').props.onValueChange(false));
  await flush();
  expect(revokeAnalyticsConsent).toHaveBeenCalled();
  expect(grantAnalyticsConsent).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/PrivacySettingsScreen.test.tsx`
Expected: FAIL — cannot find module `../PrivacySettingsScreen`.

- [ ] **Step 3: Create the screen**

```tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/layout/Header';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { SettingsToggleRow } from '../../components/settings/SettingsToggleRow';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
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
import { showSettingsError } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'PrivacySettings'>;

export const PrivacySettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [aiDataSharingConsent, setAiDataSharingConsent] = useState(false);

  useEffect(() => {
    let mounted = true;
    hasAnalyticsConsent().then(g => mounted && setAnalyticsConsent(g));
    hasAiDataSharingConsent().then(g => mounted && setAiDataSharingConsent(g));
    return () => { mounted = false; };
  }, []);

  // Optimistic flip + rollback. Order matters: revoke fires the OFF event before
  // teardown; grant fires the ON event after the SDK is live (analytics.ts).
  const onAnalyticsToggle = (enabled: boolean) => {
    const prev = analyticsConsent;
    setAnalyticsConsent(enabled);
    if (!enabled) track('analytics_consent_changed', { granted: false });
    (enabled ? grantAnalyticsConsent : revokeAnalyticsConsent)()
      .then(() => { if (enabled) track('analytics_consent_changed', { granted: true }); })
      .catch(() => {
        setAnalyticsConsent(prev);
        showSettingsError(t('settings.toast_title'), t('settings.error_update_analytics'));
      });
  };

  const onAiToggle = (enabled: boolean) => {
    const prev = aiDataSharingConsent;
    setAiDataSharingConsent(enabled);
    (enabled ? grantAiDataSharingConsent : revokeAiDataSharingConsent)().catch(() => {
      setAiDataSharingConsent(prev);
      showSettingsError(t('settings.toast_title'), t('settings.error_update_ai_sharing'));
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.section_privacy_title')}
          background="transparent"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <SettingsToggleRow
            testID="settings-analytics-consent-toggle"
            accessibilityLabel={t('settings.a11y_toggle_analytics')}
            label={t('settings.share_analytics')}
            value={analyticsConsent}
            onValueChange={onAnalyticsToggle}
          />
          <SettingsToggleRow
            testID="settings-ai-data-sharing-toggle"
            accessibilityLabel={t('settings.a11y_toggle_ai_data')}
            label={t('settings.share_ai_data')}
            value={aiDataSharingConsent}
            onValueChange={onAiToggle}
          />
        </View>
      </BottomSheetSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
});
```

- [ ] **Step 4: Run the screen test**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/PrivacySettingsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Register in `AppNavigator.tsx`**

Import:
```tsx
import { PrivacySettingsScreen } from '../screens/settings/PrivacySettingsScreen';
```
Register (after PersonalizationSettings):
```tsx
<Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
```

- [ ] **Step 6: Type-check + commit**

```bash
cd auxi && npx tsc --noEmit && git add src/screens/settings/PrivacySettingsScreen.tsx \
  src/screens/settings/__tests__/PrivacySettingsScreen.test.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(settings): Privacy sub-screen + route"
```

---

### Task 6: `AboutSettingsScreen` + route

Version (read-only; `__DEV__` → DesignSystem) · Terms · Privacy Policy.

**Files:**
- Create: `src/screens/settings/AboutSettingsScreen.tsx`
- Create: `src/screens/settings/__tests__/AboutSettingsScreen.test.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (register + import)
- Read for context: `src/screens/SettingsScreen.tsx:388-390,803-838,877-898`

**Interfaces:**
- Consumes: `MListRow`, `Header.BackTitle`, `APP_VERSION` from `settingsShared`, navigation to `LegalDocument` + `DesignSystem`, `LegalDocumentType` from `content/legal`.
- Produces: route `AboutSettings: undefined` (already added in Task 4 Step 1).

- [ ] **Step 1: Write the failing test**

`src/screens/settings/__tests__/AboutSettingsScreen.test.tsx`:
```tsx
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { AboutSettingsScreen } from '../AboutSettingsScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const one = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id)[0];

beforeEach(() => jest.clearAllMocks());

it('Terms row opens the Terms legal doc from settings', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(<AboutSettingsScreen />); });
  act(() => one(r.root, 'settings-terms-of-service-row').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', {
    documentType: 'terms', source: 'settings',
  });
});

it('Privacy Policy row opens the Privacy legal doc from settings', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(<AboutSettingsScreen />); });
  act(() => one(r.root, 'settings-privacy-policy-row').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', {
    documentType: 'privacy', source: 'settings',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/AboutSettingsScreen.test.tsx`
Expected: FAIL — cannot find module `../AboutSettingsScreen`.

- [ ] **Step 3: Create the screen**

```tsx
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MListRow } from '../../components/design-system/lib';
import { Header } from '../../components/layout/Header';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { AppStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import type { LegalDocumentType } from '../../content/legal';
import { APP_VERSION } from './settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'AboutSettings'>;

export const AboutSettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();

  const openLegal = (documentType: LegalDocumentType) =>
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.section_about')}
          background="transparent"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <MListRow
            testID="about-version-row"
            label={t('settings.version', { version: APP_VERSION })}
            // __DEV__ only: doubles as the hidden Design System reference entry.
            onPress={__DEV__ ? () => navigation.navigate('DesignSystem') : undefined}
          />
          <MListRow
            testID="settings-terms-of-service-row"
            label={t('settings.terms_of_service')}
            chevron
            onPress={() => openLegal('terms')}
          />
          <MListRow
            testID="settings-privacy-policy-row"
            label={t('settings.privacy_policy')}
            chevron
            onPress={() => openLegal('privacy')}
          />
        </View>
      </BottomSheetSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
});
```

- [ ] **Step 4: Run the screen test**

Run: `cd auxi && yarn jest src/screens/settings/__tests__/AboutSettingsScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Register in `AppNavigator.tsx` + commit**

Import + `<Stack.Screen name="AboutSettings" component={AboutSettingsScreen} />`, then:
```bash
cd auxi && npx tsc --noEmit && git add src/screens/settings/AboutSettingsScreen.tsx \
  src/screens/settings/__tests__/AboutSettingsScreen.test.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(settings): About sub-screen + route"
```

---

### Task 7: Rewrite the root `SettingsScreen`

Reminder block (toggle row · read-only time · frequency picker · reset) + 3 nav rows (with `settings_section_opened` tracking) + Delete. Removes all migrated code, Dark Mode, and the AM/PM editor.

**Files:**
- Modify (full rewrite): `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/__tests__/SettingsScreen.test.tsx` (drop migrated-away cases; add nav-row cases; replace the AM/PM change-time tests with the frequency-picker test)
- Read for context: current `src/screens/SettingsScreen.tsx`

**Interfaces:**
- Consumes everything from `settings/settingsShared`; navigates to `PersonalizationSettings` / `PrivacySettings` / `AboutSettings`.
- Produces: still exports `SettingsScreen`. `resolveSettings` is no longer exported from here (now from `settingsShared`) — update the old test import.

- [ ] **Step 1: Update the test first** — edit `src/screens/__tests__/SettingsScreen.test.tsx`:
  - (a) change the `resolveSettings` import to `import { resolveSettings } from '../settings/settingsShared';` (or remove the `resolveSettings` describe block here entirely, since `settingsShared.test.ts` now covers it — keep one home for it).
  - (b) replace the global `@react-navigation/native` reliance with a module-scoped `mockNavigate` (mirror `HomeScreen.test`):

```tsx
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  };
});
```

  - (c) DELETE the `applyChangeTime` describe block (AM/PM editor removed). Replace with the frequency-picker test:

```tsx
describe('repeat schedule picker', () => {
  it('updating frequency persists only { frequency } and closes', async () => {
    const updateCurrentUser = jest.fn().mockResolvedValue(
      makeUser({ daily_notification: { frequency: 'everydays' } }),
    );
    mockedUseAuth.mockReturnValue(buildAuth({ updateCurrentUser }));
    const r = await renderScreen();
    press(oneByTestID(r.root, 'settings-repeat-schedule-row'));
    press(oneByTestID(r.root, 'settings-freq-everydays'));
    press(oneByTestID(r.root, 'settings-freq-update'));
    await flushPromises();
    expect(updateCurrentUser).toHaveBeenCalledWith({
      user_metadata: { daily_notification: { frequency: 'everydays' } },
    });
  });
});
```

  - (d) ADD the nav-row block:

```tsx
describe('section nav rows', () => {
  it('Personalization row navigates', async () => {
    mockedUseAuth.mockReturnValue(buildAuth());
    const r = await renderScreen();
    press(oneByTestID(r.root, 'settings-personalization-row'));
    expect(mockNavigate).toHaveBeenCalledWith('PersonalizationSettings');
  });
  it('Privacy row navigates', async () => {
    mockedUseAuth.mockReturnValue(buildAuth());
    const r = await renderScreen();
    press(oneByTestID(r.root, 'settings-privacy-row'));
    expect(mockNavigate).toHaveBeenCalledWith('PrivacySettings');
  });
  it('About row navigates', async () => {
    mockedUseAuth.mockReturnValue(buildAuth());
    const r = await renderScreen();
    press(oneByTestID(r.root, 'settings-about-row'));
    expect(mockNavigate).toHaveBeenCalledWith('AboutSettings');
  });
});
```

  - (e) In `handleResetNotifications` tests: the reset/undo patches still target the full `daily_notification` block, so those tests stay valid. The `handleResetPreferences` tests stay valid (delete dialog testIDs unchanged: `settings-delete-data-row`, `settings-delete-confirm`). The `handleReminderToggle` tests stay valid (`settings-daily-toggle` unchanged).

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd auxi && yarn jest src/screens/__tests__/SettingsScreen.test.tsx`
Expected: FAIL — new testIDs (`settings-repeat-schedule-row`, `settings-freq-*`, `settings-personalization-row`, …) not present yet.

- [ ] **Step 3: Rewrite `SettingsScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { toast, MListRow } from '../components/design-system/lib';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BottomSheetSurface } from '../components/primitives/FigmaPrimitives';
import { Header } from '../components/layout/Header';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { RadioOptionList } from '../components/settings/RadioOptionList';
import { SettingsToggleRow } from '../components/settings/SettingsToggleRow';
import { DailyNotificationFrequency, User } from '../types/auth';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import { track } from '../services/analytics';
import {
  DEFAULT_SETTINGS,
  ResolvedSettingsState,
  buildFrequencyLabelMap,
  buildFrequencyOptions,
  resolveSettings,
  getErrorMessage,
  getErrorStatus,
  showSettingsError,
  usePersistUserMetadata,
} from './settings/settingsShared';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;
type ActiveModal = 'none' | 'frequency' | 'deleteConfirm';

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { checkAuth, refreshUser, resetUserPreferences, user } = useAuth();
  const { open: openSidebar } = useSidebar();
  const persist = usePersistUserMetadata();

  const [settings, setSettings] =
    useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [pendingFrequency, setPendingFrequency] =
    useState<DailyNotificationFrequency>(DEFAULT_SETTINGS.dailyNotification.frequency);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingFrequency, setIsSavingFrequency] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  const [isResettingNotifications, setIsResettingNotifications] = useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFromUser = useCallback((nextUser: User | null) => {
    const next = resolveSettings(nextUser?.user_metadata);
    setSettings(next);
    setPendingFrequency(next.dailyNotification.frequency);
  }, []);

  useEffect(() => syncFromUser(user), [syncFromUser, user]);

  useEffect(() => {
    let mounted = true;
    refreshUser()
      .then(u => { if (mounted) syncFromUser(u); })
      .catch(async error => {
        showSettingsError(t('settings.toast_title'), getErrorMessage(error, t('settings.error_load')));
        if (getErrorStatus(error) === 401) await checkAuth();
      });
    return () => {
      mounted = false;
      if (reminderSaveTimeoutRef.current) clearTimeout(reminderSaveTimeoutRef.current);
    };
  }, [checkAuth, refreshUser, syncFromUser, t]);

  const frequencyOptions = useMemo(() => buildFrequencyOptions(t), [t]);
  const frequencyLabelMap = useMemo(() => buildFrequencyLabelMap(t), [t]);
  const currentFrequencyLabel = frequencyLabelMap[settings.dailyNotification.frequency];

  // Debounced optimistic toggle persist with rollback (unchanged behavior).
  const handleReminderToggle = (enabled: boolean) => {
    const prev = settings.dailyNotification.enabled;
    track('notifications_toggle_changed', { enabled });
    setSettings(c => ({ ...c, dailyNotification: { ...c.dailyNotification, enabled } }));
    if (reminderSaveTimeoutRef.current) clearTimeout(reminderSaveTimeoutRef.current);
    reminderSaveTimeoutRef.current = setTimeout(() => {
      persist({ daily_notification: { enabled } }, t('settings.error_update_time'))
        .then(syncFromUser)
        .catch(() =>
          setSettings(c => ({ ...c, dailyNotification: { ...c.dailyNotification, enabled: prev } })),
        );
    }, 500);
  };

  const applyFrequency = async () => {
    if (isSavingFrequency) return;
    setIsSavingFrequency(true);
    try {
      const updated = await persist(
        { daily_notification: { frequency: pendingFrequency } },
        t('settings.error_update_time'),
      );
      syncFromUser(updated);
      track('notifications_schedule_changed', { frequency: pendingFrequency });
      setActiveModal('none');
    } catch {
      // persist toasted + handled 401; keep dialog open for retry.
    } finally {
      setIsSavingFrequency(false);
    }
  };

  const undoNotificationReset = (prev: ResolvedSettingsState['dailyNotification']) => {
    setSettings(c => ({ ...c, dailyNotification: { ...prev } }));
    toast.show({ type: 'info', text1: t('settings.notification_reset_undone_title'), position: 'bottom', visibilityTime: 2500 });
    track('notifications_reset_undone', { frequency: prev.frequency });
    persist({ daily_notification: { ...prev } }, t('settings.error_update_notification_reset'))
      .then(syncFromUser)
      .catch(() => {});
  };

  const handleResetNotifications = () => {
    if (isResettingNotifications) return;
    const prev = settings.dailyNotification;
    const defaults = DEFAULT_SETTINGS.dailyNotification;
    setIsResettingNotifications(true);
    setSettings(c => ({ ...c, dailyNotification: { ...defaults } }));
    persist({ daily_notification: { ...defaults } }, t('settings.error_update_notification_reset'))
      .then(updated => {
        syncFromUser(updated);
        track('notifications_reset', { frequency: defaults.frequency });
        toast.show({
          type: 'info',
          text1: t('settings.notification_reset_toast_title'),
          text2: t('settings.notification_reset_toast_body'),
          position: 'bottom',
          visibilityTime: 5000,
          onPress: () => undoNotificationReset(prev),
        });
      })
      .catch(() => setSettings(c => ({ ...c, dailyNotification: { ...prev } })))
      .finally(() => setIsResettingNotifications(false));
  };

  const handleResetPreferences = async () => {
    if (isResettingPreferences) return;
    setIsResettingPreferences(true);
    try {
      const updated = await resetUserPreferences();
      if (!updated.is_first_login) { syncFromUser(updated); setActiveModal('none'); }
    } catch (error) {
      showSettingsError(t('settings.toast_title'), getErrorMessage(error, t('settings.error_reset')));
      if (getErrorStatus(error) === 401) await checkAuth();
    } finally {
      setIsResettingPreferences(false);
    }
  };

  const openSection = (
    section: 'personalization' | 'privacy' | 'about',
    route: 'PersonalizationSettings' | 'PrivacySettings' | 'AboutSettings',
  ) => {
    track('settings_section_opened', { section });
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.MenuTitle
          title={t('settings.title')}
          background="transparent"
          leftTestID="settings-menu-button"
          onBack={openSidebar}
        />
        <View style={styles.content}>
          {/* Daily Reminder */}
          <SettingsToggleRow
            testID="settings-daily-toggle"
            accessibilityLabel={t('settings.a11y_toggle_reminder')}
            label={t('settings.enable_daily_reminder')}
            value={settings.dailyNotification.enabled}
            onValueChange={handleReminderToggle}
          />
          <MListRow
            testID="settings-reminder-time-row"
            label={t('settings.reminder_time')}
            value={`${settings.dailyNotification.time} ${settings.dailyNotification.period}`}
          />
          <MListRow
            testID="settings-repeat-schedule-row"
            label={t('settings.repeat_schedule')}
            value={currentFrequencyLabel}
            chevron
            onPress={() => {
              setPendingFrequency(settings.dailyNotification.frequency);
              setActiveModal('frequency');
            }}
          />
          <MListRow
            testID="settings-notification-reset"
            label={t('settings.reset_to_default')}
            accessibilityLabel={t('settings.a11y_notification_reset')}
            onPress={isResettingNotifications ? undefined : handleResetNotifications}
          />

          <View style={styles.sectionGap} />

          {/* Groups */}
          <MListRow
            testID="settings-personalization-row"
            label={t('settings.section_personalization')}
            accessibilityLabel={t('settings.a11y_open_personalization')}
            chevron
            onPress={() => openSection('personalization', 'PersonalizationSettings')}
          />
          <MListRow
            testID="settings-privacy-row"
            label={t('settings.section_privacy')}
            accessibilityLabel={t('settings.a11y_open_privacy')}
            chevron
            onPress={() => openSection('privacy', 'PrivacySettings')}
          />
          <MListRow
            testID="settings-about-row"
            label={t('settings.section_about')}
            accessibilityLabel={t('settings.a11y_open_about')}
            chevron
            onPress={() => openSection('about', 'AboutSettings')}
          />

          <View style={styles.sectionGap} />

          {/* Destructive */}
          <MListRow
            testID="settings-delete-data-row"
            label={t('settings.delete_my_data')}
            danger
            onPress={() => setActiveModal('deleteConfirm')}
          />
        </View>
      </BottomSheetSurface>

      {/* Repeat-schedule frequency picker (split out from the old change-time
          dialog; AM/PM editor removed per spec §3). */}
      <SettingsDialog
        visible={activeModal === 'frequency'}
        onClose={() => !isSavingFrequency && setActiveModal('none')}
        isBusy={isSavingFrequency}
        title={t('settings.repeat_schedule')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={applyFrequency}
        cancelTestID="settings-freq-cancel"
        primaryTestID="settings-freq-update"
      >
        <RadioOptionList
          options={frequencyOptions}
          selected={pendingFrequency}
          onSelect={setPendingFrequency}
          testIDPrefix="settings-freq"
        />
      </SettingsDialog>

      {/* Delete-data confirm */}
      <SettingsDialog
        visible={activeModal === 'deleteConfirm'}
        onClose={() => !isResettingPreferences && setActiveModal('none')}
        isBusy={isResettingPreferences}
        title={t('settings.dialog_delete_title')}
        body={t('settings.dialog_delete_body')}
        primaryLabel="Delete"
        primaryVariant="danger"
        onPrimary={handleResetPreferences}
        cancelTestID="settings-delete-cancel"
        primaryTestID="settings-delete-confirm"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.figmaSurface },
  sheet: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 27, paddingBottom: 24 },
  sectionGap: { height: 24 },
});
```

> `RadioOptionList` `testIDPrefix="settings-freq"` produces `settings-freq-weekdays` / `settings-freq-everydays` (the option `key` suffix), matching Step 1's test.

- [ ] **Step 4: Run the root test**

Run: `cd auxi && yarn jest src/screens/__tests__/SettingsScreen.test.tsx`
Expected: PASS (reminder toggle, frequency picker, reset notifications, delete preferences, 3 nav rows).

- [ ] **Step 5: Full type-check + lint + DS-primitive lint**

Run:
```bash
cd auxi && npx tsc --noEmit && yarn lint && ./scripts/auxi-lint-ds-primitives.sh
```
Expected: clean. (The root screen no longer hand-rolls rows.)

- [ ] **Step 6: Commit**

```bash
cd auxi && git add src/screens/SettingsScreen.tsx src/screens/__tests__/SettingsScreen.test.tsx
git commit -m "feat(settings): root page → reminder block + group nav rows + delete"
```

---

### Task 8: Analytics doc + cleanup + full verification

**Files:**
- Modify: `docs/analytics/mixpanel-tracking-plan.md`
- Modify: `src/translations/*` + `src/translations/types.ts` (retire dead keys)

- [ ] **Step 1: Update the tracking plan**
  - §5: add `settings_section_opened` — `{ section: 'personalization' | 'privacy' | 'about' }`, fired from `SettingsScreen.tsx` group-row `onPress`.
  - §5/§6 note: record that `notifications_schedule_changed` / `notifications_reset` / `notifications_reset_undone` **dropped the `period` property** (AM/PM editor removed); they now carry `{ frequency }` only.

- [ ] **Step 2: Remove now-dead i18n keys** — delete `dark_mode` and `a11y_toggle_dark` from `en-EN.json`, `vi-VN.json`, `fr-FR.json`, and `types.ts` (Dark Mode dropped). Check `daily_time` / `a11y_change_time` / `dialog_time_title`: keep only if still referenced after Task 7; otherwise remove.

Run: `cd auxi && grep -rn "dark_mode\|a11y_toggle_dark\|settings.daily_time\|a11y_change_time\|dialog_time_title" src/`
Expected: no references remain in `src/` for keys you remove; resolve each per its grep result.

- [ ] **Step 3: Full verification gate**

Run:
```bash
cd auxi && npx tsc --noEmit && yarn lint && yarn jest src/screens src/components/settings \
  && ../scripts/auxi-lint-tokens.sh && ./scripts/auxi-lint-ds-primitives.sh
```
Expected: all clean / green.

- [ ] **Step 4: Manual sim smoke (hand to qa-mobile / designer gate)**
  - Open Settings → reminder toggle, time read-only, Repeat Schedule picker (Weekdays/Everyday), Reset undo snackbar.
  - Personalization → Style Direction dialog, Language dialog, Manage Body Photo push.
  - Privacy → both consent toggles persist + survive reopen.
  - About → Version (dev: opens DesignSystem), Terms + Privacy Policy open in-app.
  - Delete My Data → confirm dialog → reset.
  - Back chevron returns from each sub-screen.

- [ ] **Step 5: Commit**

```bash
cd auxi && git add docs/analytics/mixpanel-tracking-plan.md src/translations/
git commit -m "docs(analytics): settings_section_opened + reminder event prop change; retire dark-mode keys"
```

---

## Self-Review

**Spec coverage (spec §-by-§):**
- §4 IA → root screen (Task 7) + 3 sub-screens (Tasks 4–6). ✓
- §5 components: `settingsShared` (T1), `SettingsToggleRow` (T3), `MListRow` rows (T4–7). ✓
- §6 navigation: routes + registration (T4–6). ✓
- §7 analytics (`settings_section_opened`, event prop change) (T7+T8); i18n (T2, retire keys T8); testing (each task); design gates (T8 step 4). ✓
- §3 non-goals: AM/PM dropped (T7 frequency-only dialog), Dark Mode dropped (T8), time read-only (T7 value row), keep `SettingsSwitch` (T3). ✓

**Placeholder scan:** No `TBD`/`TODO`/"handle edge cases"; every code step shows full code; every test step shows assertions. ✓

**Type consistency:** `usePersistUserMetadata` returns `Promise<User>`; callers `syncFromUser(updated)` (T7) or ignore the user (T4 direction/language). `resolveSettings` imported from `settingsShared` everywhere (old root re-export removed; old test import updated T7 step 1). Route names `PersonalizationSettings` / `PrivacySettings` / `AboutSettings` consistent across `navigation.ts` (T4), `AppNavigator` (T4–6), and `openSection` (T7). `RadioOptionList` `testIDPrefix` → `${prefix}-${key}` consistent with tests (`settings-freq-everydays`, etc.). ✓

**Open risk flagged:** Frequency-picker `notifications_schedule_changed` payload changed from `{period,frequency}` to `{frequency}` — Mixpanel dashboards reading `period` must be updated (T8 §1 note).
