# Mixpanel Tracking Plan — Auxi (mobile)

> Product analytics for the auxi React Native app. SDK: `mixpanel-react-native@3.3.0`.
> Single integration seam: `src/services/analytics.ts`. Token config: `src/config/analytics.ts`.

## Scope & decisions

| Decision | Value |
|---|---|
| Platform | React Native (auxi). iOS pod linked, Android autolinked. |
| CDP/warehouse | None — direct SDK. |
| Consent | **Required (EU/CA).** SDK is gated — not initialised until consent granted. |
| Value Moment | `outfit_favorited` — user saves a recommended outfit. |
| Tokens | Dev token wired (`__DEV__`). **Prod project + token still TODO** (`PROD_TOKEN` empty → release no-ops). |

## 1. Value Moment & KPIs (RAE framework)

- **Value Moment:** the user favorites an AI-recommended outfit (`outfit_favorited`). Active signal the recommendation landed.
- **Reach:** account creation funnel (`sign_up_started` → `sign_in_completed`).
- **Activation:** `onboarding_completed` — new user finished setup and a starter wardrobe was generated.
- **Engagement:** `outfit_favorited`, `try_on_started` / `try_on_completed`, refine flow.

**KPIs**
1. Activation rate = `onboarding_completed` / new accounts.
2. Value-moment rate = users with ≥1 `outfit_favorited` / activated users.
3. Try-on adoption = users with ≥1 `try_on_started`.
4. D7 retention of users who hit the Value Moment.

## 2. Naming conventions (enforced from day one)

- Events: `object_verb`, `snake_case`, past tense (`outfit_favorited`).
- Properties: `snake_case`, descriptive.
- Property values: lowercase strings; **numbers unquoted**; omit a property entirely when there's no value (never send `null`/`""`).
- No `$`/`mp_` prefixes on custom props. Never build event names dynamically.

## 3. Identity (`src/context/AuthContext.tsx`)

- `distinct_id = String(user.id)` — the DB primary key. **Never** email.
- A single `useEffect` on `user`:
  - user present (login, cold-start restore, post-verify) → `identifyUser(id, profile)`
  - user cleared (logout, session expiry) → `resetAnalytics()`
  - ref-guarded so it only fires on real identity transitions (also re-identifies on every app launch when authenticated).
- People profile attributes: `$email`, `$created` (from `created_at`), `gender`, `style_direction`, `confidence_level` (only when present).

## 4. Super properties (`src/services/analytics.ts`)

`platform` (`ios`/`android`), `app_environment` (`development`/`production`).
_Follow-up:_ `app_version` needs `react-native-device-info` (not installed).

## 5. Events — IMPLEMENTED

Comprehensive instrumentation landed 2026-06-16 per `plans/260616-0950-mixpanel-comprehensive-instrumentation/spec.md`. ★ = Value Moment. All events go through `track()` in `src/services/analytics.ts`.

### 5.1 Auth flow

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `sign_up_started` | EmailInputScreen "Continue" in signup mode (any non-OAuth precheck result) | `EmailInputScreen.tsx:175` | `method` |
| `sign_up_submitted` | PasswordCreationScreen submit → `register()` | `PasswordCreationScreen.tsx:147` | `method` |
| `sign_up_failed` | `register()` rejects | `PasswordCreationScreen.tsx:159` | `method`, `error_reason` |
| `sign_up_completed` | verify-email API resolves | `services/deepLinkHandler.ts:181` | `method` |
| `email_verification_resent` | "Resend code" tap | `VerifyEmailScreen.tsx:128` | — |
| `sign_in_started` | SignInScreen submit | `SignInScreen.tsx:128` | `method` |
| `sign_in_completed` | identify() resolves after login | `AuthContext.tsx:233` | `method` (`email`/`google`/`apple`) |
| `sign_in_failed` | `login()` rejects | `SignInScreen.tsx:133` | `method`, `error_reason` |
| `oauth_sign_in_started` | OAuth button tap | `WelcomeScreen.tsx:176, 214`, `EmailGoogleNoticeScreen.tsx:116` | `provider` |
| `oauth_sign_in_completed` | OAuth resolves → identify() | `AuthContext.tsx:231` | `provider` |
| `forgot_password_requested` | Request submit | `ForgotPasswordRequestScreen.tsx:92` | — |
| `password_reset_completed` | New password set | `ResetNewPasswordScreen.tsx:97` | — |
| `auth_language_changed` | Locale pick in auth tier | `LanguageSettingsScreen.tsx:83` | `locale` (`en-EN`/`vi-VN`/`fr-FR`) |

