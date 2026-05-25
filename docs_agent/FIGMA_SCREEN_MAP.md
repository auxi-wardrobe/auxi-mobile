# Figma Screen Map (New Design Page Remap)

Last updated: 2026-05-25
File key: `0nXXMAR4Arf1ZfjtQvtBh0`
Source page: [`2849:8205`](https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8205) — new design root container (PAGE/section, 18470×20056 px; holds dozens of frames, not a single screen)

> **Page migration note (2026-05):** the old master page `470:1121` is **SUPERSEDED**.
> The current design lives under node-id ranges **`2849:*` / `2850:*` / `2852:*`** (plus a
> few `2865:*` / `2870:*` item-attribute sub-frames) on the new root container `2849:8205`.
> Any node from the `470/909/1032/1039/1064/392:*` ranges in older docs/PRs is stale — do
> not lift those node IDs. The auth/UAC flow (`2849:101xx`) was extracted separately in
> `plans/260521-2335-au-242-figma-spec/` and is reused verbatim here.

This map matches app routes (from `src/navigation/AppNavigator.tsx` + `src/navigation/AuthNavigator.tsx`)
to frames in the new page. Where the new page has no clear frame for a route, it is marked
**`Unresolved`** rather than fabricating a node ID — accuracy over completeness.

URL format: `https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=<nid-with-dash>`

---

## Auth / UAC flow (Auth stack — `UAC_V2_ENABLED`)

Reused verbatim from the AU-242 extraction (`plans/260521-2335-au-242-figma-spec/00-index.md`).
Frame size 414×896. Auth screens live under `src/screens/auth/`.

| App Route               | Mapping Status | Node ID      | Exact Node URL                                                               | Target File                                          | Notes                                                                          |
| ----------------------- | -------------- | ------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Welcome (auth landing)  | `Locked`       | `2849:10085` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10085  | `src/screens/auth/WelcomeScreen.tsx`                 | "Welcome Home" frame — 3 sign-in options (Google/Apple/Email) + language link. |
| LanguageSettings        | `Locked`       | `2849:10108` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10108  | `src/screens/auth/LanguageSettingsScreen.tsx`        | "setting \ language" — list-based language switcher, lives in auth flow.       |
| EmailInput              | `Locked`       | `2849:10143` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10143  | `src/screens/auth/EmailInputScreen.tsx`              | "input email" — signup / signin pre-check.                                     |
| EmailInput (error)      | `Locked`       | `2849:10205` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10205  | `src/screens/auth/EmailInputScreen.tsx`              | "input email \| faii" — invalid-format error state.                            |
| EmailGoogleNotice       | `Locked`       | `2849:10267` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10267  | `src/screens/auth/EmailGoogleNoticeScreen.tsx`       | "gmail process" — email already linked to Google → forced OAuth.               |
| VerifyEmail             | `Locked`       | `2849:10276` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10276  | `src/screens/auth/VerifyEmailScreen.tsx`             | "input email" — open mail app + resend cooldown.                               |
| PasswordCreation (typing) | `Locked`     | `2849:10296` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10296  | `src/screens/auth/PasswordCreationScreen.tsx`        | "pass creation" — criteria pending state.                                      |
| PasswordCreation (valid)  | `Locked`     | `2849:10379` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10379  | `src/screens/auth/PasswordCreationScreen.tsx`        | "pass creation success" — all criteria met, CTA enabled.                       |
| SignIn                  | `Locked`       | `2849:10462` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10462  | `src/screens/auth/SignInScreen.tsx`                  | "welcomeback" — returning user, email read-only + password.                    |
| ForgotPasswordRequest   | `Locked`       | `2849:10535` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10535  | `src/screens/auth/ForgotPasswordRequestScreen.tsx`   | "forgot pass" — submit email.                                                  |
| ForgotPasswordCheckMail | `Locked`       | `2849:10552` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10552  | `src/screens/auth/ForgotPasswordCheckMailScreen.tsx` | "forgot pass \| check mail" — reset email sent confirmation.                   |
| ResetNewPassword        | `Locked`       | `2849:10570` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10570  | `src/screens/auth/ResetNewPasswordScreen.tsx`        | "reset pass" — set new password from reset link.                               |
| Verified                | `Locked`       | `2849:10099` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10099  | `src/screens/auth/VerifiedScreen.tsx`                | "verified successfully" — terminal convergence point.                          |

> `Login` / `Register` are legacy fallback routes behind `UAC_V2_ENABLED=false` and have no
> new-page frame (the new design is UAC-v2 only). Marked **Unresolved (legacy fallback)**.

---

## Onboarding flow (Main stack — first-login)

