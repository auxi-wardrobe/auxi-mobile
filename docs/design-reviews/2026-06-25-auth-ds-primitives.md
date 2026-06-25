# Design Review — Auth DS-Primitives Migration

**Build**: `feat/auth-ds-primitives` @ `35d8d09a`
**Device**: iPhone 17 (iOS 26.5) simulator
**Date**: 2026-06-25
**Gate**: step 6.5 designer HARD GATE (no Figma reference — CEO-approved DS standard look)
**Screens in scope**: EmailInputScreen, SignInScreen, PasswordCreationScreen, ForgotPasswordRequestScreen, ResetNewPasswordScreen + shared `MInput`/`MButton`
**Verdict**: **FAIL** — 2 MAJOR (cross-screen consistency) block; 3 MINOR logged.

> Scope note: the branch also touches HomeScreen / OutfitCanvas / many feature
> sheets. This review covers ONLY the 5 auth form screens + the MInput/MButton
> craft, per the dispatch. The pre-existing token-lint violations in
> DatabaseScreen/BodyScreen/ItemDetail/OutfitCanvas/HomeScreen/ContextChipsModal
> are NOT introduced by this change and are out of scope.

## Pre-flight

- `./scripts/mcp-doctor.sh` → exit 0 (sim booted, WDA :8100 up).
- `./scripts/auxi-lint-tokens.sh` → 29 violations, **none in the 5 auth screens or MInput/MButton** (all pre-existing in other screens).
- Figma MCP token-confirm not required (no Figma reference; DS tokens verified against `m-tokens.ts`).
- Reachable interactively: Welcome → Continue with Email → EmailInput (idle/focus/error/enabled) → PasswordCreation (read-only email + password MInput + eye toggle + criteria). SignIn / ResetNewPassword reviewed in code (share the same MInput/MButton).

## What passed (positive verification)

- **MInput craft is solid.** Focus ring crossfades to a crisp `ink` border; error state shows the danger border (`color.da400` `#C0392B`) + danger helper text; placeholder/value contrast is good. All tokens encapsulated inside the primitive — zero raw hex/font in the screens. Evidence: `designer-email-input-focus.png`, `designer-email-input-error.png`.
- **MButton primary CTA is correct.** Enabled = solid `ink` fill + cream-white label (`role.primaryBtnLabel`), full-width, radius 16 (`button.radius`), height 56 (`button.primaryHeight`). Reads unambiguously as the primary action. Press-scale + loading dots run through `PressScale`/`DotsLoader`, both honoring `useReducedMotion()` and `motion.*` tokens — lens 2 (motion) clean. Evidence: `designer-email-input-enabled.png`.
- **Eye toggle.** 28×28 glyph + `hitSlop={8}` → 44pt effective target (meets the ≥44pt note); a11y label flips "Show"/"Hide" via `revealed`; icons use `currentColor` and tint with `role.ink3`. Localized in all 3 locales. Confirmed present + labeled on PasswordCreation (`password-input-field-visibility`).
- **CTA labels are real action words**, not a11y-only strings — "Continue / Create password / Sign in / Send reset password / Save new password", localized en/vi/fr with parity. Good hierarchy (lens 3).
- **i18n parity** across en-EN / vi-VN / fr-FR for every new auth string.

---

## Findings

### 1. Back-chevron implemented three different ways across five sibling screens

**Severity**: MAJOR
**Lens**: 6 cross-screen
**Rule doc**: header-footer-rules.md §1 (canonical Header / consistent nav glyph)
**Screen**: all 5 auth form screens

#### What's off
The back affordance — the single most-repeated control in this flow — is built three incompatible ways:
- `EmailInputScreen` + `PasswordCreationScreen`: an **inline `<Svg>` `ChevronLeftGlyph`** (path `M15 6 9 12l6 6`, strokeWidth 1.5).
- `SignInScreen`: an **imported SVG asset** `IconChevronLeft` (`assets/images/icon_chevron_left.svg`), 24×24.
- `ForgotPasswordRequestScreen` + `ResetNewPasswordScreen`: a **text glyph `‹`** (`fontSize: 32`, `Text`).
The three render at visibly different weights/sizes (a 1.5px-stroke SVG vs a 32px font glyph), so the back button changes appearance as the user moves through one continuous flow. That is the "users must relearn the same control" class of cross-screen inconsistency. The text-glyph `‹` is also the weakest — it is not a real icon, has no fixed metrics, and looks lighter than the SVG variants.

