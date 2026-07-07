# Wardrobe Sort Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reorder the Wardrobe grid by date added, name, or how often worn (both directions) via a Sort pill that opens a bottom sheet.

**Architecture:** A pure, non-mutating `sortWardrobeItems(items, value)` function reorders the already-in-memory, category-filtered list client-side (no backend, no new API params). `WardrobeScreen` holds the selected sort in `useState` (session-only, default newest-first) and renders a compact `MButton` "Sort" pill that opens an `MBottomSheet` containing an `MRadioMenu` of six flat options (`{key}_{direction}`). A `wardrobe_sort_changed` analytics event fires on selection.

**Tech Stack:** React Native 0.83 · TypeScript 5.8 · TanStack Query 5 · Jest · i18next · Auxi design-system `M*` primitives.

**Primitive-choice note (intentional deviation from spec §6):** the spec named `MActionSheet`; this plan uses `MBottomSheet` + `MRadioMenu` instead. `MActionSheet` rows are label-only, have no selected-state affordance, and derive their testID from the (mutable) label — unusable for a single-select sort with stable selectors. `MRadioMenu` gives a built-in radio selected state and derives its row testID from the stable option `value` (`…-<value>` / `…-<value>-on`). This is still "Option A" (pill → bottom sheet).

## Global Constraints

Every task's requirements implicitly include these (verbatim from the spec + repo rules):

- **No backend changes.** Sorting is client-side over the in-memory list. (Worn-sort uses `exposure_count` when the API returns it, else falls back to `usage_frequency` — works either way.)
- **Default order unchanged:** `date_added_desc` (newest first) — matches today's backend `created_at DESC`. Nothing regresses on first paint.
- **Session-only state:** sort lives in component `useState`; it resets to default on app restart. No persistence in v1.
- **Analytics:** event name `wardrobe_sort_changed` — snake_case, past tense, a **literal string constant** (no template literals). Fire via `track()` from `src/services/analytics.ts` only. Props: `sort_by` ∈ `date_added|name|worn`, `direction` ∈ `asc|desc`. No PII. Update `docs/analytics/mixpanel-tracking-plan.md`.
- **Design system:** tokens only (no raw hex / magic numbers), `M*` primitives (no hand-rolled `Pressable`/`Modal`), motion encapsulated in the primitives. Must pass `scripts/auxi-lint-tokens.sh` and `auxi/scripts/auxi-lint-ds-primitives.sh`, and the designer gate (step 6.5) before PR.
- **testID + accessibilityLabel** on every interactive element. testID naming `wardrobe-sort-*`. Stateful testIDs stay defined (MRadioMenu flips a `-on` suffix, never `undefined`).
- **i18n:** all user-facing copy via `t(...)`; keys added to all three locale files (`en-EN.json`, `vi-VN.json`, `fr-FR.json`). No inline strings.
- **File size:** keep files focused (< ~200 lines). `wardrobe-sort.ts` is standalone; the screen additions are small.
- **Verification gates:** `npx tsc --noEmit` clean (legacy `_HomeScreen.tsx` errors expected), `yarn lint` adds no new errors, `yarn jest` green for the new suite.

---

### Task 1: Pure sort model + comparators (`wardrobe-sort.ts`)

**Files:**
- Create: `src/screens/wardrobe/wardrobe-sort.ts`
- Test: `src/screens/wardrobe/__tests__/wardrobe-sort.test.ts`

**Interfaces:**
- Consumes: `WardrobeItem`, `getItemUsageFrequency` from `src/services/wardrobeService.ts`.
- Produces (relied on by Task 2):
  - `type SortValue = 'date_added_desc' | 'date_added_asc' | 'name_asc' | 'name_desc' | 'worn_desc' | 'worn_asc'`
  - `const DEFAULT_SORT: SortValue` (= `'date_added_desc'`)
  - `interface SortOption { value: SortValue; labelKey: string; shortKey: string; sortBy: 'date_added'|'name'|'worn'; direction: 'asc'|'desc' }`
  - `const SORT_OPTIONS: SortOption[]` (length 6, sheet order)
  - `const SORT_OPTION_BY_VALUE: Record<SortValue, SortOption>`
  - `const sortWardrobeItems: (items: WardrobeItem[], sort: SortValue) => WardrobeItem[]` (pure, non-mutating)

