# Auxi Design System — token tiers (overview)

> Canonical token reference for the Auxi RN app. The `designer` agent enforces
> this at the **step 6.5** design-review gate. Source of truth in code:
> `auxi/src/theme/theme.ts` (colors / spacing / typography / radius / shadow /
> z-index) and `auxi/src/theme/motion.ts` (animation). This doc is the *map*;
> the `.ts` files are the *territory* — when they disagree, the `.ts` wins and
> this doc is stale (file a fix).

This is the index. Three sibling docs go deep:
- `motion-rules.md` — which motion token per interaction.
- `color-rules.md` — `ds.color` semantic usage + "no hex in screens".
- `header-footer-rules.md` — canonical Header + push-drawer + footer/CTA rules.

---

## 1. The canonical layer: `theme.ds.*` (use this first)

`theme.ts` has two generations of tokens:

1. **Legacy aliases** — `figma*` and `uac*` colors/radii, added per-feature as
   screens shipped (e.g. `figmaBackground`, `uacTextBase`, `figmaSwitchOn`).
   They still work and existing screens consume them. Do NOT delete them.
2. **`ds.*` canonical layer** (`theme.ds.color`, `theme.ds.radius`,
   `theme.ds.shadow`, `theme.ds.font`) — mirrors `Auxi Design System.html` /
   `auxi-ds.css`, extracted from `Auxi.fig`. This is **additive** — it does not
   change what existing screens render; each canonical token documents the
   alias it supersedes (e.g. `ds.color.ink` ⇐ `uacTextBase`).

**Rule: new code reads from `theme.ds.*` first.** Reach for a `figma*` / `uac*`
alias only when there is no `ds.*` equivalent. A new screen wiring raw
`figmaBackground` instead of `ds.color.cream` is a MINOR design-review finding
(on-system value, off-system tier); a new screen wiring a raw hex is a BLOCKER
(see `color-rules.md`).

| Group | Canonical token | Value | Supersedes (alias) |
|---|---|---|---|
| Color | `ds.color.*` | see `color-rules.md` | `figma*` / `uac*` color |
| Radius | `ds.radius.*` | `xs:2 sm:12 md:16 lg:17 xl:18 full:100` | `uacButtonCta`, `uacPanel`, `figmaTile`, … |
| Shadow | `ds.shadow.*` | `card / floatingButton / dialog / sheet` | (none — new) |
| Font role | `ds.font.*` | `display:Inter ui:Inter uiAlt:Inter mono:JetBrains Mono` | `typography.aliases.*` faces |

---

## 2. Spacing — 4px grid

`theme.spacing` is a strict **4px grid**. Use a named step; never an off-grid
literal (`paddingHorizontal: 22` in `Header.tsx` is a known legacy exception —
do not copy it).

| Token | px | Typical use |
|---|---|---|
| `xs` | 4 | hairline gaps, icon-to-label nudge |
| `s` | 8 | tight gaps inside a control |
| `m` | 16 | default block padding / row gap |
| `l` | 24 | section padding (matches `uacBodyPadding: 24`) |
| `xl` | 32 | group separation |
| `xxl` | 48 | major vertical rhythm |

UAC named constants (`uacBodyPadding:24`, `uacButtonHeight:56`,
`uacListItemMinHeight:56`, `uacHeaderHeight:107`, …) are 4px-grid-aligned
aliases for the account-access flow — fine to reuse, but prefer the plain
`xs…xxl` step when a screen is generic.

**Design-review:** off-grid spacing (`13`, `22`, `30`) in a new screen → MINOR
(or MAJOR if it visibly breaks alignment against a sibling screen).

---

## 3. Radius

Canonical `ds.radius`: `xs:2` (checkbox) · `sm:12` (text button, tile) ·
`md:16` (primary button / dialog) · `lg:17` (secondary button) · `xl:18`
(sheet / screen card) · `full:100` (pill / round). Legacy `theme.borderRadius`
(`s:4 m:8 l:16 round:9999 figmaTile:12 …`) is still present; new code uses
`ds.radius`.

---

## 4. Z-index — the six-tier model (never hardcode a raw `zIndex`)

`theme.zIndex` is a **canonical six-tier** stack (source: Figma `z-index` frame
node `3230:35022`; rule doc `docs/Z_INDEX_LAYERING.md`). Gaps between tiers are
intentional so future sub-layers never force a renumber.

| Tier | Token | Value | What lives here |
|---|---|---|---|
| 0 | `base` | `0` | background, canvas, scroll content |
| 1 | `content` | `1` | cards, buttons, chips, bubble chats |
| 2 | `sticky` | `100` | header, footer / tab bar, floating CTA |
| 3 | `dim` | `1000` | scrim that blocks interaction |
| 4 | `modal` | `1100` | popup, bottom sheet, dialog |
| 5 | `toast` | `1200` | toast, snackbar, global loading |

RN note: `zIndex` only orders siblings inside the same stacking context —
render Dim/Modal/Toast at a root overlay host and keep Android `elevation`
consistent with tier order. `Sidebar.tsx` is the worked example: backdrop at
`dim`, panel at `modal`.

**Design-review:** any raw `zIndex: <number>` in a new screen → BLOCKER. A
correct tier token used at the wrong layer (e.g. a dialog at `sticky`) → MAJOR.

---

## 5. Type families (roles)

`ds.font` names the ROLES; `theme.typography.aliases.*` are the concrete faces
RN renders (Inter / Roboto / Archivo / Manrope / PlayfairDisplay, all
bundled; `ds.font.mono` = JetBrains Mono is NOT bundled → falls back to
platform mono). Pick an existing alias (`uacH4Bold`, `interBodyMd`,
`interBody`, …) over inventing a new `fontFamily`/`fontSize` pair. A raw
`fontFamily: 'Inter-Bold'` string in a screen is caught by
`scripts/auxi-lint-tokens.sh` and is a BLOCKER.

> Typography *roles* (a full type-scale matrix) are a known gap — deferred per
> spec, not in this doc set yet.

---

## 6. What the designer checks against this doc (lens 1)

| Finding | Severity |
|---|---|
| Raw hex / `fontFamily` string in a new screen | BLOCKER (`color-rules.md`) |
| Raw `zIndex` number instead of a tier token | BLOCKER |
| On-system value via legacy alias where a `ds.*` token exists | MINOR |
| Off-grid spacing breaking alignment vs sibling | MAJOR |
| Off-grid spacing, cosmetically fine | MINOR |
