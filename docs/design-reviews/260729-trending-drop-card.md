# Design review — AU-438 Trending Item Drop (Home card)

**Date**: 2026-07-29 · **Gate**: step 6.5 designer hard-gate
**Build**: `feat/au-438-trending-drop` @ `817957b5d`
**Surfaces**: Home (normal-deck content branch) · `TrendingDropCard` + `useActiveTrendingDrop` wiring
**Mode**: static (code + design-system docs). No Figma (approved on-system build → no pixel-diff). Sim NOT launched (other sessions may be mid-build) — live render deferred to qa-mobile.

## VERDICT: FAIL

1 MAJOR open → PR blocked until mobile-dev fixes and lens 3/7/8 re-run on the changed surface.
Findings: **B:0 / Maj:1 / Min:2** (+1 non-blocking taste flag → CEO).

Lens pass: 1 design-system OK (alias-tier MINOR) · 2 motion OK (see adjudication) · 3 hierarchy FAIL (MAJOR) · 4 color OK · 5 states OK · 6 cross-screen OK · 7 native-feel MINOR · 8 recommendation FAIL (same MAJOR) + taste flag.

---

## Adjudication of the two open concerns

### Concern 1 — no entrance motion / no reduce-motion branch → ACCEPTABLE (not a finding)
A static inline card is **on-system**. `motion-rules.md` §2 mandates motion for **sheets/drawers (open/close), toasts, and stagger reveals** — not for a plain content card that is part of the layout. The modal it was modeled on (`WardrobeWelcomeDialog`) fades because it is a `Modal` overlay (`animationType="fade"` is the presentation, not a bespoke animation); an inline card has no equivalent obligation. The missing `useReducedMotion` branch is **N/A** — there is no translate/scale animation to reduce (`motion-rules.md` §4/§5 only fire when an animation exists). Press feedback IS covered: `MButton` → `PressScale` honors `useReducedMotion` (`MMotion.tsx:37`). **A fade-in is NOT required.** (One motion nit remains on *exit* — see MINOR-2.)

### Concern 2 — vertical breathing room on small devices → LEGITIMATE → MAJOR-1 below.

---

## MAJOR-1 — Fixed-height promo starves the primary outfit deck on SE-class devices

**Severity**: MAJOR · **Lens**: 3 hierarchy / 8 recommendation · **Rule**: experiential (lens-3/8 question) + `header-footer-rules.md` §3a (fixed viewport, no scroll escape) · **Screen**: Home

