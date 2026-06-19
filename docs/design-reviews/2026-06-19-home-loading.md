# Design Review — Home loading state (AU-364 / GH-364)

**Date**: 2026-06-19
**Reviewer**: designer (system proxy gate)
**Type**: Ad-hoc CEO-requested review (NOT a step-6.5 PR gate)
**Build**: branch `duc2820/au-364-review-ai-agent-designer-moi-feedback-de-chinh-cho-dung-gu`
**Device/MCP**: iPhone 16 Pro sim booted, WDA up (mcp-doctor exit 0). Sim screenshot of the live state not captured — cold-launch redbox toolchain issue (Xcode 26.5 / RN 0.83.1); review grounded in code + Figma per dispatch note.
**Figma reference**: `0nXXMAR4Arf1ZfjtQvtBh0` node `2850-11205` ("Home - loading") — saved to `screenshots/2026-06-19/figma-home-loading.png`

**CEO complaint (verbatim)**: "màn hình loading design rất khác với home page lúc loading, cần designer agent involve vào" — the loading screen looks very different from how the home page looks while loading.

---

## TOP — CEO escalation (decide before mobile-dev implements)

**THE MASCOT QUESTION.** The Figma "Home - loading" frame **drops the Macgie cat
mascot entirely.** It shows a silent, calm skeleton: four shimmer-gradient outfit
slots inside the *real* Home chrome (header + footer + bottom toggle), and the
only "working" affordance is a small **"Generating •••"** pill. No mascot, no
spinner, no big centered loader.

But today the mascot IS the app's loading personality — it runs at app boot
(`AppNavigator.tsx:81`), in the Home footer while building
(`HomeScreen.tsx:2941`), and in image-prep modals. So the Figma frame and the
shipped pattern encode **two different philosophies of "the app is working":**

- **Figma direction (skeleton-first):** Home-while-loading should look like Home.
  The user already understands the 2×2 grid; we just shimmer the slots and whisper
  "Generating". Mascot is reserved for *cold boot* (the one place there's no
  content scaffold to skeleton). This reads quiet, premium, content-continuous.
- **Current direction (mascot-everywhere):** The mascot is the brand's loading
  voice; it appears wherever we wait, including in-content. This reads warm,
  characterful, branded — but it overrides the content scaffold and makes
  loading feel like a *modal interruption* rather than a *content state*.

**This is a taste / brand-direction call — it is NOT mine to make.** Recommend:
adopt the **Figma skeleton-first direction** (mascot = boot + true modal waits;
in-content waits = skeleton + Generating pill). Rationale: (a) it's what the CEO
drew in the reference frame, (b) it keeps the user oriented in the grid they're
about to see, (c) it resolves the fragmentation below by giving each loader a
clear job. But if the CEO wants the mascot to stay as the in-Home loading voice,
that is a legitimate choice and the Figma frame should be revised to match —
**we should not ship a half-and-half.** → **ESCALATE to CEO.**

Everything below assumes the recommended skeleton-first direction. If the CEO
rules "mascot stays", findings 1, 4, 5 collapse and the verdict flips toward the
fragmentation cleanup only.

---

## Verdict: **ESCALATE** (gated on the mascot decision) — and **FAIL** on the
on-system gaps regardless of which direction wins

The central question (mascot vs skeleton) is a CEO call → ESCALATE. But several
findings are FAIL-grade *independent* of that decision: the footer surface color
is off-palette warm-vs-cool (BLOCKER, lens 4), and the loading state has no motion
at all (the cards are dead-flat, no shimmer/pulse — MAJOR, lens 2). Those block
regardless. Net: **ESCALATE the direction; FAIL the current implementation.**

Findings: B:1 / Maj:4 / Min:2 (+1 ESCALATE).

---

## LENS 1 — Design-system compliance

