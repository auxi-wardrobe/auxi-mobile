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
  {
    value: 'date_added_desc',
    labelKey: 'wardrobe.list.sort.newest',
    shortKey: 'wardrobe.list.sort.short_newest',
    sortBy: 'date_added',
    direction: 'desc',
  },
  {
    value: 'date_added_asc',
    labelKey: 'wardrobe.list.sort.oldest',
    shortKey: 'wardrobe.list.sort.short_oldest',
    sortBy: 'date_added',
    direction: 'asc',
  },
  {
    value: 'name_asc',
    labelKey: 'wardrobe.list.sort.name_az',
    shortKey: 'wardrobe.list.sort.short_name_az',
    sortBy: 'name',
    direction: 'asc',
  },
  {
    value: 'name_desc',
    labelKey: 'wardrobe.list.sort.name_za',
    shortKey: 'wardrobe.list.sort.short_name_za',
    sortBy: 'name',
    direction: 'desc',
  },
  {
    value: 'worn_desc',
    labelKey: 'wardrobe.list.sort.most_worn',
    shortKey: 'wardrobe.list.sort.short_most_worn',
    sortBy: 'worn',
    direction: 'desc',
  },
  {
    value: 'worn_asc',
    labelKey: 'wardrobe.list.sort.least_worn',
    shortKey: 'wardrobe.list.sort.short_least_worn',
    sortBy: 'worn',
    direction: 'asc',
  },
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
