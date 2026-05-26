# Figma Extraction — Menu Sidebar (Dark Redesign)

> Phase 1 (extraction) artifact for the canonical Figma→RN workflow.
> **NO code in this task.** This note is the authoritative spec for the
> implementation phase. Implementation must not begin until qa-ui
> review-extraction PASSes (or open questions are resolved by CEO/tech-lead).

## Source

| Field | Value |
|---|---|
| Figma URL | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-24670 |
| fileKey | `0nXXMAR4Arf1ZfjtQvtBh0` |
| Frame node-id | `2852:24670` ("Menu Sidebar") |
| Frame size | **317 × 896** px |
| Component lineage | Built from SnowUI components (`Content` 354:21080, `Icon` 354:19726, `SignOut` 354:21358, `Text` 354:19449) |
| Extracted by | mobile-dev · 2026-05-25 |
| Branch | feat/au-253-home-grid-view |
| Target | `src/components/layout/Sidebar.tsx` (rewrite, 240 LOC currently) |

Tools used: `get_metadata` → `get_design_context` (root + bottom frame 2852:24673)
→ `get_variable_defs` → `get_screenshot`. Background/pill/text hex confirmed by
pixel-sampling the rendered PNG with ImageMagick (variable defs did not surface
the frame fill — see Open Questions Q1).

---

## Frame tree

```
Menu Sidebar  2852:24670   317×896   VERTICAL auto-layout, space-between (justify)
├── Frame  2852:24671      317×164   top group · px 20 · py 58 · gap 4 · VERTICAL
│   └── Content  2852:26376   277×48   TOP PILL "See my outfits"
│        ├── icons  2852:26377   24×24   (grid icon)
│        └── Text  2852:26378   221×24
│             └── "See my outfits"  2852:26379
│
│   …large empty gap (top group ends y≈164, bottom group starts y=524)…
│
└── Frame  2852:24673      317×372   bottom group · px 20 · py 32 · gap 4 · VERTICAL
    │                                  border-top 1px rgba(0,0,0,0.10)
    ├── Content 2852:24674  277×48   row "Wardrobe"      icon 2852:24969
    ├── Content 2852:24907  277×48   row "My Favourite"  icon 2852:24957 (heart)
    ├── Content 2852:24679  277×48   row "Feedback"      icon 2852:24951 (chat bubble + 3 dots)
    ├── Content 2852:24684  277×48   row "Setting"       icon 2852:24938 (hexagon group)
    ├── Content 2852:24912  277×48   row "My account"    icon 2852:24945 (person group)
    └── Content 2852:24691  277×48   row "Log out"       icon (SignOut, Weight=Regular)
        (3 hidden/duplicate Content instances also present in the frame —
         2852:24689, :24690 hidden=true, and the visible Log out is the
         instance 2852:24691; ignore the hidden ones.)
```

**Layout intent:** root frame is a VERTICAL auto-layout with
`justify="space-between"` → top group pinned to top, bottom group pinned to
bottom, blank space in between. This is what produces the "menu anchored to
bottom" effect. In RN: `flex: 1` column with `justifyContent: 'space-between'`
(top group + bottom group as the two children).

---

## Tokens (Figma variable defs + pixel-confirmed)

### Colors

| Figma token | Hex | Used for | theme.ts mapping |
|---|---|---|---|
| (frame fill — no bound var) | **`#1D1F23`** | Sidebar background (near-black) | **EXISTS** → `colors.uacBackgroundBase` (`#1d1f23`) ✅ exact match |
| `background/primary/subtle_50` | `#F2EFEC` | "See my outfits" pill background (cream) | **EXISTS** → `colors.figmaBackground` / `figmaCardSurface` (`#f2efec`) ✅ |
| `text/primary/bold_700` | `#070707` | Pill text "See my outfits" (dark on cream) | **EXISTS** → `colors.figmaTextDark` (`#070707`) ✅ |
| `icon/primary/bold_700` | `#070707` | Pill grid icon stroke (dark on cream) | **EXISTS** → `colors.figmaTextDark` (`#070707`) ✅ |
| `text/primary/base` | `#F2EFEC` | Menu row labels (cream/off-white on dark) | **EXISTS** → `colors.uacTextPrimaryBase` (`#f2efec`) ✅ |
| `icon/primary/base` | `#F2EFEC` | Menu row icon strokes (cream on dark) | **EXISTS** → `colors.uacTextPrimaryBase` (`#f2efec`) ✅ |
| `Black/10%` | `#0000001A` (rgba(0,0,0,0.10)) | border-top divider on bottom group | **NO TOKEN** → see "needs token" below |