### [MAJOR] Loading cards are flat `figmaCardSurface`, not the Figma shimmer-gradient
- **Lens**: 1 design-system / 2 motion
- **What's off**: Each loading slot renders a solid `#f2efec` fill
  (`loadingCard` → `figmaCardSurface`). The Figma slot is a **diagonal gradient**
  `linear-gradient(230deg, #f2efec 26.8% → #d5ccc3 84%)` — a soft warm-to-greige
  ramp that reads as "image about to appear." Flat cream reads as "empty box."
- **Evidence**:
  - Source: `auxi/src/screens/HomeScreen.tsx:3333` (`loadingCard`), card shell `:3252` (`card`)
  - Figma: node `2850:11215/11216/11218/11219` — `backgroundImage: linear-gradient(230.17deg, rgb(242,239,236) 26.8%, rgb(213,204,195) 84%)`
  - Note: `#d5ccc3` has no `ds.color` token yet. No `LinearGradient` lib installed; `react-native-svg` IS available (gradient via `<Defs><LinearGradient>` or an animated shimmer overlay). → token-add + impl decision for mobile-dev.
- **Routing**: mobile-dev (impl the gradient/shimmer slot) + add the `#d5ccc3` stop to `theme.ts` (or `figma-theme-sync` first if it's a named Figma var).

### [MAJOR] The "Generating •••" pill is entirely missing
- **Lens**: 1 design-system / 3 hierarchy / 8 recommendation
- **What's off**: Figma puts a pill above the grid: bg `#eee6df`
  (`background/primary/subtle_200` = `ds.color.warm100` / `figmaCaptionPillBg`),
  radius 8, h-32, px-12, text `#070707` 12px Inter Regular "Generating" + an
  animated 24px 3-dot loading glyph. The shipped loading state has **no pill** —
  the "working" message lives only in the footer next to the mascot. The pill is
  the design's primary "we're preparing your outfit" affordance and the anchor
  for the recommendation-trust story (lens 8).
- **Evidence**:
  - Source: `HomeScreen.tsx:2921-2946` (`HomeLoadingState` — no pill rendered)
  - Figma: node `3914:28282` (pill) + `3914:28283` (text) + `Icons name="loading"` (node `3914:28293`, the animated 3-dot glyph)
  - Tokens all exist: bg `warm100`, text `black` (`#070707`), radius `8` (`border-radius/md`). No new color token needed.
- **Routing**: mobile-dev. Reuse `ds.color.warm100` + `ds.color.black`; the 3-dot glyph is a new animated icon (see lens 2).

---

## LENS 2 — Motion & interaction

### [MAJOR] The loading state has NO motion — cards are dead-flat, no shimmer/pulse
- **Lens**: 2 motion
- **What's off**: `HomeLoadingState` renders four static `<View>`s. Nothing
  animates. A loading state with zero motion reads as "frozen / stuck," not
  "working." The app *already owns* the correct primitive — `SkeletonTile`
  (`features/SkeletonTile.tsx`) does a token-correct opacity pulse 0.4↔0.8 over
  1200ms with a `useReducedMotion` branch — but Home-loading doesn't use it; it
  hand-rolls four motionless cards instead. This is a DRY miss *and* a motion
  miss. (Figma intends a shimmer; the pulse is the in-codebase equivalent.)
- **Evidence**:
  - Source: `HomeScreen.tsx:2929-2934` (static `View`s) vs `features/SkeletonTile.tsx:40-58` (the existing pulse primitive)
  - Figma: gradient slots imply a shimmer sweep (node `2850:11215`)
  - Rule: `motion-rules.md` §4 — every non-trivial loading surface should animate; SkeletonTile is the reference impl.
- **Routing**: mobile-dev — render `SkeletonTile` (or a shimmer variant of it) in the four slots instead of static `card`+`loadingCard` Views. Reuse the existing reduce-motion-safe pulse; do not hand-roll new timing.

### [MAJOR] "Generating" 3-dot glyph needs a token-correct animation (when added)
- **Lens**: 2 motion
- **What's off**: The pill's 3-dot loader (Figma node `3914:28293`) must animate
  (the dots are the only "alive" signal in the calm design). When mobile-dev adds
  it, the animation must reference `motion.ts` tokens — `stagger.normal` (80ms)
  between dots, opacity `subtle↔visible` — and carry a `useReducedMotion` branch.
  Flagging now so it isn't shipped with a hardcoded literal (which would be a
  BLOCKER under `motion-rules.md` §5).