### 5.2 Onboarding

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `onboarding_step_viewed` | useFocusEffect on each step | 8 sites: `AppWelcomeScreen.tsx:21`, `LocationPermissionScreen.tsx:38`, `OnboardingWardrobeScreen.tsx:46`, `OnboardingFitScreen.tsx:55`, `OnboardingStylesScreen.tsx:80`, `OnboardingLoadingScreen.tsx:153`, `OnboardingCompletedScreen.tsx:40`, `OnboardingOutroScreen.tsx:42` | `step_name`, `step_index` (1-8) |
| `welcome_continued` | AppWelcomeScreen primary CTA | `AppWelcomeScreen.tsx:30` | — |
| `location_permission_requested` | Just before system prompt | `LocationPermissionScreen.tsx:48` | — |
| `location_permission_granted` | Permission granted | `LocationPermissionScreen.tsx:52` | — |
| `location_permission_denied` | Permission denied/blocked | `LocationPermissionScreen.tsx:55` | `permission_status` |
| `wardrobe_direction_selected` | Direction pick | `OnboardingWardrobeScreen.tsx:57` | `direction` |
| `fit_preference_selected` | Fit pick | `OnboardingFitScreen.tsx:66` | `fit` |
| `style_selected` | Style chip add | `OnboardingStylesScreen.tsx:96` | `style_name` |
| `style_deselected` | Style chip remove | `OnboardingStylesScreen.tsx:92` | `style_name` |
| `onboarding_generated` (pre-existing) | Wardrobe generated | `OnboardingLoadingScreen.tsx:160` | `wardrobe_direction`, `fit_preference`, `styles_selected` |
| `onboarding_completed` (pre-existing) | Outro completes | `OnboardingOutroScreen.tsx:51` | `wardrobe_direction`, `fit_preference`, `styles_selected` |

### 5.3 Home + outfit recommendation engagement

| Event | Trigger | Location | Properties |
|---|---|---|---|
| **`outfit_recommendation_viewed`** | Active sheet settles on a new `outfit_hash`. Dedup'd via module-level `Set<outfit_hash>` per session — see `trackRecommendationViewedOnce()` helper. | `HomeScreen.tsx:564` via `analytics.ts:173` | `outfit_hash`, `position`, `source` (`feed`/`refine`) |
| **`outfit_favorited`** ★ (pre-existing) | `saveFavourite` success | `HomeScreen.tsx:973` | `outfit_hash`, `item_count`, `source` |
| `outfit_unfavorited` (pre-existing) | Favourite removed | `FavouriteScreen.tsx:53` | `favorite_id` |
| `outfit_swiped` | Swipe right/like or left/skip | `HomeScreen.tsx:1193, 1222` | `outfit_hash`, `direction`, `method` |
| `outfit_card_tapped` | Tap on outfit card | `HomeScreen.tsx:1386` | `outfit_hash`, `position` |
| `context_chip_changed` | Mode chip change (wired defensively — UI parked behind AU-221) | `HomeScreen.tsx:1137` | `chip_type` (`mode`), `value` |
| `refine_modal_opened` (pre-existing) | Refine open | `HomeScreen.tsx:1185, 1172` | `source` |
| `refine_chip_selected` / `refine_chip_deselected` | ContextChipsModal chip toggle | `ContextChipsModal.tsx:152` | `chip_type` (`style_feedback`), `value` |
| `refine_submitted` (pre-existing) | Refine confirm | `HomeScreen.tsx:1246` | `occasion`, `time_of_day`, `weather_condition` |
| `refine_cancelled` (pre-existing) | Refine dismiss | `HomeScreen.tsx:1589` | `source` |

