# Wardrobe Sort Control — Design Spec

- **Date:** 2026-07-02
- **Repo:** `auxi` (React Native mobile app)
- **Screen:** `src/screens/WardrobeScreen.tsx`
- **Status:** Design approved, pending implementation plan
- **Origin:** CEO request — "more ways for users to filter their items (e.g. date added, purchase date)."

---

## 1. Problem & goal

The Wardrobe grid can only be narrowed by **category** (All / Top / Bottoms / One-Piece
/ Shoes / Ac chips). As wardrobes grow, users have no way to reorder items to find what
they want — e.g. surface the most recently added, or find pieces they rarely wear.

The request was framed as "filter," but the intent (confirmed) is **sort / reorder the
grid** — keep all items visible, just change their order. This is a small, self-contained
UX win that ships without backend work.

## 2. Scope

### In scope
- A **sort control** on the Wardrobe screen offering three sort dimensions, each toggling
  between two directions:
  1. **Date added** — newest first (default) ↔ oldest first — `created_at`
  2. **Name (A–Z)** — alphabetical ↔ reverse — `name`
  3. **Most / least worn** — usage-based — `usage_frequency` (+ `exposure_count` if available)
- Sort applies **client-side** to the already-loaded, category-filtered item set.
- Analytics event for the new interaction.

### Explicitly out of scope (YAGNI)
- **Purchase date, price, brand** — no DB column, no data, no input UI exists. Dropped.
- **Server-side sort / new API params** — unnecessary; all items are already in memory.
- **Persisting sort choice across app restarts** — v1 keeps it session-only (see §5).
- **Multi-attribute filtering / date-range filtering** — not this feature.
- Any change to the category-chip filter itself.

## 3. Data reality (why this is cheap)

The frontend `WardrobeItem` type (`src/services/wardrobeService.ts:30-61`) and backend
model (`wardrobe-backend/models/wardrobe.py`) already carry every field we sort on:

| Sort dimension | Field | Availability |
|---|---|---|
| Date added | `created_at` (ISO string) | ✅ On every item; backend already orders by it |
| Name | `name` | ✅ Present (may be auto-generated for some items — acceptable) |
| Most / least worn | `usage_frequency` (`NORMAL` \| `LESS_USED`) | ✅ On frontend type, but coarse (2 buckets) |
| Most / least worn (crisp) | `exposure_count` (numeric) | ⚠️ Backend column exists; **verify it is serialized in the API response** |

**Worn-sort resolution (decide at build time):**
- If the items API already returns a numeric `exposure_count` → sort by it (crisp ordering).
- If not → either (a) file a one-line backend change to include `exposure_count` in the
  wardrobe item serializer, or (b) ship a coarse two-tier sort on `usage_frequency`
  (`LESS_USED` vs `NORMAL`) for v1. The plan must state which path was taken.

## 4. Approach — client-side sort

`WardrobeScreen` loads the full item set via `useQuery` (`getWardrobeItems()` /
`filterWardrobeItems({category})`) — there is **no pagination**, so the entire
category-filtered array is in memory. Sorting is a pure reordering of that array before it
is passed to the grid.

- **No backend changes**, no new API params, no migration.
- Composes with the category chips: the active category still filters; sort reorders the
  result. Order of operations: `fetch → category filter (already happens) → client sort → render`.
- Sort is a **pure function** `sortWardrobeItems(items, { key, direction })` that lives in a
  small, testable module (e.g. `src/screens/wardrobe/wardrobe-sort.ts`, mirroring the
  existing `wardrobe-grid.ts` helper split). It must be a **stable** sort and must not
  mutate the input array.

### Sort semantics
- **Date added:** compare `created_at` as timestamps. Default direction = **desc (newest
  first)** — preserves today's behavior exactly, so no regression. Missing/invalid
  `created_at` sorts last regardless of direction.
- **Name:** locale-aware, case-insensitive compare (`localeCompare`). Missing name sorts last.
- **Worn:** by `exposure_count` (or coarse `usage_frequency` per §3). "Most worn" =
  highest first; "Least worn" = lowest first. Ties broken by `created_at` desc for stability.
- **Default direction per dimension** (used when a dimension is first selected): Date added →
  `desc` (newest first); Name → `asc` (A–Z); Worn → `desc` (most worn first).
- **Direction toggle:** re-selecting the active dimension flips its direction.

## 5. State & default

- Sort state (`{ key, direction }`) is held in **`WardrobeScreen` component state**
  (`useState`), initialized to **`{ key: 'date_added', direction: 'desc' }`** — the current
  default order.
- **Session-only:** the choice resets to default on app restart. (Persisting via
  AsyncStorage is a small, deferrable follow-up — intentionally out of scope for v1.)
- Sort state is **independent of** the category tab; switching category preserves the chosen
  sort.

## 6. UI — Option A (Sort pill → bottom sheet)