- **Evidence**: Figma node `3914:28293/28294`; rule `motion-rules.md` §1, §4.
- **Routing**: mobile-dev — build the 3-dot loader off `motion.ts` tokens with reduce-motion fallback.

---

## LENS 4 — Color & emphasis

### [BLOCKER] Loading footer surface is `#F3F5F9` (cool blue-gray) — off the warm palette
- **Lens**: 4 color / 6 cross-screen
- **What's off**: `loadingFooter` uses `figmaSurfaceSoft` = `#F3F5F9`, a
  **cool blue-gray** that is alien to Auxi's warm-paper palette. The Figma loading
  footer is the real Home footer: a `white` 80% surface with `backdrop-blur-4`
  (`background/neutral/subtlest`), plus the warm-tan toggle pill `#e0d2c4`
  (`ds.color.tan`). A cool gray block floating under a warm cream/white grid is a
  semantic color violation — `figmaSurfaceSoft` is not a member of the warm
  surface family in `color-rules.md` §1 (surfaces are `white`/`surface`/`cream`/
  `warm100`/`tan`). Same wrong token also appears at `:3077`, `:3468`, `:3489`.
- **Evidence**:
  - Source: `HomeScreen.tsx:3420` (`loadingFooter.backgroundColor: figmaSurfaceSoft`); token def `theme.ts:33` `figmaSurfaceSoft: '#F3F5F9'`
  - Figma: footer node `3910:14047/14094` — `background/neutral/subtlest` white @ opacity 80, `backdrop-blur-4`; toggle pill `3914:24541` bg `#e0d2c4` = `tan`
  - Rule: `color-rules.md` §1/§2 — app surfaces are the warm family; `#F3F5F9` is not in `ds.color`.
- **Routing**: mobile-dev — the loading footer should match the real footer surface (`ds.color.white` @ blur, warm-tan toggle). If the skeleton-first direction wins, the loading footer should literally *be* the real footer chrome (disabled "Show another", outlined "Wear this") per Figma `3910:14076`.

---

## LENS 3 — Visual hierarchy

### [MAJOR] Loading footer competes for attention via the mascot; the real chrome is absent
- **Lens**: 3 hierarchy / 7 native-feel
- **What's off**: Today the loading footer is a gray bar with a 28px animated cat
  + "Building your next looks" — a high-attention, centered, branded element that
  pulls the eye to the footer. The Figma design inverts this: the footer shows the
  *real* controls (Remix / page-dots / Show another [disabled] / "Wear this"
  outlined CTA / grid-toggle), all dimmed/disabled, so the user previews the
  shape of what's coming and the **shimmering grid** is the focal point. The
  current hierarchy says "look at the loading animation"; the intended hierarchy
  says "your outfits are materializing here." The latter is calmer and keeps the
  recommendation (the grid) primary.
- **Evidence**:
  - Source: `HomeScreen.tsx:2940-2943` (mascot+text footer) vs Figma `Footer` node `3910:14047` (full disabled chrome)
  - Lens-3 question failed: "is the recommendation clearly prioritized?" — no, the footer loader out-competes the grid.
- **Routing**: mobile-dev (skeleton-first direction) / CEO if mascot stays.

---

## LENS 6 — Cross-screen consistency (loading-language fragmentation)

