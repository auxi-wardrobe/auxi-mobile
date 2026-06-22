# Auth Redesign — Combined Login + 6-digit OTP (Phase 2)

**Status:** DEFERRED / tracked follow-up. **Do NOT implement** until Phase 1
(email-delivery plumbing) is verified live AND the CEO greenlights the OTP model
+ the open decisions below.
**Date:** 2026-06-21
**Lead:** mobile-dev (UI) · backend contract via tech-lead + backend-dev (cross-repo)

## Why
Current shipped auth (AU-242: opaque-link-token model + email-first precheck)
works once Phase 1 plumbing is fixed. But the CEO's claude_design **"Auxi Auth
Flow"** board specifies a simpler, more reliable UX:
- ONE **combined** login form (email + password together) — drops the email-precheck split.
- In-app **6-digit OTP codes** for email-verify AND password-reset — replaces the
  fragile deep-link / "Open mail app" model.

This plan captures that target so Phase 2 is built deliberately, not guessed.

## Sources of truth
- **claude_design** project `auxi` (`019df3b4-ff8b-74c4-bfc6-7d7d597c90a2`):
  `Auxi Auth Flow.html` (visual board) + `Auxi Auth Guide.html` (flow logic, error
  states, business rules). Re-fetch via the `DesignSync` MCP — they are NOT copied
  locally (mobile-dev/QA agents can't call DesignSync; orchestrator must export the
  spec to them at build time).
- **Figma** `2849-10084` "Login" section. ⚠️ The Figma largely matches the CURRENT
  shipped flow (link-token + precheck). Where Figma and the claude_design board
  CONFLICT, the **claude_design board wins** for Phase 2.
- Current code map: 11 screens in `auxi/src/screens/auth/`, `services/auth.ts`,
  `context/AuthContext.tsx`, `navigation/AuthNavigator.tsx`.

## Target flows (from the Auth Guide)
### Login (Path 01)
Welcome → "Continue with email" → **combined login form** (Email + Password +
"Forgot password?") → "Signing you in…" → Home. Plus Google/Apple. "Create account" → Register.
- LOGIN-E1 wrong creds: 401 → inline "Email or password is incorrect.", clear password, keep email.
- LOGIN-E2 social consent cancelled: silent return to Welcome (dismiss ≠ failure).

### Register (Path 02)
Welcome → "Create account" → **combined form** (Email + Password + Confirm + rule
line "Min 8 characters, 1 number.") → "Creating account…" → **Verify email (6-digit
OTP)** "We sent a 6-digit code to {email}", auto-advance boxes, resend countdown
(0:42) → "Email verified" → Home.
- REG-E1 email exists: 409 → inline "An account with this email exists." + link to Log in.
- REG-E2 wrong/expired code: red boxes, "That code didn't match."; expire 10 min → Resend.

### Reset (Path 03)
Login "Forgot password?" → Forgot (single Email) → "Send reset code" → neutral
"Check your email · If {email} has an account, a code is on its way." → **Enter reset
code (6-digit OTP)** → "Set a new password" (New + Confirm + rules) → "Update
password" → "Password updated" (all sessions invalidated) → Back to log in.
- RST-E1 invalid/expired code: red boxes, "Incorrect or expired code."; 5 fails → cool-down.
- RST-E2 mismatch/weak: inline error, submit stays disabled until valid.

### Business rules
- Email account inactive until 6-digit verified; social arrives pre-verified.
- Password ≥8 chars + ≥1 number; confirm must match before submit enables.
- Codes are 6 digits, expire 10 min, resend rate-limited by a visible countdown.
- Forgot-password returns an identical response whether or not the email exists (no enumeration).
- A successful reset invalidates ALL existing sessions.
- Repeated failures (login, code) → temporary cool-down, not a hard lock.
- All three paths converge on Home / Today's outfit with an active session.

## Delta from the current implementation
### Mobile (auxi) — mobile-dev
- **NEW** combined `LoginScreen` (email + password + forgot, one form) — replaces the `EmailInput → SignIn` split.
- **NEW** combined `RegisterScreen` (email + password + confirm) — replaces `EmailInput → PasswordCreation`.
- **NEW** reusable 6-box OTP component (auto-advance, paste, masked, resend countdown) — used by verify-email AND reset-code.
- **REWORK** `VerifyEmailScreen`: from "Open mail app" / deep-link → in-app OTP entry hitting a verify-by-code endpoint.
- **REWORK** reset flow: Forgot → CheckMail(neutral) → **EnterResetCode (OTP)** → SetNewPassword → Done. (Current `ResetNewPassword` is reached via a reset LINK; becomes code-gated.)
- **RETIRE** `EmailInputScreen` (precheck) + `EmailGoogleNoticeScreen` — combined login drops the email-first precheck. ⚠️ This removes AU-356 enumeration-safe precheck + AU-313 Gmail fast-path — see decision #1.
- Rewire `AuthNavigator`; new `uac.*` i18n keys (en/vi/fr) for the combined forms + OTP; analytics events (`otp_code_entered`, `verification_code_resent`, etc. per `analytics-tracking-required.md`); `testID` on every control.
- **Reuse**: `AuthContext`, `tokenStorage`, Google/Apple OAuth, `theme.ts` uac tokens, the shared password-rule checklist.

### Backend (wardrobe-backend) — backend-dev + tech-lead (CROSS-REPO CONTRACT CHANGE)
- Today verify/reset use **opaque URL tokens** (`POST /api/auth/verify-email {token}`,
  `POST /api/auth/reset-password {token, new_password}`). Target needs **6-digit codes**:
  - generate/store/email a 6-digit numeric code for email-verify + password-reset.
  - new/changed endpoints: verify-email-by-code `{email, code}`; reset-password-by-code `{email, code, new_password}`; resend already exists.
  - email templates send the CODE, not a link (adjust the Phase-1 ElasticEmail adapter copy).
  - keep enumeration-safety + 10-min expiry + cool-down (backend has these for tokens; port to codes).
- **Contract change** → `API_DOCUMENTATION.md` update + tech-lead review + coordinated mobile/backend rollout.

## Open decisions (confirm with CEO before build)
1. **Drop the email-precheck entirely**, or keep it server-side for enumeration-safety while showing the combined form? (claude_design implies drop.)
2. **Full switch to 6-digit codes** (bigger, matches board) vs. a hybrid that keeps tokens under the hood. Board clearly wants codes.
3. **Migration**: hard cutover vs. support both link + code during a transition window (in-flight tokens).

## Out of scope (Phase 1 — handled separately)
Email delivery (ElasticEmail + `mail.auxi.app` DNS), OAuth env config, 30-day
access-token bug. This redesign assumes Phase 1 is done and verified.

## Workflow when Phase 2 starts
Follow the canonical Figma→RN gate (CLAUDE.md): figma-design-extraction →
qa-ui review-extraction → figma-to-rn-workflow → auxi-lint-tokens → qa-ui Compare →
**designer gate (6.5)** → qa-mobile smoke → PR. Export the claude_design spec to
mobile-dev at build time (they can't fetch it themselves).