### 5.4 Wardrobe + ItemDetail

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `wardrobe_viewed` (pre-existing) | Tab view | `WardrobeScreen.tsx:128` | `category` |
| `wardrobe_filter_changed` (pre-existing) | Filter pill | `WardrobeScreen.tsx:135` | `category` |
| `wardrobe_item_opened` (pre-existing) | Item tap | `WardrobeScreen.tsx:139` | `item_id`, `category` |
| `item_detail_opened` | ItemDetailScreen mount | `ItemDetailScreen.tsx:280` | `item_id`, `source` |
| `wardrobe_item_added` | Take-photo upload complete | `WardrobeScreen.tsx:218` | `source`, `method` (`take_photo`), `item_id?`, `category?` |
| `wardrobe_item_added` | Database clone complete | `DatabaseScreen.tsx:138` | `item_id`, `source` (`database`), `method` (`search_database`), `category?` |
| `item_ready_toast_shown` (AU-361) | Uploaded item finishes background processing (`is_preparing` true→false) and the "Your item is ready" toast fires | `WardrobeScreen.tsx:149` | `item_category?` |
| `wardrobe_item_edited` | ItemDetail save with diff | `ItemDetailScreen.tsx:678` | `item_id`, `fields_changed` (`category`/`color`/`style`/`fit`) |
| `wardrobe_item_deleted` | ItemDetail delete confirm | `ItemDetailScreen.tsx:548` | `item_id`, `category?` |
| `wardrobe_search_result_selected` | Database result tap → add | `DatabaseScreen.tsx:118` | `item_id`, `source` (`database`) |
| `wardrobe_photo_captured` | Camera capture for take-photo flow | `WardrobeScreen.tsx:204` | `source` (`add_item`) |
| `add_item_opened` (pre-existing) | Add-item entry | `WardrobeScreen.tsx:147` | `source` |
| `add_item_method_selected` (pre-existing) | Method pick | `WardrobeScreen.tsx:152, 158, 234` | `method` |
| `add_item_upload_started/succeeded/failed` (pre-existing) | Upload lifecycle | `WardrobeScreen.tsx:201, 209, 219` | `source` |

### 5.5 Favourite + try-on outcomes

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `favourite_try_on_tapped` | "See on me" from a favourite card | `FavouriteScreen.tsx:112` | `favorite_id` |
| `try_on_outcome_retaken` | Retake from try-on outcome | `SeeThisOnMeScreen.tsx:229` | `outfit_hash` |
| `try_on_started` (pre-existing) | Try-on initiated | `BodyScreen.tsx:282`, `SeeThisOnMeScreen.tsx:147` | `outfit_hash`, `item_count`, `has_body_photo` |
| `try_on_completed` (pre-existing) | Try-on succeeded | `BodyScreen.tsx:300`, `SeeThisOnMeScreen.tsx:166` | `outfit_hash`, `step_count?` |
| `try_on_failed` (pre-existing) | Try-on errored | `BodyScreen.tsx:303`, `SeeThisOnMeScreen.tsx:175, 254, 262` | `outfit_hash`, `error_reason?` |
| `try_on_step_completed` (pre-existing) | Step done (selfie/fullBody/bodyShape/pose) | `SeeThisOnMeScreen.tsx:419, 444, 467, 451` | `step` |
| `try_on_profile_retake` (pre-existing) | Profile retake | `SeeThisOnMeScreen.tsx:225` | `outfit_hash` |
| `body_photo_reuse_confirmed` (AU-354 pt.3) | On re-entry with a saved reusable profile, user confirms the persisted body photo on the reuse-confirm screen → proceeds to render (no re-capture) | `SeeThisOnMeScreen.tsx:267` | `outfit_hash` |
| `body_photo_retake_selected` (AU-354 pt.3) | On the reuse-confirm screen, user chooses to retake instead of reusing the persisted photo → drops to the normal capture flow (fires BEFORE any render, so distinct from `try_on_outcome_retaken`) | `SeeThisOnMeScreen.tsx:308` | `outfit_hash` |
| `body_shape_generation_backgrounded` (AU-358) | User leaves the AI body-shape generating screen via the quit affordance WITHOUT cancelling the render (the out-of-React store keeps the request alive; the in-app completion toast fires when it finishes) | `SeeThisOnMeScreen.tsx:418` | `outfit_hash` |
| `body_shape_generation_completed_notified` (AU-358) | The in-app completion notification (toast) was shown to a user who had backgrounded the generation, when the render finished | `try-on-completion-notice.ts:50` | `result` (`success`/`error`) |

