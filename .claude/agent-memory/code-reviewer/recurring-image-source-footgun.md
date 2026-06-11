---
name: recurring-image-source-footgun
description: auxi recurring bug class — screens reading item.image_url directly miss png-only V05 items; resolveItemImage (png-preferred) is canonical
metadata:
  type: project
---

Recurring review finding in auxi: wardrobe/V05 items carry BOTH `image_url` and `image_png` (background-removed cutout). V05 `common_essential` items can be png-only — `mapItem` in HomeScreen coerces `image_url: it.image_url ?? ''`. The canonical accessor is `resolveItemImage()` in `src/utils/url.ts` (prefers png, falls back to url, then getImageUrl S3 fix).

**Why:** Found in AU-312 review (2026-06-11): rebuilt ItemDetailScreen read `getImageUrl(item?.image_url)` only, so png-only fallback items showed "Image unavailable" while the Home tile showed the cutout. The old ItemDetailBottomSheet had it right (resolveItemImage). Same class of bug likely recurs whenever a new surface renders item images.

**How to apply:** In any auxi review touching item image rendering, grep for raw `image_url` reads and flag if `resolveItemImage` (or equivalent png fallback) isn't used.
