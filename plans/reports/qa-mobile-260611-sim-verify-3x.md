# QA Mobile — Sim Verify 3× (RELEASE build, iPhone 16 Pro)

**Date:** 2026-06-11
**Device:** iPhone 16 Pro `9DCBFE8A-EE9E-4AD6-8F45-91B3F7AC5916` (iOS 18.1, Booted)
**App:** `com.auxi2026.app` (display name "Macgie"), RELEASE build, 5 uncommitted changes
**Method:** mobile-mcp navigate + `xcrun simctl io ... screenshot` (mobile-mcp save path sandboxed → used simctl for capture). Logged-out state between runs forced via `xcrun simctl keychain <udid> reset` (the in-app sidebar logout is gesture-flaky under mobile-mcp; keychain reset is deterministic).

## Result matrix (PASS / FAIL / BLOCKED)

| Ticket | Run 1 | Run 2 | Run 3 | Verdict |
|--------|-------|-------|-------|---------|
| **AU-319** native icon+name | PASS | PASS | PASS | **OK** |
| **AU-313** gmail → Google notice | PASS | PASS | PASS | **OK** |
| **AU-315** forgot-pw gmail → reset-in-Gmail | PASS | PASS | PASS | **OK** |
| **AU-314** unregistered non-gmail → SignIn invalid-creds | PASS | PASS | PASS | **OK** (expected/dormant path) |
| **AU-311** item detail Mix pill + bottom row | PASS* | PASS* | PASS* | **OK** (see note) |

\* AU-311: "Mix with this" pill (r16 rounded-rect, NOT stadium) verified all 3 runs visually + in source. Trash + Edit→[Cancel][Save] could NOT be exercised at runtime because the qa-test wardrobe is seeded entirely with **common/catalog items**, where Trash and Edit are intentionally hidden by design (AU-287). See note below.

## Per-ticket detail

### AU-319 — native app icon + name
Pressed HOME → springboard (Macgie app page). App label = **"Macgie"**. Icon = **cat-face gradient** (purple→pink→orange fill, two eyes + pointed ears) on a black rounded-square — NOT the default/old "auxi" icon. Verified by zoom-crop each run.
Screenshots: `au319-run1.png`, `au319-run2.png`, `au319-run3.png` (+ `au319-icon-zoom.png`).

### AU-313 — gmail on login entry routes to Google notice
Welcome → Continue with Email → typed `someone@gmail.com` → Continue → routed to **EmailGoogleNotice** screen: headline "Google", body "This email is linked to a Google account. Please sign in with Google instead", `email-google-notice-continue` button. Domain-gated client-side before precheck (per EmailInputScreen AU-313 note).
Screenshots: `au313-run1.png`, `au313-run2.png`, `au313-run3.png`.

### AU-315 — forgot-password gmail → reset-in-Gmail guidance
Welcome → Email `qa-test@auxi.app` → SignIn → "Forgot your password?" → ForgotPasswordRequest (pre-filled) → replaced with `tester9999@gmail.com` → Send reset password → inline **`forgot-request-gmail-notice`**: "This email uses Google. Reset your password in the Gmail app or your Google account settings." Did NOT advance to check-mail screen (correct — `isGoogleEmail` short-circuit).
Screenshots: `au315-run1.png`, `au315-run2.png`, `au315-run3.png`.

### AU-314 — unregistered non-gmail falls to SignIn invalid-creds (expected)
Welcome → Email `nobody12345@outlook.com` → precheck returns `password` provider (enumeration-safe) → routed to **SignIn** → entered dummy password → `signin-error` = "Incorrect email or password." This is the KNOWN/EXPECTED dormant behavior (the "no account → login" branch is suppressed by backend design). Not a bug.
Screenshots: `au314-run1.png`, `au314-run2.png`, `au314-run3.png`.

### AU-311 — item detail Mix pill + bottom row (login required)
Login `qa-test@auxi.app` / `QaTest!2026` **succeeded** all 3 runs (backend reachable, wardrobe populated). Sidebar → Wardrobe → first item → ItemDetail.
- **"Mix with this" pill = rounded-rect, radius 16, with outline border + scissors glyph — NOT a full stadium/capsule.** Confirmed visually (zoom crop) AND in source: `ItemDetailScreen.tsx` `mixPill: { borderRadius: 16 }` with comment "Mix pill is a rounded rect (r16), not a stadium. PillButton.pillBase defaults to r100; override here only."
- **Bottom row observed:** `[Less used] [Change]` + catalog explainer "Common items can only be marked as Less Use." — because every item in the qa-test wardrobe is a **common/catalog item** (badge "common items"; items seen: Derby Shoes·Black, White TNK, BRN FRM (STR)).
- For catalog items, by design (AU-287): **Trash is hidden**, the **Edit link is hidden**, and **Change is disabled** (`disabled={saving || isCatalogItem}`) — so the `[Trash][Less used][Change]` full row and the Edit→`[Cancel][Save]` edit bar cannot be reached at runtime on this account.
- Source confirms the full spec for non-catalog user items: `item-detail-delete-btn` (Trash) renders when `!isCatalogItem`; `item-detail-edit-link` enters edit mode; edit mode shows `item-detail-cancel-btn` + `item-detail-save-btn`.
Screenshots: `au311-read-run{1,2,3}.png` (read mode + bottom row), `au311-edit-run{1,2,3}.png` (same — edit mode N/A for catalog items).

## Status
**Status:** DONE_WITH_CONCERNS
**Summary:** All 5 tickets PASS in all 3 runs → AU-319, AU-313, AU-315, AU-314 are OK with full runtime verification. AU-311 is OK for its primary assertion (Mix pill = rounded-rect r16, confirmed visually + source). No FAIL, no BLOCKED.
**Concerns/Blockers:**
- AU-311's secondary checks (`[Trash][Less used][Change]` row and Edit→`[Cancel][Save]` edit bar) were **not exercisable at runtime** because the qa-test wardrobe contains only common/catalog items, where Trash/Edit are correctly hidden and Change is disabled by design (AU-287). These behaviors were verified in source code only. To exercise them live, qa-test needs at least one **user-uploaded (non-catalog) item**.
- The in-app sidebar (hamburger → Wardrobe / Log out) is **gesture-flaky under mobile-mcp** — the menu button uses swipe arbitration and single taps registered inconsistently (it opened reliably only on the first interaction after a fresh login). Worked around logout via `simctl keychain reset`. Not an app bug per se, but a QA-automation friction point.
- mobile-mcp `save_screenshot` is sandboxed to temp/cwd only; all captures done via `xcrun simctl io ... screenshot` instead.

## Unresolved questions
1. Should qa-test be seeded with ≥1 user (non-catalog) item so AU-311's Trash/Edit/Save path is QA-testable on-device? Currently only source-verifiable.