- [ ] **Step 1: Write the failing test**

Create `src/screens/wardrobe/__tests__/wardrobe-sort.test.ts`:

```ts
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  SORT_OPTION_BY_VALUE,
  sortWardrobeItems,
} from '../wardrobe-sort';
import { WardrobeItem } from '../../../services/wardrobeService';

const item = (over: Partial<WardrobeItem> & { id: string }): WardrobeItem =>
  ({ ...over } as WardrobeItem);

const ids = (items: WardrobeItem[]): string[] => items.map(i => i.id);

describe('sortWardrobeItems', () => {
  test('default is newest-first', () => {
    expect(DEFAULT_SORT).toBe('date_added_desc');
  });

  test('date_added_desc orders newest created_at first', () => {
    const items = [
      item({ id: 'a', created_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'b', created_at: '2026-03-01T00:00:00Z' }),
      item({ id: 'c', created_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(ids(sortWardrobeItems(items, 'date_added_desc'))).toEqual(['b', 'c', 'a']);
  });

  test('date_added_asc orders oldest created_at first', () => {
    const items = [
      item({ id: 'a', created_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'b', created_at: '2026-03-01T00:00:00Z' }),
      item({ id: 'c', created_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(ids(sortWardrobeItems(items, 'date_added_asc'))).toEqual(['a', 'c', 'b']);
  });

  test('name_asc is case-insensitive A→Z; name_desc reverses', () => {
    const items = [
      item({ id: '1', name: 'banana' }),
      item({ id: '2', name: 'Apple' }),
      item({ id: '3', name: 'cherry' }),
    ];
    expect(ids(sortWardrobeItems(items, 'name_asc'))).toEqual(['2', '1', '3']);
    expect(ids(sortWardrobeItems(items, 'name_desc'))).toEqual(['3', '1', '2']);
  });

  test('worn_desc/asc prefer numeric exposure_count', () => {
    const items = [
      item({ id: 'low', exposure_count: 1 }),
      item({ id: 'high', exposure_count: 9 }),
      item({ id: 'mid', exposure_count: 5 }),
    ];
    expect(ids(sortWardrobeItems(items, 'worn_desc'))).toEqual(['high', 'mid', 'low']);
    expect(ids(sortWardrobeItems(items, 'worn_asc'))).toEqual(['low', 'mid', 'high']);
  });

  test('worn falls back to usage_frequency when exposure_count absent', () => {
    const items = [
      item({ id: 'less', usage_frequency: 'LESS_USED' }),
      item({ id: 'normal', usage_frequency: 'NORMAL' }),
    ];
    expect(ids(sortWardrobeItems(items, 'worn_desc'))).toEqual(['normal', 'less']);
    expect(ids(sortWardrobeItems(items, 'worn_asc'))).toEqual(['less', 'normal']);
  });

  test('missing created_at sorts last in both directions', () => {
    const items = [
      item({ id: 'none' }),
      item({ id: 'has', created_at: '2026-01-01T00:00:00Z' }),
    ];
    expect(ids(sortWardrobeItems(items, 'date_added_desc'))).toEqual(['has', 'none']);
    expect(ids(sortWardrobeItems(items, 'date_added_asc'))).toEqual(['has', 'none']);
  });

  test('does not mutate the input array', () => {
    const items = [
      item({ id: 'a', created_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'b', created_at: '2026-02-01T00:00:00Z' }),
    ];
    const snapshot = ids(items);
    sortWardrobeItems(items, 'date_added_desc');
    expect(ids(items)).toEqual(snapshot);
  });

  test('empty and single-item inputs are safe', () => {
    expect(sortWardrobeItems([], 'name_asc')).toEqual([]);
    expect(ids(sortWardrobeItems([item({ id: 'solo', name: 'x' })], 'name_asc'))).toEqual(['solo']);
  });

  test('SORT_OPTIONS has 6 entries indexed by value', () => {
    expect(SORT_OPTIONS).toHaveLength(6);
    SORT_OPTIONS.forEach(o => expect(SORT_OPTION_BY_VALUE[o.value]).toBe(o));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd auxi && yarn jest src/screens/wardrobe/__tests__/wardrobe-sort.test.ts`