#### Evidence
- Source: `src/screens/auth/EmailInputScreen.tsx:79-93` (inline SVG) · `src/screens/auth/PasswordCreationScreen.tsx:67-77` (inline SVG) · `src/screens/auth/SignInScreen.tsx:55,170` (asset) · `src/screens/auth/ForgotPasswordRequestScreen.tsx:127` (`‹` glyph) · `src/screens/auth/ResetNewPasswordScreen.tsx:135,184` (`‹` glyph)
- Rule: header-footer-rules.md §1 — one canonical back glyph; a header that drifts vs siblings is a MAJOR consistency finding.

#### Routing
mobile-dev — pick ONE back glyph for all 5 screens (the imported `icon_chevron_left.svg` asset is the strongest candidate; drop the inline `<Svg>` and the `‹` text glyph). Same `width/height/color` everywhere.

---

### 2. Header + safe-area strategy is inconsistent across the five screens

**Severity**: MAJOR
**Lens**: 6 cross-screen
**Rule doc**: header-footer-rules.md §1 + §3a (bottom safe-area)
**Screen**: all 5 auth form screens

#### What's off
Each screen handles the top chrome / safe-area differently, so the header bar and the top inset don't sit at a consistent place across the flow:
- `EmailInputScreen` / `PasswordCreationScreen`: `SafeAreaView edges={['top','bottom']}` + a normal-flow header row of height `uacHeaderHeight`.
- `SignInScreen`: **no `SafeAreaView`**; an **absolutely-positioned** header (`position:'absolute'`, `paddingTop: 45`) and the body uses `paddingTop: uacSafeAreaTop` — a hardcoded 45 magic number standing in for the top inset.
- `ForgotPasswordRequestScreen` / `ResetNewPasswordScreen`: **no `SafeAreaView`**; a `View` header with `justifyContent:'flex-end'` + `paddingBottom: 16` and the body padded by `uacSafeAreaTop` constants.
Three different top-inset mechanisms (real `SafeAreaView` insets vs a `uacSafeAreaTop` constant vs a literal `paddingTop: 45`) means the header baseline and first-content offset can land on different y-positions between two screens the user navigates between back-to-back. On notch/Dynamic-Island devices a hardcoded `45`/constant inset is the exact pattern the safe-area rule exists to prevent. The forgot/reset bottom CTA does correctly add `uacSafeAreaBottom`, but the family as a whole is not coherent.

