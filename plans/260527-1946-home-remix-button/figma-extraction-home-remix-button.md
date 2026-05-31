# Extracted: Home / Outfit action row (Frame 2105) — left "Remix" button

Figma file: `0nXXMAR4Arf1ZfjtQvtBh0` · Page "✅ Hifi (RFD) 1.1" (`2849:8205`)

## Frame tree (the canonical 3-zone action row)

```
Frame 2105            id 2849:11976  x16 y572  382×32   (HORIZONTAL, space-between)
├── Button "Remix"    id 2849:11977  x0   w83  h32   ← LEFT slot (was empty in code)
│   └── Content       gap 8, px 12, rounded 100, overflow-clip
│       ├── Text "Remix"   Text-xs/Regular, color text/neutral/base
│       └── icons 16×16     Vector 2403:13632 (remix/cut glyph) — NEW icon
├── Frame 2124        id 2849:11978  x122 w94  h32
│   └── Frame 2036    id 2849:11979  3× Ellipse (4×4 dots) — pager
└── Button "Show another" id 2849:11983 x255 w127 h32  ← RIGHT slot (already built)
    └── Content       gap 8, px 12, rounded 100
        ├── Text "Show another"  Text-xs/Regular, color text/neutral/base
        └── Icons 16×16  name=swipe  → existing icon_swipe.svg
```

Both Buttons are the SAME component: `Hierarchy=Text button, State=Enable, Icon=Yes, Size=32`
(component node `2403:13607`). They differ only by label + icon. So the Remix
button must be visually consistent with "Show another": same height (32),
typography, gap, padding, radius — only label="Remix" and a different icon.

## Tokens used (all already in theme.ts — NO new token needed)

| Figma var | value | theme.ts path |
|---|---|---|
| `text/neutral/base` | `#1d1f23` | `theme.colors.uacTextBase` (exact match) |
| `Text-xs/Regular` | Inter, 400, 12/16, ls 0 | `theme.typography.aliases.poppinsXs` (the row's existing xs alias used by "Show another") |
| corner radius | `100` (rounded-full) | `theme.borderRadius.round` (9999) |
| content padX | `12` | `theme.spacing.uacDimension12` (12) |
| content gap | `8` | `theme.spacing.s` (8) |
| icon size | `16×16` | literal 16 (matches "Show another" icon footprint) |

Note on font: Figma var resolves family to **Inter** for `Text-xs/Regular`, but
the shipped "Show another" button uses `theme.typography.aliases.poppinsXs`.
Mirroring the existing counterpart (CEO wants the two visually consistent) is
the correct call — both buttons share one Figma component, so the Remix label
gets the SAME app type alias the row already uses. No font drift introduced.

## Icons

| icon | Figma | exists in src/assets/images/? | action |
|---|---|---|---|
| Show-another swipe | `name=swipe` 16×16 | yes → `icon_swipe.svg` | reuse (unchanged) |
| Remix glyph | Vector `2403:13632`, content 12×12 rendered into 16×16 | NO | EXPORT → `icon_remix.svg` |

Remix icon exported SVG: `viewBox="0 0 12 12"`, single path, Figma baked
`fill="var(--fill-0, #1D1F23)"`. Normalised to `fill="currentColor"` per
figma-icons-sync convention so it themes via the `color` prop (same pattern
as `IconSwipe color={theme.colors.uacTextBase}`).

## Variants / states

- Component variant present in design: `State=Enable` (text button, icon=yes, size 32).
- "Show another" implements a `State=Disable` (opacity 0.5) edge variant driven
  off `showAnotherDisabled`. The Remix button is ALWAYS enabled (navigation entry,
  no edge condition) → only the Enable state is needed. Pressed: use the same
  `activeOpacity={0.82}` as "Show another" for consistency.

## Wiring (HomeScreen.tsx)

- `OutfitActionRow` gets new optional prop `onRemix?: () => void`; renders a
  Remix `TouchableOpacity` in the left slot, replacing the empty `sideSlot`
  spacer. Left button footprint mirrors right button so the 3-dot cluster
  stays centred (was `sideSlot width:83`; the Remix button measured 83 wide
  in Figma — perfect mirror).
- `OptionSheet` prop type (~1450/1461) gets `onRemix: () => void`; passed to
  `<OutfitActionRow onRemix={onRemix} />` (~1660); supplied at the
  `<OptionSheet>` call site (~1304) from a `handleRemix` callback in parent.
- `handleRemix` = `navigation.navigate('OutfitCanvas')` (no params — canvas
  currently renders mock items; real item-passing is a separate BE-wiring task).
- testID `home-remix-${sheetIndex}` (mirrors `home-action-row-${sheetIndex}` /
  `home-show-another`); `accessibilityRole="button"`,
  `accessibilityLabel="Remix this outfit"`.

## Open questions for CEO / tech-lead

- None blocking. CEO has explicitly re-enabled Remix (overrides AU-253
  "Remix omitted" scope decision). Navigating without params is intentional
  for this slice — passing the real outfit into the canvas is a separate
  backend-wiring task per the task brief.
- Minor: Figma `Text-xs/Regular` resolves to Inter; app uses Poppins-xs alias
  for the sibling button. Mirroring the sibling (consistency) chosen over the
  raw Figma family. Flag for CEO if Inter was intended app-wide (would be a
  theme-level decision, not this button's).

## New backend fields (vs current API client)

None — this is a pure navigation entry point. No new API surface. Passing real
outfit items into OutfitCanvas (`items`/`outfitId` params) is explicitly out of
scope for this task.