### [MAJOR] App has ~6 divergent loading vocabularies with no documented tiering
- **Lens**: 6 cross-screen
- **What's off**: Inventory of loaders found in `src/`:
  | # | Loader | Where | Motion |
  |---|---|---|---|
  | 1 | Macgie mascot (fullScreen 112px) | boot `AppNavigator.tsx:81` | sway/bob/look loop |
  | 2 | Macgie mascot (inline 28px) | Home footer `HomeScreen.tsx:2941` | inline mascot |
  | 3 | Opacity-pulse skeleton | pin `/build` `/try_another` `SkeletonTile.tsx` | 0.4↔0.8 / 1200ms, reduce-motion ✓ |
  | 4 | Flat static cards | Home-loading `HomeScreen.tsx:2933` | **none** |
  | 5 | Rotating 3-dot spinner | onboarding `OnboardingLoadingScreen.tsx:114` | **hardcoded** 360°/1000ms `Easing.linear` |
  | 6 | `ActivityIndicator` (iOS spinner) | favorites `HomeScreen.tsx:1977`, `BodyScreen.tsx:474` | OS default |
  | 7 | Static skeleton (no anim) | wardrobe grid `WardrobeScreen.tsx:518` (`tileSkeleton`) | **none** |
  | 8 | Figma target | Home-loading reference | shimmer-gradient + animated 3-dot pill |

  That is **not** a clean tier — it's drift. Three different "we're waiting"
  metaphors (mascot / skeleton / spinner) appear with no rule for which goes
  where, and two of them (4, 7) don't animate at all. This is the root of the
  CEO's complaint: the *same conceptual moment* (app is loading content) looks
  different on boot vs Home vs onboarding vs wardrobe.
