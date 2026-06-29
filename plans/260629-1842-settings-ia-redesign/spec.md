# Settings IA Redesign — Design Spec

> **Date:** 2026-06-29
> **Surface:** `auxi` (React Native mobile app) — Settings
> **Scope:** Information-architecture reorganization only. No new reminder
> functionality (time stays read-only, Weekdays/Everyday only, no "Custom").
> **Status:** Approved (brainstorming) → ready for implementation plan.
> **Builds on:** `plans/260526-0019-settings-redesign/` — the Figma-frame visual
> redesign (tokens/fonts/colors) that produced today's *flat* screen. This spec
> reorganizes that shipped result into a grouped, drill-down IA; it does NOT
> revisit the visual tokens settled there.

## 1. Problem

The Settings screen (`src/screens/SettingsScreen.tsx`) is a single flat,
1134-line scroll: the daily-reminder block, Style Direction, Language, a
"Privacy control" heading, two consent toggles, Terms/Privacy legal links,
Manage Body Photo, Delete data, Version, and a disabled Dark Mode stub — all
stacked with hand-rolled `TouchableOpacity` rows and manual `<Divider>`s.

Problems:
- **No grouping.** Unrelated settings (reminders, privacy consent, legal, body
  photo) sit at the same level. Doesn't scale — every new setting lengthens one
  page.
- **Off-system rows.** Hand-rolled `TouchableOpacity` rows violate the
  `design-system-primitives-required` rule (an `MListRow` primitive exists).
- **One giant file.** 1134 lines, one `useState` blob — far over the 200-line
  guideline; hard to test slices in isolation.

## 2. Goals

- Keep the main Settings page short and scannable.
- Group related settings into logical sections.
- Follow iOS Human Interface Guidelines (grouped sections, drill-down
  disclosure for nested config, destructive action isolated).
- Design for future scalability — adding a setting touches one small screen.

## 3. Non-goals (explicit scope cuts)

- **No new reminder behavior.** Reminder Time stays a **read-only** display
  (locked 06:15 AM, per prior CEO Q12). Repeat Schedule stays Weekdays/Everyday
  — **no "Custom" day picker** (deferred to a separate ticket).
- **Drop the AM/PM (period) toggle.** Today's combined change-time dialog edits
  AM/PM + frequency. Making Reminder Time read-only removes the AM/PM control.
  This is an approved consequence (time is locked at 06:15 AM; the control was
  low-value). Decision: **drop AM/PM editing.**
- **Drop the Dark Mode stub** entirely (non-functional; reintroduce under a
  future "Appearance" group when theming infra lands).
- **Keep `SettingsSwitch`** (do not migrate toggles to `MSwitch` in this pass —
  byte-identical on-system look; a swap is out of IA scope).
- No backend changes. `user_metadata` shape is unchanged.

## 4. Information architecture

```
Settings  (top-level route · Header.MenuTitle: ☰ "Settings")
│
├─ DAILY REMINDER            ← inline, stays on the main page
│   1. Enable Daily Reminder ........... [toggle]
│   2. Reminder Time ................... 6:15 AM   (read-only value, no chevron)
│   3. Repeat Schedule ........ Weekdays ›  → frequency picker (Weekdays/Everyday)
│   4. Reset to Default ............... (action, undo snackbar)
│
├─ GROUPS                    ← drill-down nav rows
│   5. Personalization ............... ›  → push PersonalizationSettings
│   6. Privacy ....................... ›  → push PrivacySettings
│   7. About ......................... ›  → push AboutSettings
│
└─ 8. Delete My Data ......... [trash]  (danger, isolated at the bottom)

PersonalizationSettings  (Header.BackTitle: ‹ "Personalization")
   5.1 Style Direction .... Stay Balanced ›  → Style Direction dialog (in-screen)
   5.2 Language ................ English ›  → Language dialog (in-screen)
   5.3 Manage Body Photo ............... ›  → push Body { mode: 'photoDetail' }

PrivacySettings  (Header.BackTitle: ‹ "Privacy Control")
   6.1 "Privacy Control" = the screen title (NOT a row)
   6.2 Share Usage Analytics .......... [toggle]   (grant/revoke consent)
   6.3 AI Data Sharing ................ [toggle]   (grant/revoke consent)

AboutSettings  (Header.BackTitle: ‹ "About")
   7.1 Version ...................... 0.0.1   (read-only; __DEV__ → DesignSystem)
   7.2 Terms of Service ............... ›  → push LegalDocument { documentType: 'terms', source: 'settings' }
   7.3 Privacy Policy ................. ›  → push LegalDocument { documentType: 'privacy', source: 'settings' }
```