> **CORRECTIONS to the task's pre-read:**
> - Background is **`#1D1F23`**, not `#141718`. The current Sidebar's
>   `#141718` (its old "Get dressed" pill) is NOT the new bg.
> - Text is **`#F2EFEC` (cream/off-white)**, NOT pure `#FFFFFF`. Both row
>   labels and row icons use the cream base, matching the UAC dark-flow
>   light-text token already in theme.ts.
> - Pill text/icon are dark **`#070707`**, not the same as labels.

### Typography

| Figma style | Family | Size | Line height | Tracking | theme.ts mapping |
|---|---|---|---|---|---|
| Body Large (pill + 5 rows) | **Poppins Regular** | 16 | 24 | **0.15** | `typography.aliases.poppinsBody` (Poppins-Regular 16/24, **letterSpacing 0**) — see Q2 |
| "14 Regular" (Log out row label only) | "Font" = **Inter** Regular | 14 | 20 | 0 | `typography.aliases.uacBodyXsRegular` is Inter 12/16 — **no exact 14/20 alias**; see Q3 |

> **Font deltas vs current Sidebar.tsx:** current uses `Manrope-SemiBold`
> (pill) and `Manrope-Medium` (rows). New design is **Poppins Regular** for
> the pill + 5 rows. The "Log out" row is an odd one out — it came from a
> different SnowUI source component and reads as **Inter Regular 14/20**
> (likely a design inconsistency, not intentional — see Q3).

### Spacing / radius

| Figma value | px | Used for | theme.ts mapping |
|---|---|---|---|
| px (both groups) | 20 | horizontal padding | `spacing` has no `20`; `uacButtonPaddingX` = 20 ✅ (or add named) — see Q4 |
| py top group | 58 | top padding above pill | **NO exact token** (closest: none). Likely safe-area-aware — see Q5 |
| py bottom group (`3XL`) | 32 | top+bottom padding of menu group | `spacing.xl` = 32 ✅ |
| row/pill inner padding (`12`) | 12 | `p:12` on each Content | `spacing.uacDimension12` = 12 ✅ |
| icon↔text gap (`8`) | 8 | gap inside each row/pill | `spacing.s` = 8 / `uacDimension8` = 8 ✅ |
| inter-row gap (`4`) | 4 | gap between rows (and top group gap) | `spacing.xs` = 4 / `uacDimension4` = 4 ✅ |
| radius (`12`) | 12 | pill + each row corner radius | **NO exact token** (borderRadius has s4/m8/l16/figmaTile12). `figmaTile` = 12 ✅ (semantically odd name) — see Q6 |
| icon box | 24×24 | every icon | render `width={24} height={24}` |
| row/pill height | 48 | each Content row (24 icon + 12+12 pad) | derived, no token needed |

### Derived geometry

- **Overall width: 317** (matches current `SIDEBAR_WIDTH = 317` — keep).
- Row content width 277 = 317 − 20 − 20 (px padding).
- Each row: 48 tall = 12 (padTop) + 24 (icon) + 12 (padBottom). Icon and text
  vertically centered. Text x-offset 44 = 20(px) + 12(padL) + 24(icon)? No —
  44 is measured from the Content box left at x=20: 12 (padL) + 24 (icon) + 8
  (gap) = 44. ✅ consistent.