- **Recommended unified loading language** (for mobile-dev to implement once the
  CEO confirms the mascot scope):
  - **Mascot (MacgieLoader)** → reserved for **cold boot** + true full-screen
    modal waits where there is *no content scaffold to skeleton* (e.g. try-on
    image generation). The brand's "first hello," not an in-content state.
  - **Skeleton (SkeletonTile / shimmer)** → **every in-content load** where the
    layout is known: Home-loading grid (4 slots), wardrobe grid, pin/build slots.
    One primitive, one pulse/shimmer, one reduce-motion branch. Wardrobe's static
    `tileSkeleton` (`WardrobeScreen.tsx:889`) should adopt the same animated
    primitive (currently dead-flat — a separate MINOR below).
  - **Inline spinner (`ActivityIndicator`)** → reserved for **button-scoped /
    micro waits** (the favorite heart while saving, a single-row action). Never a
    full screen.
  - **Onboarding 3-dot rows** → fold into the skeleton/spinner language or at
    minimum move its hardcoded `1000ms`/`Easing.linear` onto `motion.ts` tokens
    (it's a `motion-rules.md` §5 BLOCKER in isolation — flagged here, see below).
- **Evidence**: file:line per row above. Rule: `header-footer-rules.md` (chrome
  consistency) + `motion-rules.md` §4 (every loader animates, reduce-motion).
- **Routing**: mobile-dev (implement the unified language) — but the *scope of the
  mascot* is the CEO call at the top of this doc; mobile-dev should not unify until
  that's decided.

---

## LENS 7 — Native feel

### (folded into lens 3) — flat motionless cards read as "frozen," not "loading"
A native iOS loading state animates (shimmer/pulse/skeleton). Four dead-flat
boxes (`HomeScreen.tsx:2933`) read as a broken/stuck screen on a real device,
especially on a slow recommendation fetch. Covered by the lens-2 MAJOR; no
separate finding.

---

## LENS 8 — Recommendation experience

The "Generating" pill (missing, lens-1 MAJOR) is the recommendation-trust anchor
during the wait — it tells the user "Auxi is preparing *your* outfit" rather than
"the app is busy." Restoring it (+ shimmer slots) makes the wait feel curated and
intentional. No separate finding beyond the lens-1 pill MAJOR.

---

## MINORs (do not block; log for follow-up)

### [MINOR] Onboarding 3-dot spinner uses hardcoded motion (`1000ms` / `Easing.linear`)
- **Lens**: 2 motion. Source: `src/onboarding/v2/OnboardingLoadingScreen.tsx:118-127`.
  `duration: 1000` + `Easing.linear` are literals — `motion-rules.md` §5 calls a
  hardcoded duration/easing a BLOCKER *in a feature PR*. Logged MINOR here because
  it's pre-existing and out of this review's primary scope, but it should ride
  the loading-language unification. Route: mobile-dev.

### [MINOR] Wardrobe grid skeleton is static (no pulse) — inconsistent with `SkeletonTile`
- **Lens**: 6 cross-screen. Source: `WardrobeScreen.tsx:518/889` (`tileSkeleton`
  is a flat `figmaDetailSurface` View, no animation). Should adopt the animated
  `SkeletonTile` primitive when the loading language is unified. Route: mobile-dev.

---

## Self-audit
- Surfaces reviewed: 1 (Home-loading) + cross-screen inventory of 8 loaders.
- Findings: B:1 / Maj:4 / Min:2 (+1 ESCALATE). All cite file:line + Figma node + rule doc/lens question.
- Screenshot evidence: Figma reference exists on disk (`screenshots/2026-06-19/figma-home-loading.png`). No live-sim shot (toolchain redbox) — every finding is code+Figma grounded, none rely on a missing sim screenshot. 0 findings dropped.
- Verdict follows ladder: 1 BLOCKER + 4 MAJOR ⇒ FAIL; central direction question ⇒ ESCALATE.

## Routing summary
- **CEO (ESCALATE)**: mascot-vs-skeleton direction (top of doc) — decide before mobile-dev unifies.
- **mobile-dev**: shimmer-gradient slots (+`#d5ccc3` token), "Generating" pill (reuse `warm100`/`black`), animated 3-dot glyph (motion.ts tokens), footer surface fix off `figmaSurfaceSoft`→warm/white chrome, render `SkeletonTile` in loading slots, unified loading language, 2 MINORs.
- **qa-ui**: none (this is not a pixel re-audit).
- **qa-ux**: none flagged (no contrast/touch-target/VoiceOver verdict needed; `SkeletonTile` already has `accessibilityRole="progressbar"`).

---

# Re-gate — 2026-06-19 (skeleton-first fix verification)

**Reviewer**: designer (system proxy gate)
**Build**: branch `feat/home-loading-figma-fidelity` @ `88d3f73c` ("feat(home): match Home-loading state to Figma (skeleton-first)") — verified HEAD on this branch
**Device/MCP**: iPhone 16 Pro sim booted, WDA :8100 up (mcp-doctor exit 0). Figma `get_design_context` node `2850-11205` re-pulled and confirmed.
**Direction**: CEO confirmed the **skeleton-first** direction (mascot dropped from Home-loading; mascot reserved for cold boot + true modal waits). The ESCALATE is resolved — this re-gate assesses the implementation against that decision.
**Live-sim note**: the transient loading state could not be driven (Metro Fast-Refresh disconnected + the Xcode 26.5 / RN 0.83.1 cold-launch blocker; the state only renders during an in-flight recommendation fetch). Re-gate grounded in code + Figma, my primary mode — every finding maps to a concrete, read-verified code change and a Figma node. The one thing a live shot would add (pulse actually animating + load→loaded transition feel) is behavioral, routed to **qa-mobile step-7 smoke** as a confirm-on-render item, not a gate blocker.

## Per-finding closure

| # | Prior finding | Severity | Status | Evidence (branch `88d3f73c`) |
|---|---|---|---|---|
| 1 | Loading footer surface `#F3F5F9` (cool blue-gray) off the warm palette | **BLOCKER** | **CLOSED** | Old `loadingFooter` style (the off-palette one) removed. New `loadingFooterChrome` (`HomeScreen.tsx:3392`) carries **no `backgroundColor`** — it renders the *real* footer chrome (`OutfitActionRow` Remix row + outlined "Wear this") dimmed at `motion.opacity.subtle` (0.6), `pointerEvents="none"` (`:2964-2973`). Matches Figma footer node `3910:14047` (white/blur, opacity-50, disabled controls). The 3 surviving `figmaSurfaceSoft` usages (`:3108 pinHeaderLabel`, `:3533 loadingMoreIndicator`, `:3550 cycledHint`) are pre-existing, out-of-scope micro-affordances — NOT the loading footer. |
| 2 | Loading cards flat `figmaCardSurface`, not the Figma diagonal shimmer-gradient | MAJOR | **CLOSED** | `ShimmerSlot.tsx:90-113` renders `react-native-svg` `<LinearGradient>` `x1=1 y1=0 → x2=0 y2=1` (≈230deg, top-right→bottom-left), stops `offset 0.268 = figmaCardSurface (#f2efec)` → `offset 0.84 = figmaSkeletonRampEnd (#d5ccc3)`. Offsets + colors match Figma node `2850:11215` ramp exactly. No raw hex — both stops are tokens. |
| 3 | Loading state has NO motion (dead-flat) | MAJOR | **CLOSED** | `ShimmerSlot.tsx:48-72` runs an `Animated.loop` opacity pulse `subtle(0.6) ↔ visible(1.0)`, half-cycle = `motion.duration.reveal` (700ms) → 1400ms loop, in the SkeletonTile family. Reduce-motion branch holds steady at full opacity, no loop (`:49-52`, motion-rules §3.2). All timings from `motion.ts`. No frozen feel. |
| 4 | "Generating" pill entirely missing | MAJOR | **CLOSED** | Pill present `HomeScreen.tsx:2934-2939` (`loadingPill` style `:3371`): bg `figmaCaptionPillBg` (warm100 `#eee6df`), h-32, px-12, gap-8, radius-8 (`m`), text `uacBodyXsRegular` 12px `figmaTextDark (#070707)`, + `<GeneratingDots size={24} />`. Matches Figma node `3914:28282/28283`. `GeneratingDots.tsx` animates 3 dots, opacity `subtle↔visible`, `motion.stagger.normal` (80ms) offset, `easing.standard`, reduce-motion fallback (`:42-45`) — Figma `Icons name="loading"` node `3914:28293`. No hardcoded motion literal. |
| 5 | Focal hierarchy — mascot competing; real chrome absent | MAJOR | **CLOSED** | Mascot fully removed from `HomeLoadingState` (no `MacgieLoader`/mascot import in the loading render). The shimmering grid is the focal point; the real footer chrome previews dimmed at opacity 0.6 (`loadingFooterChrome`). Matches the Figma intent (skeleton-first) the CEO confirmed. |
| 6 | Continuity — loading skeleton structurally matches LOADED Home | (new check) | **CLOSED (PARTIAL note)** | Loading grid uses `cardRow` + `cardShellFixed` (`width: CARD_WIDTH`) + `loadingSlotShell` (`height: CARD_HEIGHT`), 12-radius tiles, `GRID_GAP` (4) — same constants the loaded 2-row layouts use. Pill + footer positions mirror Figma. **Minor seam (non-blocking):** the loaded `twoByTwo` render (`:2705`) uses `cardShell` (`flex:1`, full-bleed ~181px) while loading uses `cardShellFixed` (CARD_WIDTH ≈ 180px, centered), and `gridWrap` adds `paddingVertical:8` that `loadingCards` omits. Widths land within ~1px so no perceptible horizontal jump, but the two are not driven by the identical wrapper rule. Logged as **MINOR** (lens 6) for mobile-dev: align loading `loadingCards`→`gridWrap`/`gridWrapStart` + cell shell with the loaded `twoByTwo` so the load→loaded swap is provably zero-shift. Does NOT block. |
| 7 | New components on-system (token tier / reduce-motion / placement) | (new check) | **CLOSED** | `ShimmerSlot.tsx` + `GeneratingDots.tsx` placed in `components/features/**` (consistent). Zero raw hex/zIndex/fontFamily/motion literals in code (the only `#hex` strings are in doc comments; the one `rgba(7,7,7,0.05)` is the whitelisted designer-intent shadow form, identical to the loaded `pinBadge`). All colors via tokens, all timings via `motion.ts`, both carry `useReducedMotion` branches + `accessibilityRole="progressbar"`. New tokens `figmaSkeletonRampEnd (#d5ccc3)` + `figmaOverlayLight30 (rgba 255,255,255,0.3)` added to `theme.ts:129/133` with sourcing comments. `auxi-lint-tokens.sh` adds **0 new violations** (the 32 reported are all pre-existing unrelated files). |
| 8 | Pin on loading slots mirrors the real pinned-card badge | (new check) | **CLOSED** | Bottom two slots get `showPin` (`HomeScreen.tsx:2952` `showPin={row === 1}`) → Figma nodes `2850:11218/11219`. `ShimmerSlot` pin style (`:122-145`) is byte-for-byte the loaded `pinBadge` geometry: `top:8, right:9, 34×34, radius m(8), figmaOverlayLight30`, identical drop-shadow (4/4, blur 5.3, 5%), same `IconHomePin width=17 height=17` glyph (loaded `:2650`, loading `:131`). `pointerEvents="none"` (nothing to pin yet). Prior inline pin-bg literal promoted to `figmaOverlayLight30` and now shared by both (DRY closed). |

## New issues introduced by the fix
- **None blocker/major.** One **MINOR** (continuity wrapper-rule seam, finding 6 above) — loading grid container/cell not driven by the identical rule as the loaded `twoByTwo`; widths coincide (~1px) so no visible jump, but it should be unified for a provably zero-shift transition. Route → mobile-dev (polish, does not block).

## Prior MINORs (carry forward, still open, do not block)
- Onboarding 3-dot spinner hardcoded `1000ms`/`Easing.linear` — untouched by this PR (out of scope). Still logged.
- Wardrobe grid skeleton static (no pulse) — untouched. **Opportunity:** `ShimmerSlot` is now a clean, token-correct, reduce-motion-aware shimmer primitive; the loading-language unification (prior lens-6 MAJOR) could adopt it for the wardrobe grid + pin/build slots in a follow-up. Not in this PR's scope; not a blocker.

## Verdict: **PASS**

All re-gate items: **1 BLOCKER + 4 MAJOR CLOSED**; the 3 new checks (continuity, new-components-on-system, pin parity) CLOSED. Only 1 new MINOR (continuity wrapper-rule polish) + 2 carried-forward pre-existing MINORs remain — none block. The Home-loading state now reads as Auxi intended: a calm warm-gradient shimmer grid inside the real (dimmed) Home chrome, a token-correct animated "Generating" pill, no mascot, pin badges mirroring the loaded grid. On-system: right token tier, motion off `motion.ts`, warm color semantics, header/footer/grid consistent with the loaded screen, both new components clean and reduce-motion-aware.

**Gate status**: this was a CEO-requested ad-hoc review that became the de-facto step-6.5 gate for branch `feat/home-loading-figma-fidelity`. With this PASS the PR is unblocked from the designer gate. **Hand-off to qa-mobile (step 7):** confirm on a live render once the toolchain allows that (a) the slot pulse + 3-dot wave actually animate, and (b) the load→loaded swap is shift-free — these are behavioral confirms outside the designer craft gate.

## Routing summary (re-gate)
- **mobile-dev**: 1 new MINOR — unify loading grid wrapper/cell rule with the loaded `twoByTwo` (`loadingCards`→`gridWrap`/`gridWrapStart`, `cardShellFixed`→match `cardShell`) for a zero-shift transition. Optional follow-up: adopt `ShimmerSlot` for wardrobe grid + pin/build slots (closes the prior loading-language MAJOR app-wide).
- **qa-mobile**: step-7 smoke — confirm pulse animates + load→loaded transition is shift-free on a live render.
- **CEO**: ESCALATE resolved (skeleton-first confirmed). No open taste question.
- **qa-ui / qa-ux**: none.