iOS HIG alignment: grouped sections; chevron drill-down for nested config;
value-on-the-right rows; the single destructive action (Delete My Data)
isolated at the bottom of the root page.

## 5. Component architecture

Approach: **dedicated sub-screens built from shared DS primitives** (chosen
over a flat single page and over a generic config-engine — KISS + DRY without
premature abstraction).

| File | Role |
|---|---|
| `src/screens/SettingsScreen.tsx` | Main page: reminder block + 3 nav rows + Delete. Shrinks 1134 → ~250 lines. |
| `src/screens/settings/PersonalizationSettingsScreen.tsx` | Style Direction + Language (owns those dialogs) + Manage Body Photo |
| `src/screens/settings/PrivacySettingsScreen.tsx` | Analytics + AI consent toggles (owns the consent-load effect) |
| `src/screens/settings/AboutSettingsScreen.tsx` | Version (+ `__DEV__` DesignSystem entry) + Terms + Privacy Policy |
| `src/screens/settings/settingsShared.ts` | Extracted pure helpers shared across screens: `resolveSettings`, `DEFAULT_SETTINGS`, `buildDirectionOptions`/label maps, `buildFrequencyOptions`/label maps, `getErrorStatus`/`getErrorMessage`/`showSettingsError`, and the `persistUserMetadata` factory |
| `src/components/settings/SettingsToggleRow.tsx` | New thin presentational row: label + `SettingsSwitch` (no `MListRow` toggle variant exists) |

### Row strategy

- **All nav / value / danger rows → `MListRow`** (`src/components/design-system/lib`).
  Props: `label`, `value?`, `chevron?`, `danger?`, `onPress?`, `testID`,
  `accessibilityLabel`. It owns its own bottom divider and renders the danger
  trash glyph — so this replaces ~9 hand-rolled `TouchableOpacity` rows AND the
  manual `<Divider>`s. This is the `design-system-primitives-required` cleanup.
- **Toggle rows** (Enable Daily Reminder, Usage Analytics, AI Data Sharing) →
  `SettingsToggleRow` (label + existing `SettingsSwitch`), since `MListRow` has
  no trailing-switch slot. This is the only justified bespoke row.
- **Dialogs reused unchanged** (`SettingsDialog` + `RadioOptionList`): the
  Style Direction, Language, and Delete-confirm dialogs move verbatim to the
  screen that owns their row. The old combined **change-time dialog splits**
  into a single Repeat-Schedule frequency picker (Weekdays/Everyday); its AM/PM
  half is removed (§3).

### State / data flow

- **No shared store** (auxi "no Zustand" rule). Each screen reads `useAuth()`
  independently and persists via the shared `persistUserMetadata` helper from
  `settingsShared.ts`. The current single `useState` blob is split so each
  screen owns only its slice → small, independently testable screens.
- `resolveSettings` + `DEFAULT_SETTINGS` move to `settingsShared.ts` (unit test
  moves with them).

## 6. Navigation

- New routes in `src/types/navigation.ts` → `AppStackParamList`:
  ```ts
  PersonalizationSettings: undefined;
  PrivacySettings: undefined;
  AboutSettings: undefined;
  ```
- Register all three in `src/navigation/AppNavigator.tsx` (`<Stack.Screen … />`),
  alongside `Settings`. Each sub-screen renders its own `Header.BackTitle`
  (back chevron + title) wired to `navigation.goBack()` — matching the existing
  per-screen header pattern.
- Existing destinations unchanged: `Body { mode: 'photoDetail' }`,
  `LegalDocument { documentType, source: 'settings' }`, `DesignSystem`.