### 5.6 Body screen

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `body_photo_added` | First photo set in slot | `BodyScreen.tsx:263` | `slot` (`full_body`) |
| `body_photo_replaced` | Existing photo replaced | `BodyScreen.tsx:263` (same call, branched by `wasEmpty && !isRetake`) | `slot` |
| `body_photo_deleted` | Photo cleared | `BodyScreen.tsx:208` | `slot` |

### 5.7 Settings

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `notifications_toggle_changed` | Daily reminder switch flip | `SettingsScreen.tsx:392` | `enabled` |
| `settings_language_changed` | Locale switch | `SettingsScreen.tsx:379` | `locale` (`en-EN`/`vi-VN`/`fr-FR`) |
| `style_direction_changed` | Style direction save | `SettingsScreen.tsx:454` | `direction` |
| `analytics_consent_changed` | Consent toggle (fires AFTER grant, BEFORE revoke) | `SettingsScreen.tsx:431, 438` | `granted` |

### 5.8 Mood feedback (pre-existing, unchanged)

8 events fired from `src/hooks/use-mood-feedback.ts`: `wear_this_clicked`, `mood_feedback_opened`, `mood_feedback_skipped`, `mood_feedback_submitted`, `outfit_mood_linked`, `negative_mood_selected`, `mood_feedback_submission_failed`, `mood_chip_selected`/`mood_chip_deselected`. See file for full property shapes.

### 5.9 Global navigation

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `screen_viewed` | React Navigation `onStateChange` → route name change. `OnboardingLoading` skipped (transient). 500ms debounce on identical consecutive names. | `AppNavigator.tsx:70` (`handleNavStateChange`) | `screen_name`, `previous_screen_name?` |

### 5.10 Analytics helpers (`src/services/analytics.ts`)

- `track(event, props?)` — primary entry. No-op until consent granted.
- `trackRecommendationViewedOnce(outfitHash, props?)` — module-level `Set<outfit_hash>` dedups per session. Resets on app restart. Used only for `outfit_recommendation_viewed`.
- `identifyUser` / `resetAnalytics` / `init*` / `*Consent` — unchanged.

### 5.11 Outfit Canvas (Remix editor)

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `canvas_item_layer_reordered` | Selected canvas item moved one layer via the toolbar (AU-360 fix — z-index swap with adjacent item). Fires only on an actual move, not at the front/back edge. | `OutfitCanvasScreen.tsx:448` (`moveLayer`) | `direction` (`forward`/`backward`) |

> Gap: other canvas toolbar actions (add / duplicate / swap / delete / tag add-remove / save) are not yet instrumented — local-only editor state, no persistence wired. Track when the Save→backend persist step lands (`handleSave` is a TODO `goBack()` today). Logged in §6.6.

### 5.12 App Feedback

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `feedback_submitted` | `POST /api/feedback` succeeds (201) | `FeedbackScreen.tsx:88` (mutation `onSuccess`) | `category` (`bug`/`idea`/`general`/`praise`), `rating?` (1–5, omitted when unset) |
| `feedback_submit_failed` | `POST /api/feedback` rejects | `FeedbackScreen.tsx:101` (mutation `onError`) | `error_code` — sanitized snake_case (`rate_limited` 429 / `validation_error` 422 / `auth_error` 401 / `network_error` no-status / `server_error` other) |

> PII: the free-text `message` is NEVER tracked — only `category` + optional `rating` leave the device. `platform` rides the global super-property. `screen_viewed` for `Feedback` fires from the global nav listener (§5.9), not double-tracked here.