The app onboarding is `Welcome → GenderPreference → StylePreference → StylePicker → Home`
(LocationPermission **dropped** from the product — see row below).
The new page reorganizes this as a 3-step picker ("Step N/3"): wardrobe direction → fit → styles,
plus an entry intro and a completion state. Frame size 414×896 (style picker steps are taller).

| App Route           | Mapping Status      | Node ID      | Exact Node URL                                                              | Target File                                | Notes                                                                                                       |
| ------------------- | ------------------- | ------------ | --------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Welcome (main stack)| `Locked`            | `2849:8332`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8332  | `src/screens/AppWelcomeScreen.tsx`         | "Welcome Home" — "Welcome to auxi" + "Get started — takes 1 min". Exact match for first-login entry.        |
| LocationPermission  | `Removed (product)` | —            | —                                                                           | `src/screens/LocationPermissionScreen.tsx` | **Dropped from product 2026-05-25** (no design frame, not needed). Screen code + nav wiring still present — code removal not yet scheduled (doc-only decision). |
| GenderPreference    | `Locked`            | `2849:8339`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8339  | `src/screens/GenderPreferenceScreen.tsx`   | "onboarding \| choose wardrobe" — Step 1/3 "What's your wardrobe like?" (Womenswear/Menswear/Mixed) = `wardrobe_direction`. |
| StylePreference     | `Locked (variants)` | `2849:8423`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8423  | `src/screens/StylePreferenceScreen.tsx`    | "choose fit" Step 2/3 "How do you like things to fit?" = `fit_preference`. Menswear variant; see variants table below. |
| StylePicker         | `Locked (variants)` | `2849:9793`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-9793  | `src/screens/StylePickerScreen.tsx`        | "other womenswear \| styles" Step 3/3 "Which of these feels most like you?" (pick up to 2) = `style_preferences`. See variants below. |
| Onboarding complete | `Locked`            | `2849:8477`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8477  | `src/screens/StylePickerScreen.tsx` (terminal state) | "completed onboarding" — "Your … wardrobe will be ready" + Analyzing/Building progress, then Home. Not a separate route. |

### Onboarding variant frames

| Design State                  | Node ID      | Exact Node URL                                                              | Suggested Target                        | Notes                                              |
| ----------------------------- | ------------ | --------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| Choose wardrobe (alt)         | `2850:13995` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-13995 | `src/screens/GenderPreferenceScreen.tsx`| Duplicate "choose wardrobe" frame.                 |
| Choose fit — womenswear       | `2849:8443`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8443  | `src/screens/StylePreferenceScreen.tsx` | Womenswear fit variant.                            |
| Choose fit — mixed            | `2849:8460`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8460  | `src/screens/StylePreferenceScreen.tsx` | Mixed/unisex fit variant.                          |
| Styles — other options (men)  | `2849:9748`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-9748  | `src/screens/StylePickerScreen.tsx`     | Menswear style options (taller frame, 1137px).     |
| Styles — other options (men2) | `2849:9883`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-9883  | `src/screens/StylePickerScreen.tsx`     | Menswear style options variant.                    |
| Styles — womenswear (alt)     | `2849:9838`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-9838  | `src/screens/StylePickerScreen.tsx`     | Womenswear style options variant.                  |
| Completed onboarding (alt)    | `2849:8498`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8498  | `src/screens/StylePickerScreen.tsx` (terminal) | Second completion-state frame.              |

---

## Home (Main stack)

`HomeScreen.tsx`. Base node + key interaction states. Frame size 414×896.

| App Route | Mapping Status | Node ID      | Exact Node URL                                                              | Target File                  | Notes                                                                       |
| --------- | -------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Home      | `Locked`       | `2852:16986` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-16986 | `src/screens/HomeScreen.tsx` | Base Home: weather/date header, outfit grid w/ "common" tags, Remix, "Show another", "Wear this" CTA, bottom view toggle. |

### Home interaction states / variants