Expected: FAIL — `Cannot find module '../wardrobe-sort'`.

- [ ] **Step 3: Write the implementation**

Create `src/screens/wardrobe/wardrobe-sort.ts`:

```ts
import {
  WardrobeItem,
  getItemUsageFrequency,
} from '../../services/wardrobeService';

// The six user-selectable sort choices. `value` doubles as the MRadioMenu
// option value AND the session sort key; the `{key}_{direction}` shape makes the
// analytics split trivial. Newest-first is the default — it matches the backend's
// created_at DESC ordering, so nothing regresses on first paint.
export type SortValue =
  | 'date_added_desc'
  | 'date_added_asc'
  | 'name_asc'
  | 'name_desc'
  | 'worn_desc'
  | 'worn_asc';

export const DEFAULT_SORT: SortValue = 'date_added_desc';

export type SortBy = 'date_added' | 'name' | 'worn';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  value: SortValue;
  /** i18n key for the bottom-sheet row label. */
  labelKey: string;
  /** i18n key for the compact trigger-pill label. */
  shortKey: string;
  /** Analytics dimension. */
  sortBy: SortBy;
  /** Analytics direction. */
  direction: SortDirection;
}

// Order here is the order the rows appear in the sheet.
export const SORT_OPTIONS: SortOption[] = [
  { value: 'date_added_desc', labelKey: 'wardrobe.list.sort.newest', shortKey: 'wardrobe.list.sort.short_newest', sortBy: 'date_added', direction: 'desc' },
  { value: 'date_added_asc', labelKey: 'wardrobe.list.sort.oldest', shortKey: 'wardrobe.list.sort.short_oldest', sortBy: 'date_added', direction: 'asc' },
  { value: 'name_asc', labelKey: 'wardrobe.list.sort.name_az', shortKey: 'wardrobe.list.sort.short_name_az', sortBy: 'name', direction: 'asc' },
  { value: 'name_desc', labelKey: 'wardrobe.list.sort.name_za', shortKey: 'wardrobe.list.sort.short_name_za', sortBy: 'name', direction: 'desc' },
  { value: 'worn_desc', labelKey: 'wardrobe.list.sort.most_worn', shortKey: 'wardrobe.list.sort.short_most_worn', sortBy: 'worn', direction: 'desc' },
  { value: 'worn_asc', labelKey: 'wardrobe.list.sort.least_worn', shortKey: 'wardrobe.list.sort.short_least_worn', sortBy: 'worn', direction: 'asc' },
];

export const SORT_OPTION_BY_VALUE: Record<SortValue, SortOption> =
  SORT_OPTIONS.reduce((acc, o) => {
    acc[o.value] = o;
    return acc;
  }, {} as Record<SortValue, SortOption>);

// ── comparators ────────────────────────────────────────────────────────────

const NO_TIME = Number.NEGATIVE_INFINITY;

const toTime = (iso?: string): number => {
  if (!iso) return NO_TIME;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? NO_TIME : t;
};

// Numeric usage score. Prefer the backend's numeric `exposure_count` (reached via
// the WardrobeItem index signature, so typed `unknown` — narrow it); fall back to
// the coarse usage_frequency enum (LESS_USED < NORMAL) when it is absent.
const wornScore = (item: WardrobeItem): number => {
  const raw = item['exposure_count'];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return getItemUsageFrequency(item) === 'LESS_USED' ? 0 : 1;
};

// Deterministic final tie-break so equal keys never reorder run-to-run.
const byId = (a: WardrobeItem, b: WardrobeItem): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

// Items that HAVE the sort value always precede items missing it, regardless of
// direction (missing sorts last). Returns 0 when both present or both missing.
const presenceFirst = (aHas: boolean, bHas: boolean): number =>
  aHas === bHas ? 0 : aHas ? -1 : 1;

type Comparator = (a: WardrobeItem, b: WardrobeItem) => number;

const compareByDate =
  (dir: SortDirection): Comparator =>
  (a, b) => {
    const at = toTime(a.created_at);
    const bt = toTime(b.created_at);
    const p = presenceFirst(at !== NO_TIME, bt !== NO_TIME);
    if (p !== 0) return p;
    if (at !== bt) return dir === 'desc' ? bt - at : at - bt;
    return byId(a, b);
  };

const compareByName =
  (dir: SortDirection): Comparator =>
  (a, b) => {
    const an = (a.name ?? '').trim();
    const bn = (b.name ?? '').trim();
    const p = presenceFirst(an.length > 0, bn.length > 0);
    if (p !== 0) return p;
    const c = an.localeCompare(bn, undefined, { sensitivity: 'base' });
    if (c !== 0) return dir === 'asc' ? c : -c;
    return byId(a, b);
  };

const compareByWorn =
  (dir: SortDirection): Comparator =>
  (a, b) => {
    const aw = wornScore(a);
    const bw = wornScore(b);
    if (aw !== bw) return dir === 'desc' ? bw - aw : aw - bw;
    // secondary: newest first, then id — stable, sensible ties.
    const at = toTime(a.created_at);
    const bt = toTime(b.created_at);
    if (at !== bt) return bt - at;
    return byId(a, b);
  };

const COMPARATORS: Record<SortValue, Comparator> = {
  date_added_desc: compareByDate('desc'),
  date_added_asc: compareByDate('asc'),
  name_asc: compareByName('asc'),
  name_desc: compareByName('desc'),
  worn_desc: compareByWorn('desc'),
  worn_asc: compareByWorn('asc'),
};

/**
 * Pure, non-mutating client-side sort of the (already category-filtered)
 * wardrobe list. Returns a NEW array; the input is never mutated.
 */
export const sortWardrobeItems = (
  items: WardrobeItem[],
  sort: SortValue,
): WardrobeItem[] => [...items].sort(COMPARATORS[sort]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd auxi && yarn jest src/screens/wardrobe/__tests__/wardrobe-sort.test.ts`
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Type-check**

