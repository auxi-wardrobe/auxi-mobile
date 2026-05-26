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

| Event | Trigger | Location | Properties |
|---|---|---|---|
| `sign_in_completed` | login() resolves | `AuthContext.tsx` `login` | `method` (`email`) |
| `onboarding_completed` | `completeOnboarding()` ok | `StylePickerScreen.tsx` mutation `onSuccess` | `styles_selected`, `wardrobe_direction`, `fit_preference` |
| **`outfit_favorited`** ★ | `saveFavourite` success | `HomeScreen.tsx` `handleHeartTapForOutfit` | `outfit_hash`, `item_count`, `source` |
| `try_on_started` | generate invoked | `BodyScreen.tsx` `handleGenerateTryOn` | `outfit_hash`, `item_count`, `has_body_photo` |
| `try_on_completed` | generate success | `BodyScreen.tsx` | `outfit_hash` |
| `try_on_failed` | generate error | `BodyScreen.tsx` | `outfit_hash` |

★ = Value Moment. Pre-existing events `refine_modal_opened` / `refine_submitted` / `refine_cancelled` (HomeScreen refine flow) already route through the same seam — keep them.

## 6. Events — DESIGNED, not yet wired (follow-ups)

- `sign_up_started` (register) — `register()` has no authenticated user yet; track method only.
- `sign_up_completed` at email verification — wire in `VerifyEmailScreen` once that handler is confirmed.
- OAuth method tagging — Google/Apple sign-in path doesn't clearly route through `AuthContext.login`; `sign_in_completed` currently tags `email` only. Locate the OAuth login path and pass the real `method`.
- `outfit_recommendation_viewed` — **intentionally deferred**: the prefetch/swipe pipeline buffers outfits ahead, so firing on fetch over-counts. Define "viewed" as *the active sheet settling on a new outfit* and wire there.
- `outfit_unfavorited` — `favouriteService` has no remove path yet (see PHASE B/D TODO in HomeScreen).
- `wardrobe_item_added`, `screen_viewed` (React Navigation listener).

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