| Home Variant            | Node ID      | Exact Node URL                                                              | Suggested Target             | Notes                                                                   |
| ----------------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Home — loading          | `2850:11205` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-11205 | `src/screens/HomeScreen.tsx` | Recommendation loading state.                                           |
| Home 1/3 (option pager) | `2850:9125`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-9125  | `src/screens/HomeScreen.tsx` | First of the 3-option recommendation pager.                             |
| Home 2/3                | `2850:9250`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-9250  | `src/screens/HomeScreen.tsx` | Second option page.                                                      |
| Home 3/3                | `2849:11960` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-11960 | `src/screens/HomeScreen.tsx` | "Home for option 3/3" — third option page.                              |
| After 2 packs (6 opts)  | `2850:11059` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-11059 | `src/screens/HomeScreen.tsx` | "Show another" exhausted-pack state.                                     |
| Menu open               | `2852:26588` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-26588 | `src/screens/HomeScreen.tsx` | Hamburger / nav drawer open over Home (alt: `2852:26393`).              |
| Select context (chip)   | `2850:11300` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-11300 | `src/screens/HomeScreen.tsx` | Context chip selection (occasion/weather/time).                         |
| Input context (keyboard)| `2850:11453` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-11453 | `src/screens/HomeScreen.tsx` | Free-text context input + keyboard.                                     |
| Collage view 3–6 items  | `2850:13590` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-13590 | `src/screens/HomeScreen.tsx` | Collage layout; 4/5/6-item variants `2850:13618`/`13647`/`13677`.       |
| Outfit with N items     | `2850:9508`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-9508  | `src/screens/HomeScreen.tsx` | Item-count variants: 6 (`9508`), >6 (`9542`), 5 (`9580`), 3 (`9613`).   |
| Loved item + snackbar   | `Unresolved` | —            | —                                                                           | `src/screens/HomeScreen.tsx` | No dedicated "loved" Home frame. `Snackbar` exists as a component (`2852:7142`, `2852:20247`); love toggle state not frame-captured. Confirm. |

---

## Wardrobe (Main stack)

| App Route | Mapping Status | Node ID      | Exact Node URL                                                              | Target File                      | Notes                                                                       |
| --------- | -------------- | ------------ | --------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Wardrobe  | `Locked`       | `2850:16483` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16483 | `src/screens/WardrobeScreen.tsx` | "wardrobe" — grid + category filter chips (All / One-Piece / Top / Bottoms / Ac / Shoes) + add (+) button. |

### Wardrobe-adjacent frames (add-item / database)

| Design State          | Node ID      | Exact Node URL                                                              | Suggested Target                  | Notes                                              |
| --------------------- | ------------ | --------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Add item              | `2850:16584` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16584 | `src/screens/WardrobeScreen.tsx` (add flow) | "add" entry.                              |
| Take photo            | `2852:19995` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-19995 | Wardrobe add flow                 | Camera capture state.                              |
| Add item — loading    | `2852:20021` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-20021 | Wardrobe add flow                 | Upload/processing state.                           |
| Database view         | `2850:16559` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16559 | `src/screens/DatabaseScreen.tsx`  | "database view".                                   |
| Database selected     | `2850:20024` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-20024 | `src/screens/DatabaseScreen.tsx`  | Selection state.                                   |
| Database search       | `2850:17504` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-17504 | `src/screens/DatabaseScreen.tsx`  | Search state.                                       |

---

## Item Detail (Main stack)

| App Route  | Mapping Status | Node ID      | Exact Node URL                                                              | Target File                        | Notes                                                                       |
| ---------- | -------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| ItemDetail | `Locked`       | `2852:20047` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-20047 | `src/screens/ItemDetailScreen.tsx` | "detail" — item photo + Name/Style/Energy attributes + More/Edit + Add/Cancel. |

### Item Detail states / attribute editors

| Design State            | Node ID      | Exact Node URL                                                              | Suggested Target                   | Notes                                                       |
| ----------------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Detail item — more      | `2850:16678` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16678 | `src/screens/ItemDetailScreen.tsx` | Expanded "more" actions.                                    |
| Detail item — more/edit | `2852:16316` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-16316 | `src/screens/ItemDetailScreen.tsx` | Edit mode.                                                  |
| Detail — categories     | `2852:15222` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-15222 | `src/screens/ItemDetailScreen.tsx` | Category picker.                                            |
| Edit Color              | `2852:15453` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-15453 | `src/screens/ItemDetailScreen.tsx` | Color attribute editor.                                    |
| Edit Fit                | `2852:15610` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-15610 | `src/screens/ItemDetailScreen.tsx` | Fit attribute editor.                                      |
| Edit Style              | `2852:15701` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-15701 | `src/screens/ItemDetailScreen.tsx` | Style attribute editor.                                    |
| Edit Occasion           | `2852:15813` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-15813 | `src/screens/ItemDetailScreen.tsx` | Occasion attribute editor.                                 |
| Edit Materials          | `2865:13145` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2865-13145 | `src/screens/ItemDetailScreen.tsx` | Materials attribute editor.                                |
| Edit Energy             | `2870:13875` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2870-13875 | `src/screens/ItemDetailScreen.tsx` | Energy attribute editor.                                   |
| Detail AI — states      | `2852:22571` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-22571 | `src/screens/ItemDetailScreen.tsx` | AI tagging: fail (`22571`), success (`2852:22592`), loading (`2852:22899`). |

---

## Body (Main stack)