Chosen over an inline segmented control because it doesn't crowd the category-chip row,
scales if more sort options are added, and reuses the `MActionSheet` already mounted on this
screen.

```
┌─────────────────────────────────────────────┐
│  [All][Top][Bottoms][Shoes][Ac]     ⇅ Sort   │   chips left · Sort pill right
└─────────────────────────────────────────────┘
         tap ⇅ Sort  →  bottom sheet:
         ┌──────────────────────────────┐
         │  Sort by                      │
         │  Date added            ↓  ✓   │  ← active row: shows direction + check
         │  Name (A–Z)                   │  ← tapping active row toggles ↑/↓
         │  Most worn                    │
         └──────────────────────────────┘
```

### Components & rules
- **Sort trigger:** a compact pill/button in the category-chip header row, right-aligned
  (falls to its own row above the grid if the chip row wraps). Built from an `M*` primitive
  (`MChip` / `MFloatingPill`), not a hand-rolled `Pressable`.
- **Sheet:** `MActionSheet` titled "Sort by", listing the three dimensions. The active
  dimension shows a check + a direction arrow (↑/↓); tapping it toggles direction; tapping a
  different dimension selects it at its default direction.
- **Design-system compliance:** tokens only (no hex/magic numbers), `M*` primitives, motion
  via `motion.ts`. Passes the token lint (`scripts/auxi-lint-tokens.sh`) and DS-primitives
  lint, and the **designer gate (step 6.5)** before merge. Final placement/label styling is
  the designer's call.
- **testID + accessibilityLabel** on every interactive element per repo convention:
  - Sort trigger: `wardrobe-sort-trigger`
  - Each sheet row: `wardrobe-sort-option-<key>` (e.g. `wardrobe-sort-option-date_added`)
  - a11yLabels are human-readable and state-aware (e.g. "Sort by date added, newest first").

## 7. Analytics (required)

Per `.claude/rules/analytics-tracking-required.md`, the new interaction ships tracking:

- **Event:** `wardrobe_sort_changed` (snake_case, past tense), fired via
  `src/services/analytics.ts` only, literal string constant.
- **Properties:**
  - `sort_by`: `date_added` \| `name` \| `worn`
  - `direction`: `asc` \| `desc`
- Fires when the user selects a dimension or toggles direction (not on initial default).
- Sits alongside the existing `wardrobe_filter_changed` (category) event.
- **Doc update (mandatory):** add the event to §5 of
  `auxi/docs/analytics/mixpanel-tracking-plan.md`; note it belongs to the wardrobe-browse
  funnel in §10.

## 8. Files (anticipated)

**Create**
- `src/screens/wardrobe/wardrobe-sort.ts` — `SortKey`/`SortDirection` types, `SORT_OPTIONS`
  metadata, pure `sortWardrobeItems(items, state)`.
- (Possibly) a small `WardrobeSortSheet` composite if `WardrobeScreen` would otherwise grow
  past the ~200-line file-size guideline.

**Modify**
- `src/screens/WardrobeScreen.tsx` — sort state, the Sort trigger in the chip header, wire
  `MActionSheet`, apply `sortWardrobeItems` to the queried items before rendering, fire
  analytics.
- `src/services/analytics.ts` — add `trackWardrobeSortChanged` (or extend existing helper).
- `docs/analytics/mixpanel-tracking-plan.md` — document the new event.

**No changes:** `wardrobeService.ts` (unless the worn-sort path chooses to surface
`exposure_count`), backend, navigation, item model.

## 9. Testing

- **Unit** (Jest) on `sortWardrobeItems`: each key × both directions; stability; no input
  mutation; missing-field items sort last; empty array; single item; the coarse-vs-numeric
  worn path chosen in §3.
- **Interaction:** selecting a dimension reorders the grid; toggling flips direction; sort
  persists across category-tab switches; sort resets on remount.
- **Verification gates:** `npx tsc --noEmit` clean, `yarn lint` no new errors, token +
  DS-primitives lints clean, designer gate PASS, qa-mobile smoke on sim.

## 10. Success criteria

- User can reorder the Wardrobe grid by date added, name, or worn — both directions — from a
  discoverable control.
- Default order is unchanged (newest first); nothing regresses.
- Zero backend changes required (or, at most, a one-line serializer addition for
  `exposure_count`, explicitly decided in the plan).
- `wardrobe_sort_changed` fires correctly and the tracking plan is updated.
- All verification gates green.

## 11. Open items for the plan

1. **Worn-sort data:** confirm whether the items API returns `exposure_count`; pick path (a)
   or (b) from §3 and record it.
2. **File-size split:** decide whether the sheet warrants its own `WardrobeSortSheet`
   component to keep `WardrobeScreen.tsx` under the size guideline.
3. **Sort-pill placement** when the category-chip row wraps (same row vs. own row) — resolve
   with the designer.