- Top group height 164, bottom group height 372, gap between ≈ 360px of empty
  space (896 − 164 − 372). The gap is a natural consequence of
  `space-between`, NOT a fixed spacer — do not hardcode it.

---

## Icons — per-item audit

Existing icon index: `src/assets/icons/index.ts` (`Icons` object), SVGs live in
`src/assets/images/`. SVG convention check: `icon_grid.svg`, `icon_grid_alt.svg`,
`icon_user.svg`, `icon_logout.svg` already use `viewBox 0 0 24 24`. `icon_grid*`
use **`stroke="currentColor"`** (good). BUT `icon_heart.svg`, `icon_wardrobe.svg`,
`icon_user.svg`, `icon_logout.svg`, `feedback.svg` use **hardcoded strokes**
(`#272A32`, `black`, `#070707`) — these will NOT recolor to cream `#f2efec` via
prop. That's a blocker for token-correct rendering (see Q7 + figma-icons-sync).

| # | Design item | Figma icon node | Shape (from vectors) | Existing asset? | currentColor? | Action |
|---|---|---|---|---|---|---|
| 0 | **See my outfits** (pill) | 2852:26377 | 4-cell grid (rounded squares) | ✅ `icon_grid.svg` (`Icons.Grid`? **NOT exported** — file exists but not in index) | ✅ yes | **Add to index** as `Grid`; render dark `#070707`. Shape matches design grid. |
| 1 | **Wardrobe** | 2852:24969 (472:1818) | wardrobe/closet outline | ✅ `icon_wardrobe.svg` (`Icons.Wardrobe`) | ❌ `stroke="black"`, viewBox 48×48 | Normalize to currentColor + 24-viewBox, OR re-export from Figma. |
| 2 | **My Favourite** | 2852:24957 (821:1693) | heart outline | ✅ `icon_heart.svg` (`Icons.Heart`) | ❌ `stroke="#272A32"`, viewBox 48×48 | Normalize to currentColor + 24-viewBox, OR re-export. |
| 3 | **Feedback** | 2852:24951 (821:3637 + 3 ellipses) | chat bubble + 3 dots | ✅ `feedback.svg` (`Icons.Feedback`) | ❌ `stroke="#272A32"`, viewBox 94×94 | Normalize/re-export. Shape matches (bubble + dots). |
| 4 | **Setting** | 2852:24938 (2852:26143 Group) | **hexagon** w/ inner shape | ❌ **MISSING** — no hexagon/gear SVG. (`icon_idea.svg` is a bulb, not it.) | n/a | **EXPORT from Figma** → `icon_setting.svg` (currentColor, 24 viewBox). |
| 5 | **My account** | 2852:24945 (2852:26150 Group) | person (head + shoulders) | ✅ `icon_user.svg` (`Icons.User`) | ❌ `stroke="#272A32"`, viewBox 24×24 (size OK) | Normalize stroke→currentColor. Shape matches. |
| 6 | **Log out** | 2852:24691 SignOut (1:9244) | door + arrow-out | ✅ `icon_logout.svg` (`Icons.Logout`) | ❌ `stroke="#272A32"`, viewBox 24×24 (size OK) | Normalize stroke→currentColor. Shape matches. |

**Icon summary:**
- **1 MISSING and must be exported from Figma:** Setting (hexagon) →
  `icon_setting.svg`.
- **1 exists on disk but is not exported in the index:** `icon_grid.svg` →
  add `Grid: IconGrid` to `Icons`.
- **5 exist but need normalization** (currentColor + 24×24 viewBox) so the
  cream `#f2efec` tint applies: wardrobe, heart, feedback, user, logout.
  (icon_grid is already currentColor.)
- **NO icon files added in this task** — inventory only. Export/normalize is a
  follow-up via `figma-icons-sync` during implementation.

> Note: the design renders all 6 row icons in cream `#f2efec` and the pill grid
> icon in dark `#070707`. With `react-native-svg`, a `currentColor`-based SVG
> recolors via the `color`/`fill`/`stroke` prop on the component. Hardcoded-hex
> SVGs will ignore that prop → they'd render in their baked-in dark color and be
> nearly invisible on the dark bg. This is why normalization is required, not
> optional.