Run: `cd auxi && npx tsc --noEmit`
Expected: no NEW errors (pre-existing `_HomeScreen.tsx` errors are expected).
If `item['exposure_count']` or `getItemUsageFrequency` errors, confirm the import path `../../services/wardrobeService` and that `getItemUsageFrequency` is exported there.

- [ ] **Step 6: Commit**

```bash
cd auxi && git add src/screens/wardrobe/wardrobe-sort.ts src/screens/wardrobe/__tests__/wardrobe-sort.test.ts
git commit -m "feat(wardrobe): pure client-side sort model + comparators"
```

---

### Task 2: Wire the Sort UI into WardrobeScreen + i18n + analytics + docs

**Files:**
- Modify: `src/screens/WardrobeScreen.tsx`
- Modify: `src/translations/en-EN.json` (`wardrobe.list` block, ~line 271)
- Modify: `src/translations/vi-VN.json` (`wardrobe.list` block)
- Modify: `src/translations/fr-FR.json` (`wardrobe.list` block)
- Modify: `docs/analytics/mixpanel-tracking-plan.md` (§5 wardrobe events + §10 funnel note)

**Interfaces:**
- Consumes from Task 1: `DEFAULT_SORT`, `SORT_OPTIONS`, `SORT_OPTION_BY_VALUE`, `SortValue`, `sortWardrobeItems`.
- Produces: user-visible Sort pill + sheet; `wardrobe_sort_changed` event.

