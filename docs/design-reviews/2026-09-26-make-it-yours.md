# Design review — AU-458 "Make It Yours" (Discovery outfit detail)

**Gate:** step 6.5 designer design-review (HARD GATE)
**Date:** 2026-09-26
**Build:** auxi `e254c8f` + uncommitted working tree, branch `nguyenthaihiep94/au-458-make-it-yours-mobile`
**Device:** iPhone 17 Pro sim `34528D25-C08D-4E54-89B8-BDA0E3226B7F` (mcp-doctor exit 0)
**Figma:** section 5456:18648 (idle 5456:18703 · loading 5456:19479 · result 5456:19149 · no match 5456:19860)
**Upstream:** qa-ui Compare PASS — `plans/reports/qa-ui-260926-2335-au-458-make-it-yours.md`
**Status:** COMPLETE — **VERDICT: PASS** (0 BLOCKER · 0 MAJOR · 8 MINOR · 4 ESCALATE-for-CEO, non-blocking)

**Surfaces reviewed (4):** idle detail · loading · partial · no match. Success (result pager + Saved) reviewed from code + Figma intent only; the test account cannot reach it (same gap as qa-ui). Error / no_wardrobe reviewed from code.

**Evidence:**
- `auxi/docs/qa-findings/screenshots/2026-09-26/miy-1-idle-detail.png`, `miy-2-partial.png`, `miy-4-no-match.png` (qa-ui)
- `auxi/docs/design-reviews/screenshots/2026-09-26/designer-miy-partial.png` (fresh, 23:37: partial state scrolled into view, body copy clear of the footer)
- `auxi/docs/design-reviews/screenshots/2026-09-26/designer-miy-loading.png` (fresh; captured after the run had already resolved, so it shows partial with the cover still loading, not the loading panel)
- Evidence caveat: `miy-3-loading.png` on disk is byte-for-byte the no-match frame, not loading. qa-ui's "Loading PASS" row points to an overwritten file. I verified the loading panel from code only (`MakeItYoursPanels.tsx:17-41`).

**Accepted decisions (not failed):** no summary card / match % / stars; frameless states reuse the no-match layout; idle footer drops Remix + heart; missing slot = inspiration at 30% + "Not in your wardrobe"; Save→"Saved" + Favourites link; 18px MButton icons.

**Mechanical:** `auxi-lint-tokens.sh` reports 13 violations repo-wide and **0 in AU-458 files**. No raw hex, `fontFamily`, `zIndex`, or motion literals in scope. The footer uses `theme.zIndex.sticky`, `insets.bottom`, and the house blur + tint sticky-footer treatment.

---

## Lens summary

| # | Lens | Result |
|---|---|---|
| 1 | Design-system | On-system. Legacy-alias tier + raw on-grid dot literals → MINOR 1, 2 |
| 2 | Motion | No custom motion added, so no literal/asymmetry/reduce-motion violations. Mascot motion + reduce-motion come from `MacgieLoader`. Panel/footer swaps and dot change are instant cuts → MINOR 3 |
| 3 | Hierarchy | Clear. Cover stays as the anchor, H4 "Make it yours" title, then one message block, then one primary CTA per state. Loading pairs a disabled `loading` primary with a secondary Cancel. Good. |
| 4 | Color | Semantics correct (ink primary fill, ink text, no accent misuse). Inactive dot uses `ds.color.warm500` per Figma `text/primary/bold_400` → ESCALATE 2 (cross-screen) |
| 5 | States | Covers idle / loading / success / partial / no_match / no_wardrobe / error / saving / saved / removing(disabled). Two CTA/copy mismatches in error → MINOR 4, 5 |
| 6 | Cross-screen | Uses `MButton` + the shared footer shell. Favourites hand-off uses `navigate('Favourite', {showBackButton})` and See-on-me keeps the `SeeThisOnMeConfirm` gate. Pager indicator differs from Home / OutfitActionRow → ESCALATE 2 |
| 7 | Native feel | Back chip, Android back, and loading-Cancel close the panel. iOS edge-swipe is *disabled* while open, it does not close the panel → MINOR 6. Favourites link is a bare underlined `Text` → MINOR 7 |
| 8 | Recommendation | Missing-slot treatment is honest (never shown as owned) and the inspiration cover stays above the generated tiles as a comparison anchor. Partial promises "a few pieces" but shows none → ESCALATE 1 |
| — | Journey continuity | Where was I / where am I / what next can be answered in every reviewed state: the cover persists, the title names the mode, and the footer offers one clear next step. Back returns to the detail, not the feed. OK. |

---

# MINOR 1 — New code reads legacy `uac*`/`figma*` aliases where `ds.*` exists

**Severity**: MINOR
**Lens**: 1 design-system
**Rule doc**: design-system.md §1 ("new code reads from `theme.ds.*` first"), color-rules.md §5
**Screen**: Discovery detail → Make It Yours panels
**Build**: e254c8f + working tree

