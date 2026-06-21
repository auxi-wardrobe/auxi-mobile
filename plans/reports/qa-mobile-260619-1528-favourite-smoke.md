# Favourite Screen — Figma-Fidelity Smoke (mobile-mcp exploratory)

**Result:** PASS (with 1 minor i18n finding)
**Build:** branch `feat/favourite-figma-fidelity` (PR #101), HEAD `478f018a` (+ `97ee9f3c`)
**Device:** iOS Simulator iPhone 16 Pro · iOS 18.1 (booted, warm app instance)
**Bundle:** `com.auxi2026.app`
**Lane:** mobile-mcp exploratory (no Maestro flow exists for Favourite)
**Date:** 2026-06-19 15:34–15:37
**Session:** warm, already logged in, app already on Favourite screen — NO cold launch (toolchain blocker respected)

## Environment pre-flight
- `./scripts/mcp-doctor.sh` → exit 0; sim booted, WDA up on :8100, mobile-mcp healthy (pin 0.0.56).
- No Maestro `*favourite*` flow under `maestro/flows/` — exploratory it is.
- Warm session was logged in and already rendering the Favourite screen → no creds needed, no BLOCKED.

## What I could navigate to
- Favourite screen body (warm, scrolled top and through cards)
- Push-drawer (via header hamburger)
- Remove bottom sheet (open + Cancel dismiss)

## Per-behavior results

### 1. Header hamburger → drawer — PASS
- Header is a single hamburger button `testID=favourite-header-menu` (a11yLabel "Open menu"), top-left at (12,70), 44×44.
- NO back chevron, NO title, NO undo/redo present anywhere in the a11y tree. Matches spec.
- Tapping it opened the push-drawer: the ENTIRE screen content shifted right by ~314px (hamburger 12→326, card date 182→496, etc.) — the canonical push-drawer translate. Drawer's own menu rows did not surface in the warm-sim capture (known qa-ui caveat: drawer overlay not reliably composited / not in capture buffer); the content-push is conclusive evidence the drawer opened. Did NOT fail on missing drawer screenshot per instructions.
- Tapping the pushed body closed the drawer; content returned to un-shifted position.

### 2. Card render — PASS
Each saved-outfit card exposes, per card id:
- Per-card date line `favourite-card-<id>-date` (e.g. "19 Jun", "18 Jun", "17 Jun" … down to "14 Jun") — dates render and vary per card.
- Bold title "Clean. Ready for today" (the title sits between the two hairline dividers — dividers are pure layout, not in a11y tree, visible in screenshot).
- Mood chip where present ("Feels like me", "common") — not every card has one (consistent with data).
- "Why this outfit" tile (lightbulb glyph, the self-visualization affordance image).
- Tile grid of outfit items (jeans/boots/polo; loafers/polo/shorts) — renders correctly in screenshot.
- Remove button `favourite-remove-<id>` (56×56) + Self-visualization button `favourite-self-visualization-<id>` (290×56) row at card bottom.
- 18 cards rendered in the warm list; all testIDs well-formed per CLAUDE.md convention.

### 3. Remove bottom sheet — PASS (open + Cancel), confirm-busy NOT exercised
- Tapping a card's ⊖ remove opened a bottom-anchored sheet: slides up from bottom, rounded top corners, dim scrim over the dimmed screen body. (This sheet DOES composite to the screenshot, unlike the push-drawer.)
- Sheet content:
  - Title StaticText "Remove from your favourite"
  - Body StaticText "Are you sure to remove this outfit from your favourite list"
  - `favourite-remove-confirm` — label "Yes", danger styling, trash icon, left (16,760) 177×56
  - `favourite-remove-cancel` — right (205,760) 180×56
- Tapping Cancel dismissed the sheet (slides down): sheet elements gone from a11y tree, full card list restored, first card `af696097…` still present → non-destructive confirmed.
- Did NOT tap "Yes": all 18 favourites appear to be real seeded data, not throwaways. Per dispatch instruction, no real deletion → confirm busy/disabled state left unverified. Recommend qa-ui author a Maestro flow with a disposable seeded favourite to cover the confirm/busy path deterministically.

### 4. Empty state — NOT SEEN (out of reach)
- Account has 18+ favourites; empty state only reachable by deleting all (destructive, declined). Not in scope for this smoke.

## Findings

### F1 (minor) — Cancel button shows raw i18n key `favourite.cancel`
- The remove-sheet Cancel button renders the untranslated key string `favourite.cancel` instead of resolved copy ("Cancel"). Confirmed in both the screenshot and the a11y tree (button label literally `favourite.cancel`). The "Yes" / title / body strings ARE resolved, so the `favourite.cancel` key is missing from the translation resource (or mis-referenced).
- Severity: minor (functional — Cancel works and dismisses correctly; cosmetic copy defect only).
- Suspected area: i18n resource under `auxi/src/translations/` (missing `favourite.cancel`) and/or the cancel-button copy lookup in the Favourite remove-sheet component under `auxi/src/screens/` / `auxi/src/components/features/`.
- Routing: mobile-dev (missing i18n string / key wiring). Not a flow defect, not a backend defect.

## Crashes
- `mobile_list_crashes` → only 2 unrelated, stale reports (`.IDECacheDeleteAppExtension` 2024-09-24, `Cursor Helper (Plugin)` 2025-04-28). NO `com.auxi2026.app` crash during or after the smoke.

## Screenshots saved (auxi/docs/qa-findings/screenshots/2026-06-19/)
- `qa-mobile-favourite-screen-body.png` — landing state (hamburger, date, title, tile grid, footer)
- `qa-mobile-favourite-after-drawer-close.png` — body restored after drawer close
- `qa-mobile-favourite-card-scrolled.png` — card with visible ⊖ remove + Self-visualization
- `qa-mobile-favourite-remove-sheet-2.png` — bottom sheet open (scrim, rounded top, Yes danger + Cancel)
- (`qa-mobile-favourite-remove-sheet.png` — pre-tap intermediate, kept for trail)

## Unresolved questions
- Confirm/busy/disabled state on "Yes" not verified (no throwaway favourite). Needs a seeded disposable favourite — best promoted to a Maestro flow by qa-ui.
- Empty-state not verifiable without wiping the account.

---
**Status:** DONE_WITH_CONCERNS
**Summary:** Favourite Figma-fidelity smoke PASS on warm sim — hamburger→push-drawer, card render (date/title/mood/tiles/remove/self-viz), and bottom remove-sheet open+Cancel all verified; no crash. One minor i18n finding (Cancel button shows raw key `favourite.cancel`) routed to mobile-dev.
**Concerns:** (1) F1 raw i18n key on Cancel — minor copy defect, mobile-dev. (2) Confirm-busy state + empty-state unverified (destructive / unreachable on this account) — recommend qa-ui Maestro flow with disposable seed.