- [ ] **Step 1: Add the i18n `sort` block to all three locale files**

In `src/translations/en-EN.json`, inside the `wardrobe.list` object, add a comma after the `"error_body"` value and append this `"sort"` block (it becomes the last key in `list`):

```json
      "error_body": "We couldn't load your wardrobe. Check your connection and try again.",
        "sort": {
          "label": "Sort",
          "title": "Sort by",
          "a11y_open": "Open sort options, currently {{option}}",
          "newest": "Newest first",
          "oldest": "Oldest first",
          "name_az": "Name (A–Z)",
          "name_za": "Name (Z–A)",
          "most_worn": "Most worn",
          "least_worn": "Least worn",
          "short_newest": "Newest",
          "short_oldest": "Oldest",
          "short_name_az": "A–Z",
          "short_name_za": "Z–A",
          "short_most_worn": "Most worn",
          "short_least_worn": "Least worn"
        }
```

Then add the **same** `"sort"` block (identical keys) into the `wardrobe.list` object of `src/translations/vi-VN.json` and `src/translations/fr-FR.json`. Use the English values as a first pass — a follow-up localization pass translates them; i18next would otherwise fall back to `en-EN` for any missing key. Match each file's existing indentation and remember the trailing comma after that file's `error_body` value.

- [ ] **Step 2: Verify the JSON parses**

Run: `cd auxi && node -e "['en-EN','vi-VN','fr-FR'].forEach(l=>{require('./src/translations/'+l+'.json');console.log(l,'ok')})"`
Expected: `en-EN ok` / `vi-VN ok` / `fr-FR ok` (a syntax error prints the offending file + position).

- [ ] **Step 3: Update imports in `WardrobeScreen.tsx`**

Add `useMemo` to the React import (line 1):

