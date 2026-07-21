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
| `sign_up_completed` | verify-email API resolves (real/email mode) **or** registration returns `verification_required: false` / `auto_verified: true` (dev "mock email" auto-verify) | `services/deepLinkHandler.ts:188`, `PasswordCreationScreen.tsx` (auto-verify branch) | `method` |
| `sign_up_auto_verified` | Registration response says the account is already verified (`verification_required: false` / `auto_verified: true`), so the app skips VerifyEmail and auto-completes sign-in | `PasswordCreationScreen.tsx` (auto-verify branch) | `method` (`email`) |
| `email_verification_resent` | "Resend code" tap | `VerifyEmailScreen.tsx:128` | — |
| `sign_in_started` | SignInScreen submit | `SignInScreen.tsx:128` | `method` |
| `sign_in_completed` | identify() resolves after login | `AuthContext.tsx:233` | `method` (`email`/`google`/`apple`) |
| `sign_in_failed` | `login()` rejects | `SignInScreen.tsx:133` | `method`, `error_reason` |
| `oauth_sign_in_started` | OAuth button tap | `WelcomeScreen.tsx:187, 225`, `EmailGoogleNoticeScreen.tsx:116` | `provider` |
| `oauth_sign_in_completed` | OAuth resolves → identify() | `AuthContext.tsx:231` | `provider` |
| `email_sign_in_started` | Welcome "Continue with email" CTA tap (mirrors `oauth_sign_in_started`; the third auth-entry option). `sign_up_started` still fires later on the EmailInput "Continue" submit. | `WelcomeScreen.tsx:142` | `method` (`email`) |
| `auth_language_button_tapped` | Welcome top-right language button tap → opens auth-tier LanguageSettings. The actual locale change fires `auth_language_changed`. | `WelcomeScreen.tsx:148` | — |
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
| `onboarding_completed` (pre-existing) | Outro "See my outfit" completes onboarding. ALSO fires from the Loading screen's "Continue to app" escape hatch when the starter-wardrobe generate keeps failing — a non-trapping completion so a generate failure never re-throws the user into onboarding on relaunch. | `OnboardingOutroScreen.tsx:51`; `OnboardingLoadingScreen.tsx` (`handleContinueAnyway`) | `wardrobe_direction`, `fit_preference`, `styles_selected`, `generate_failed?` (`true` only on the Loading escape-hatch path; omitted on the normal Outro completion) |

### 5.3 Home + outfit recommendation engagement

