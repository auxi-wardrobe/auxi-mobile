# qa-ui Compare — Sidebar Dark Redesign

| Field | Value |
|---|---|
| Mode | Compare (Pass 2 static + Pass 3 sim) |
| Figma | `0nXXMAR4Arf1ZfjtQvtBh0` · node `2852:24670` ("Menu Sidebar", 317×896) |
| Code | `src/components/layout/Sidebar.tsx` (240 LOC) + 7 icons + theme tokens |
| Spec contract | `plans/260525-2344-sidebar-dark-redesign/figma-extraction-sidebar.md` |
| Branch | feat/au-253-home-grid-view |
| Date | 2026-05-25 |
| Figma frame PNG | `docs/qa-findings/screenshots/2026-05-25/figma-sidebar-frame.png` |

## VERDICT: **PASS** (Pass 2) · **Pass 3 = SIM_BLOCKED** (WDA infra, not impl)

Code matches Figma on every audited axis: layout, tokens (zero raw hex / font
literals), typography, dimensions, item set, routing, testIDs, and all 3
CEO-resolved decisions. No pixel/token deltas to fix. Pass 3 sim screenshot
could not run — WebDriverAgent failed to attach to the booted simulator
(`xcodebuild: Unable to find a device matching the provided destination
specifier`). Not an implementation problem.

---

## Pass 2 — code vs Figma (static)

### Colors → tokens (no raw hex; lint clean)
`grep` for hex/font literals in `Sidebar.tsx` → NONE. Every color is a token.

| Surface | Figma | Token in code | Token value | Match |
|---|---|---|---|---|
| Sidebar bg | `#1D1F23` (frame fill) | `uacBackgroundBase` | `#1d1f23` | ✅ exact |
| Pill bg | `background/primary/subtle_50` `#f2efec` | `figmaBackground` | `#f2efec` | ✅ |
| Pill text+icon | `text/icon primary bold_700` `#070707` | `figmaTextDark` | `#070707` | ✅ |
| Row labels | `text/primary/base` `#f2efec` | `uacTextPrimaryBase` | `#f2efec` | ✅ |
| Row icons | `icon/primary/base` `#f2efec` | `uacTextPrimaryBase` via `color` prop | `#f2efec` | ✅ |
| Divider | `Black/10%` `rgba(0,0,0,0.1)` | `figmaDividerOnDark` | `rgba(242,239,236,0.1)` | ✅ CEO override (see Decision 3) |

### Typography
| Element | Figma | Code | Match |
|---|---|---|---|
| Pill text | Poppins Regular 16/24 | `aliases.poppinsBody` (Poppins-Regular 16/24) | ✅ |
| Rows 1–5 | Poppins Regular 16/24 | `aliases.poppinsBody` | ✅ |
| Log out | Figma literal = Inter 14/20 | `aliases.poppinsBody` (Poppins 16/24) | ✅ CEO override (Decision 1) |

Letter-spacing: Figma carries `tracking 0.15` on body large; `poppinsBody` has
`letterSpacing: 0`. Per artifact Q2 (resolved): 0.15px is visually negligible,
use as-is (KISS). Accepted — not a finding.

### Dimensions / spacing / radius
| Property | Figma | Code | Match |
|---|---|---|---|
| Width | 317 | `SIDEBAR_WIDTH = 317` | ✅ |
| Row/pill height | 48 | `menuItem.height: 48` (pill derived 12+24+12) | ✅ |
| Icon box | 24×24 | `width={24} height={24}` everywhere | ✅ |
| px padding | 20 | `uacButtonPaddingX` (=20) on both groups | ✅ |
| inner pad | 12 | `uacDimension12` (=12) on pill + rows | ✅ |
| icon↔text gap | 8 | `uacDimension8` (=8) | ✅ |
| inter-row gap | 4 | `uacDimension4` (=4) on both groups | ✅ |
| radius | 12 | `borderRadius.figmaTile` (=12) | ✅ |
| py bottom group | 32 (3XL) | `spacing.xl` (=32) | ✅ |

### Layout intent — bottom anchoring
Figma root = VERTICAL auto-layout `space-between` (top group y=0 h=164, bottom
group y=524 h=372, ~360px empty between). Code: `sidebar` style is
`flex` column `height: '100%'` + `justifyContent: 'space-between'` with exactly
two children (`topGroup`, `bottomGroup`). ✅ Bottom menu anchors correctly; the
gap is emergent, not hardcoded — matches artifact §"Derived geometry".

### Item set (EXACTLY 6 rows + pill — Decision 4)
Code renders: pill "See my outfits" + Wardrobe, My Favourite, Feedback,
Setting, My account, Log out. No Home/My body/Archive/Outfit Canvas. ✅
Matches Figma metadata visible Content nodes (hidden instances 24689/24690
correctly ignored).