## 6. Events — DESIGNED, awaiting UI/API (gaps)

These hooks were spec'd but cannot fire today — the UI surface, control, or API doesn't exist yet. **No code shipped for these** (we don't fake events). Re-evaluate when the underlying surface lands.

### 6.1 Settings — controls missing

- `daily_reminder_time_changed` — no hour-picker on `SettingsScreen` (only AM/PM + frequency are interactive; the hour value `'06:15'` is read-only display per CEO Q12)
- `confidence_level_changed` — no confidence-level control
- `account_logged_out` — no logout button on `SettingsScreen` (likely lives in a Drawer/Sidebar component — re-locate and wire)
- `account_deleted` — "Delete data" row resets preferences (`resetUserPreferences`), doesn't delete the account
- `support_link_tapped` — no support/help/TOS/privacy links exist on this screen

### 6.2 Home — CTAs missing

- `outfit_try_on_tapped` — no "See on me" CTA on Home (footer is "Wear this" + Remix). Wire when a Home-level try-on entry ships.
- `outfit_swiped` `direction: 'previous'` — deck is forward-only; never fires today
- `outfit_swiped` `method: 'button'` — no button-driven swipe path; never fires today
- `context_chip_changed` runtime UI — mode-selector JSX commented out behind AU-221. `handleSelectMode` is wired so the event fires automatically once the UI lands.

### 6.3 Wardrobe — URL import not built

- `wardrobe_url_import_submitted`
- `wardrobe_url_import_completed`
- `wardrobe_url_import_failed`

`handleImportFromWeb` in `WardrobeScreen.tsx:158-165` is a "coming soon" Toast — no service, no submit form. Wire on the real handler once import lands.

### 6.3.b Wardrobe — search submit step not built

- `wardrobe_search_initiated`

`DatabaseScreen` today is a grid-browse-and-pick UI with no search box; the "Add" button is a basket-commit step, not a search submit. Event removed from §5 to avoid skewing the search funnel. Wire on a real search-query dispatcher when search lands.

### 6.4 Favourite + try-on outcomes — UI not built

- `favourite_outfit_opened` — `FavouriteOutfitCard` has no whole-card tap target (only remove ⊖ and try-on actions are tappable)
- `try_on_outcome_saved` — `OutfitPreview` has no save button (TODO AU-346: backend save not wired)
- `try_on_outcome_shared` — no share affordance on `OutfitPreview`

### 6.5 Body screen — slot coverage incomplete

`body_photo_added/replaced/deleted` only fire for `slot: 'full_body'` today. `selfie` and `body_shape` slots live in the SeeThisOnMe step screens (`StepSelfie`, `StepBodyShape`) with a different lifecycle (flow-state, not persisted slots editable independently). When those flows gain replace/delete affordances, mirror the same event names with the matching `slot` value.

### 6.6 Outfit Canvas — non-reorder toolbar actions not yet instrumented

Only `canvas_item_layer_reordered` ships today (§5.11). The other `OutfitCanvasScreen` toolbar handlers (`handleAddItem`, `handleDuplicate`, `handleDelete`, swap-TODO, tag add/remove, undo/redo) and `handleSave` are local-only editor state with no persistence — the canvas never reaches the backend (`handleSave` is a TODO that just `goBack()`s). Wire `canvas_outfit_saved` (with `item_count`, `tag_count`) and the per-action events when the Save→persist endpoint lands. Re-wire condition: a real canvas-persist mutation exists.

## 7. Consent (EU/CA) — mechanism DONE, UI PENDING ⚠️

`src/services/analytics.ts` exposes:
- `initAnalytics()` — called on app start; inits **only if** consent was previously granted.
- `grantAnalyticsConsent()` / `revokeAnalyticsConsent()` / `hasAnalyticsConsent()`.
- Decision persisted in AsyncStorage (`auxi.analytics.consent.v1`). Privacy: `setUseIpAddressForGeolocation(false)`.

**Gap:** there is no consent UI yet, so `track()`/`identify()` stay no-ops until something calls `grantAnalyticsConsent()`. Before any data flows:
- **Product/design decision needed:** first-run consent prompt vs. a "Share usage analytics" toggle in Settings (SettingsScreen exists).
- Dev/QA verification in the meantime: call `grantAnalyticsConsent()` (e.g. temporarily from a dev affordance) before exercising flows.

## 8. Manual Mixpanel dashboard steps (human — Phases 2 & 8)

- [ ] **DEV project:** confirm timezone; **verify Simplified ID Merge is ON before sending events** (cannot change retroactively). Dev token `b402…f93` already wired.
- [ ] **PROD project:** create it, then paste token into `PROD_TOKEN` in `src/config/analytics.ts`.
- [ ] **Lexicon:** add a description for every event + property above.
- [ ] **Data Standards:** enforce `snake_case`.
- [ ] **Event Approval:** require review before new events go live.
- [ ] **Roles:** Data Owner / Governor / Engineer / Analyst; quarterly review.

## 9. Live View verification

1. Run dev build: `yarn ios:sim` (full stack: `./scripts/qa-boot.sh`).
2. Grant analytics consent (see §7).
3. Trigger flows: sign in → finish onboarding → favorite an outfit → start a try-on.
4. Mixpanel → Live View (dev project): confirm `sign_in_completed`, `onboarding_completed`, `outfit_favorited`, `try_on_*` arrive with the right props and are linked to the user (distinct_id = user id).
5. Log out → confirm `reset()` (next session is a fresh anonymous id, not merged).

## 10. Suggested funnels (build in Mixpanel Insights → Funnels)

- **Activation funnel:** `sign_up_started` → `sign_up_submitted` → `sign_up_completed` → `onboarding_step_viewed` (per step) → `onboarding_completed` → first `outfit_favorited`
- **Sign-in funnel:** `sign_in_started` → `sign_in_completed` (break down by `method`)
- **OAuth funnel:** `oauth_sign_in_started` → `oauth_sign_in_completed` (break down by `provider`)
- **Onboarding step funnel:** `welcome_continued` → `location_permission_granted`/`_denied` → `wardrobe_direction_selected` → `fit_preference_selected` → `style_selected` → `onboarding_generated` → `onboarding_completed`
- **Recommendation engagement (value-moment rate):** `outfit_recommendation_viewed` → `outfit_favorited`
- **Try-on funnel:** `try_on_started` → `try_on_step_completed` ×N → `try_on_completed` → `try_on_outcome_retaken` *(extend to `_saved`/`_shared` when UI ships)*
- **Reuse-on-return funnel (AU-354 pt.3):** on re-entry with a saved reusable body profile, `body_photo_reuse_confirmed` → `try_on_started` → `try_on_completed` measures returning-user conversion; `body_photo_retake_selected` is the drop-to-recapture branch (denominator: arrivals on the reuse-confirm screen).
- **Wardrobe-grow funnel (take-photo):** `add_item_opened` → `add_item_method_selected` (`take_photo`) → `add_item_upload_started` → `add_item_upload_succeeded` → `wardrobe_item_added` → `item_ready_toast_shown` (AU-361: background processing completed — tail of the take-photo funnel)
- **Wardrobe-grow funnel (database):** `wardrobe_search_initiated` → `wardrobe_search_result_selected` → `wardrobe_item_added`
- **Refine-engagement funnel:** `refine_modal_opened` → `refine_chip_selected` ×N → `refine_submitted` (vs `refine_cancelled`)
- **Retention insight:** `screen_viewed` per `screen_name` over time — identifies dead screens
- **Mood-feedback funnel:** `wear_this_clicked` → `mood_feedback_opened` → `mood_feedback_submitted` (vs `mood_feedback_skipped`)
- **App-feedback submission funnel:** `screen_viewed` (`screen_name = Feedback`) → `feedback_submitted` (vs `feedback_submit_failed`, broken down by `error_code`) — measures completion rate of the feedback form and surfaces rate-limit / validation friction.

Common breakdown dimensions: `method`, `provider`, `chip_type`, `source`, `category`, `direction`. Super properties (`platform`, `app_environment`) are available globally.