## What's off
The rendered values are on-system, but they come through the legacy tier:
`theme.colors.uacTextBase` → should be `theme.ds.color.ink` (makeItYoursStyles.ts:21, 34, 45, 50, 86, 114). `theme.colors.figmaCardSurface` → `theme.ds.color.cream` (:69). `theme.borderRadius.figmaTile` → `theme.ds.radius.sm` (:68). The active dot uses `theme.colors.figmaCtaLabel` (:106), an alias named for the "Wear this" CTA label. The value matches Figma primary/bold_600, but the alias name carries the wrong meaning for a pager indicator.

## Evidence
- Source: `auxi/src/screens/make-it-yours/makeItYoursStyles.ts:21,34,45,50,68,69,86,106,114`

## Routing
- mobile-dev

# MINOR 2 — Pager dot geometry uses raw literals

**Severity**: MINOR
**Lens**: 1 design-system
**Rule doc**: design-system.md §2 (named 4px-grid steps)
## What's off
`height: 4`, `width: 16`, `width: 8` (makeItYoursStyles.ts:101,105,110) are on-grid but unnamed. Use `theme.spacing.xs / m / s`, or better a shared pager-indicator primitive (see ESCALATE 2).
## Routing
- mobile-dev

# MINOR 3 — Panel swap, footer swap, and active-dot change are hard cuts

**Severity**: MINOR
**Lens**: 2 motion
**Rule doc**: motion-rules.md §2 (no token covers an in-place content swap, so this is polish, not a violation)
## What's off
idle→loading→result replaces the body (`DiscoveryOutfitDetailScreen.tsx:156-161`) and the footer row (`MakeItYoursActions.tsx`) in one frame. The animated `scrollToEnd` (:81-85) softens it, but the content itself pops. The active pager line also jumps between dots on `onMomentumScrollEnd` (MakeItYoursResultPanel.tsx:94-98, 137-146). This doesn't break continuity, because the cover anchor persists. A `fast` (120) opacity cross-fade on the panel body would make the swap feel prepared rather than abrupt. It would also be the reduce-motion-safe form, since it is opacity only.
## Routing
- mobile-dev (optional polish); CEO if a house "in-place state swap" motion token is wanted

# MINOR 4 — `not_found` error offers "Try again" for a look that no longer exists

**Severity**: MINOR
**Lens**: 5 states
## What's off
When `mode.code === 'not_found'` the body reads "This look is no longer available" (MakeItYoursBody.tsx:13). The footer still makes **Try again** the primary CTA (MakeItYoursActions.tsx:58-72), so the primary action can never succeed. For `not_found`, "Find another inspiration" (`onFindAnother`) is the honest next step. Separately, `server_error` shows "Check your connection and try again" (MakeItYoursBody.tsx:12), which blames the network for a 5xx.
## Evidence
- Source: `auxi/src/screens/make-it-yours/MakeItYoursBody.tsx:9-15`, `MakeItYoursActions.tsx:58-72`
## Routing
- mobile-dev

# MINOR 5 — Error footer labels its dismiss "Cancel"; the result footer calls it "Close"

**Severity**: MINOR
**Lens**: 5 states / 6 consistency
## What's off
After a failed run nothing is in flight, yet the secondary button reads "Cancel" (MakeItYoursActions.tsx:66-70, `makeItYours.cancel`) while it calls `panel.close`. The success footer uses "Close" for the same action (:81-88). Use `makeItYours.close` so a single verb means "leave the panel".
## Routing
- mobile-dev

# MINOR 6 — iOS edge-swipe is disabled while the panel is open, not redirected to close it

**Severity**: MINOR
**Lens**: 7 native-feel
## What's off
`navigation.setOptions({ gestureEnabled: !isOpen })` (useMakeItYoursPanel.ts:79-82) makes the edge-swipe do nothing while the panel is open. The brief says swipe "closes the panel", but it doesn't. Blocking the gesture is a common, acceptable native-stack trade-off and it prevents accidental exits. Still, a dead gesture is a small native-feel gap. Either intercept with `usePreventRemove`/`beforeRemove` → `panel.back()`, or record the "swipe disabled" behaviour as the intended spec.
## Routing
- mobile-dev (or accept and update the spec)

# MINOR 7 — "Saved — open Favourites" is a bare underlined `Text` link with no native press feedback

**Severity**: MINOR
**Lens**: 7 native-feel / 8 recommendation
## What's off
After saving, the only bridge to See-on-Me is an inline `Text onPress` with an underline (MakeItYoursResultPanel.tsx:149-157). It has no press state and a small hit area, which is web-link idiom, while every other action in the flow is an `MButton`. Consider `MButton variant="text"` (or a `Pressable` with `scale.press` feedback + `hitSlop`) for this link.
## Routing
- mobile-dev; touch-target measurement → qa-ux

# MINOR 8 — Pager pages clip at the panel's 16px padding