### What's off
The content branch is a **flex column, not a ScrollView**: `TrendingDropCard` (fixed height) sits above `deckWrap` (`flex:1`, `styles.ts:51`), which holds the outfit swipe deck — Auxi's hero surface — plus the fixed Remix/dots/Refine action row. The card's intrinsic height ≈ **image 160 + title(≤2) + description(≤3) + two stacked `md` buttons (44+8+44) + paddings ≈ 390–440px** (`TrendingDropCard.tsx:95-116`). On an iPhone SE-class viewport (~667pt) after safe-area + HomeHeader (~90px) the deck is left ≈ **120–190px** for the outfit photo + action row. The core personalized recommendation gets visually buried beneath an admin-authored merchandising card, and there is no scroll to relieve the crowding. On tall devices (≥6.1") it is tolerable; on SE-class it degrades the primary experience whenever a drop is active.

### Evidence
- Source: `src/screens/HomeScreen/index.tsx:1712-1720` (card above `deckWrap`), `src/screens/HomeScreen/styles.ts:18-53` (`container flex:1` white / `deckWrap flex:1`), `src/components/features/TrendingDropCard.tsx:95` (`image height:160`).
- Live SE render NOT captured (sim not launched) — geometric estimate; qa-mobile to confirm on the min supported device.

### Fix (mobile-dev)
Make the card compact/adaptive so the deck keeps a usable minimum: cap/shrink the hero image (e.g. shorter fixed height or aspect-capped), tighten `numberOfLines`, and/or consider a slimmer banner treatment above the deck. Verify the outfit card remains the dominant element on the smallest supported device.

### Dependency (could downgrade to MINOR)
If the min supported device is **not** SE-class (product supports ≥6.1" only), this drops to MINOR. Confirm supported-device floor — see unresolved Qs.

---

## MINOR-1 — Token-tier drift: legacy `figma*`/`uac*` aliases where `ds.*` exists

**Severity**: MINOR · **Lens**: 1 design-system / 4 color · **Rule**: `design-system.md` §1/§6, `color-rules.md` §5 ("on-system value via legacy alias where a `ds.*` exists" = MINOR) · **Screen**: Home

On-system values, but new code should read `theme.ds.*` first. Swaps for mobile-dev (`TrendingDropCard.tsx`):
- `colors.uacTextBase` → `ds.color.ink` (`#1d1f23`, exact) — title (l.103).
- `colors.uacTextSubtle100` (`#40444d`) → `ds.color.onVariant` (`#49454f`, canonical muted label) — description (l.108).
- `borderRadius.uacPanel` (16) → `ds.radius.md` (16) — card (l.88).
- `borderRadius.m` (image) → `ds.radius.sm` (12) — image (l.98).
- `colors.white` → `ds.color.white` — image bg (l.99).
- `colors.figmaSurfaceSoft` (`#F3F5F9`, **cool** neutral) → prefer a warm subtle surface (`ds.color.surface2 #f7f7f8` or `warm100 #eee6df`). The DS neutral-surface family is warm-biased; a cool blue-gray panel is subtly off-family. On the white Home the difference is minor — MINOR, not a clash.

Typography aliases (`uacBodyMdSemibold`, `interBodySm`) are acceptable — the `ds.font` role-scale is a documented gap (`design-system.md` §5). No raw hex / `fontFamily` / raw `zIndex` anywhere — no BLOCKER.

---

## MINOR-2 — Abrupt exit on dismiss (deck snaps up)

**Severity**: MINOR · **Lens**: 2 motion / 7 native-feel · **Rule**: `motion-rules.md` §5 (abrupt motion, calm/intentional) · **Screen**: Home

On "Not interested", the optimistic hide (`useActiveTrendingDrop.ts:123`, `isVisible`→false) removes the card instantly, so the whole outfit deck jumps up ~400px in a single frame — a web-like lurch, not the calm iOS collapse the motion system aims for. User-initiated so continuity isn't broken (not MAJOR), but it's a craft polish.

### Fix (mobile-dev)
Animate the removal — `LayoutAnimation.configureNext` with `motion.duration.normal`/`easing.exit`, or a height/opacity collapse — honoring `useReducedMotion` (jump to final when reduced). Entrance stays static (Concern 1).

---

## Taste flag (non-blocking) → CEO

The card places an admin-authored **"Add to my wardrobe" merchandising promo in the top slot above the personalized recommendation**. Mechanically it is respectful (inline, dismissible, "Not interested", server excludes answered drops, instant optimistic hide) — it does not hijack the "wardrobe stays user-controlled" ethos. But *promo-above-the-curated-recommendation* is a product-direction call. AU-438 was approved as an on-system build, so this is a confirm-not-block: CEO to confirm the above-deck placement is intended vs. below-deck / slim-banner. Not part of the FAIL.

---

## Routing
- **MAJOR-1, MINOR-1, MINOR-2** → mobile-dev.
- **Taste flag** → CEO (confirm placement).
- **Live SE render + min-device floor** → qa-mobile (confirms/downgrades MAJOR-1).

## Unresolved questions
1. What is the minimum supported device? (SE-class vs ≥6.1" decides MAJOR-1 vs MINOR.)
2. Is the promo-above-deck placement CEO-intended? (taste flag)

## Self-audit
- Findings N=3 (+1 taste flag). Visual findings citing a screenshot: 0 (sim not launched — no broken evidence paths). MAJOR-1 is a stated geometric estimate, live-verify deferred to qa-mobile.
- Each finding cites a rule doc + concrete token OR the lens question it fails.
- Ladder: 1 open MAJOR ⇒ FAIL.