---

## Variants / states

The Figma frame shows only the **default/resting** state — no hover/pressed/
disabled/selected variants are present in this node. SnowUI `Content` component
supports states upstream but they aren't instantiated here.

**Implementation must still provide a pressed state** (per workflow rule 5):
- Rows: `TouchableOpacity` default `activeOpacity` (~0.7) is acceptable, OR a
  subtle row background on press. Design gives no pressed spec → use a
  restrained press feedback; flag to CEO if a specific pressed bg is wanted
  (see Q8).
- Pill: same — pressed feedback on the cream pill (slight opacity).
- No "active/current route" highlight is shown in the design (rows are flat).
  Do not invent a selected state.

---

## Behavior / routing (CEO-approved — do NOT invent screens)

| Item | onPress | Notes |
|---|---|---|
| **See my outfits** (pill) | `navigation.navigate('Home')` + `onClose()` | Home = outfit grid |
| **Wardrobe** | `navigation.navigate('Wardrobe')` + `onClose()` | route exists |
| **My Favourite** | **no-op + `// TODO` comment** | NO route exists; render per design, do not create screen |
| **Feedback** | **no-op + `// TODO` comment** | NO route exists; render per design, do not create screen |
| **Setting** | `navigation.navigate('Settings')` + `onClose()` | route exists (note: route is `Settings`, label is "Setting") |
| **My account** | **no-op + `// TODO` comment** | NO route exists; render per design, do not create screen |
| **Log out** | `useAuth().logout()` | + `onClose()` after, as today |

**Dropped from current Sidebar (per CEO):** Home, My body, Archive, Outfit
Canvas. Render ONLY the 6 items above + the pill. Match design exactly.

> Routing confirms these screens already exist in `AppStackParamList`:
> `Home`, `Wardrobe`, `Settings`. No navigation.ts / AppNavigator.tsx changes
> are needed (this redesign adds no new screens). Confirm during impl.

### testID plan (mandatory — every row is a TouchableOpacity)

| Element | testID | accessibilityLabel (icon-bearing) |
|---|---|---|
| Pill | `sidebar-pill-see-outfits` | "See my outfits" |
| Wardrobe row | `sidebar-menu-wardrobe` | "Wardrobe" |
| My Favourite row | `sidebar-menu-favourite` | "My Favourite" |
| Feedback row | `sidebar-menu-feedback` | "Feedback" |
| Setting row | `sidebar-menu-setting` | "Setting" |
| My account row | `sidebar-menu-account` | "My account" |
| Log out row | `sidebar-menu-logout` | "Log out" |
| Backdrop (dismiss) | `sidebar-backdrop` | — |

---

## New backend fields

**None.** This is a pure presentational/navigation change. No API surface, no
new service file, no new endpoint.

---

## theme.ts impact summary (for figma-theme-sync during impl)

All colors and most spacing/radius map to EXISTING tokens — good. The redesign
is the opportunity to tokenize the current raw-hex Sidebar.

**Already covered (use directly):**
- bg `#1D1F23` → `colors.uacBackgroundBase`
- pill bg `#F2EFEC` → `colors.figmaBackground`
- pill text/icon `#070707` → `colors.figmaTextDark`
- row text/icon `#F2EFEC` → `colors.uacTextPrimaryBase`
- spacing 4/8/12/32 → `xs`/`s`/`uacDimension12`/`xl`
- radius 12 → `borderRadius.figmaTile`

**Needs decision / possible new token (hardcode risk):**
1. Divider `rgba(0,0,0,0.10)` (`Black/10%`) — **NO token**. Either add
   `colors.figmaDividerOnDark: 'rgba(0,0,0,0.10)'` OR reconsider: a 10%-black
   line on a `#1D1F23` bg is nearly invisible; the existing Sidebar uses
   `rgba(0,0,0,0.1)` as a right-border on white. Confirm divider is intended on
   dark bg (Q9).