## 7. Cross-cutting concerns

### Analytics (`analytics-tracking-required` rule)
- All existing events preserved, moved with their handlers:
  `notifications_toggle_changed`, `notifications_schedule_changed`,
  `notifications_reset`, `notifications_reset_undone`, `style_direction_changed`,
  `settings_language_changed`, `analytics_consent_changed`,
  `ai_consent_granted` / `ai_consent_revoked`.
- **New event** for the drill-down taps: `settings_section_opened` (literal
  name) with property `{ section: 'personalization' | 'privacy' | 'about' }`.
  No dynamic/template event names.
- Update `auxi/docs/analytics/mixpanel-tracking-plan.md` §5 (new event) — and
  note in §6 that the AM/PM `notifications_schedule_changed.period` dimension is
  now always the persisted default (period control removed).

### i18n
- New keys (added to `en-EN`, `vi-VN`, `fr-FR` + `src/translations/types.ts`):
  - `settings.section_personalization` = "Personalization"
  - `settings.section_privacy` = "Privacy" (root nav row)
  - `settings.section_privacy_title` = "Privacy Control" (sub-screen title, 6.1)
  - `settings.section_about` = "About"
  - `settings.enable_daily_reminder` = "Enable Daily Reminder"
  - `settings.reminder_time` = "Reminder Time"
  - `settings.repeat_schedule` = "Repeat Schedule"
  - `settings.reset_to_default` = "Reset to Default" (reuse/rename of `notification_reset`)
  - `settings.delete_my_data` = "Delete My Data" (reuse/rename of `delete_data`)
- Reuse existing keys everywhere else (`style_direction`, `language`,
  `manage_body_photo`, `share_analytics`, `share_ai_data`, `terms_of_service`,
  `privacy_policy`, `version`, the dialog keys, error keys).
- Retire `dark_mode` / `a11y_toggle_dark` (Dark Mode dropped).

### Testing
- Split `src/screens/__tests__/SettingsScreen.test.tsx`: keep root-page coverage
  (reminder toggle persist + rollback, Repeat Schedule picker, Reset undo,
  Delete confirm, nav-row → navigate assertions) and add one test file per new
  sub-screen (render, row → navigate / dialog, toggle persist + rollback).
- `resolveSettings` unit test moves to a `settingsShared` test.
- `npx tsc --noEmit` + `yarn lint` clean; `./scripts/auxi-lint-tokens.sh` and
  `auxi/scripts/auxi-lint-ds-primitives.sh` clean (rows now `MListRow`).

### Design gates
- This is a UI feature → the **step-6.5 designer gate** + **qa-ui** still apply.
- No Figma frame exists (CEO-authored IA). Drift risk is low because we reuse
  on-system `MListRow` + existing dialogs, but the plan must route a **designer
  PASS** + **CEO sign-off** on the grouped visual treatment (section spacing,
  group headers, whether root sections get `inset-grouped`-style headers vs
  plain dividers) before PR.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Dropping AM/PM is a silent functional regression | Documented & approved (§3); call out in PR + tracking-plan §6 |
| State split duplicates persist/consent logic | Centralize in `settingsShared.ts` (DRY) |
| Visual treatment of root section groups undefined (no Figma) | Designer gate + CEO sign-off before PR (§7) |
| Branch already named `…settings-cleanup` — possible overlap | Plan step 0: reconcile with in-flight work on this branch before editing |

## 9. Definition of done

- Main Settings page shows: reminder block (4 items) + 3 group nav rows +
  Delete My Data — nothing else.
- Personalization / Privacy / About each push a dedicated sub-screen with a
  back chevron.
- All non-toggle rows render via `MListRow`; toggles via `SettingsToggleRow`.
- `SettingsScreen.tsx` ≤ ~250 lines; each sub-screen is its own focused file.
- All prior analytics events fire from their new homes; `settings_section_opened`
  added; tracking-plan doc updated.
- i18n complete in all 3 locales + types; Dark Mode keys retired.
- Type-check, lint, token-lint, DS-primitives-lint, and the test suite pass.
- Designer PASS + CEO sign-off recorded.