```ts
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Extend the design-system import (line 24) to add the sheet + radio menu:

```ts
import {
  MActionSheet,
  MBottomSheet,
  MButton,
  MRadioMenu,
} from '../components/design-system/lib';
```

Add a new import for the sort module (place it next to the other `./wardrobe/*` imports, after the `wardrobe-grid` import block that ends at line 55):

```ts
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  SORT_OPTION_BY_VALUE,
  SortValue,
  sortWardrobeItems,
} from './wardrobe/wardrobe-sort';
```

- [ ] **Step 4: Add sort state**

After the `photoSourceSheetVisible` state (line 89), add:

```ts
  // Client-side sort of the (already category-filtered) grid. Session-only:
  // resets to newest-first on app restart. Default matches the backend's
  // created_at DESC ordering, so first paint is unchanged.
  const [sortValue, setSortValue] = useState<SortValue>(DEFAULT_SORT);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
```

- [ ] **Step 5: Apply the sort to the displayed items**

Replace the existing `displayItems` / `hasItems` block (lines 273-278):

```ts
  // In select mode hide the item being changed so it can't be re-picked.
  const displayItems =
    isSelectMode && excludeItemId
      ? items.filter(item => item.id !== excludeItemId)
      : items;
  const hasItems = displayItems.length > 0;
```

with:

```ts
  // In select mode hide the item being changed so it can't be re-picked.
  const filteredItems =
    isSelectMode && excludeItemId
      ? items.filter(item => item.id !== excludeItemId)
      : items;
  // Client-side reorder of the category-filtered set (pure, non-mutating).
  const displayItems = useMemo(
    () => sortWardrobeItems(filteredItems, sortValue),
    [filteredItems, sortValue],
  );
  const hasItems = displayItems.length > 0;
```

(The grid already renders `displayItems.map(...)`, so no change to the grid JSX.)

- [ ] **Step 6: Add the sort handler**

After `handleSelectTab` (ends line 182), add:

```ts
  const handleSelectSort = (value: SortValue) => {
    setSortValue(value);
    setSortSheetVisible(false);
    const opt = SORT_OPTION_BY_VALUE[value];
    track('wardrobe_sort_changed', {
      sort_by: opt.sortBy,
      direction: opt.direction,
    });
  };
```

- [ ] **Step 7: Render the Sort pill under the category chips**

Immediately after the `<CategoryTabs ... />` element (closes line 328), add the trigger row:

```tsx
        {!isSelectMode && hasItems ? (
          <View style={styles.sortRow}>
            <MButton
              variant="secondary"
              size="sm"
              onPress={() => setSortSheetVisible(true)}
              testID="wardrobe-sort-trigger"
              accessibilityLabel={t('wardrobe.list.sort.a11y_open', {
                option: t(SORT_OPTION_BY_VALUE[sortValue].shortKey),
              })}
            >
              {`${t('wardrobe.list.sort.label')} · ${t(
                SORT_OPTION_BY_VALUE[sortValue].shortKey,
              )}`}
            </MButton>
          </View>
        ) : null}
```

- [ ] **Step 8: Render the sort bottom sheet**

Immediately after the closing `</MActionSheet>` of the photo-source sheet (line 425), add:

```tsx
      {/* Sort chooser — MBottomSheet + MRadioMenu (single-select of six flat
          options). onChange sets sort + fires wardrobe_sort_changed. */}
      <MBottomSheet
        visible={sortSheetVisible}
        onDismiss={() => setSortSheetVisible(false)}
        testID="wardrobe-sort-sheet"
      >
        <Text style={styles.sortSheetTitle}>
          {t('wardrobe.list.sort.title')}
        </Text>
        <View style={styles.sortSheetBody}>
          <MRadioMenu
            options={SORT_OPTIONS.map(o => ({
              value: o.value,
              label: t(o.labelKey),
            }))}
            value={sortValue}
            onChange={value => handleSelectSort(value as SortValue)}
            testID="wardrobe-sort-menu"
          />
        </View>
      </MBottomSheet>
```

- [ ] **Step 9: Add the styles**

In the `StyleSheet.create({...})` block, add these three entries (e.g. after `plusButton`, before `changeFooter`):

```ts
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 8,
    marginBottom: 4,
  },
  sortSheetTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  sortSheetBody: {
    alignItems: 'center',
    paddingBottom: 8,
  },