2. px padding `20` — no generic `spacing.20`; `uacButtonPaddingX` = 20 fits but
   is semantically auth-flavored. Consider a neutral `spacing.l20` or reuse.
3. py top `58` — no token. Likely should be safe-area top inset, not a literal
   (Q5). If literal, add a named constant.

---

## Open questions / escalations

- **Q1 (resolved-by-pixel):** Frame fill `#1D1F23` did not appear in
  `get_variable_defs` (no bound color variable on the frame — it's a raw fill or
  an unexported style). Confirmed via PNG pixel sample = `srgb(29,31,35)` =
  `#1D1F23`, which exactly equals the existing `uacBackgroundBase` token. Treat
  as authoritative. **For tech-lead:** OK to reuse `uacBackgroundBase` for the
  sidebar bg, or do you want a dedicated `sidebarBackground` alias?
- **Q2 — letter-spacing 0.15:** Body Large carries `tracking 0.15`, but the
  existing `poppinsBody` alias has `letterSpacing: 0`. 0.15px is visually
  negligible. Use `poppinsBody` as-is, or add a 0.15 variant? (Recommend: use
  as-is, KISS.)
- **Q3 — "Log out" font mismatch:** The Log out row label extracts as **Inter
  Regular 14/20**, while the other 5 rows are **Poppins Regular 16/24**. This
  looks like an unintended SnowUI component leak, not a deliberate design.
  **Escalate to CEO:** should Log out match the other rows (Poppins 16/24,
  recommended for consistency) or honor the literal 14/20 Inter? Recommend
  matching the others.
- **Q4 — px=20 token:** reuse `uacButtonPaddingX` (=20, auth-named) or add a
  neutral spacing token? tech-lead call.
- **Q5 — top padding 58:** is `py:58` a literal, or should the top group respect
  the device safe-area top inset (notch)? On a 896-tall artifact 58 ≈ status bar
  + breathing room. Recommend `useSafeAreaInsets().top + ~16` rather than a hard
  58. Confirm with CEO/tech-lead.
- **Q6 — radius 12 token name:** `borderRadius.figmaTile` (=12) is the only 12
  token but it's named for image tiles. Reuse, or add `borderRadius.row`/`pill`?
- **Q7 — icon recolor blocker:** 5 of 7 icons have hardcoded strokes and won't
  tint to cream. They MUST be normalized to `currentColor` (and 24-viewBox for
  the 48/94 ones) during impl via `figma-icons-sync`, else they render
  near-invisible on dark. Flagging as the main impl risk.
- **Q8 — pressed state:** design has no pressed/hover variant. Use default
  TouchableOpacity opacity, or does CEO want a specific row press background?
- **Q9 — divider on dark:** a `rgba(0,0,0,0.10)` border-top on a `#1D1F23` bg is
  near-invisible. Confirm the divider is intended (and visible) or whether it
  should be a light hairline (e.g. `rgba(255,255,255,0.10)`). Possible Figma
  artifact carried over from a light-bg component.
- **Q10 — animation:** current Sidebar slides in from left (Animated,
  `SIDEBAR_WIDTH=317`) with a 0.5-opacity backdrop. Design is a static frame;
  assume the slide-in + backdrop behavior is preserved unchanged. Confirm.

---

## Hand-off

- **Artifact path:** `auxi/plans/260525-2344-sidebar-dark-redesign/figma-extraction-sidebar.md`
- **Next gate:** auto-dispatch `qa-ui` in *review-extraction* mode to audit this
  note vs Figma (Pass 1, no code). Implementation (`figma-to-rn-workflow`) does
  not start until qa-ui PASS or open questions resolved by CEO/tech-lead.
- **Impl will require:** `figma-icons-sync` (export Setting + normalize 5 icons),
  `figma-theme-sync` (divider/padding token decisions), then rewrite of
  `src/components/layout/Sidebar.tsx`.