#### Evidence
- Source: `src/screens/auth/SignInScreen.tsx:265-296` (absolute header, `paddingTop:45`, `uacSafeAreaTop/Bottom`) · `src/screens/auth/ForgotPasswordRequestScreen.tsx:206-211,250-255` · `src/screens/auth/ResetNewPasswordScreen.tsx:273-278,326-331` · vs `EmailInputScreen.tsx:202,267-273` / `PasswordCreationScreen.tsx:199,287-293` (`SafeAreaView edges`).
- Rule: header-footer-rules.md §1 (one header pattern) + §3a (respect `useSafeAreaInsets().bottom`, don't hardcode insets).

#### Routing
mobile-dev — standardize the 5 auth screens on ONE header + safe-area scaffold (recommend `SafeAreaView edges={['top','bottom']}` as EmailInput/PasswordCreation already do, OR the canonical `<Header>`). Remove the `paddingTop: 45` literal in SignIn and the `flex-end` one-off in forgot/reset. This pairs naturally with finding 1 (one shared header → one shared back glyph).

---

### 3. Disabled CTA reads as a live button (enabled fill at 50% opacity)

**Severity**: MINOR
**Lens**: 5 states / 3 hierarchy
**Rule doc**: (DS-wide — `MButton.styles.disabled` + color-rules.md emphasis)
**Screen**: EmailInput (default state), all auth CTAs

#### What's off
`MButton` disabled = `opacity: 0.5` applied to the `ink` fill. On a screen that opens with the CTA disabled (EmailInput: `submitDisabled = email.trim().length === 0`), the result is a **solid mid-gray button** that, before the user has typed anything, reads as a normal tappable primary action — there's no shape/outline/label cue that it's inert, only a subtle darkness delta vs the enabled black. Compare `designer-email-input.png` (disabled, gray) with `designer-email-input-enabled.png` (enabled, black): the difference is real but easy to miss on first glance, so a user may tap and get no response. This is the standard `MButton` disabled treatment used app-wide, so it is logged as MINOR (changing it is a DS-level decision, not an auth-PR blocker).

#### Evidence
- Source: `src/components/design-system/lib/MButton.tsx:175` (`disabled: { opacity: 0.5 }`) applied over `role.ink` fill.
- Screenshots: `designer-email-input.png` (disabled) vs `designer-email-input-enabled.png` (enabled).

#### Routing
mobile-dev (low priority) — consider a distinct disabled treatment for the solid primary variant (e.g. a muted `n300` fill rather than 50%-opacity ink) so "not yet actionable" reads at a glance. If the DS-wide disabled token is intentional as-is, this is a **CEO** taste call — flag for confirmation, do not block.

---

### 4. Email-validation error copy typo: "adress" → "address"

**Severity**: MINOR
**Lens**: 5 states (content)
**Rule doc**: n/a (copy)
**Screen**: EmailInput error state

#### What's off
The inline validation error reads "Please enter a valid email **adress**" — "address" is misspelled. Surfaced live on the field (see error screenshot). A spelling error in the auth flow — the user's first impression of the product — undercuts the "crafted / trustworthy" feel.

#### Evidence
- Screenshot: `designer-email-input-error.png`
- Source: i18n key `uac.email_input.error_invalid` in `src/translations/en-EN.json` (check vi/fr equivalents for the same).

#### Routing
mobile-dev — fix the en-EN string (and verify vi-VN / fr-FR equivalents).

---

### 5. SignIn uses fixed pixel content widths where siblings flex full-width

**Severity**: MINOR
**Lens**: 6 cross-screen
**Rule doc**: design-system.md §2 (grid) — consistency
**Screen**: SignIn

#### What's off
`SignInScreen` hardcodes `BODY_INNER_WIDTH = 360` and `FORGOT_BLOCK_WIDTH = 327` and applies them to the heading/email/password/CTA/forgot blocks (capped with `maxWidth:'100%'`). The other four screens let the field/CTA flex to the body padding edges. On most iPhone widths the cap is inert, but it means the SignIn field/CTA can sit at a slightly different inner width than the visually-identical EmailInput field/CTA — a subtle rhythm divergence in a flow meant to feel like one system. (ResetNewPassword has a similar `width: 327` on its checklist block — `ResetNewPasswordScreen.tsx:314`.)

#### Evidence
- Source: `src/screens/auth/SignInScreen.tsx:256-258,300,306-308,319-326,330-331,335-336` · `src/screens/auth/ResetNewPasswordScreen.tsx:314`.
- Rule: design-system.md — prefer the shared body-padding flex used by the sibling screens over per-screen pixel widths.

#### Routing
mobile-dev (polish) — drop the fixed-width constants; let the blocks flex to `uacBodyPadding` like the other auth screens. Naturally folds into the finding-2 scaffold unification.

---

## Self-audit

- Surfaces reviewed: 5 (2 interactively on sim — EmailInput, PasswordCreation; 3 in code — SignIn, ForgotPasswordRequest, ResetNewPassword, all sharing MInput/MButton).
- Findings: 5 (BLOCKER 0 / MAJOR 2 / MINOR 3). All cite a rule doc + concrete token/source line or the lens question they fail.
- Screenshots on disk (S=5/5 visual claims evidenced): `designer-email-input.png`, `designer-email-input-focus.png`, `designer-email-input-enabled.png`, `designer-email-input-error.png`, `designer-password-creation.png`.
- Verdict ladder: 2 open MAJOR ⇒ **FAIL**. The DS-primitive migration itself (MInput/MButton usage, tokens, eye toggle, states, motion) is clean and on-system — the FAIL is driven entirely by the un-unified per-screen chrome (back glyph + header/safe-area), which the migration left untouched.

**VERDICT: FAIL** · 5 findings (B:0 / Maj:2 / Min:3) · Routing → mobile-dev (all 5; finding 3 has a CEO taste fork if the DS-wide disabled token is deemed intentional)

---

# RE-GATE — 2026-06-25 (commit `261efdbb`)

**Re-review of**: the FAIL above (commit `35d8d09a`, 2 MAJOR + 3 MINOR).
**Fix commit**: `261efdbb` — "fix(auth): unify header/back-glyph/safe-area across the 5 auth screens".
**Device**: iPhone 17 (iOS 26.5) sim · Metro JS-only (no native rebuild) · backend :5001.
**Pre-flight**: `./scripts/mcp-doctor.sh` → exit 0 (sim booted, WDA :8100 up). Token-lint scoped to AuthHeader + the 5 screens → **0 violations**.

## What was verified

A new shared **`src/components/auth/AuthHeader.tsx`** was introduced: ONE canonical
top chrome — a single back glyph (`icon_chevron_left.svg`, 24×24) in a normal-flow
header row of height `theme.spacing.uacHeaderHeight`, back `Pressable` in a 45×45
hit target with `hitSlop={8}`, a11y label `uac.common.back`. All 5 form screens
now wrap in `SafeAreaView edges={['top','bottom']}` and render `<AuthHeader>`.

Confirmed by reading `AuthHeader.tsx` + all 5 screens, by grep, and on the sim.

### MAJOR 1 (back-glyph drift) — RESOLVED
- grep for `‹` text glyph and inline `ChevronLeftGlyph` across the 5 in-scope
  screens → **none**. (Remaining `‹`/inline hits are in OTHER auth screens —
  EmailGoogleNotice, ForgotPasswordCheckMail, LanguageSettings, VerifyEmail,
  Welcome — which were never in this review's scope and are unchanged.)
- All 5 screens import `AuthHeader` (one back glyph, one weight/size everywhere).
- Sim: EmailInput renders the single `<` SVG chevron top-left; `email-back-button`
  is a 45×45 target at (24,93) with hitSlop 8 → effective ~61pt, a11y label "Back".
  Tapping it navigates back to Welcome (functional verify passed).

### MAJOR 2 (header/safe-area drift) — RESOLVED
- grep across the 5 in-scope screens → **no** `paddingTop: 45`, **no** `flex-end`
  header, **no** `position:'absolute'` header, **no** `uacSafeAreaTop/Bottom`
  double-counting. (The 4 stray hits are all in out-of-scope screens.)
- All 5 use the real `SafeAreaView edges={['top','bottom']}` inset, not a magic
  number. Sim: back row sits clear below the status bar (no clip, no doubling);
  bottom CTAs clear the home indicator.
- Note on `header-footer-rules.md §1`: that section's canonical `<Header>` (76px,
  title-center, hamburger/user) is the IN-APP chrome. The pre-auth stack
  legitimately uses a minimal back-only header (matching Welcome/onboarding),
  so the correct resolution was "one shared `AuthHeader` across the 5 siblings",
  which is exactly what landed. The original finding was sibling-vs-sibling
  inconsistency, not "adopt the in-app Header" — resolved.

### MINOR 4 (typo "adress"→"address") — RESOLVED
- en-EN `uac.email_input.error_invalid` = "Please enter a valid email address";
  vi-VN and fr-FR equivalents correct. No "adress" remains in `src/translations/`.

### MINOR 5 (fixed widths 360/327) — RESOLVED
- grep → no `BODY_INNER_WIDTH`/`FORGOT_BLOCK_WIDTH` in the 5 screens. Sim:
  EmailInput field flexes to 319 inside body padding; CTA full-width 354.

### MINOR 3 (disabled CTA = enabled fill @50% opacity) — DEFERRED (as agreed)
- Unchanged and intentionally out of scope: this is the app-wide
  `MButton.styles.disabled` token (`opacity:0.5` over `role.ink`), a DS-level
  CEO taste fork, not an auth-PR concern. Visible on the sim (gray "Continue"
  before typing). NOT re-raised as a blocker; remains logged for the DS-wide
  follow-up / CEO confirmation.

## No new craft regression
- Header alignment: chevron vertically centered in the `uacHeaderHeight` row,
  consistent across all 5 (same component, same token).
- Safe-area: top inset real (not hardcoded), not doubled, not clipped; bottom
  CTAs clear the home indicator.
- Back tap target ≥44pt (45×45 + hitSlop 8). a11y label present.
- CTA still correct (full-width MButton primary, height 56). Token-lint clean.

## Re-gate self-audit
- Surfaces: 5 (EmailInput interactively on sim — back-nav functional verify;
  all 5 confirmed in code + grep to share the identical `AuthHeader` +
  `SafeAreaView edges` scaffold).
- Screenshot: `screenshots/2026-06-25/designer-regate-email-input.png`.
- Verdict ladder: 0 open BLOCKER, 0 open MAJOR (both resolved), 1 deferred MINOR
  (MINOR-3, out of scope) ⇒ **PASS**.

**RE-GATE VERDICT: PASS** · both MAJORs resolved · MINOR 4 + 5 resolved ·
MINOR 3 deferred (DS-wide CEO taste fork, out of scope) · Routing → none
blocking; MINOR-3 remains for CEO/DS follow-up.

---

# Addendum — VerifyEmailScreen (Figma 3910:23056 "verifie")

**Build**: `feat/auth-ds-primitives` @ `2016b370`
**Figma**: 3910:23056 · Extraction: `plans/260625-1714-verify-email-figma-fidelity/figma-extraction-verify-email.md`
**Device**: iPhone 17 (iOS 26.5) sim · **Live reach: BLOCKED** (see method note)
**Screen**: VerifyEmail (post-signup verification waiting room)
**Verdict**: **FAIL** — 1 MAJOR (layout fidelity: action stack not bottom-anchored). DS-compliance + states + cross-screen all PASS.

## Method note (degraded-reach disclosure)
Could not reach VerifyEmail interactively: the sim app showed a persistent
"Fast Refresh disconnected" banner (running bundle not connected to Metro), and
the EmailInput gate's validation kept reading stale/empty state on
keystroke+paste (autocorrect-mangled the address; `Continue` returned "Please
enter a valid email address" on a visibly-valid field value). Per the dispatch's
sanctioned fallback I judged on **code review + live Figma compare**, corroborated
by the live Welcome screen which renders the *same* `MacgieLogo` (observed
118×126 in the element tree). I did NOT label this a clean interactive PASS.
mobile-mcp pre-flight was green (`mcp-doctor.sh` exit 0).

## Lens results

**1 DS compliance — PASS.** Token-lint clean (`grep` for hex/`fontFamily`/`zIndex`
= NONE). Both CTAs are `MButton` (primary "Open Mail app" + `variant="secondary"`
resend); hero is `MacgieLogo` (the real Figma "Macgie Animate 2" node 2849:8332,
Reduce-Motion-aware, image a11y "Macgie") — the gray placeholder box is gone.
All colors/spacing/typography via `theme.*` aliases (uacTextBase, uacH4Bold,
uacBodyMd*, uacDimension*). Matches the GH-364 primitives rule.

**2 Motion — PASS.** Spinner = linear 1.2s Animated loop (continuous status, fine).
MacgieLogo entrance + breathing idle has a real `useReducedMotion` branch.
MButton carries the DS press motion. No hardcoded literals.

**3 Hierarchy — PASS.** Primary (filled ink) vs secondary (outline) CTA contrast
is correct; "Open Mail app" is the obvious next action; status row is correctly
subordinate (`uacTextSubtle200`).

**4 Color — PASS.** Primary ink fill + light label, secondary ink-outline, subtle
status text — all semantic, matches Figma vars and the rest of auth.

**5 States — PASS.** Resend has cooldown→disabled+countdown ("Resend email in
(NNs)"), `loading` during the mutation, success/error toasts, and the testID
flips `verify-resend-button` ↔ `verify-resend-button-cooldown` (always-defined).
Open-mail has a no-mail-client toast fallback. Logout present. Polling spinner
covers the "waiting" state. All testIDs preserved + `verify-hero-macgie` added.

**6 Cross-screen — PASS.** All 6 auth screens now render `MButton`; VerifyEmail
is consistent with the just-migrated cohort (same SafeAreaView scaffold, same
token tier, same full-width h56 primary).

**7 Native feel — PASS.** `message://` / `mailto:` open-mail is the native iOS
pattern; SafeAreaView edges top+bottom; toasts bottom-positioned.

**8 Recommendation — n/a** (auth surface, no recommendation content).

## The one finding

### MAJOR — Action stack sits upper-middle; Figma anchors it near the bottom
**Severity**: MAJOR · **Lens**: 2/fidelity (layout composition) · **Rule doc**: n/a (Figma-frame fidelity) · **Screen**: VerifyEmail

**What's off.** In Figma 3910:23056 the screen is composed in two vertically
separated blocks: the **hero block** (mascot + title + 3 body lines, Frame 2203)
sits in the **top third** (y171–y429), then a deliberate ~117px gap, then the
**action stack** (both CTAs + status row, Frame 2108) is **bottom-anchored**
(y546, i.e. ~65–82% of the 844-tall frame). The shipped layout uses a single
top-stacked `body` column: hero at `paddingTop ≈100`, then title/body, then
`buttonStack` at just `marginTop:24`, then status at `marginTop:24` — so the
buttons cluster **directly under the body text in the upper-middle** and ALL the
empty space falls at the bottom of the screen. This inverts the Figma
composition (Figma's empty space is the mid-gap; shipped empty space is the
bottom). The buttons read as "floating in the middle" rather than the calm,
bottom-weighted CTA shelf the design intends — and it diverges from the other
auth screens whose primary CTA is bottom-weighted.

**Evidence.**
- Source: `src/screens/auth/VerifyEmailScreen.tsx:270-303` — `body` is `flex:1`
  with `alignItems:center` but no `justifyContent:'space-between'` and no flex
  spacer between the text block and `buttonStack`; `buttonStack` (line 299) is
  `marginTop: uacDimension24` off the body text, not pushed to the bottom.
- Figma: hero `Frame 2203` y171 vs action `Frame 2108` y546 (per extraction note
  + live frame screenshot `screenshots/2026-06-25/figma-verify-email.png`).
- Fix direction (mobile-dev): split into a top hero group + a bottom action
  group (e.g. `justifyContent:'space-between'` on `body`, or a `flex:1` spacer
  between body text and `buttonStack`, or pin the action stack with
  `marginTop:'auto'`). Keep the existing 7px / 12px internal rhythm. No token or
  motion change needed.

## Watch-item (not a blocker)
- **Mascot width 119 vs Figma 103.** `MacgieLogo size={126}` derives width from
  `MacgieFace`'s ~0.943 aspect → ~119px wide; Figma's `macgie-animate-2` node is
  103×126 (~0.82). So the rendered mascot is ~16px wider than the Figma mascot.
  This is NOT raised as a blocker because it is the **app-wide, already-shipped**
  rendering of the brand mark (Welcome uses the identical MacgieLogo at the same
  118×126, designer-PASS) — i.e. consistent system behavior, not a per-screen
  drift. If the CEO wants the exact 103-wide Figma mascot proportion, that's a
  DS-level MacgieFace/MacgieLogo aspect decision (route → CEO/DS), not a
  VerifyEmail fix.

## Verdict + routing
**FAIL** — 1 open MAJOR (action-stack not bottom-anchored, `VerifyEmailScreen.tsx:270-303`).
Routing → **mobile-dev** (layout: bottom-anchor the action stack). Mascot-width
watch-item → **CEO/DS** (optional, app-wide, not blocking). Re-run lens 2/fidelity
on the changed surface after the fix.

---

# RE-GATE — VerifyEmail action-stack (commit `c4db0888`)

**Re-review of**: the VerifyEmail addendum FAIL above (commit `2016b370`, 1 MAJOR).
**Fix commit**: `c4db0888` — `buttonStack.marginTop` changed from `uacDimension24` → **`'auto'`** (exactly the prescribed remedy).
**Method**: CODE-ONLY (sim deliberately not used — stale-bundle / Fast-Refresh-disconnected issue that blocked the live gate; judged on code + the Figma composition captured in the original addendum). No edits to production code.

## What was verified

`src/screens/auth/VerifyEmailScreen.tsx` styles + JSX order re-read:
- `body` (`flex:1`, `alignItems:'center'`, `paddingTop ≈100px`, default `justifyContent:flex-start`) inside `SafeAreaView edges={['top','bottom']}`.
- Children in order: `heroIllustration` → `title` → 3 body lines → `buttonStack` → `statusRow`.
- `buttonStack` now has **`marginTop: 'auto'`** (line 301).

In a flex column with `flex-start`, `marginTop:'auto'` on `buttonStack` consumes all free space **above** it, so:
- **Hero block** (mascot + title + 3 lines) stays anchored at the top (`paddingTop ≈100px`) → **top third**. ✓
- All vertical slack collapses into the gap **between the last body line and `buttonStack`** → the deliberate Figma mid-gap (≈117px). ✓
- **`buttonStack` + `statusRow`** are pushed to the **bottom** of the `body` → bottom-weighted action shelf, matching Figma 3910:23056 (action `Frame 2108` @ y546 in the 844-tall frame). ✓

This **inverts the prior failure mode**: before, the empty space pooled at the screen bottom and the CTAs floated upper-middle; now the empty space is the mid-gap and the action stack is bottom-weighted — the calm CTA shelf the design intends, and consistent with the other bottom-weighted auth CTAs.

### MAJOR (action stack not bottom-anchored) — RESOLVED
- `marginTop:'auto'` on `buttonStack` is exactly the prescribed fix (one of the three suggested remedies).
- Hero remains top-third; action group (CTAs + status) bottom-anchored. Composition now matches Figma 3910:23056.

## No new craft regression
- **Safe-area**: action group bottom-anchors to the **inner** (already-inset) bottom edge via `SafeAreaView edges={['top','bottom']}` — not the raw screen bottom. No collision with the home indicator.
- **Element nearest the edge** is the subordinate `statusRow` (subtle waiting text + spinner), not the tappable CTAs — the primary/secondary CTAs sit comfortably above it. Healthy breathing room; matches Figma where status sits below the CTAs.
- **Internal rhythm unchanged**: 7px hero gaps, 12px button gap, 24px status top-margin all preserved.
- Single style-property change — cannot affect DS-compliance, color, states, motion, native-feel, or cross-screen (all PASSed in the addendum and remain so). tsc/eslint clean per handoff.

## Watch-item (still deferred)
- **Mascot width 119 vs Figma 103** — unchanged, correctly stays deferred → **CEO/DS** (app-wide `MacgieLogo`/`MacgieFace` aspect; consistent with Welcome at the same 118×126, designer-PASS). Not a VerifyEmail fix, not blocking.

## Re-gate self-audit
- Surface: 1 (VerifyEmail) · method CODE-ONLY (sim withheld by handoff — stale-bundle blocker).
- Lens re-run: 2/fidelity (layout composition) — the only lens the fix touched.
- Verdict ladder: 0 open BLOCKER, 0 open MAJOR (the one MAJOR resolved), 0 new findings, 1 deferred watch-item (mascot width, CEO/DS) ⇒ **PASS**.

**RE-GATE VERDICT: PASS** · MAJOR resolved (`marginTop:'auto'` bottom-anchors the action stack, hero stays top-third, no safe-area collision) · mascot-width watch-item deferred → CEO/DS · Routing → none blocking. VerifyEmail clears the step-6.5 hard gate.