### Routing / testIDs
All 7 testIDs match the artifact's mandatory plan (`sidebar-pill-see-outfits`,
`sidebar-menu-{wardrobe,favourite,feedback,setting,account,logout}` +
`sidebar-backdrop`). Routing honors artifact: pill→Home, Wardrobe→Wardrobe,
Setting→Settings, Log out→`logout()`; Favourite/Feedback/My account are
no-op with `// TODO` comments (no invented screens). accessibilityLabels set
per row. ✅

### Re-derived / normalized icons (special attention)
All 7 icon SVGs now use `stroke="currentColor"` / `fill="currentColor"` → they
recolor via the `color` prop (cream rows, dark pill). The hardcoded-hex blocker
from artifact Q7 is resolved.

| Icon | viewBox | stroke @24px | Glyph vs Figma | Notes |
|---|---|---|---|---|
| Grid (pill) | 24 | currentColor 1.5 | 4-cell rounded grid | ✅ matches Figma grid |
| Wardrobe | 48 | width 3 → ÷2 = **1.5px @24** | closet w/ center divider + handles | ✅ weight + geometry match |
| Heart | 48 | width 3 → ÷2 = **1.5px @24** | heart outline | ✅ |
| Feedback (re-derived) | 24 | stroke 1.5 + 3 filled dots r=1 | speech bubble + 3 dots | ✅ matches Figma (bubble + 3 ellipses) |
| Setting (NEW, re-derived) | 24 | stroke 1.63, inner `scale(0.9203)` | **hexagon + inner circle** | ✅ hexagon geometry matches Figma group; effective stroke ≈1.5px after scale |
| My account (user) | 24 | stroke 1.5 | head + shoulders | ✅ |
| Log out | 24 | stroke 1.5 | door + arrow-out | ✅ |

**Stroke-weight scaling check (48-viewBox icons rendered at 24px):** wardrobe &
heart carry `stroke-width="3"` in a 48 viewBox → at 24px render that scales to
~1.5px visual weight, matching the 1.5px native-24 icons (grid/feedback/user/
logout). Feedback was re-derived natively at 24/1.5 (no scaling needed). Setting
uses 1.63 stroke inside a `scale(0.9203)` group → ~1.5px effective. Visual
weight reads consistent ~1.5px across all 6 row icons + pill. ✅

### CEO-resolved decisions — all 3 honored
1. **Log out font** = Poppins 16/24 (`poppinsBody`), same as other rows — NOT
   the Figma-literal Inter 14/20. ✅ (`menuText` style applies to all rows incl.
   Log out via shared `MenuItem`.)
2. **Top padding** = `insets.top + 16` (`paddingTop: insets.top + 16` on
   `topGroup`), NOT a literal 58px. ✅ Safe-area-aware.
3. **Divider** = visible cream hairline ~10% via `figmaDividerOnDark`
   (`rgba(242,239,236,0.1)`), NOT invisible 10%-black. ✅ Applied as
   `borderTopWidth: 1` + `borderTopColor` on `bottomGroup`. Theme comment cites
   the Q9 CEO resolution.

---

## Pass 3 — simulator screenshot: SIM_BLOCKED

- Simulator booted: iPhone 16 (18.2). Auxi installed (3 bundle IDs incl.
  `org.reactjs.native.example.auxi`, `com.auxi`).
- MCP doctor pre-flight: simulator ✓, but **WebDriverAgent failed to start on
  :8100**. Doctor auto-invoked `wda-install.sh` (xcodebuild WDA bring-up);
  after >4 min the runner never attached — `:8100` stayed HTTP 000 and
  `logs/wda.log` ended with:
  `xcodebuild: error: Unable to find a device matching the provided destination
  specifier`. Doctor exited with `✗ WebDriverAgent startup failed`.
- mobile-mcp screenshot/tap requires :8100. With WDA dead, Pass 3 cannot run.
- Per qa-ui boundaries (no build churn / don't fight Xcode SDK-destination
  mismatches): **stopped Pass 3, did not loop on builds.** This is an
  environment/tooling failure, independent of the Sidebar implementation.
- **To unblock:** fix WDA destination matching (sim UDID vs WDA scheme
  destination in `wda-install.sh`), confirm :8100 → 200, then re-run Pass 3:
  launch Auxi → open sidebar via Header menu (`header-menu`) → screenshot →
  overlay vs `docs/qa-findings/screenshots/2026-05-25/figma-sidebar-frame.png`.
  Hand to qa-mobile (full exploratory tier) if WDA recovery needs a fresh sim.

---

## Findings summary

| Sev | Count |
|---|---|
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 |

No deltas. Pass 2 is a clean PASS; the only gap is the unrun sim screenshot,
blocked by WDA infra (not the code).

## Routing
- No fixes to route to mobile-dev — implementation matches Figma + all CEO
  decisions.
- Pass 3 re-run blocked on WDA recovery (infra). Surface to whoever owns the
  sim/WDA setup, or hand to qa-mobile once :8100 is healthy.

## Unresolved
- Pass 3 visual confirmation pending WDA fix — Pass 2 static confidence is high
  (token-exact, geometry-exact), so visual risk is low, but bottom-anchoring +
  cream-on-dark contrast + divider visibility are best confirmed on-device.
