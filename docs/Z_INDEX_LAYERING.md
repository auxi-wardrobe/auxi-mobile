# Macgie Z-Index / Layering System — v1.0

> **Status:** Canonical design rule. Single source of truth for stacking order
> (what renders on top of what) across the Macgie / Auxi app. When a layering
> choice conflicts with a tier here, the tier wins.
>
> **Source:** Figma — [Auxi · `z-index` frame](https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=3230-35022&m=dev)
> (node `3230:35022`).
>
> **In code:** consume via `src/theme/theme.ts` → `theme.zIndex.*`
> (`base`, `content`, `sticky`, `dim`, `modal`, `toast`). Never hardcode a raw
> `zIndex: 100` / `zIndex: 1000` — use a token. There are exactly six tiers; if
> you think you need a value *between* two tiers, you are putting the element in
> the wrong tier.

---

## 1. The six tiers (bottom → top)

Every on-screen element belongs to exactly one of these tiers. Higher number =
closer to the user. This is the whole model — there is nothing above Toast.

| Tier | Name | What lives here | Token | `zIndex` |
|------|------|-----------------|-------|----------|
| 0 | **Background** | Background, canvas, scroll content | `theme.zIndex.base` | `0` |
| 1 | **Content** | Cards, buttons, bubble chats, chips, list items | `theme.zIndex.content` | `1` |
| 2 | **Sticky UI** | Header, footer/tab bar, floating CTA | `theme.zIndex.sticky` | `100` |
| 3 | **Dim** | Dim / scrim layer that blocks interaction | `theme.zIndex.dim` | `1000` |
| 4 | **Modal** | Popup, bottom sheet, dialog | `theme.zIndex.modal` | `1100` |
| 5 | **Toast** | Toast, snackbar, global loading | `theme.zIndex.toast` | `1200` |

**Key relationships:**

- **Sticky UI (2) sits above scroll content (0–1)** — the header/footer never
  scroll away, content slides *underneath* them.
- **Dim (3) sits above sticky UI but below Modal (4)** — when a modal/sheet
  opens, the scrim covers the header and footer too, then the modal sits on top
  of its own scrim.
- **Toast (5) is always the top tier** — a toast, snackbar, or blocking loader
  is visible even over an open dialog. Nothing renders above it.

---

## 2. Token scale (add to `theme.ts`)

Tiers are deliberately spaced by large gaps so future sub-layers never force a
renumber. Add this block to `src/theme/theme.ts` and reference it everywhere:

```ts
// Stacking order — see docs/Z_INDEX_LAYERING.md. Six tiers, bottom → top.
zIndex: {
  base:    0,    // tier 0 — background, canvas, scroll content
  content: 1,    // tier 1 — cards, buttons, chips, bubble chats
  sticky:  100,  // tier 2 — header, footer/tab bar, floating CTA
  dim:     1000, // tier 3 — scrim that blocks interaction
  modal:   1100, // tier 4 — popup, bottom sheet, dialog
  toast:   1200, // tier 5 — toast, snackbar, global loading
},
```

Pair each tier with its matching shadow/elevation token so depth reads
consistently (`theme.ds.shadow.card` → Content, `…dialog` → Modal dialog,
`…sheet` → Modal sheet). See §4 for the Android elevation caveat.

---

## 3. Sticky UI spec (header & footer)

From the Figma note attached to the Sticky tier:

- **Background:** surface at **90% opacity** (translucent, not solid).
- **Blur:** background blur of **8px** behind the bar.
- **Behavior:** `sticky` — pinned to the top (header) / bottom (footer).
- **Scroll content moves *underneath* the sticky UI** — content is visible,
  softly blurred, through the translucent bar as it scrolls past. The bar must
  never get an opaque fill that hides scrolling content.

Implementation notes (RN):

- Use a real blur surface (e.g. `@react-native-community/blur` /
  `expo-blur` `BlurView`) behind the bar; do **not** fake it with a flat
  semi-transparent color — the spec is explicitly *blur*, not just opacity.
- The scroll container sits at tier 0–1; the sticky bar sits at
  `theme.zIndex.sticky` so content passes behind it.
- Add top/bottom content padding equal to the bar height so the first/last row
  isn't permanently hidden behind the translucent bar.

---

## 4. React Native gotchas (read before you set a zIndex)

RN is **not** the web. A raw `zIndex` value does not guarantee an element wins
globally. Three rules that bite if ignored:

1. **`zIndex` only orders *siblings* inside the same stacking context.** A
   `zIndex: 1000` deep inside a screen will **not** rise above a header that
   lives in a different parent. To guarantee a layer beats everything, it must
   be rendered **at the app/navigation root** (a portal / root overlay host),
   not nested inside a screen. Dim, Modal, and Toast tiers therefore belong to a
   single root-level overlay host — never to an individual screen subtree.

2. **Android: `elevation` also controls stacking order**, not just shadow. A
   high `elevation` can render *above* a higher `zIndex`. When you set a tier,
   set `zIndex` **and** keep `elevation` consistent with the tier order
   (Content < Sticky < Modal). Don't give a card `elevation: 16` — that's the
   sheet's depth and it will punch through overlays on Android.

3. **One overlay host, one tier order.** All Dim / Modal / Toast surfaces should
   mount through the same root host so their relative order is decided by these
   tokens, not by accident of render tree position.

---

## 5. Do / Don't

**Do**

- Pick the tier first ("is this a card or a dialog?"), then use its token.
- Render Dim / Modal / Toast at the root overlay host.
- Keep the scrim (Dim) and the modal content (Modal) as separate tiers — scrim
  below, content above.
- Keep `elevation` consistent with the tier on Android.

**Don't**

- Hardcode `zIndex: 2 / 10 / 20 / 100 / 1000` — use `theme.zIndex.*`.
- Invent a value between tiers (e.g. `zIndex: 150`) — re-pick the tier.
- Put a global Toast/loader inside a screen subtree — it must outrank dialogs.
- Give a sticky header an opaque fill — content must blur through it (§3).
- Stack a dialog over a bottom sheet over a popup. They are **one** tier
  (Modal); only one modal surface should be open at a time.

---

## 6. Current state & migration

As of this rule, z-index/elevation is scattered with raw literals across
`HomeScreen`, `SettingsScreen`, `Sidebar` (`zIndex: 1000`), `OutfitCanvasScreen`
(`zIndex: 100`), the auth screens (`zIndex: 10`), and overlay components
(`elevation: 16` on `ContextChipsModal` / `MoodFeedbackSheet`). There is **no**
`theme.zIndex` token yet.

Migration order (do not big-bang):

1. Add the `theme.zIndex` block from §2.
2. Confirm there is a single root overlay host for Dim / Modal / Toast; if not,
   that's the prerequisite refactor.
3. Replace raw literals tier-by-tier, starting with the overlay tiers
   (Dim/Modal/Toast) since those are the cross-screen correctness risks.
4. Per-item drag stacking inside `OutfitCanvasScreen` (relative `zIndex` between
   collage items) is a *local* ordering within tier 1 — it stays relative and is
   exempt from the global tokens.

> **Lint target:** once §2 lands, `scripts/auxi-lint-tokens.sh` should flag raw
> `zIndex:` numeric literals outside `theme.ts` the same way it flags hex colors.