```

- [ ] **Step 10: Type-check + lint + token/DS lints**

Run each and confirm clean (no NEW errors):

```bash
cd auxi && npx tsc --noEmit
cd auxi && yarn lint
cd /Users/nguyenminhduc/dev/wardrobe_project && ./scripts/auxi-lint-tokens.sh
cd auxi && ./scripts/auxi-lint-ds-primitives.sh
```

Expected: `tsc` — only pre-existing `_HomeScreen.tsx` errors. `yarn lint` — no new errors beyond the known 4 (`_HomeScreen.tsx`) + 3 warnings. Token + DS-primitive lints — clean (all copy via `t()`, all colors/spacing via tokens, only `M*` primitives used).

- [ ] **Step 11: Update the analytics tracking plan**

In `docs/analytics/mixpanel-tracking-plan.md`, find the existing `wardrobe_filter_changed` entry in §5 and add, directly after it (matching that entry's exact formatting), an entry for:

- Event: `wardrobe_sort_changed`
- Fired: `src/screens/WardrobeScreen.tsx` → `handleSelectSort` (on the user selecting a sort option; not on the initial default).
- Properties: `sort_by` (`date_added` | `name` | `worn`), `direction` (`asc` | `desc`).
- Purpose: user reordered the Wardrobe grid.

In §10 (funnels), add a one-line note that `wardrobe_sort_changed` is a wardrobe-browse engagement signal alongside `wardrobe_filter_changed`.

- [ ] **Step 12: Commit**

```bash
cd auxi && git add src/screens/WardrobeScreen.tsx src/translations/en-EN.json src/translations/vi-VN.json src/translations/fr-FR.json docs/analytics/mixpanel-tracking-plan.md
git commit -m "feat(wardrobe): sort pill + bottom sheet (date added / name / worn)"
```

---

### Task 3: On-device verification & gate handoff

**Files:** none (verification only).

- [ ] **Step 1: Run the app on the simulator**

Per the iOS workflow rule, expect Fast Refresh — do NOT trigger a native rebuild for this JS-only change. If the change doesn't appear: reload (`Cmd+R`) → `yarn start:reset` (never `ios:clean` without confirming no other session is mid-build).

Run: `cd auxi && yarn ios:sim` (or reload if Metro is already running).

- [ ] **Step 2: Manual smoke (record pass/fail for each)**

  1. Wardrobe with items → the "Sort · Newest" pill shows under the category chips.
  2. Tap the pill → bottom sheet opens with six options; "Newest first" is selected (radio dot).
  3. Select "Name (A–Z)" → sheet closes, grid reorders alphabetically, pill reads "Sort · A–Z".
  4. Select "Most worn" / "Least worn" → order flips accordingly.
  5. Switch category chip (e.g. All → Shoes) → the chosen sort persists on the new subset.
  6. Confirm the sort pill is hidden in select mode (open via ItemDetail "Change") and on the empty/loading/error states.
  7. Metro console shows `analytics.track wardrobe_sort_changed { sort_by, direction }` on each selection (dev flushes immediately).

- [ ] **Step 3: Gate handoff (not code)**

This feature touches product UI, so before PR it must clear:
- `qa-ui` Compare pass (visual) — the pill + sheet on-system.
- **designer gate (step 6.5)** — HARD GATE: pill placement/label, sheet title, radio-menu width inside the sheet, cross-screen consistency. Route any fixes back to mobile-dev.
- `qa-mobile` smoke on sim.

Record the designer PASS at `auxi/docs/design-reviews/2026-07-02-wardrobe-sort.md` per `.claude/rules/design-review-required.md`.

- [ ] **Step 4: Open the PR**

Branch off `main` (e.g. `feat/wardrobe-sort-control`), not the current `feat/wardrobe-loading-caching` branch. Fill the PR template (Figma N/A — no new frame; sort is a system control), attach a sim screenshot of the sheet, and check the token-lint / designer-PASS / analytics-doc boxes.

---

## Self-Review

**Spec coverage:**
- §2 three dimensions × both directions → six `SORT_OPTIONS` (Task 1) ✓
- §4 client-side, pure, non-mutating, composes with category filter → `sortWardrobeItems` applied to `filteredItems` (Task 2, Step 5) ✓
- §5 default `date_added_desc`, session-only `useState` → Task 2, Step 4 ✓
- §3 worn uses `exposure_count` else `usage_frequency` → `wornScore` (Task 1) ✓; no backend change needed ✓
- §6 Option A pill → sheet, `M*` primitives, testIDs, tokens → Task 2 Steps 7-9 (MButton + MBottomSheet + MRadioMenu; deviation from `MActionSheet` justified in header) ✓
- §7 `wardrobe_sort_changed` (literal, snake_case, props) + tracking-plan doc → Task 2 Steps 6 + 11 ✓
- §9 unit tests + verification gates → Task 1 + Task 2 Step 10 + Task 3 ✓

**Placeholder scan:** none — every code step shows full code; the i18n/doc steps give exact content and anchors.

**Type consistency:** `SortValue`, `DEFAULT_SORT`, `SORT_OPTIONS`, `SORT_OPTION_BY_VALUE`, `sortWardrobeItems` are used identically in Task 1 (definition), the test, and Task 2 (screen). `MRadioMenu` option shape `{ value, label }` matches `MMenuOption` (Task 2 Step 8). `onChange(value: string)` cast to `SortValue` at the single call site.
