# Discovery — item-type filter ("Món đồ")

Lets a user narrow the Discovery feed to outfits that contain a given item —
e.g. pick **Chân váy chữ A** and see only outfits with an A-line skirt.

The pill renders only when `GET /discovery/item-types` returns at least one
type. Against a backend without the endpoint (404) the pill stays hidden.

## Why a filter, not search

Discovery is a small, curated, browse-for-inspiration feed with 1–4 items per
outfit. Item names are English catalog strings, so a Vietnamese free-text query
("chân váy chữ A") would match nothing without a synonym layer. A server-owned,
translated chip list has no vocabulary gap, shows only what exists, and reuses
the existing `DiscoveryFilterSheet` pattern (season / tag / color).

## Backend contract (auxi-backend)

Source of truth: `utils/discovery_item_types.py` and `API_DOCUMENTATION.md`
§Discovery in auxi-backend.

### `GET /discovery/item-types`

Item types present in at least one servable outfit **for this viewer** (same
gender filtering as the feed), in vocabulary order. Types with zero outfits
are omitted.

```json
{
  "item_types": [
    { "code": "t_shirt", "label": "T-shirt", "count": 9 },
    { "code": "skirt", "label": "Skirt", "count": 5 },
    { "code": "a_line_skirt", "label": "A-line skirt", "count": 2 }
  ]
}
```

### `GET /discovery/outfits?item_type=a_line_skirt,loafers`

- ONE comma-separated string (same as `color`; FastAPI does not read
  `item_type[]=`).
- OR within the axis, AND with season / trend_tag / color.
- `total` is the filtered count; the `seed` shuffle applies to the filtered
  set.
- Unknown code → 422 `"Invalid item type"`.

### How an item gets its type

Derived server-side from structured metadata only (AU-299 — names are never
parsed):

- `category_code` → base type (`SKR` → `skirt`, `LOA` → `loafers`,
  `TRS`/`CHI`/`LEA` → `trousers`…). Every item in the v0.5 common-item
  catalog maps to a type (pinned by a backend test).
- Skirts and trousers get a child type from the style code
  (`physical_attributes.fit_code` / `raw_style_code`) or the v0.5
  `silhouette_type` / `construction_type` / `length_type`:
  `ALN` → `a_line_skirt`, `PEN` → `pencil_skirt`, `PLT` → `pleated_skirt`,
  `SLK` → `slip_skirt`, `MIN` → `mini_skirt`, `MDI` → `midi_skirt`,
  `LNG`/`MAX` → `long_skirt`, `WID` → `wide_leg_trousers`. Shape outranks
  length.
- An item yields child first, then parent: an A-line skirt is
  `["a_line_skirt", "skirt"]`. So "Chân váy" finds every skirt look and
  "Chân váy chữ A" only the A-line ones.

The detail endpoint also returns `items[].item_types`.

## Vocabulary

Translations for all 55 codes live in `src/translations/*.json` under
`discovery.item_types`, in the same order as the backend. A code the app has
no translation for falls back to the server's English `label`. Adding a type
means adding it to the backend vocabulary and to all three locale files.

## Mobile implementation

- `src/services/discoveryService.ts` — `itemTypes` param → `item_type`;
  `listItemTypes()` (404 → `[]`).
- `src/hooks/useDiscovery.ts` — `useDiscoveryItemTypes`; `itemTypes` in the
  feed query key.
- `src/hooks/useDiscoveryFeed.ts` — selection state, page reset, analytics
  (`discovery_filter_applied` with `filter_type: 'item_type'`,
  `filter_item_type` on `discovery_feed_viewed`).
- `src/screens/discovery/DiscoveryFilterRow.tsx` — "Món đồ" pill + sheet.
  testIDs: `discovery-item-type-trigger`, `discovery-item-type-sheet`,
  `discovery-item-type-chip-<code>`, `discovery-item-type-chip-all`,
  `discovery-item-type-default`, `discovery-item-type-apply`.
