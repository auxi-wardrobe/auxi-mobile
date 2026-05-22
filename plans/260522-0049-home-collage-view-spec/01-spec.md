# Collage View — Figma Spec (verbatim measurements)

**Reference frame**: 382×509.33px (Figma `Image 3:4` container, aspect 0.75)
**Coordinate system**: `x, y` = top-left of rect within the 382×509.33 frame; `width, height` in px
**Scaling at runtime**: multiply all coords by `(actualWidth / 382)` to fit the runtime sheet content area
**Z-order**: rects listed top-to-bottom = back-to-front (FIRST = bottom layer, LAST = top layer). Verify against Figma child-order if implementation rendering differs.

---

## Part A — 4 Home Collage frames (active screens with chrome)

These are the actual Home screens with header/footer/CTA chrome. Each renders ONE template inside its content area.

| Frame node | Item count | Template used | Notes |
|---|---|---|---|
| `2850:13590` | 3 | `9` | T-shirt centered top + jeans + sneakers asymmetric |
| `2850:13618` | 4 | Likely `10` or `4-1` | Jacket open over tshirt + jeans + sneakers vertical stack |
| `2850:13647` | 5 | `11` | + cap accessory |
| `2850:13677` | 6 | `12` | + trenchcoat outer layer |

→ Designer to confirm exact template mapping for each frame (counts overlap with `-1` variants).

Wrapper chrome (same as Grid View, inherited from Home base):
- Header `2850:9152` style: hamburger (45×45) + weather/date center + feedback button (47×47) — h=107
- Content area: starts y=107, ends y=781 (above footer h=98)
- Action row (under content): subtitle chip + idea button, then Remix/counter/(removed Show another), then "Wear this" secondary button
- Footer pill (toggle): h=98 backdrop-blur 3.25, 158×56 pill bg `#eee6df`, 2 icons in 149×56 inner, currently grid-icon active (left)

---

## Part B — 10 Layout templates (the meat)

All templates inside 382×509.33 frame `Image 3:4`. Items overlap by design — overlap is the "flat-lay" aesthetic.

### Template `9` (3 items) — node `2852:23092`

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 (back) | 127, 158, 252, 337 | Jeans / bottom (largest, lower-right) |
| 2 | 34, -2, 219, 293 | Top / shirt (overlaps top edge) |
| 3 (front) | 36, 248, 163, 217 | Shoes (lower-left, on top) |

Notes: Rect 2 has negative y (-2) → bleeds above frame top. Clip to frame in implementation.

---

### Template `4-1` (4 items, alt) — node `2852:23098`

| Layer | Rect (x, y, w, h) | Named hint |
|---|---|---|
| 1 (back) | 68, 54, 355, 401 | `image 499` — hero garment (largest, overflows right edge x+w=423>382) |
| 2 | 20, 92, 163, 163 | `image 535` — top-left accessory |
| 3 | 21, 200, 126, 169 | `SYS_AC_BAG_BLK_SHO_01` — BLACK SHOES (lower-left) |
| 4 (front) | 39, 311, 125, 166 | Generic media (front, lower-left) |

Notes: Rect 1 overflows right edge by 41px → either clip or accept overflow.

---

### Template `10` (4 items) — node `2852:23105`

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 (back) | 144, 165, 248, 330 | Bottom / jeans (right) |
| 2 | 162, -4, 215, 287 | Top-right shirt (overflows top -4) |
| 3 | 26, 9, 206, 274 | Top-left shirt (paired top item, e.g. cardigan) |
| 4 (front) | 36, 292, 163, 217 | Shoes (lower-left) |

---

### Template `11` (5 items) — node `2852:23112`

Builds on `10` + adds 2 small accessories at center.

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 (back) | 144, 165, 248, 330 | Jeans |
| 2 | 162, -4, 215, 287 | Top-right |
| 3 | 26, 9, 206, 274 | Top-left |
| 4 | 56, 340, 127, 169 | Lower-left accessory |
| 5 (front) | 66, 238, 108, 144 | Centered small accessory |

---

### Template `12` (6 items) — node `2852:23120`

