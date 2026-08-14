# Figma Audit: AU-442 Soft-Paywall MVP (UsageLimitSheet + NotifyMeScreen)

**Date:** 2026-08-14
**Figma URL:** https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Macgie?node-id=4444-26066&m=dev
**Section node:** `4444:26066` — frames `5078:13668` / `5078:13983` / `5078:14024` (sheet) + `5078:13760` (NotifyMe)
**Source files:**
- `auxi/src/components/features/UsageLimitSheet.tsx`
- `auxi/src/screens/NotifyMeScreen.tsx`
- `auxi/src/hooks/useUsageLimitGate.ts`

**Extraction artifact (Pass 1, PASSED earlier today):** `plans/260814-1232-au-442-paywall-mvp/figma-extraction-paywall-sheet.md`
**Auditor:** qa-ui

## Summary

- Pass 2 findings: 6 (H:1 / M:4 / L:3 — see "Inherited/informational" section for the L's)
- Pass 3: **incomplete** — live sim navigation to the target surfaces was not reachable within this session's tool tier + time budget (see Pass 3 section). Verified app boot + Home render only.
- Blocking (HIGH): 1 — must resolve before merge
- Locked decisions (mascot swap, 6-vs-8 feature rows, 50-vs-100 enhance copy, no-Figma-ref confirmed state, footer omission) are **honored correctly in code** — verified, not re-flagged as bugs, per explicit instruction.
- `./scripts/auxi-lint-tokens.sh`: **clean for all 3 target files** (zero raw hex / raw font-family literals in `UsageLimitSheet.tsx`, `NotifyMeScreen.tsx`, `useUsageLimitGate.ts`). 13 pre-existing violations exist elsewhere in the codebase (`BodyPhotoGrid.tsx`, `BodyTryOnView.tsx`, `ItemPickerPanel.styles.ts`, `LanguageSettingsScreen.tsx`, `HomeScreen/styles.ts`, `ContextChipsModal.tsx`, `PinGenerationError.tsx`) — none in AU-442 scope, not introduced by this change, not blocking this PR.

## Findings

| # | Pass | Element | Property | Expected (Figma) | Actual (code) | Severity | Fixed |
|---|---|---|---|---|---|---|---|
| 1 | 2 | UsageLimitSheet `title` (`styles.title`) | fontSize / lineHeight / token | 14px / 20 (Text-sm(l-20)/Semibold) | `type.h3` = 20px / 26 (m-tokens.ts) — 6px oversize, wrong token | **HIGH** | [ ] |
| 2 | 2 | UsageLimitSheet `body` (`styles.body`) | fontSize / lineHeight / token | 14px / 20 ("body/sm") | `type.body` = 16px / 24 — 2px/4px oversize, wrong token | MEDIUM | [ ] |
| 3 | 2 | UsageLimitSheet body copy | inline emphasis | One bold inline span on the feature name (e.g. "**See on Me**") inside the body sentence | Plain flat string, no emphasis markup — `usageLimit.*_body` i18n values are unstyled text, `<Text style={styles.body}>` has no bold sub-span | MEDIUM | [ ] |
| 4 | 2 | UsageLimitSheet secondary CTA ("Maybe later") label | fontWeight | Medium (Text-md(l-24)/Medium 16px) | `MButton variant="text"` renders `FONT.regular` (Inter-Regular) + `letterSpacing:0.15` — by design, per PR #138 precedent baked into the shared primitive (`MButton.tsx:90-98`), not screen-local | MEDIUM (DS-level — see routing note) | [ ] |
| 5 | 2 | UsageLimitSheet `actions` (button group) | gap between primary/secondary CTA | 12px ("button group" gap 12) | `gap: space.s2` = 8px | MEDIUM | [ ] |
| 6 | 2 | UsageLimitSheet primary CTA label color | color | `#eee6df` (Figma `text/primary/subtle_100`, exact match confirmed in extraction to `theme.ds.color.warm100`) | `MButton` sources `role.primaryBtnLabel` from `m-tokens.ts` = `#EFE9E3` — a **different** hex than `theme.ds.color.warm100` (`#eee6df`), both claiming to represent the same Figma variable | LOW (≈1% RGB drift, visually near-imperceptible, but a real two-token identity split — DS-level, pre-existing, not introduced by this ticket) | [ ] |

## Inherited / informational (not new AU-442 regressions — verified via diff against `UpgradeScreen.tsx`, already-shipped sibling)

These were checked and confirmed to be **exact structural/style copies of `UpgradeScreen.tsx`** (the extraction's own recommended reuse pattern), not new drift introduced by this ticket. Listed for completeness, not blocking:

- `NotifyMeScreen` header renders `background="solid"` (opaque white) rather than Figma's translucent/blurred spec (90% opacity + 7.5px blur) — `UpgradeScreen`'s `Header.BackTitle` uses the same default. App-wide header-treatment choice, out of AU-442 scope.
- Feature-grid icon chip 28×28 (Figma: 32×32), title/subtitle render 12px/16 (Figma: 10px/12 "Text-xxs"), subtitle color `theme.ds.color.onVariant` (muted) instead of Figma's `text/neutral/base` for both lines — all three verified identical to `UpgradeScreen.tsx:528-560`.
- `MBottomSheet` renders as a floating rounded-all-4-corners card (8px gutter margins, grab handle) rather than Figma's edge-to-edge sheet with top-corners-only radius + separate blurred button-group footer strip. This is the correct, intentional reuse of the on-system bottom-sheet primitive (extraction explicitly calls out **not** hand-rolling the scrim/shell) — architectural substitution, not a bug.

## Locked decisions — verified correctly implemented

1. Mascot: `MacgieFace` reused (not a new "sad cat" asset) — confirmed, `UsageLimitSheet.tsx:53`.
2. NotifyMeScreen ships exactly 6 feature rows (drops "Unlimited Capsule" / "Wardrobe analysis") — confirmed, `FEATURES` array has 6 entries matching `UpgradeScreen`.
3. Enhance subtitle reuses `upgrade.feature_enhance_subtitle` ("50 enhancements/ month") — confirmed, `NotifyMeScreen.tsx` imports `upgrade.feature_${f.key}_subtitle` verbatim, no new i18n key.
4. "Notify me" confirmed state — label swaps to `notifyMe.notify_confirmed` ("We'll notify you") + `MButton disabled` (opacity 0.5) — confirmed, `NotifyMeScreen.tsx:87-91,126-136`.
5. "Version 1.0.3" footer — confirmed omitted, no equivalent element in `NotifyMeScreen.tsx`.

## Pass 3 — Visual verification (incomplete, disclosed)

- MCP pre-flight passed (`./scripts/mcp-doctor.sh` exit 0; sim booted, WDA up).
- App launched successfully (`com.auxi2026.app`), Home screen renders correctly — proof-of-life confirmed via screenshot.
- **Could not reach `UsageLimitSheet` or `NotifyMeScreen` live within this session:**
  - `UsageLimitSheet` triggers only via `maybeShowUsageLimit()`, which requires a real backend `GET /api/me/usage` response with `limit_reached: true` for the current test account (real seeded usage data) — not something fast to force without backend/account manipulation.
  - `NotifyMeScreen` has no direct entry point other than the sheet's "Upgrade to Macgie+" CTA (no deep-link route registered for it in `deepLinkHandler.ts`, which only supports `verify-email`/`reset-password`).
  - Attempted the app's hamburger nav-drawer as an alternate path to Wardrobe (a known trigger site); the drawer opens (confirmed via screenshot) but its row items (Wardrobe / My Favourite / Schedule / ...) are **not exposed to `list_elements_on_screen`** (only background Home-screen elements report), and repeated coordinate-estimated taps against the drawer rows did not register a navigation change. This is itself a minor testability gap (drawer rows likely lack `testID`/accessibility exposure) — flagging separately, not blocking AU-442.
- **Recommendation:** re-run Pass 3 via `qa-mobile` (full exploratory tier — has `type_keys`/`terminate_app` and can seed state or use a debug shortcut) once the mobile-dev fixes for findings #1-#5 land, OR ask mobile-dev for a fast local trigger (e.g. temporarily lowering the wardrobe-item limit) to unblock a live screenshot pass.

## Unresolved questions

- Should `MButton`'s `text` variant weight (#4) and `role.primaryBtnLabel` vs `theme.ds.color.warm100` (#6) be fixed system-wide (design-system token pass) rather than patched locally in `UsageLimitSheet`? Recommend routing to mobile-dev with a note to consult `figma-theme-sync` before touching `m-tokens.ts`/`MButton.tsx`, since both are shared primitives used by other screens.
- Drawer nav-row testability gap (Pass 3 section) — separate from AU-442, flagging for mobile-dev/qa-ui backlog, not part of this gate.