**Severity**: MINOR
**Lens**: 7 native-feel
## What's off
The horizontal `ScrollView pagingEnabled` sits inside `styles.panel` (`paddingHorizontal: m`). While you swipe, the next outfit appears and disappears at a hard 16px inset instead of sliding in from the screen edge. It also gives no peek that more outfits exist, so only the dots signal them. Consider bleeding the pager to full width (`marginHorizontal: -m` + `contentContainerStyle` padding) with page snapping that keeps the 16px gutters.
## Evidence
- Source: `auxi/src/screens/make-it-yours/makeItYoursStyles.ts:13-18,58-64`, `MakeItYoursResultPanel.tsx:107-135`
## Routing
- mobile-dev (verify on a seeded success account)

---

## ESCALATE (CEO): taste/product calls, non-blocking under the accepted decisions

1. **Partial state promises pieces it doesn't show** (lens 8). Copy: "You own a few pieces of this look". The panel is text-only, and the `relevant_items` the backend returns for `partial` are discarded (`makeItYoursService.ts:58-59`; phase-06 spec line 22 planned a "closest pieces you own" strip). This is accepted as "reuse the no-match layout", but the claim with no proof weakens trust in the recommendation. Decide: add the relevant-items strip (existing `DiscoveryItemStrip`-style tiles), or soften the copy. Evidence: `designer-miy-partial.png`.
2. **Pager indicator has no canonical form** (lens 6/4). MIY uses 4px round-capped lines (16 active / 8 inactive, `ds.color.warm500` inactive) per Figma 5456:21381. Home TodaysPicks uses a 6px pill (20 active, `figmaDotInactive`), and OutfitActionRow uses 4px circles (`figmaDivider`). That makes three pager indicators in the product. Pick one canonical `MPagerDots` and fold it into the DS.
3. **Empty-state copy vs. the single CTA**. no_match says "Try to add items from this look or find another inspiration", and partial says "Add similar items or find another inspiration". The footer only offers "Find another inspiration" (Figma 5456:19938). Decide whether to add an "Add clothes" secondary (no_wardrobe already has it) or drop the "add items" half of the copy.
4. **Loading/cover continuity (unconfirmed)**. In the fresh capture `designer-miy-loading.png`, the cover rendered as an empty cream frame while the panel had already reached partial (detail had just opened). No code path remounts the cover (`DiscoveryOutfitSummary` only gates the body), so this is likely a cold image load and not a regression. Flagged for qa-mobile smoke to confirm it doesn't recur on a warm cache.

---

## Self-audit
- 4 surfaces reviewed · 8 MINOR + 4 ESCALATE · every visual finding cites a screenshot that exists on disk, 0 deleted
- Every finding cites a rule doc + token, or the lens question it fails
- Verdict per ladder: 0 BLOCKER / 0 MAJOR → **PASS**
- Open gap (not designer-owned): success/Saved state and pager behaviour still need a sim pass on a seeded non-prod account (qa-mobile), and qa-ui should re-capture the overwritten `miy-3-loading.png`.

`4 surfaces reviewed · 12 items (B:0/Maj:0/Min:8 + 4 ESCALATE) · PASS · routing → mobile-dev (minors), CEO (escalations), qa-ui (loading evidence), qa-mobile (success-state sim pass)`

## Fixes applied after review (main session, 2026-09-26)
| # | Status | Change |
|---|---|---|
| 1 | FIXED | `makeItYoursStyles.ts` → `ds.color.ink`, `ds.color.cream`, `ds.radius.sm`, `ds.radius.full`; active dot keeps `figmaCtaLabel` (#262421 has no ds alias — commented) |
| 2 | FIXED | Dot sizes → `spacing.xs` / `spacing.s` / `spacing.m` |
| 3 | DEFERRED | State-swap fade — optional polish, no motion rule broken |
| 4 | FIXED | 404 → primary "Find another inspiration" (no dead retry); server errors → new `error_server_body` copy (no network blame) |
| 5 | FIXED | Error-state dismiss is "Close" (`make-it-yours-close`), same as result |
| 6 | ACCEPTED | iOS swipe disabled while open (hardware/visible Back close the panel) — spec note |
| 7 | FIXED | Favourites link → `MButton variant="text" size="sm"` (press feedback, 32h) |
| 8 | DEFERRED | Pager peek/edge-bleed — polish |
| E1 | FIXED | Partial now renders the owned `relevant_items` as a 96px 3:4 tile strip (user request 2026-09-26) — `MakeItYoursPanels.tsx`, `MakeItYoursTileImage.tsx` |
| E2–E3 | CEO | Open (page-indicator standard, Add clothes on no-match) |
Evidence: loading screenshot re-captured (`auxi/docs/qa-findings/screenshots/2026-09-26/miy-3-loading.png`). Tests 66/66 (discovery + make-it-yours), tsc/eslint/token-lint clean.

## Follow-up after sim QA (2026-09-27)
- Missing-slot tile (faded inspiration image) REMOVED — user: only the user's own items may be shown; null slots are skipped.
- Footer Close icon: `Icons.Close` is a broken asset (full 828×1792 screen mock) → `Icons.CloseThin` (path-identical to Figma `5456:21357`).
- Panel reveal scroll now waits for the new panel's layout (`useRevealPanelScroll`).
- Backend miy-2: roles derived from codes when `category_family` is empty; garment type dominates similarity; unknown type never "close"; relevance floor 0.55.