Builds on `11` + adds 1 more mid-layer accessory.

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 (back) | 145, 167, 245, 326 | Jeans |
| 2 | 163, 0, 212, 283 | Top-right |
| 3 | 28, 12, 204, 271 | Top-left |
| 4 | 56, 340, 127, 169 | Lower-left small |
| 5 | 63, 219, 108, 144 | Centered small |
| 6 (front) | 49, 255, 142, 189 | Larger mid accessory |

---

### Template `13` (7 items) — node `2852:23129`

Builds on `12` + adds right-side bag.

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 | 145, 167, 245, 326 | Jeans |
| 2 | 163, 0, 212, 283 | Top-right |
| 3 | 28, 12, 204, 271 | Top-left |
| 4 | 56, 340, 127, 169 | Lower-left small |
| 5 | 63, 219, 108, 144 | Centered small |
| 6 | 49, 255, 142, 189 | Mid accessory |
| 7 (front) | 305, 340, 122, 163 | `SYS_AC_BAG_BRN_BRF_01` — BROWN BRIEFCASE (right side, overflows right edge x+w=427) |

---

### Template `14` (8 items, max coverage) — node `2852:23166`

The maximal layout — heavy overlap, multiple accessories.

| Layer | Rect (x, y, w, h) | Named hint |
|---|---|---|
| 1 (back) | 148, 171, 239, 319 | Jeans (slightly larger than `13`) |
| 2 | 182, 30, 191, 254 | Right top |
| 3 | 97, 46, 205, 273 | `SYS_L2_KNT_SGE_RIB_01` — KNIT SAGE RIB (center top) |
| 4 | -11, 10, 232, 309 | `SYS_L3_PRK_OLV_REG_01` — OLIVE PARKA (left edge, x=-11 bleeds left) |
| 5 | 157, 214, 122, 163 | `SYS_AC_BAG_BRN_BRF_01` — BROWN BRIEFCASE |
| 6 | 30, 325, 132, 176 | Generic media (lower-left) |
| 7 | 162, 250, 95, 127 | `SYS_AC_BLT_BLK_LEA_01` — BLACK LEATHER BELT |
| 8 (front) | 268, 314, 121, 162 | `SYS_AC_BRC_GLD_CHK_01` — GOLD BRACELET CHECK (front, right) |

---

### Template `5-1` (5 items, alt) — node `2852:23139`

Alternative arrangement for 5 items — hero piece shifted, knit dominant.

| Layer | Rect (x, y, w, h) | Named hint |
|---|---|---|
| 1 (back) | 148, 171, 239, 319 | Jeans |
| 2 | 182, 30, 191, 254 | Top right |
| 3 | 97, 46, 205, 273 | `SYS_L2_KNT_SGE_RIB_01` — KNIT center |
| 4 | -33, 36, 260, 346 | Hero overflowing left (x=-33) — largest |
| 5 (front) | 31, 330, 146, 194 | Lower-left front item |

---

### Template `6-1` (6 items, alt) — node `2852:23147`

`5-1` + black shoes.

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 | 148, 171, 239, 319 | Jeans |
| 2 | 182, 30, 191, 254 | Top right |
| 3 | 97, 46, 205, 273 | Knit center |
| 4 | -33, 36, 260, 346 | Hero left (overflows left) |
| 5 | 31, 330, 146, 194 | Front lower-left |
| 6 (front) | 65, 221, 126, 169 | `SYS_AC_BAG_BLK_SHO_01` — BLACK SHOES |

---

### Template `7-1` (7 items, alt) — node `2852:23156`

`6-1` + leather belt.

| Layer | Rect (x, y, w, h) | Hint |
|---|---|---|
| 1 | 148, 171, 239, 319 | Jeans |
| 2 | 182, 30, 191, 254 | Top right |
| 3 | 97, 46, 205, 273 | Knit center |
| 4 | -33, 36, 260, 346 | Hero left |
| 5 | 31, 330, 146, 194 | Front lower-left |
| 6 | 65, 221, 126, 169 | Black shoes |
| 7 (front) | 160, 340, 95, 127 | `SYS_AC_BLT_BLK_LEA_01` — BLACK BELT |