| App Route | Mapping Status      | Node ID      | Exact Node URL                                                              | Target File                  | Notes                                                                       |
| --------- | ------------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Body      | `Partial / nearest` | `2850:16157` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16157 | `src/screens/BodyScreen.tsx` | "body photo" — full-screen single body photo + "This photo helps show how outfits look on you" + Delete/Retake. Reached from Settings → Manage body photo. **No dedicated full Body-management frame**; this single-photo detail is the nearest match. (Try-on sub-mode **dropped from product 2026-05-25** — see note below.) |

> The app's try-on flow (`Body` route with `mode: 'tryOn'`) is **dropped from the product (2026-05-25)** — no design frame, feature cut. Try-on code (`src/services/try-on.ts` + Body try-on UI) still present; code removal not yet scheduled (doc-only decision).

---

## Settings (Main stack)

`SettingsScreen.tsx`. New Settings section is `2850:15839`. Frame size 414×896.

| App Route | Mapping Status | Node ID      | Exact Node URL                                                              | Target File                      | Notes                                                                       |
| --------- | -------------- | ------------ | --------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Settings  | `Locked`       | `2850:15840` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-15840 | `src/screens/SettingsScreen.tsx` | "setting" base: Daily Time (toggle + 6:15 AM / Weekdays), Style Direction (Stay Balanced), Privacy control, Your information, Manage body photo, Delete data, Version 1.0.3, Dark Mode toggle. Alt frame `2850:15915`. |

### Settings states / dialogs

| Design State              | Node ID      | Exact Node URL                                                              | Suggested Target                   | Notes                                                            |
| ------------------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Settings (alt base)       | `2850:15915` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-15915 | `src/screens/SettingsScreen.tsx`   | Second base-settings frame.                                      |
| Change time (daily reminder) | `2850:15994` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-15994 | `src/screens/SettingsScreen.tsx`   | "change time" — time-picker dialog for daily reminder.           |
| Delete data confirmation  | `2850:16082` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16082 | `src/screens/SettingsScreen.tsx`   | "delete data" — destructive confirmation dialog.                 |
| Body photo detail         | `2850:16157` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-16157 | `src/screens/SettingsScreen.tsx` → `BodyScreen.tsx` | Manage-body-photo detail (shared with Body route — see above).   |
| Language switcher         | `2849:10108` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-10108 | `src/screens/auth/LanguageSettingsScreen.tsx` | Reused — same language list, currently lives in auth flow.       |

---

## OutfitCanvas (Main stack)

| App Route    | Mapping Status | Node ID      | Exact Node URL                                                              | Target File                        | Notes                                                                       |
| ------------ | -------------- | ------------ | --------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| OutfitCanvas | `Tentative`    | `2852:16582` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-16582 | `src/screens/OutfitCanvasScreen.tsx` | "remix" frames (`2852:16582`, `2852:18707`, `2852:16707` "remix (enable an item)") are the closest match to an outfit-editing canvas. **Note:** project memory says Remix was killed in favour of "Try Another" — these frames may be stale design. Confirm with PM before treating as canonical. |

---

## Frames present in design with NO current app route

These are real product surfaces in the new page that don't map to an existing `src/screens` route.
Listed for awareness — do NOT force them onto unrelated screens.

| Design State                 | Node ID      | Exact Node URL                                                              | Notes                                                              |
| ---------------------------- | ------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Favourite collection         | `2852:22063` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-22063 | Saved-outfits collection (no `Favourites` route yet). Empty state `2852:22228`. |
| Quote intro ("One small step")| `2849:8510` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-8510  | "One small step is enough." + "See my outfit" — motivational intro, no route. |
| Notification ("noti")        | `2850:11102` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-11102 | Generic notification/permission prompt overlay (recurs across sections). |

---

## Deterministic mapping rules

1. Match by exact screen copy + layout role first; confirm ambiguous frames with a section screenshot.
2. Multiple variants of one route → keep one baseline (`Locked`) and list the rest as variants.
3. No clear replacement in the new page → mark **`Unresolved`** (never invent a node ID).
4. Use child frames (414×896), never the page-level node `2849:8205`, for implementation.
5. New section with no existing route → list under "no current app route", don't force-fit.
6. Auth/UAC node IDs are owned by `plans/260521-2335-au-242-figma-spec/` — sync there, not here.

## Verification provenance

- App routes read from `src/navigation/AppNavigator.tsx`, `src/navigation/AuthNavigator.tsx`, `src/types/navigation.ts` (2026-05-25).
- New-page frames extracted from cached metadata of `2849:8205`; key frames visually confirmed via Figma MCP screenshots: `2849:8332`, `2849:8339`, `2849:8423`, `2849:9793`, `2849:8477`, `2849:8510`, `2850:15840`, `2850:16157`, `2850:16483`, `2852:16986`, `2852:20047`.
- Auth flow node IDs sourced from `plans/260521-2335-au-242-figma-spec/00-index.md`.
