# Color rules — `ds.color` semantic usage

> When to use which color token, contrast expectations, and the hard "no hex
> literals in screens" rule. Source of truth: `theme.ds.color` in
> `auxi/src/theme/theme.ts`. The `designer` agent checks this at design-review
> lens 3. Mechanical backstop: `scripts/auxi-lint-tokens.sh`.

---

## 1. The canonical palette (`ds.color`)

### Ink & neutrals (text + control fills)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#1d1f23` | **primary text**, primary button fill, dark borders (⇐ `uacTextBase`/`uacBackgroundBase`) |
| `black` | `#070707` | control fills, radio dot, icon/bold_700 (⇐ `figmaTextDark`) |
| `slate` | `#272a32` | deep slate actions/buttons (⇐ `figmaText`/`figmaButton`) |
| `onVariant` | `#49454f` | MD3 on-surface-variant — secondary/muted label (⇐ `figmaTextMuted`/`uacOnSurfaceVariant`) |
| `warm700` | `#5b5550` | warm gray stroke / selected chip bg (⇐ `figmaChipBg`) |
| `warm500` | `#9e968e` | warm muted text — step labels (⇐ `figmaOnboardingStepLabel`) |
| `gray500` | `#717171` | neutral gray |

### Surfaces (warm paper)
| Token | Hex | Use |
|---|---|---|
| `white` | `#ffffff` | pure white surface |
| `surface` | `#fcfcfd` | dialog / sheet surface (⇐ `uacBackgroundNeutralSubtlest`) |
| `surface2` | `#f7f7f8` | subtle alt surface — onboarding bg (⇐ `figmaOnboardingBackground`) |
| `cream` | `#f2efec` | **primary warm app surface + cards** (⇐ `figmaBackground`/`figmaCardSurface`) |
| `warm100` | `#eee6df` | divider / warm hairline, caption pill (⇐ `figmaCaptionPillBg`/`figmaListDivider`) |
| `tan` | `#e0d2c4` | warm accent surface (⇐ `figmaInsightPillBg`) |
| `tanStroke` | `#c6bcb1` | tan stroke / inactive dot (⇐ `figmaDotInactive`) |
| `placeholder` | `#d9d9d9` | image placeholder fill |
| `cool100` | `#e3e3ec` | cool surface — icon chip (⇐ `figmaIconSurface`) |

### Functional accents (reserve for their meaning)
| Token | Hex | Use — DO NOT repurpose |
|---|---|---|
| `teal` | `#16a085` | **switch active** / success-toggle — DS canonical switch-ON (⇐ `figmaSwitchOn`) |
| `green` | `#039855` | **radio / confirm** green (⇐ `figmaToggleOn`) |
| `danger` | `#bb251a` | **destructive / error** — delete, cancel, error text (⇐ `uacTextDangerBase`/`figmaDestructive`) |
| `red` | `#ff0000` | raw red — **flagged off-system in the DS; avoid in new code** |

> Note the deliberate split: `teal` is the *switch* ON color, `green` is the
> *radio / confirm* color. They are not interchangeable — using `green` on a
> switch track is a MAJOR semantic finding even though both read as "on/success".

Lines / hairlines: `ds.line` `rgba(29,31,35,0.10)`, `ds.line2`
`rgba(29,31,35,0.06)`, `ds.hairline` `#eee6df`. On the **dark sidebar**, the
Black/10% line is invisible — use cream-at-10% `figmaDividerOnDark`
(`rgba(242,239,236,0.1)`) instead (per CEO Q9; see `Sidebar.tsx`).

---

## 2. Semantic usage — when each

- **Text:** body/headings → `ink`; secondary/muted → `onVariant` or `warm500`;
  light text on a dark surface (sidebar) → `uacTextPrimaryBase` `#f2efec`.
- **Surfaces:** app background + cards → `cream`; dialogs/sheets → `surface`;
  pills/dividers → `warm100`; accent tiles → `tan`.
- **Primary action:** dark fill = `ink`; label on it = `cream` / `white`.
- **State accents:** switch → `teal`; radio/confirm → `green`; destructive →
  `danger`. Don't reach for `red` (`#ff0000`) — it's intentionally off-system.

---

## 3. Contrast expectations

Designer flags contrast risk; **qa-ux owns the measured a11y verdict** (≥4.5:1
normal text, ≥3:1 large text, per their checklist). At design-review, sanity-
check the obvious ones:
- Light cream text (`#f2efec`) only on dark surfaces (`ink` sidebar) — never on
  `cream`/`white` (the classic invisible-on-light bug).
- Muted `warm500`/`onVariant` on `cream` is fine for secondary text, but not for
  a primary CTA label.
- A new accent color pairing that *looks* low-contrast → flag MAJOR and route the
  measurement to qa-ux.

---

## 4. No hex literals in screens (hard rule)

Per `auxi/CLAUDE.md`: **no literal hex in `src/screens/**` or
`src/components/{features,layout}/**`.** Every color comes from a token.
`scripts/auxi-lint-tokens.sh` enforces this mechanically (whitelist: `theme.ts`
is the only file allowed to declare hex; `transparent` / `currentColor` /
`rgba()` / `hsl()` are intentional escape hatches). A few legacy hex literals
exist — **don't add more.**

**Design-review:** a new screen with a raw hex (e.g. `color: '#1d1f23'` instead
of `ds.color.ink`) is a **BLOCKER** — and the finding cites both this doc and the
exact `ds.*` token it should have used.

---

## 5. Severity at design-review (lens 3)

| Finding | Severity |
|---|---|
| Raw hex literal in a new screen (lint would catch) | BLOCKER |
| Wrong semantic token (`green` on a switch, `red`/`#ff0000` for destructive) | MAJOR |
| Plausibly low-contrast accent pairing | MAJOR (route measurement → qa-ux) |
| On-system value via legacy alias where a `ds.color.*` exists | MINOR |