---

## TypeScript registry stub

For Phase 2 implementation, the registry would look like:

```ts
type Rect = { x: number; y: number; w: number; h: number };
type TemplateName = '9' | '4-1' | '10' | '11' | '12' | '13' | '14' | '5-1' | '6-1' | '7-1';

export const COLLAGE_FRAME = { width: 382, height: 509.33 } as const;

export const COLLAGE_TEMPLATES: Record<TemplateName, Rect[]> = {
  '9':   [{x:127, y:158, w:252, h:337}, {x:34, y:-2,  w:219, h:293}, {x:36, y:248, w:163, h:217}],
  '4-1': [{x:68,  y:54,  w:355, h:401}, {x:20, y:92,  w:163, h:163}, {x:21, y:200, w:126, h:169}, {x:39, y:311, w:125, h:166}],
  '10':  [{x:144, y:165, w:248, h:330}, {x:162,y:-4,  w:215, h:287}, {x:26, y:9,   w:206, h:274}, {x:36, y:292, w:163, h:217}],
  '11':  [{x:144, y:165, w:248, h:330}, {x:162,y:-4,  w:215, h:287}, {x:26, y:9,   w:206, h:274}, {x:56, y:340, w:127, h:169}, {x:66, y:238, w:108, h:144}],
  '12':  [{x:145, y:167, w:245, h:326}, {x:163,y:0,   w:212, h:283}, {x:28, y:12,  w:204, h:271}, {x:56, y:340, w:127, h:169}, {x:63, y:219, w:108, h:144}, {x:49, y:255, w:142, h:189}],
  '13':  [{x:145, y:167, w:245, h:326}, {x:163,y:0,   w:212, h:283}, {x:28, y:12,  w:204, h:271}, {x:56, y:340, w:127, h:169}, {x:63, y:219, w:108, h:144}, {x:49, y:255, w:142, h:189}, {x:305,y:340, w:122, h:163}],
  '14':  [{x:148, y:171, w:239, h:319}, {x:182,y:30,  w:191, h:254}, {x:97, y:46,  w:205, h:273}, {x:-11,y:10,  w:232, h:309}, {x:157,y:214, w:122, h:163}, {x:30, y:325, w:132, h:176}, {x:162,y:250, w:95,  h:127}, {x:268,y:314, w:121, h:162}],
  '5-1': [{x:148, y:171, w:239, h:319}, {x:182,y:30,  w:191, h:254}, {x:97, y:46,  w:205, h:273}, {x:-33,y:36,  w:260, h:346}, {x:31, y:330, w:146, h:194}],
  '6-1': [{x:148, y:171, w:239, h:319}, {x:182,y:30,  w:191, h:254}, {x:97, y:46,  w:205, h:273}, {x:-33,y:36,  w:260, h:346}, {x:31, y:330, w:146, h:194}, {x:65, y:221, w:126, h:169}],
  '7-1': [{x:148, y:171, w:239, h:319}, {x:182,y:30,  w:191, h:254}, {x:97, y:46,  w:205, h:273}, {x:-33,y:36,  w:260, h:346}, {x:31, y:330, w:146, h:194}, {x:65, y:221, w:126, h:169}, {x:160,y:340, w:95,  h:127}],
};
```

---

## Observations

- **Overflow common**: `4-1`, `13`, `14`, `5-1`/`6-1`/`7-1` have items with rects extending outside the 382 frame. Implementation must decide: clip, or allow overflow.
- **Templates 11/12/13 share base layout**: incremental additions to the same hero+top pair. Renderer could share base + N additions.
- **Templates 5-1/6-1/7-1 share base**: same hero-left + knit + jeans, incremental accessories.
- **2 templates per count (4,5,6,7)**: gives designer flexibility. Need rule for which to pick.
- **Named items in some templates** (BLACK SHOES, BROWN BRIEFCASE, BLACK BELT, KNIT, PARKA, GOLD BRACELET): strongly implies category-aware slotting. Backend `Item` already has `category` + `color` fields — could match.