| Event | Trigger | Location | Properties |
|---|---|---|---|
| **`outfit_recommendation_viewed`** | Active sheet settles on a new `outfit_hash`. Dedup'd via module-level `Set<outfit_hash>` per session — see `trackRecommendationViewedOnce()` helper. | `HomeScreen.tsx:564` via `analytics.ts:173` | `outfit_hash`, `position`, `source` (`feed`/`refine`) |
| **`recommendation_failed`** | The Home recommendation build/poll mutation rejects (`onError`). Makes launch-week AI failures visible (previously only `console.error`'d). | `HomeScreen/index.tsx` (`startMutation.onError`) via `analytics.ts` (`trackRecommendationFailed`) | `error_kind` (`network` / `rate_limited` / `ai_unavailable` / `server` / `unknown` — sanitized from the axios error, NO raw message/URL/PII); `status` (HTTP status number, omitted when no response reached the app) |
| `home_empty_state_cta_tapped` | CTA on the Home empty state — shown when the recommendation resolved but surfaced no outfit (empty wardrobe / nothing composable) and it is NOT a climate wardrobe-gap (own CTA) nor an error. Fixes the blank-white-screen a new user hit. Distinct from the wardrobe-gap and error states, which have their own CTAs. | `HomeScreen/index.tsx` (`HomeEmptyState` handlers) | `action` (`add_items` → Wardrobe / `try_again` → re-request recommendation) |
| **`outfit_favorited`** ★ (pre-existing) | `saveFavourite` success | `HomeScreen.tsx:973` | `outfit_hash`, `item_count`, `source` |
| `outfit_unfavorited` (pre-existing) | Favourite removed | `FavouriteScreen.tsx:53` | `favorite_id` |
| `outfit_swiped` | Swipe left → next suggestion / swipe right → previous (navigation only; favouriting moved to "Wear this"). Right-swipe is blocked on the first card, so `previous` only fires from index ≥ 1. | `HomeScreen/index.tsx` (`handleSkip`, `handleSwipeBack`) | `outfit_hash`, `direction` (`next`/`previous`), `method` (`gesture`) |
| `outfit_card_tapped` | Tap on outfit card | `HomeScreen.tsx:1386` | `outfit_hash`, `position` |
| `context_chip_changed` | Mode chip change (wired defensively — UI parked behind AU-221) | `HomeScreen.tsx:1137` | `chip_type` (`mode`), `value` |
| `refine_modal_opened` (pre-existing) | Refine sheet opens — manual ("Refine" action-row button) or the after-6 progressive gate | `HomeScreen/index.tsx` | `source` (`refine_button` / `viewed_threshold`; legacy `unfavorited_swipe` removed) |
| `refine_chip_selected` / `refine_chip_deselected` | ContextChipsModal chip toggle | `ContextChipsModal.tsx:152` | `chip_type` (`style_feedback`), `value` |
| `refine_submitted` (pre-existing) | Refine confirm | `HomeScreen.tsx:1246` | `occasion`, `time_of_day`, `weather_condition` |
| `refine_cancelled` (pre-existing) | Refine dismiss | `HomeScreen.tsx:1589` | `source` |
| `refine_skipped` | "Skip for now" on the after-6 progressive-refinement gate — defers feedback and resumes generation of the next tier | `HomeScreen/index.tsx` (`onSkipRefinement`) | `skipped_count` (running per-session skip tally) |
| `refine_confirmation_shown` | The "{feedback} applied!" confirmation toast surfaces once the refined deck has loaded — measures how often a refine submit actually produced a visible refreshed result | `HomeScreen/index.tsx` (`showRefineToast`) | `mode` (`chip` / `custom`, always); `value` (applied chip label — **chip mode only**; omitted for custom to avoid shipping free-text user input, same gate as `refine_submitted`) |
| `home_view_toggled` | Tap on the grid/collage view-toggle pill (DS `MFloatingPill`, icon mode) — swaps the outfit sheet's middle region between the grid and collage layouts. The SAME pill is mounted on two surfaces (Home footer + Favourite header), so `source` discriminates them | `HomeViewToggleFooter.tsx` (`handleChange`) | `view` (`grid` / `collage`); `source` (`home` / `favourite` — which surface fired it) |
| `ai_limit_view_latest_tapped` (AI daily-limit gate — Home "view latest" fallback) | User taps "View latest outfits" on the Home styling-limit page (over their daily AI budget, so no fresh looks can be built). Fires at the top of `handleViewLatestOutfits`, guarded by `isViewingLatestRef` so a rapid double-tap can't double-count | `HomeScreen/index.tsx:1483` | — |
| `ai_limit_view_latest_empty` | No recommendation sheets are persisted for the user (a brand-new user who hit the limit before ever seeing a deck) — the limit page stays up and a brief "no recent" banner surfaces instead of a restored deck | `HomeScreen/index.tsx:1487` | — |
| `ai_limit_view_latest_shown` | The persisted recommendation sheets were restored and seated as a read-only deck (pool marked depleted + limit sheet marked shown, so swiping to the end can't re-fire a fresh `/build` or the Refine flow — both would just re-hit the limit) | `HomeScreen/index.tsx:1506` | `count` (number of restored sheets) |
| `ai_limit_view_latest_failed` | `readLatestOutfits` threw while restoring the persisted deck → the "no recent" banner surfaces. Raw error goes to `console.warn` only, never here | `HomeScreen/index.tsx:1509` | — |

### 5.4 Wardrobe + ItemDetail

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `wardrobe_viewed` (pre-existing) | Tab view | `WardrobeScreen.tsx:128` | `category` |
| `wardrobe_filter_changed` (pre-existing) | Filter pill | `WardrobeScreen.tsx:135` | `category` |
| `wardrobe_sort_changed` | Sort option selected in the sort bottom sheet (`handleSelectSort`) — not fired on the initial default | `WardrobeScreen.tsx` (`handleSelectSort`) | `sort_by` (`date_added` \| `name` \| `worn`), `direction` (`asc` \| `desc`) |
| `wardrobe_item_opened` (pre-existing) | Item tap | `WardrobeScreen.tsx:139` | `item_id`, `category` |
| `item_detail_opened` | ItemDetailScreen mount | `ItemDetailScreen.tsx:280` | `item_id`, `source` |
| `creation_item_detail_opened` | Tap an item inside a saved-creation collage → opens ItemDetail. Fired from both entry points to that collage: the My Creations list and the Schedule day's creation card. Resolves the real wardrobe id first (stored `wardrobeItemId`, else recovered from the synthetic canvas id); a no-op when neither yields one. | `MyCreationsScreen.tsx` (`handleItemPress`), `ScheduleScreen.tsx` (creation-card `onItemPress`) | `wardrobe_item_id` (internal wardrobe id) |
| `wardrobe_item_added` | Take-photo upload complete | `useAddWardrobeItem.ts:142` | `source`, `method` (`take_photo`), `mode` (`remove_bg`/`beautify`), `item_id?`, `category?` |
| `wardrobe_item_added` | Database clone complete | `DatabaseScreen.tsx:138` | `item_id`, `source` (`database`), `method` (`search_database`), `category?` |
| `item_ready_toast_shown` (AU-361) | Uploaded item finishes background processing (`is_preparing` true→false) and the "Your item is ready" toast fires | `useItemReadySnackbar.ts:133` | `item_category?` |
| `wardrobe_item_edited` | ItemDetail save with diff | `ItemDetailScreen.tsx:678` | `item_id`, `fields_changed` (`category`/`color`/`style`/`fit`) |
| `wardrobe_item_deleted` | ItemDetail delete confirm | `ItemDetailScreen.tsx:548` | `item_id`, `category?` |
| `wardrobe_search_result_selected` | Database result tap → add | `DatabaseScreen.tsx:118` | `item_id`, `source` (`database`) |
| `wardrobe_photo_captured` | Camera capture for take-photo flow | `useAddWardrobeItem.ts:122` | `source` (`add_item`) |
| `add_item_opened` (pre-existing) | Add-item entry | `WardrobeScreen.tsx:147` | `source` |
| `add_item_method_selected` (pre-existing) | Method pick | `useAddWardrobeItem.ts:205` | `method` |
| `add_item_mode_selected` | **RETIRED** — the upload-time mode selector was removed from the add-item sheet (uploads always run remove-background; the AI step moved on-demand to Item Detail, §5.21). Historical data only | — (was `AddItemSheet.tsx`) | `mode` (`beautify`) |
| `add_item_upload_started` (pre-existing, extended) | Upload initiated after image pick | `useAddWardrobeItem.ts:120` | `source` (`camera`/`gallery`), `mode` (`remove_bg`/`beautify`) |
| `add_item_upload_succeeded` (pre-existing) | Non-beautify upload succeeded (fires only for `mode: 'remove_bg'`; beautify path fires `beautify_started` instead) | `useAddWardrobeItem.ts:174` | `source` |
| `add_item_upload_failed` (pre-existing, extended) | Upload errored (network / unexpected). Beautify-specific path also fires this when the upload response is missing `item_id` | `useAddWardrobeItem.ts:150, 180` | `source`; `reason` (`missing_item_id`) on the beautify id-guard path only |
| `add_item_upload_cancelled` | User declined the AI data-sharing consent dialog on the beautify path — action dropped, item not uploaded | `useAddWardrobeItem.ts:225` | `reason` (`ai_consent_declined`) |
| `wardrobe_load_failed` (design-review F7) | Non-silent `fetchItems` failure → dedicated error state shown | `WardrobeScreen.tsx` (`fetchItems` catch) | `category` (selected filter tab) |
| `wardrobe_load_retry_tapped` (design-review F7) | "Try again" tapped on the error state | `WardrobeScreen.tsx` (`handleRetryLoad`) | `category` (selected filter tab) |
| `wardrobe_url_import_submitted` (PR #215) | User taps Import on the web-image preview | `ImportFromWebScreen.tsx:213` | `url_domain?` (hostname only — never the raw URL) |
| `wardrobe_url_import_completed` (PR #215) | Web-image import created the wardrobe item | `WardrobeScreen.tsx:185` | `method` (`import_web`), `item_id?`, `category?` |
| `wardrobe_url_import_failed` (PR #215) | Web-image import threw (network / service) | `WardrobeScreen.tsx:192` | — |
| `add_item_method_selected` `import_web` | "Import from web" method picked in the add sheet | `WardrobeScreen.tsx:326` | `method` (`import_web`) |

### 5.5 Favourite + try-on outcomes

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `favourite_try_on_tapped` | "See on me" from a favourite card | `FavouriteScreen.tsx:112` | `favorite_id` |
| `try_on_outcome_retaken` | Retake from try-on outcome | `SeeThisOnMeScreen.tsx:229` | `outfit_hash` |
| `try_on_cached_result_shown` | On re-entering "See on me" for an outfit that already produced a successful AI result, the persisted result photo is shown immediately (with a Retake affordance) instead of re-running the capture/reuse flow | `SeeThisOnMeScreen.tsx` (mount effect) | `outfit_hash` |
| `try_on_image_saved` (download) | Header download icon on the try-on preview → saves the rendered image to the device photo library (native) or downloads it (web). Fires on both outcomes | `hooks/use-save-image.ts` (+ `.web.ts`) via `components.tsx` `StomDownloadButton`; wrapper `analytics.ts` `trackTryOnImageSaved` | `surface` (`tryon`), `status` (`success` / `error`) |
| `try_on_started` (pre-existing) | Try-on initiated | `BodyScreen.tsx:282`, `SeeThisOnMeScreen.tsx:147` | `outfit_hash`, `item_count`, `has_body_photo` |
| `try_on_completed` (pre-existing) | Try-on succeeded | `BodyScreen.tsx:300`, `SeeThisOnMeScreen.tsx:166` | `outfit_hash`, `step_count?` |
| `try_on_failed` (pre-existing) | Try-on (render phase) errored | `BodyScreen.tsx:303`, `SeeThisOnMeScreen.tsx:235` (render resolution effect) | `outfit_hash`; `error_kind` — differentiated + sanitized: `timed_out` / `job_failed` (poll paths) · `network` / `rate_limited` / `ai_unavailable` / `server` / `unknown` (thrown paths, from `classifyRecommendationError`) · falls back to `generate` if unset; `error_code?` — sanitized backend `detail.code` (e.g. `ai_daily_limit_reached`), omitted when absent. Raw backend reason goes to Sentry only (`try-on-generation-store.ts` render branches), never here |
| `try_on_step_completed` (pre-existing) | Step done (selfie/fullBody/bodyShape/pose) | `SeeThisOnMeScreen.tsx:419, 444, 467, 451` | `step` |
| `try_on_profile_retake` (pre-existing) | Profile retake | `SeeThisOnMeScreen.tsx:225` | `outfit_hash` |
| `body_photo_reuse_confirmed` (AU-354 pt.3) | On re-entry with a saved reusable profile, user confirms the persisted body photo on the reuse-confirm screen → proceeds to render (no re-capture) | `SeeThisOnMeConfirmScreen.tsx:110` (`handleConfirm`) | `outfit_hash` |
| `body_photo_retake_selected` (AU-354 pt.3) | On the reuse-confirm screen, user chooses to retake instead of reusing the persisted photo → drops to the normal capture flow (fires BEFORE any render, so distinct from `try_on_outcome_retaken`) | `SeeThisOnMeConfirmScreen.tsx:120` (`handleRetake`) | `outfit_hash` |
| `body_photo_reuse_dismissed` (reuse-confirm bottom sheet) | On the reuse-confirm step (now a `ContextualBottomSheet`), user dismisses it via backdrop-tap / swipe-down instead of confirm or retake → leaves the flow (same nav as the header back). THIRD reuse-confirm exit; makes this drop-off branch visible in the funnel. Fires ONLY on sheet dismissal, not on the header back button or other navigations | `SeeThisOnMeConfirmScreen.tsx:126` (`handleDismiss`, wired via `StepReuseConfirm`'s `onDismiss` → `ContextualBottomSheet` at `SeeThisOnMeConfirmScreen.tsx:151`) | `outfit_hash` |
| `body_shape_generation_backgrounded` (AU-358) | User leaves the AI body-shape generating screen via the quit affordance WITHOUT cancelling the render (the out-of-React store keeps the request alive; the in-app completion toast fires when it finishes) | `SeeThisOnMeScreen.tsx:418` | `outfit_hash` |
| `body_shape_generation_completed_notified` (AU-358) | The in-app completion notification (toast) was shown to a user who had backgrounded the generation, when the render finished | `try-on-completion-notice.ts:50` | `result` (`success`/`error`) |
| `body_shape_generation_started` (AU-358 3-shape) | On leaving the full-body step, the async job to generate the 3 AI body-shape photos (slim/average/fuller) is submitted to the worker | `SeeThisOnMeScreen.tsx` (`startShapeGeneration`) | `outfit_hash` |
| `body_shape_generation_completed` (AU-358 3-shape) | The 3-shape generation job resolved successfully (poll). `partial` is true when only 1–2/3 builds came back | `SeeThisOnMeScreen.tsx` (resolution effect) | `outfit_hash`, `partial` |
| `body_shape_generation_failed` (AU-358 3-shape) | The 3-shape generation job failed or timed out (poll) | `SeeThisOnMeScreen.tsx:212` (shapes resolution effect) | `outfit_hash`; `error_kind` — differentiated + sanitized: `timed_out` / `job_failed` (poll paths) · `network` / `rate_limited` / `ai_unavailable` / `server` / `unknown` (thrown paths, from `classifyRecommendationError`) · falls back to `generate` if unset; `error_code?` — sanitized backend `detail.code`, omitted when absent. Raw backend reason goes to Sentry only (`try-on-generation-store.ts` shapes branches), never here |
| `body_shape_selected` (AU-358 3-shape) | User picked one of the 3 generated body shapes → primary profile created server-side (`select`), outfit render starts | `SeeThisOnMeScreen.tsx` (`handleSelectShape`) | `shape` (`slim`/`average`/`fuller`) |
| `ai_limit_gate_shown` (AI daily-limit gate) | The daily AI-budget limit sheet appeared on a `429 ai_daily_limit_reached` — replaces the generic "Try again" error view (kills the retry-storm). Fires once per limit-resolution (deduped by the same `resolvedHashRef` key that guards `try_on_failed` / `body_shape_generation_failed`), so it does NOT double-count on re-render. Terminal "hit daily limit" state — there is no retry from the sheet | `SeeThisOnMeScreen.tsx:262` (render resolution effect), `SeeThisOnMeScreen.tsx:221` (shapes resolution effect) via `useAiLimitGate.ts` | `feature` (`try_on`), `phase` (`render` / `shapes`) — bounded enums, no PII |
| `try_on_step_viewed` (see-on-me redesign, B1–B3 shell) | Fires when a stepped capture screen (`StomStepLayout`) becomes the active one | `SeeThisOnMeScreen.tsx` (`useEffect` on `step`) | `step` (`selfie` / `full_body` / `body_fit`) |
| `try_on_result_liked` (see-on-me redesign B3) | Thumb-up tapped on the result screen (`OutfitPreview`'s overlaid feedback row). Single-choice — re-tapping the same thumb is a no-op; tapping the other thumb switches the vote (also fires `try_on_result_disliked`) | `useTryOnFeedback.ts` (`castVote`) | `outfit_hash` |
| `try_on_result_disliked` (see-on-me redesign B3) | Thumb-down tapped on the result screen | `useTryOnFeedback.ts` (`castVote`) | `outfit_hash` |

### 5.6 Body screen

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `body_photo_added` | First photo set in slot | `BodyScreen.tsx:263` | `slot` (`full_body`) |
| `body_photo_replaced` | Existing photo replaced | `BodyScreen.tsx:263` (same call, branched by `wasEmpty && !isRetake`) | `slot` |
| `body_photo_deleted` | Photo cleared | `BodyScreen.tsx:208` | `slot` |
| `body_photo_add_started` | Empty-state "Add photo" CTA tapped on the body-photo detail view (opens the camera/gallery source picker) — the intent step before an upload. Fixes the empty state that instructed "Tap Retake" but rendered no obvious button. | `BodyPhotoDetailView.tsx` (empty-add `onPress`) | `source` (`empty_detail`) |

### 5.7 Settings

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `notifications_toggle_changed` | Daily reminder switch flip | `SettingsScreen.tsx:418` | `enabled` |
| `notifications_schedule_changed` | Change-time dialog Update — AM/PM (period) + Weekdays/Everydays (frequency) cadence saved (AU-316; previously an un-fired gap, see §6.1). Fires on persist success | `SettingsScreen.tsx:541` | `period` (`AM`/`PM`), `frequency` (`weekdays`/`everydays`) |
| `notifications_reset` | "Reset to default setting" link applied — daily-notification block restored to first-run defaults (AU-316 RST-1). Fires on persist success | `SettingsScreen.tsx:617` | `period` (`AM`), `frequency` (`weekdays`) — the defaults applied |
| `notifications_reset_undone` | Undo tapped on the post-reset snackbar — prior notification values restored (AU-316 RST-1) | `SettingsScreen.tsx:565` | `period`, `frequency` — the restored prior values |
| `settings_language_changed` | Locale switch | `SettingsScreen.tsx:403` | `locale` (`en-EN`/`vi-VN`/`fr-FR`) |
| `style_direction_changed` | Style direction save | `SettingsScreen.tsx:507` | `direction` |
| `analytics_consent_changed` | Consent toggle (fires AFTER grant, BEFORE revoke) | `SettingsScreen.tsx:460, 466` | `granted` |
| `account_logged_out` | "Log out" row confirmed (Account section). Fires when the confirm dialog's primary is tapped, before `AuthContext.logout()` clears the session. Resolves the §6.1 gap ("no logout button on SettingsScreen"). | `SettingsScreen.tsx` (`handleLogout`) | `source` (`settings`) |

> PII: all settings events carry bounded enums only (`period`, `frequency`, `direction`, `locale`, `granted`, `enabled`) — no raw text, no identifiers. The read-only hour value (`'06:15'`) is NOT tracked. `notifications_reset` props echo the constant defaults (so the dashboard can confirm what "default" was at fire time); `notifications_reset_undone` echoes the restored prior values for symmetry.

### 5.8 Mood feedback

8 events fired from `src/hooks/use-mood-feedback.ts`: `wear_this_clicked`, `mood_feedback_opened`, `mood_feedback_skipped`, `mood_feedback_submitted`, `outfit_mood_linked`, `negative_mood_selected`, `mood_feedback_submission_failed`, `mood_chip_selected`/`mood_chip_deselected`. See file for full property shapes.

**Feeling-aware recommendations (AU-388) additions:**
- `mood_feedback_submitted` now carries (on BOTH the saved and the soft-negative branch, so the event shape is uniform):
  - `intent_moods: string[]` — engine-vocab projection of the chosen feeling chips (`feedbackMoodsToIntentMoods`, `services/mood/mood-vocabulary.ts`). Empty array when the selection maps to nothing.
  - `saved: boolean` — `true` when the outfit was saved to favourites; `false` for a soft-negative (`not_quite_me`) submission, which is recorded as feedback only and **not** saved.
  - `occasion?: string` — context for Feeling × Context analysis. **Omitted entirely when unknown** (no `null` per the no-null-props rule); fuller context (weather/temp/season/time) lands with the P1 capture schema.
- `negative_mood_selected` now fires from the dedicated soft-negative branch (a mixed selection like `[confident, not_quite_me]` still counts as a rejection) and also carries the optional `occasion` property (same omit-when-unknown rule).
- Funnel/analysis intent: validate the feedback→engine mood mapping (e.g. do users who pick `relaxed` favourite `confident`-mapped outfits?) before backend Feeling-Memory wiring. See `docs/strategy-mood-aware-recommendations.md`.

### 5.9 Global navigation

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `screen_viewed` | React Navigation `onStateChange` → route name change. `OnboardingLoading` skipped (transient). 500ms debounce on identical consecutive names. | `AppNavigator.tsx:70` (`handleNavStateChange`) | `screen_name`, `previous_screen_name?` |
| `feedback_opened` | Sidebar "Feedback" row tapped → navigates to the `Feedback` screen (App Store B3 dead-button fix — row was previously a no-op). | `SidebarMenu.tsx:107` (live push-drawer). The unused legacy `Sidebar.tsx:164` overlay carries the same call for parity. | `source` (`sidebar`) |
| `design_system_opened` | Email-gated "Design System" sidebar row tapped → opens the in-app DS reference page (internal-only, CEO + designer accounts). | `SidebarMenu.tsx` (live push-drawer). | `source` (`sidebar`) |

### 5.10 Analytics helpers (`src/services/analytics.ts`)

- `track(event, props?)` — primary entry. No-op until consent granted.
- `trackRecommendationViewedOnce(outfitHash, props?)` — module-level `Set<outfit_hash>` dedups per session. Resets on app restart. Used only for `outfit_recommendation_viewed`.
- `identifyUser` / `resetAnalytics` / `init*` / `*Consent` — unchanged.

### 5.11 Outfit Canvas (Remix editor)

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `canvas_item_layer_reordered` | Selected canvas item moved one layer via the toolbar (AU-360 fix — z-index swap with adjacent item). Fires only on an actual move, not at the front/back edge. | `OutfitCanvasScreen.tsx:448` (`moveLayer`) | `direction` (`forward`/`backward`) |
| `canvas_reset` | Canvas cleared to a blank state via the footer "+" new-canvas button (after the save/discard sheet resolves). | `OutfitCanvasScreen.tsx` (`resetCanvasToBlank`) | — |
| `creation_saved` | A creation persisted successfully (`creationsService.saveCreation` resolved — server, or a local-store fallback when offline). | `OutfitCanvasScreen.tsx:892` (`persistCreation`) | `item_count` (number of persisted items) |
| `creation_save_failed` | A save genuinely failed (the `creationsService.saveCreation` call threw). A true offline error never reaches here — the service falls back to a local save. | `OutfitCanvasScreen.tsx:910` (`persistCreation` catch) | `kind` — sanitized enum (`auth` session-expired / `server` other HTTP / `unknown`) |
| `creation_self_visualization_opened` | "See on me" sparkle tapped on a saved creation card — launches the try-on (`SeeThisOnMe`) flow with the creation's wardrobe items. | `MyCreationsScreen.tsx:133` (`handleVisualize`) | `creation_id` (internal id) |

> PII: `kind` is a closed enum, `creation_id` an internal record id — no garment names / free text. The Save→backend persist step now ships (`creation_saved`, §5.11 above is the success counterpart); other canvas toolbar actions (add / duplicate / swap / delete / tag add-remove) remain local-only editor state and are still uninstrumented (logged in §6.6).

### 5.12 App Feedback

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `feedback_submitted` | `POST /api/feedback` succeeds (201) | `FeedbackScreen.tsx:88` (mutation `onSuccess`) | `category` (`bug`/`idea`/`general`/`praise`), `rating?` (1–5, omitted when unset) |
| `feedback_submit_failed` | `POST /api/feedback` rejects | `FeedbackScreen.tsx:101` (mutation `onError`) | `error_code` — sanitized snake_case (`rate_limited` 429 / `validation_error` 422 / `auth_error` 401 / `network_error` no-status / `server_error` other) |

> PII: the free-text `message` is NEVER tracked — only `category` + optional `rating` leave the device. `platform` rides the global super-property. `screen_viewed` for `Feedback` fires from the global nav listener (§5.9), not double-tracked here.

### 5.13 Outfit Temperature override (AU-362)

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `temperature_modal_opened` | Lightbulb pill tapped → "Outfit Temperature" sheet opens | `HomeScreen.tsx:1770` via `analytics.ts:181` | `override_active` (bool) |
| `temperature_option_selected` | A temperature radio is selected in the sheet | `HomeScreen.tsx:1782` via `analytics.ts:186` | `option` (bucket key) |
| `temperature_apply_clicked` | Apply tapped (before the build resolves) | `HomeScreen.tsx:1787` via `analytics.ts:191` | `option` (bucket key) |
| `temperature_override_active` | Apply succeeded with a non-weather bucket → override now active | `HomeScreen.tsx:1805` via `analytics.ts:196` | `bucket` (bucket key), `rep_temp_c` (number) |
| `temperature_override_removed` | Apply with `weather` while an override was active → override cleared | `HomeScreen.tsx:1807` via `analytics.ts:204` | `previous_bucket` (bucket key) |
| `recommendation_generated_by_temperature` | A build completed under an active override. Dedup'd per `outfit_hash` per session (Set in `analytics.ts`, mirrors `trackRecommendationViewedOnce`) so "Show another" re-serving the same outfit doesn't double-count | `HomeScreen.tsx:949` via `analytics.ts:215` | `bucket` (bucket key), `outfit_count` (number) |

> PII: bucket KEYS only (`weather` / `hot_28_40` / `mild_10_25` / `cold_0_7` / `freezing_-10_0`) — never raw user text. `rep_temp_c` / `outfit_count` are unquoted numbers. `temperature_apply_clicked` is present-tense (borderline vs the `object_verb` past-tense convention) — kept verbatim per the AU-362 ticket for funnel continuity; flag to CEO if `temperature_applied` is preferred. Bucket→temp_c mapping lives in `src/config/temperature-buckets.ts` (single source of truth).

### 5.14 Legal documents (App Store blocker B5)

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `legal_document_viewed` | Terms of Service / Privacy Policy screen opens (mount effect). Fired once per screen mount; both entry points (Welcome legal-footer links + Settings rows) route through the same screen | `LegalDocumentScreen.tsx:60` via `analytics.ts:237` | `document` (`terms_of_service` / `privacy_policy`), `source` (`welcome` / `settings`) |

> PII: both props are bounded enums — no raw text, no URL, no identifiers. The screen owns the single fire site so the press handlers in `WelcomeScreen.tsx` / `SettingsScreen.tsx` only navigate (no double-count). `source` distinguishes the unauthenticated (Welcome) vs authenticated (Settings) entry for funnel segmentation.

### 5.15 AI data-sharing consent + AI-content disclosure (App Store blockers B1 + B2)

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `ai_consent_granted` | User accepts the AI data-sharing prompt before a try-on photo upload, OR flips the Settings "AI data sharing" toggle ON | `services/aiConsent.ts:32` (called from `useAiConsentGate.ts` Accept + `SettingsScreen.tsx` grant) | — |
| `ai_consent_declined` | User declines the AI data-sharing prompt (tap Decline / tap-outside) | `services/aiConsent.ts:38` (called from `useAiConsentGate.ts` Decline) | — |
| `ai_consent_revoked` | User flips the Settings "AI data sharing" toggle OFF (Privacy Policy §6 withdraw) | `services/aiConsent.ts:48` (called from `SettingsScreen.tsx` revoke) | — |
| `ai_content_reported` | User reports an AI-generated result (opens prefilled mailto). Fires from the inline disclosure "Report" link and from the Home AI-feedback floating button (`surface = recommendation`). | `components/features/AiContentDisclosure.tsx:30` (`useAiReport`); Home FAB via `HomeScreen.tsx` `handleReportAi` | `surface` (`tryon` / `recommendation`) |

> PII: none. `ai_consent_*` carry no properties; `ai_content_reported.surface` is a bounded enum. The Report mailto subject/body are static localized strings — no ids, photos, or free text leave the device via analytics. Consent is gated server-side too: the try-on route requires `gemini_opt_in === true`, and the client only sends that after a recorded grant, so no photo is uploaded pre-consent.

### 5.16 Root error boundary

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `app_error_caught` | Root `ErrorBoundary.componentDidCatch` fires — an unexpected render/lifecycle error was caught in the navigator subtree and the recoverable fallback rendered (instead of a white screen). Also reported to Sentry. | `components/common/ErrorBoundary.tsx:55` | `fatal` (boolean — always `false`; the boundary recovers) |

> PII: presence-of-error signal only. The raw `error.message` / component stack are NEVER tracked (they can carry PII) — those go to Sentry, not Mixpanel. The single `fatal: false` flag distinguishes a recovered boundary catch from a hard crash (the latter is captured by Mixpanel's automatic-events crash signal + Sentry).

### 5.17 Pin an item / build-around (AU-307 Figma redesign)

The pin feature (AU-307) originally shipped with NO analytics (only `console.info` placeholders). Wired during the 2026-06-20 Figma-flow rebuild. The "Don't show again" checkbox is the genuinely-new interaction the rule mandated; pin/unpin were existing actions with no prior event, so they get one now.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| **`item_pinned`** | An item becomes pinned — via the on-tile pill (confirm sheet skipped when "Don't show again" is set), or via the confirm/replace sheet "Build around this" CTA. | `HomeScreen.tsx:1624, 1706` | `source` (`home_tile_pill` / `home_confirm_sheet` / `home_confirm_sheet_replace`), `confirm_skipped` (bool) |
| **`item_unpinned`** | An item is unpinned — via tapping the "Tap to unpin" pill on the pinned tile. | `HomeScreen.tsx:1613` | `source` (`home_tile_pill`) |
| **`pin_dont_show_again_toggled`** | The "Don't show this popup again" checkbox in the pin-confirm sheet is toggled. Fires on every toggle (the value persists to `AsyncStorage` only on confirm). | `HomeScreen.tsx:1722` | `checked` (bool) |

> PII: none. `source` values are a closed enum of UI-surface keys; `confirm_skipped` / `checked` are unquoted booleans. No item id, no garment name, no free text. Item identifiers are intentionally omitted (the funnel question is "does the pin feature get used", not "which garment").

### 5.18 Schedule (outfit planning, mobile-local)

The Schedule screen (sidebar → Schedule) lets the user plan saved outfits / canvas creations onto calendar days. The store is now **backend-backed** (`/api/schedule`, via `scheduleService`) with per-user AsyncStorage (`@auxi/schedule/<userId>`) as an offline fallback only. Events capture the planning funnel: open the date picker → confirm a day; plus the in-Schedule add-source picker, day selection, and removal.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| **`favourite_schedule_opened`** | "Add to schedule" (calendar-add) tapped on a saved outfit (Favourite sticky action bar) — opens the date picker. | `FavouriteScreen.tsx:218` (`handleSchedule`) | `favorite_id` (internal id) |
| **`favourite_added_to_schedule`** | Date picker confirmed for a favourite — outfit scheduled to the chosen day. | `FavouriteScreen.tsx:224` (`handleConfirmSchedule`) | `favorite_id`, `date` (`YYYY-MM-DD`) |
| **`creation_schedule_opened`** | "Add to schedule" tapped on a saved creation — opens the date picker. | `MyCreationsScreen.tsx:66` (`handleSchedule`) | `creation_id` (internal id) |
| **`creation_added_to_schedule`** | Date picker confirmed for a creation — creation scheduled to the chosen day. | `MyCreationsScreen.tsx:72` (`handleConfirmSchedule`) | `creation_id`, `date` (`YYYY-MM-DD`) |
| **`schedule_add_tapped`** | Schedule header "+" tapped — opens the "Add an outfit" source picker. | `ScheduleScreen.tsx:186` (`handleAddOutfit`) | `date` (`YYYY-MM-DD`, the selected day) |
| **`schedule_add_source_selected`** | A source chosen in the "Add an outfit" picker — routes to that page. | `ScheduleScreen.tsx:193` (`handlePickSource`) | `source` (`favourite` / `creations`) |
| **`schedule_day_selected`** | A day tapped on the week strip. | `ScheduleScreen.tsx:181` (`handleSelectDay`) | `date` (`YYYY-MM-DD`), `is_today` (bool) |
| **`outfit_unscheduled`** | An outfit removed from a planned day (Schedule screen remove / collage-card remove). Fired from the store so every removal path is covered. | `ScheduleContext.tsx:173` (`unscheduleOutfit`) via `trackOutfitUnscheduled` | `source` (`favourite` / `creation`) — bounded enum, no ids/PII |

> Funnel intent: `*_schedule_opened` → `*_added_to_schedule` measures add-to-schedule completion per source (favourite vs creation); `schedule_add_tapped` → `schedule_add_source_selected` measures the in-Schedule "+" entry. `schedule_day_selected` is engagement with the rail. `outfit_unscheduled` ÷ `*_added_to_schedule` is the plan-removal (regret) rate.
>
> Note: **adding** to the schedule is intentionally NOT re-fired from the `scheduleService`/context wiring — it is already captured by `favourite_added_to_schedule` / `creation_added_to_schedule` at the screen level. Firing an extra `outfit_scheduled` from the store would double-count the add funnel, so only the previously-untracked removal (`outfit_unscheduled`) was added when the feature moved to the backend.
>
> PII: none. `favorite_id` / `creation_id` are internal record ids (no garment names, no free text); `date` is a calendar day (`YYYY-MM-DD`, no time); `source` is a closed enum; `is_today` is an unquoted boolean. The store itself is on-device only and never sent to a backend.

### 5.19 Push notifications (Phase 1)

FCM device-token lifecycle + tap routing (push-notification system, Phase 1).
Permission requested contextually after sign-in (AuthContext identity effect)
and when enabling the daily reminder (SettingsScreen). All events are
literal-named via `analytics.ts` helpers.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `push_permission_requested` | OS notification-permission prompt shown / re-evaluated (login + Settings reminder-enable) | `notificationService.ts` (`requestPushPermission`) via `analytics.ts` | — |
| `push_permission_granted` | Permission granted or provisionally granted | `notificationService.ts` via `analytics.ts` | — |
| `push_permission_denied` | Permission denied / not determined | `notificationService.ts` via `analytics.ts` | — |
| `device_token_registered` | FCM token successfully POSTed to `/api/notifications/device-token` (register + token-refresh re-register) | `notificationService.ts` (`registerCurrentToken`) via `analytics.ts` | — |
| `push_received` | A push arrived while the app was foregrounded (`onMessage`) | `notificationService.ts` (`registerPushTapHandlers`) via `analytics.ts` | `type` (notification type) |
| `push_opened` | A push was tapped and routed — cold-start (`getInitialNotification`) or background (`onNotificationOpenedApp`) | `notificationService.ts` (`registerPushTapHandlers`) via `analytics.ts` | `type` (notification type) |

> PII: none. `type` is the bounded notification-type enum (`daily_reminder` / `planned_outfit` / `admin_broadcast` / `admin_direct` / `admin_segment`) carried in the FCM `data` payload — no token, no deep-link url, no free text. Tokens never enter analytics. Deep-link tap routing uses the curated allowlist (`CURATED_PUSH_SCREENS` in `deepLinkHandler.ts`, the mobile mirror of spec §5.1); the `Creations` registry name maps to the RN route `MyCreations`.

### 5.22 Upgrade / Paywall (Macgie+)

The Macgie+ paywall (`UpgradeScreen`, reached from the Settings "Upgrade" pill for free users). Now backed by real IAP via RevenueCat (AU-415): Subscribe purchases the selected offering package and Restore restores prior purchases; the purchase lifecycle is instrumented in §5.23. `paywall_viewed` is the funnel denominator; the entry tap, plan selection, Subscribe/Restore taps, and back-dismiss round out the view→tap conversion. The entry points are behind a `SHOW_UPGRADE_PAYWALL` kill-switch (currently **dark**), so no paywall events fire in production until the flag is flipped.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `paywall_viewed` | UpgradeScreen focus (fires once per focus via `useFocusEffect`) — funnel denominator | `UpgradeScreen.tsx:130` | `source` (entry origin, mirrors `upgrade_entry_tapped`; defaults `settings`), `default_plan` (`yearly` — the initially-selected plan) |
| `upgrade_entry_tapped` | Settings "Upgrade to Macgie+" pill tapped → navigates to the paywall | `SettingsScreen.tsx:434` | `source` (`settings`) |
| `upgrade_plan_selected` | A plan card (Yearly / Monthly) is selected on the paywall | `UpgradeScreen.tsx:136` | `plan` (`yearly` / `monthly`) |
| `upgrade_subscribe_tapped` | The gradient Subscribe CTA is tapped (shows "coming soon" toast — no purchase) | `UpgradeScreen.tsx:145` | `plan` (`yearly` / `monthly` — currently-selected plan) |
| `upgrade_restore_tapped` | "Restore purchase" tapped (shows "coming soon" toast — no restore). Fires from two surfaces, disambiguated by `source` | `UpgradeScreen.tsx:156` (trust row `:229`, legal row `:258`) | `source` (`trust_row` / `legal_row`) |
| `paywall_dismissed` | Paywall closed via the header back button (`Header.BackTitle` onBack) | `UpgradeScreen.tsx:140` | `source` (entry origin) |

> PII: none. `source` / `plan` / `default_plan` are bounded enums (UI-surface + plan-id keys) — no prices, no user text, no ids. Prices come from RevenueCat's localized `priceString` for display only, never tracked. The purchase lifecycle fires from §5.23.

### 5.23 Purchase lifecycle (Macgie+ IAP via RevenueCat)

The RevenueCat purchase/restore flow on the paywall (AU-415). Subscribe → `Purchases.purchasePackage`; Restore → `Purchases.restorePurchases`. RevenueCat validates the receipt with Apple and pushes the `macgie_plus` entitlement to the backend via webhook (the durable authority for `is_premium`); these client events measure the store-side funnel. Fired via typed helpers in `analytics.ts` (no template strings). Still behind the `SHOW_UPGRADE_PAYWALL` kill-switch (dark) + RevenueCat stays unconfigured until a key is provisioned, so no data flows in production yet.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `purchase_started` | Subscribe CTA tapped → the RevenueCat purchase call is about to run (or the not-configured/no-package bail) | `analytics.ts` `trackPurchaseStarted`; called `UpgradeScreen.tsx` `handleSubscribe` | `plan` (`yearly` / `monthly`) |
| `purchase_succeeded` | Purchase resolved with an active `macgie_plus` entitlement | `analytics.ts` `trackPurchaseSucceeded`; `UpgradeScreen.tsx` `handleSubscribe` | `plan` (`yearly` / `monthly`), `product_id` (store product identifier) |
| `purchase_failed` | Purchase threw or cancelled, or offerings/package unavailable | `analytics.ts` `trackPurchaseFailed`; `UpgradeScreen.tsx` `handleSubscribe` | `reason` (sanitized enum: `user_cancelled` / `store_error` / `not_configured` / `unknown`) |
| `purchase_restored` | Restore completed | `analytics.ts` `trackPurchaseRestored`; `UpgradeScreen.tsx` `handleRestore` | `restored` (bool — whether an active entitlement was found) |

> PII: bounded enums only — `plan` (plan-id), `product_id` (store product identifier, not user data), a sanitized `reason` enum, and a `restored` boolean. NEVER a raw StoreKit / RevenueCat error string, receipt data, transaction id, or price. `upgrade_restore_tapped` (§5.22, the tap) and `purchase_restored` (§5.23, the outcome) are distinct: intent vs result.

## 6. Events — DESIGNED, awaiting UI/API (gaps)

These hooks were spec'd but cannot fire today — the UI surface, control, or API doesn't exist yet. **No code shipped for these** (we don't fake events). Re-evaluate when the underlying surface lands.

### 6.1 Settings — controls missing

- `daily_reminder_time_changed` — no hour-picker on `SettingsScreen` (only the AM/PM + frequency cadence is interactive — now tracked as `notifications_schedule_changed`, §5.7; the hour value `'06:15'` stays read-only display per CEO Q12, so a dedicated hour-change event remains a gap until a picker ships)
- `confidence_level_changed` — no confidence-level control
- ~~`account_logged_out`~~ — **SHIPPED** (§5.7): a "Log out" row now exists in the Account section (confirm dialog → `AuthContext.logout()`).
- `account_deleted` — "Delete data" row resets preferences (`resetUserPreferences`), doesn't delete the account
- `support_link_tapped` — no support/help/TOS/privacy links exist on this screen

### 6.2 Home — CTAs missing

- `outfit_try_on_tapped` — no "See on me" CTA on Home (footer is "Wear this" + Remix). Wire when a Home-level try-on entry ships.
- `outfit_swiped` `direction: 'previous'` — now fires on swipe-right (back navigation); `'next'` on swipe-left
- `outfit_swiped` `method: 'button'` — no button-driven swipe path; never fires today
- `context_chip_changed` runtime UI — mode-selector JSX commented out behind AU-221. `handleSelectMode` is wired so the event fires automatically once the UI lands.

### 6.3 Wardrobe — URL import (SHIPPED · PR #215)

The "Import from web" add-item flow is now built (real WebView search → extract →
preview → import via `wardrobeService.importWardrobeItemFromUrl`). The three
events are now WIRED and documented in §5 above:
`wardrobe_url_import_submitted` (ships hostname-only `url_domain`, never the raw
URL), `wardrobe_url_import_completed`, `wardrobe_url_import_failed`. The
`add_item_method_selected {method: 'import_web'}` option is back on
`WardrobeScreen` (`WardrobeScreen.tsx:326`).

### 6.3.b Wardrobe — search submit step not built

- `wardrobe_search_initiated`

`DatabaseScreen` today is a grid-browse-and-pick UI with no search box; the "Add" button is a basket-commit step, not a search submit. Event removed from §5 to avoid skewing the search funnel. Wire on a real search-query dispatcher when search lands.

### 6.4 Favourite + try-on outcomes — UI not built

- `favourite_outfit_opened` — `FavouriteOutfitCard` has no whole-card tap target (only remove ⊖ and try-on actions are tappable)
- `try_on_outcome_saved` (backend persist) — no server-side "save this look" affordance on `OutfitPreview`. The **save-to-device** variant now ships as `try_on_image_saved` (§5.5 — header download icon, Figma 3398:17581); a backend save remains unbuilt.
- `try_on_outcome_shared` — no share affordance on `OutfitPreview`
- **Thumbs feedback server-side persistence (see-on-me redesign B3):** `try_on_result_liked`/`try_on_result_disliked` (§5.5) ARE wired and fire on tap — the client-side analytics signal is real. What's still a gap: the vote is ALSO meant to persist server-side via `POST /api/tryon/feedback` (`tryOnFeedbackService.submitVote`), and that endpoint does not exist yet (confirmed absent from `wardrobe-backend/routers/**` and `API_DOCUMENTATION.md`). The client ships fire-and-forget against the contract now (errors swallowed, never blocks the UI) — re-evaluate the "was the vote durably recorded" server-side metric once the backend endpoint lands; a backend follow-up issue is needed to build + document it.

### 6.5 Body screen — slot coverage incomplete

`body_photo_added/replaced/deleted` only fire for `slot: 'full_body'` today. `selfie` and `body_shape` slots live in the SeeThisOnMe step screens (`StepSelfie`, `StepBodyShape`) with a different lifecycle (flow-state, not persisted slots editable independently). When those flows gain replace/delete affordances, mirror the same event names with the matching `slot` value.

### 6.7 Beautify — failure event not wired

- `beautify_failed { reason }` — `BeautifyPendingScreen` transitions to a "Couldn't beautify" error UI when polling detects `status === 'failed'` OR the 3-minute `MAX_WAIT_MS` timeout elapses, but **no `track()` call is present at either branch**. Wire condition: add `track('beautify_failed', { reason: 'server_error' | 'timeout' })` inside the two `setFailed(true)` branches in `BeautifyPendingScreen.tsx` (lines ~48 and ~63).

### 6.6 Outfit Canvas — non-reorder toolbar actions not yet instrumented

Only `canvas_item_layer_reordered` ships today (§5.11). The other `OutfitCanvasScreen` toolbar handlers (`handleAddItem`, `handleDuplicate`, `handleDelete`, swap-TODO, tag add/remove, undo/redo) and `handleSave` are local-only editor state with no persistence — the canvas never reaches the backend (`handleSave` is a TODO that just `goBack()`s). Wire `canvas_outfit_saved` (with `item_count`, `tag_count`) and the per-action events when the Save→persist endpoint lands. Re-wire condition: a real canvas-persist mutation exists.

### 6.8 Web sandbox login — real login / admin impersonation (no web events)

The web-preview ("sandbox") surface now boots through the real login screen (cookie auto-login across `*.auxi-web-review.pages.dev`) or an admin `?token=` impersonation param, instead of a forced review account. Mixpanel is stubbed on web (`web/stubs/mixpanel.ts`), so no auth events fire from the sandbox; impersonation auto-boot is not a user action. No new events — re-wire only if web analytics is ever un-stubbed. Spec: `docs/superpowers/specs/2026-07-06-web-sandbox-cookie-auth-and-admin-impersonation-design.md`.

### 6.9 Upgrade — purchase lifecycle (SHIPPED · AU-415, RevenueCat)

**SHIPPED** and documented in §5.23. The paywall now integrates RevenueCat IAP: Subscribe → `Purchases.purchasePackage`, Restore → `Purchases.restorePurchases`, with the entitlement pushed to the backend via webhook. All four events are WIRED via typed helpers in `analytics.ts` (`trackPurchaseStarted` / `trackPurchaseSucceeded` / `trackPurchaseFailed` / `trackPurchaseRestored`) and fire from `UpgradeScreen.tsx`.

Two deltas from the original spec:
- `purchase_succeeded` also carries `product_id` (the store product identifier) alongside `plan`, so revenue-by-product is segmentable.
- `purchase_restored` carries a `restored` boolean (entitlement found or not) rather than being prop-less, so the restore success rate is measurable.
- `reason` enum is `user_cancelled` / `store_error` / `not_configured` / `unknown` (RevenueCat surfaces cancellation via `error.userCancelled`; other failures collapse to `store_error` to avoid leaking raw store error strings).

Note: these still don't flow in production until `SHOW_UPGRADE_PAYWALL` is flipped AND a RevenueCat key is provisioned (the SDK stays unconfigured otherwise, so purchases can't start).

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
  - `sign_up_completed` fires on either verification path: the emailed magic link (real mode) or the auto-verify branch (dev "mock email" mode). The auto-verify branch additionally fires `sign_up_auto_verified` — segment on it to split self-serve email verification vs. auto-verified signups, or to isolate dev/mock traffic.
- **Sign-in funnel:** `sign_in_started` → `sign_in_completed` (break down by `method`)
- **OAuth funnel:** `oauth_sign_in_started` → `oauth_sign_in_completed` (break down by `provider`)
- **Welcome auth-entry split:** `oauth_sign_in_started` (by `provider`) vs `email_sign_in_started` — which entry point users pick on the Welcome screen; the email branch continues `email_sign_in_started` → `sign_up_started` → `sign_up_submitted` → `sign_up_completed`.
- **Onboarding step funnel:** `welcome_continued` → `location_permission_granted`/`_denied` → `wardrobe_direction_selected` → `fit_preference_selected` → `style_selected` → `onboarding_generated` → `onboarding_completed`
- **Recommendation engagement (value-moment rate):** `outfit_recommendation_viewed` → `outfit_favorited`
- **AI daily-limit "view latest outfits" fallback (Home, PR #291):** when a user over their daily AI budget taps "View latest outfits" on the Home limit page: `ai_limit_view_latest_tapped` → `ai_limit_view_latest_shown` (restored a persisted read-only deck) **or** `ai_limit_view_latest_empty` (nothing persisted → banner) **or** `ai_limit_view_latest_failed` (restore threw → banner). `ai_limit_view_latest_shown` ÷ `ai_limit_view_latest_tapped` is the salvage rate (how often a capped user still gets to see their most recent looks); `_empty` / `_failed` are the dead-end branches.
- **Try-on funnel:** `try_on_started` → `try_on_step_completed` ×N → `try_on_completed` → `try_on_outcome_retaken` *(extend to `_saved`/`_shared` when UI ships)*. **AU-358 note:** the render is now async (submit → poll) and so is the body-shape step — both run in the out-of-React generation store, so `try_on_started`/`try_on_completed` now bracket a worker poll, not a synchronous call. **Daily-limit terminal state:** `ai_limit_gate_shown` (`feature = try_on`, `phase = render`/`shapes`) is the "user hit today's AI budget" exit — it replaces `try_on_failed` / `body_shape_generation_failed` on a `429 ai_daily_limit_reached` and offers no retry. `ai_limit_gate_shown` ÷ `try_on_started` is the daily-cap block rate; segment by `phase` to see whether users are capped at the body-shape gen or the final render. **See-on-me redesign (stepped shell, B1–B3):** `try_on_step_viewed` (`step`: `selfie`/`full_body`/`body_fit`) now brackets each stepped capture screen becoming active — drop-off between consecutive `try_on_step_viewed` values is the per-step abandon rate. The funnel gains a **result-satisfaction step** at the tail: `try_on_completed` → `try_on_result_liked` **or** `try_on_result_disliked` (mutually exclusive per result, vote changeable). `(liked + disliked) ÷ try_on_completed` is the feedback-response rate; `liked ÷ (liked + disliked)` is result satisfaction. Server-side persistence of the vote (`POST /api/tryon/feedback`) is a backend follow-up (§6.4) — the client-side event fires regardless.
- **3-shape generation sub-funnel (AU-358):** `body_shape_generation_started` → `body_shape_generation_completed` (`partial` branch) → `body_shape_selected` → `try_on_started`. Drop-off at `_completed` measures AI body-shape gen reliability; `body_shape_generation_failed` ÷ `_started` is the failure rate. `body_shape_generation_backgrounded` is the leave-during-gen branch (recovered via `body_shape_generation_completed_notified`).
- **Reuse-on-return funnel (AU-354 pt.3):** on re-entry with a saved reusable body profile, `body_photo_reuse_confirmed` → `try_on_started` → `try_on_completed` measures returning-user conversion; `body_photo_retake_selected` is the drop-to-recapture branch (denominator: arrivals on the reuse-confirm screen). The reuse-confirm step is now a `ContextualBottomSheet`, so it has THREE mutually-exclusive exits off that denominator: `body_photo_reuse_confirmed` (proceed), `body_photo_retake_selected` (recapture), and `body_photo_reuse_dismissed` (backdrop-tap / swipe-down — leaves the flow). `body_photo_reuse_dismissed` ÷ arrivals is the silent-abandon rate that was invisible before the sheet dismiss was tracked.
- **Wardrobe-grow funnel (take-photo):** `add_item_opened` → `add_item_method_selected` (`take_photo`) → `add_item_upload_started` → `add_item_upload_succeeded` → `wardrobe_item_added` → `item_ready_toast_shown` (AU-361: background processing completed — tail of the take-photo funnel)
- **Wardrobe-grow funnel (database):** `wardrobe_search_initiated` → `wardrobe_search_result_selected` → `wardrobe_item_added`
- **Wardrobe load-error recovery (design-review F7):** `wardrobe_load_failed` → `wardrobe_load_retry_tapped` measures how often a failed wardrobe load is recovered via the error-state Retry (denominator: `wardrobe_load_failed`). A high failure rate with low retry signals a journey dead-end.
- **Wardrobe-browse engagement:** `wardrobe_filter_changed` and `wardrobe_sort_changed` are wardrobe browse-engagement signals — track them together to understand how users navigate and organise their grid (filtering by category vs reordering by date/name/worn).
- **Refine-engagement funnel:** `refine_modal_opened` → `refine_chip_selected` ×N → `refine_submitted` (vs `refine_cancelled`, or `refine_skipped` on the after-6 gate). `refine_skipped` ÷ `refine_modal_opened` (source `viewed_threshold`) measures defer rate on the progressive gate; rising `skipped_count` flags users repeatedly dodging refinement.
- **Retention insight:** `screen_viewed` per `screen_name` over time — identifies dead screens
- **Mood-feedback funnel:** `wear_this_clicked` → `mood_feedback_opened` → `mood_feedback_submitted` (vs `mood_feedback_skipped`)
- **App-feedback submission funnel:** `screen_viewed` (`screen_name = Feedback`) → `feedback_submitted` (vs `feedback_submit_failed`, broken down by `error_code`) — measures completion rate of the feedback form and surfaces rate-limit / validation friction.
- **Temperature-override funnel (AU-362):** `temperature_modal_opened` → `temperature_apply_clicked` → `temperature_override_active` → `recommendation_generated_by_temperature` — answers the ticket's analytics goal: do users actually adopt a temperature override vs stay on live weather? Break down by `option` / `bucket` to see which ranges are used. `temperature_override_removed` is the return-to-weather branch; `temperature_option_selected` ÷ `temperature_apply_clicked` measures browse-vs-commit on the radios.

- **Home view-toggle adoption:** `home_view_toggled` broken down by `view` measures how often users switch the outfit sheet to the collage layout vs stay on the grid — a low collage rate flags weak discoverability or low value of the alternate layout (informs the AU-253 collage seed-layout investment). Denominator: `screen_viewed` (`screen_name = Home`). **Filter `source = home`** — the identical toggle pill is also mounted on the Favourite header (`source = favourite`), and those taps must be excluded or they inflate the numerator against a Home-only denominator. Conversely, `source = favourite` is the basis for a separate "Favourite view-toggle adoption" cut should it be needed.

- **Notification-settings engagement (AU-316):** `notifications_toggle_changed` / `notifications_schedule_changed` / `notifications_reset` measure how users tune the daily reminder; `notifications_reset` ÷ `notifications_reset_undone` is the regret rate on the reset action (a high undo rate signals the reset is too easy to trigger or its defaults are wrong — relevant to the pending UAC 07:30 vs constant 06:15 default discrepancy). Break down `notifications_schedule_changed` by `frequency`/`period` to see preferred cadence.

- **Push opt-in + engagement funnel (push Phase 1):** `push_permission_requested` → `push_permission_granted` → `device_token_registered` measures registration completion (denominator: requested; `push_permission_denied` is the drop branch). Engagement: `push_opened` ÷ `push_received` (foreground) plus cold/background opens — break down by `type` to compare `daily_reminder` vs `planned_outfit` vs `admin_*` open rates.

- **Upgrade / paywall funnel (Macgie+, §5.22 + §5.23):** `paywall_viewed` → `upgrade_plan_selected` → `upgrade_subscribe_tapped` → `purchase_started` → `purchase_succeeded` *(now WIRED — §5.23, RevenueCat IAP; flows once `SHOW_UPGRADE_PAYWALL` is flipped + a RC key is provisioned)*. Measures paywall view→intent→purchase conversion; `paywall_viewed` is the denominator, `upgrade_entry_tapped` ÷ Settings `screen_viewed` (`screen_name = Settings`) measures pill CTR into the paywall. `paywall_dismissed` ÷ `paywall_viewed` is the bounce rate. Break down by `source` (paywall entry origin) and `default_plan` / `plan` (which plan users start on vs commit to). **Note:** the paywall entry points are currently behind the `SHOW_UPGRADE_PAYWALL` kill-switch (dark), so this funnel has no data until the flag is flipped for funnel collection / App-Store screenshots.

- **Beautify funnel:** `beautify_started` → `beautify_ready` → `beautify_review_opened` → `beautify_accepted`. Drop-off between `beautify_started` and `beautify_ready` = job failure / timeout rate (see §6.7 gap — `beautify_failed` not yet wired so failures are only visible as missing continuations). `beautify_wait_continued_browsing` between `started` and `ready` is the leave-during-wait branch — segment `beautify_review_opened` by `from` (`loader` vs `snackbar`) to compare users who watched the full loader vs returned via the Wardrobe snackbar. `beautify_kept_original` and `beautify_regenerated` are exits or re-entry loops from the review step; `beautify_regenerated` broken down by `source` (`review` vs `retry_pending`) distinguishes deliberate re-rolls from failure-recovery retries. `add_item_mode_selected { mode: 'beautify' }` is historical only because the upload-time selector was removed.

- **Enhance funnel (on-demand, §5.21):** `enhance_started` → `enhance_completed` → `enhance_applied`. Drop between `started` and `completed` = failure rate — break `enhance_failed` down by `reason` (`timeout` specifically tests the "under 10 seconds" promise). Drop between `completed` and `applied` splits into `enhance_discarded` (user rejected the result — a quality signal on the studio-shot model) vs silent exits (backed out of the preview). `enhance_apply_failed` between `completed` and `applied` is the save-error branch. Keep separate from the `beautify_*` upload-time funnel — same backend, different intent.

Common breakdown dimensions: `method`, `provider`, `chip_type`, `source`, `category`, `direction`, `option`/`bucket`, `frequency`/`period`, `view`, `type`. Super properties (`platform`, `app_environment`) are available globally.

### 5.20 AI Beautify (studio-shot)

> **DORMANT** — the add-item sheet's mode selector was removed, so this upload-time flow is no longer user-reachable; new studio shots come from the on-demand Enhance flow (§5.21). The screens/events below stay wired for the dormant path and for historical data.

The Beautify flow lets a user upload a garment photo and have GPT image-editing produce a studio-style shot. The flow is: upload → job submitted (`beautify_started`) → pending/polling screen → job resolves (`beautify_ready`) → review screen → accept / keep original / regenerate.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `beautify_started` | Upload succeeded with `mode: 'beautify'` and `createdItem.id` is present — beautify job submitted, navigation to BeautifyPending | `useAddWardrobeItem.ts:165` | — |
| `beautify_wait_continued_browsing` | User taps "Continue browsing" on the pending/loader screen and navigates back to Wardrobe (job keeps running in background) | `BeautifyPendingScreen.tsx:136` | — |
| `beautify_ready` | Polling detects `status === 'ready'` — auto-navigates to BeautifyReview with `from: 'loader'` | `BeautifyPendingScreen.tsx:55` | — |
| `beautify_review_opened` | BeautifyReview screen mounts — fired via `useFocusEffect`-equivalent `useEffect` on mount. `from` distinguishes the two entry points: the loader auto-advance vs the Wardrobe snackbar tap (user left the loader and returned via the "Studio shot ready — Review" snackbar) | `BeautifyReviewScreen.tsx:35` | `from` (`loader` / `snackbar`) |
| `beautify_accepted` | User taps "Accept & save" — `wardrobeService.acceptBeautify` resolves; the studio shot replaces the original image in the wardrobe | `BeautifyReviewScreen.tsx:55` | — |
| `beautify_kept_original` | User taps "Keep original" — `wardrobeService.discardBeautify` resolves; the original image is retained unchanged | `BeautifyReviewScreen.tsx:66` | — |
| `beautify_regenerated` | User requests a new studio shot. Two call sites with different prop shapes: from BeautifyReview ("Regenerate" button) carries `attempt`; from BeautifyPending failed-state ("Try again" button) does not — attempt count is unavailable after a timeout/failure reset | `BeautifyReviewScreen.tsx:77` (`source: 'review'`), `BeautifyPendingScreen.tsx:105` (`source: 'retry_pending'`) | `source` (`review` / `retry_pending`), `attempt` (integer ≥ 1, present only when `source === 'review'`) |

> PII: none. `from` and `source` are closed enums; `attempt` is an unquoted integer (server-side counter). No garment names, URLs, or user identifiers.
>
> Note: `beautify_failed` is NOT wired — see §6.7. The pending screen shows a "Couldn't beautify" UI when polling times out or `status === 'failed'` but tracks no event at that point.

### 5.21 AI Image Enhancement (on-demand, Item Detail)

The on-demand v2 of the beautify branch: an existing wardrobe item is enhanced from Item Detail's sparkle FAB. Same backend endpoints as §5.20 but a synchronous preview UX ("under 10 seconds", 2s poll, 15s client timeout) with an explicit Discard / Replace-original decision. Distinct `enhance_*` event names keep this funnel separate from the upload-time `beautify_*` one.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `enhance_started` | Enhance session begins — `POST /items/{id}/beautify` submitted from the EnhanceImage screen (mount and every Retry) | `EnhanceImageScreen.tsx` (`startSession`) | `item_id` |
| `enhance_completed` | Polling detects `status === 'ready'` with a candidate — preview swaps to the enhanced image | `EnhanceImageScreen.tsx` | `item_id`, `duration_ms` |
| `enhance_failed` | Session ends in the error state | `EnhanceImageScreen.tsx` (`fail`) | `item_id`, `reason` (`network` / `timeout` / `server_error`) |
| `enhance_discarded` | User taps Discard — candidate dropped, original untouched | `EnhanceImageScreen.tsx` | `item_id` |
| `enhance_applied` | User taps Replace original — `acceptBeautify` resolves, studio shot becomes the display image | `EnhanceImageScreen.tsx` | `item_id` |
| `enhance_apply_failed` | Replace original errored (server/storage) — user stays on the preview, candidate preserved | `EnhanceImageScreen.tsx` | `item_id` |

> PII: none. `reason` is a closed enum; `item_id` is the backend UUID (consistent with `item_detail_opened` / `wardrobe_item_edited`).
>
> Not wired (deliberate MVP cut): a compare-used event for the long-press original preview, and `enhance_restore_original` — the restore-from-Edit affordance does not exist yet (no backend endpoint or UI).

### 5.24 Capsule Wardrobe

Curated wardrobe subsets ("capsules") with rule-based outfit generation (spec `plans/260718-0433-capsule-wardrobe/spec.md` §6). All wrappers live in `src/services/analytics.ts` (`trackCapsule*`), literal event names, no template strings. **PII: the capsule NAME is never sent** — only numeric constraints, sanitized error enums, and live counts.

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `capsule_creation_started` | Create Capsule row tapped in the switcher | `WardrobeScreen.tsx`, `CapsuleDetailScreen.tsx` | `source` (`switcher`) |
| `capsule_configured` | Create tapped on the requirements step | `CapsuleInfoScreen.tsx` | `has_temp_range`, `formalness_level?`, `outfit_target?`, `shoe_limit?` |
| `capsule_generation_started` | Create mutation fires on the generating screen | `CapsuleGeneratingScreen.tsx` | `outfit_target?` |
| `capsule_generation_backgrounded` | "Leave — notify me when ready" tapped | `CapsuleGeneratingScreen.tsx` | — |
| `capsule_generated` | Generation resolves success / success_with_gaps / failed | `CapsuleGeneratingScreen.tsx` | `status`, `item_count`, `outfit_count` |
| `capsule_generation_failed` | Create API rejects | `CapsuleGeneratingScreen.tsx` | `error_kind` (sanitized enum), `status?` |
| `capsule_viewed` | Detail opened — **once per capsule id per session** (Set dedup, `trackCapsuleViewedOnce`) | `CapsuleDetailScreen.tsx` | `item_count`, `outfit_count` |
| `capsule_summary_expanded` | Expandable summary opened | `CapsuleSummaryPanel.tsx` | — |
| `capsule_add_source_selected` | Add-source chosen | `CapsuleAddFlow.tsx` | `source` (`wardrobe` / `favourites` / `creations`) |
| `capsule_items_added` | Add success (wardrobe items or from-outfits) | `CapsuleAddFlow.tsx` | `source`, `items_added`, `new_outfits`, `already_existed` |
| `capsule_item_removed` | Item removed from capsule | `CapsuleItemDetailScreen.tsx` | `used_in_outfits` |
| `capsule_item_changed` | Item swapped | `CapsuleItemDetailScreen.tsx` | `scope` (`outfit` / `all`) |
| `capsule_deleted` | Capsule deleted | `CapsuleDetailScreen.tsx` | — |
| `capsule_switcher_opened` | "Choose a wardrobe" sheet opened (header title tap) | `WardrobeScreen.tsx`, `CapsuleDetailScreen.tsx` | — |
| `wardrobe_context_selected` | A wardrobe context chosen in the switcher | `WardrobeScreen.tsx`, `CapsuleDetailScreen.tsx` | `context` (`entire` / `capsule`) |
| `capsule_settings_edited` | Capsule settings saved via the edit screen | `CapsuleEditScreen.tsx` | `changed_constraints` (bool — a numeric constraint changed vs name-only) |

> Design revision 260719 (wardrobe switcher + capsule edit): the three events above are added by the switcher/edit surface (spec `plans/260718-0433-capsule-wardrobe/spec.md` §9.2). `wardrobe_context_selected.context` is a closed enum; `capsule_settings_edited.changed_constraints` is a boolean (true regenerates outfits server-side). No capsule name is ever sent.
>
> PII: none. Constraints (`formalness_level`, `outfit_target`, `shoe_limit`, `temp` via the `has_temp_range` boolean) are numeric/boolean; `error_kind` is a closed enum (`network_error` / `timeout` / `server_error` / `not_found` / `unknown`) derived by `classifyCapsuleError`; counts come from live server joins.
>
> Local-notification gap (§6 style): the "notify me when ready" seam (`src/services/capsuleNotifications.ts`) is a logged no-op — the repo ships only remote FCM display (`@react-native-firebase/messaging`), no local-notification lib. Re-wire condition: add a local-notification dependency, then implement `notifyCapsuleReady`. The in-app `toast.success('Your capsule is ready.')` is today's user-visible signal.
