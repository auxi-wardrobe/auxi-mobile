# Discovery — item-type filter ("Món đồ")

Lets a user narrow the Discovery feed to outfits that contain a given item —
e.g. pick **Chân váy chữ A** and see only outfits with an A-line skirt.

The mobile side ships in this repo and is **dormant until the backend ships
the two changes below**: while `GET /discovery/item-types` 404s (or returns an
empty list) the "Món đồ" pill is simply not rendered.

## Why a filter, not search

Discovery is a small, curated, browse-for-inspiration feed with 1–4 items per
outfit. Item names are English catalog strings, so a Vietnamese free-text query
("chân váy chữ A") would match nothing without a synonym layer. A server-owned,
translated chip list has no vocabulary gap, shows only what exists, and reuses
the existing `DiscoveryFilterSheet` pattern (season / tag / color).

## Backend contract (to implement in auxi-backend)

### 1. `GET /discovery/item-types`

Item types present in at least one servable outfit **for this viewer** (same
gender filtering as the feed). Types with zero outfits are omitted.

```json
{
  "item_types": [
    { "code": "a_line_skirt", "label": "A-line skirt", "count": 4 },
    { "code": "loafers", "label": "Loafers", "count": 7 }
  ]
}
```

- `code` — stable snake_case id; what the client sends back.
- `label` — English fallback, shown only when the app has no
  `discovery.item_types.<code>` translation.
- `count` — number of servable outfits containing ≥1 item of the type.
- Order — the order chips are shown in. Suggested: grouped
  top → outerwear → bottom → one-piece → shoes → accessory, then by name.

### 2. `GET /discovery/outfits?item_type=a_line_skirt,pleated_skirt`

- ONE comma-separated string (same as `color`; FastAPI does not read
  `item_type[]=`).
- OR within the axis: outfit matches if it contains ANY selected type.
- AND with the other axes (season, trend_tag, color), as today.
- `total` must be the filtered count, and the `seed` shuffle must apply to the
  filtered set, so offset paging stays gap-free.

### Where the type comes from

`category_code` alone is too coarse (no skirt code; A-line is a silhouette,
not a category). Options, best first:

1. **Curated field** on each discovery outfit item (`item_type`), set in the
   admin tool when an outfit is authored. Discovery is curated content, so this
   is cheap and exact.
2. Derive from Gemini metadata (`subcategory` + `description`, e.g.
   "A-line midi skirt…") with a keyword map, reviewed by an admin.

Do not classify on the client: feed cards carry no item list, and the feed is
paginated, so client-side filtering would produce empty or partial pages.

## Starter vocabulary

Translations for these codes already exist in `src/translations/*.json` under
`discovery.item_types`. The backend may add codes freely; unknown codes fall
back to `label`.

| code | en | vi |
| --- | --- | --- |
| `t_shirt` | T-shirt | Áo phông |
| `shirt` | Shirt | Áo sơ mi |
| `blouse` | Blouse | Áo kiểu |
| `polo` | Polo | Áo polo |
| `tank_top` | Tank top | Áo ba lỗ |
| `knit_sweater` | Sweater | Áo len |
| `cardigan` | Cardigan | Áo cardigan |
| `hoodie` | Hoodie | Áo hoodie |
| `blazer` | Blazer | Áo blazer |
| `jacket` | Jacket | Áo khoác |
| `coat` | Coat | Áo măng tô |
| `jeans` | Jeans | Quần jeans |
| `trousers` | Trousers | Quần tây |
| `wide_leg_trousers` | Wide-leg trousers | Quần ống rộng |
| `shorts` | Shorts | Quần short |
| `a_line_skirt` | A-line skirt | Chân váy chữ A |
| `pencil_skirt` | Pencil skirt | Chân váy bút chì |
| `pleated_skirt` | Pleated skirt | Chân váy xếp ly |
| `midi_skirt` | Midi skirt | Chân váy midi |
| `mini_skirt` | Mini skirt | Chân váy ngắn |
| `dress` | Dress | Váy liền |
| `jumpsuit` | Jumpsuit | Jumpsuit |
| `sneakers` | Sneakers | Giày sneaker |
| `loafers` | Loafers | Giày lười |
| `boots` | Boots | Bốt |
| `heels` | Heels | Giày cao gót |
| `flats` | Flats | Giày bệt |
| `sandals` | Sandals | Xăng đan |
| `bag` | Bag | Túi |

An item belongs to exactly one type. Pick the most specific type: an A-line
midi skirt is `a_line_skirt`, not `midi_skirt`.

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
