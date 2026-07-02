# Wardrobe Loading & Caching — Design Spec

- **Date:** 2026-07-02
- **Status:** Approved (design) — pending implementation plan
- **Repo:** `auxi` (RN 0.83.1, React 19.2, New Architecture + Hermes on, no Expo)
- **Owner:** mobile-dev

## Problem

On the Wardrobe page, item images "load đi load lại" — every time the user
navigates into the page and back, the grid flashes skeletons and images
re-request/re-decode. It feels slow and janky compared to the rest of the app.

## Root cause (verified against code)

Two independent causes:

1. **Data refetches on every screen focus.** `src/screens/WardrobeScreen.tsx` is
   the *only* list screen that does **not** use TanStack Query. It holds items in
   local `useState` (line ~75) and refetches inside a `useEffect` keyed on
   `useIsFocused()` (lines ~146–152):
   ```ts
   useEffect(() => {
     if (isFocused) { fetchItems(); track('wardrobe_viewed', { category: selectedTab }); }
   }, [fetchItems, isFocused]);
   ```
   Navigating away and back flips `isFocused` false→true → full network call →
   `setItems()` replaces the whole array → `loading` flips true → **6 skeleton
   tiles flash** (lines ~254–260) → tiles rebuild. `fetchItems` is also recreated
   when `selectedTab` changes, so tab switches refetch too. There is a second
   effect (lines ~158–166) that `setInterval`-polls every `PREPARING_POLL_MS`
   (4000ms, `src/screens/wardrobe/wardrobe-grid.ts:96`) while focused and any item
   `is_preparing`.

2. **Images use RN's weak `<Image>` cache.** `src/screens/wardrobe/WardrobeGridTile.tsx`
   renders plain `Image` from `react-native` (lines ~58–63) with
   `source={{ uri, cache: 'force-cache' }}`. `force-cache` is an iOS-only hint;
   there is **no** cross-platform persistent disk cache. No `expo-image` /
   `FastImage` installed. Image files can re-download, especially on Android and
   after app restart.

Compounding: the app's `QueryClient` is a bare `new QueryClient()` (`App.tsx:29`)
with no defaults, so `staleTime: 0` app-wide — every screen treats data as
instantly stale.

## Goals

- Revisiting the Wardrobe page shows the list **instantly from cache**, with **no
  skeleton flash** and **no image flicker** on the 2nd+ visit.
- Image **files** persist on disk across navigations **and app restarts** — no
  re-download.
- Preserve existing behavior: `is_preparing` → ready reconciliation + snackbar,
  add-item refresh, and the `wardrobe_viewed` analytics event.
- Stay on-system: image access goes through a single reusable primitive.

## Non-goals / out of scope (follow-ups)

- Migrating Home / Favourite / MyCreations tiles to the new cached-image
  primitive (they already use `useQuery`; image swap is a fast-follow).
- React Query persistence across cold start via `persistQueryClient` +
  AsyncStorage (image disk cache already covers the visible pain; data refetch on
  cold start is a single fetch, not the reported annoyance).
- Any backend / API changes.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Both layers (data + image) | Data fix kills the flash; image fix stops file re-download. |
| Image library | `@d11/react-native-fast-image` | Maintained FastImage fork w/ New-Arch (Fabric) support; single native module, no Expo runtime — smallest footprint for this bare-RN app. |
| Data-layer approach | Migrate to `useQuery` + shared key + stale-while-revalidate (Approach A), plus conservative global `QueryClient` defaults (light touch of C) | Idiomatic; matches Home/Favourite/MyCreations; shares cache with Home. |
| `staleTime` | `60_000` (60s), global default + wardrobe query | Balances freshness vs. avoiding refetch spam. Home currently uses 30s; 60s app-default is conservative and tunable. |

## Design

### 1. Data layer — `WardrobeScreen.tsx` → TanStack Query

Replace local `useState<WardrobeItem[]>` + `fetchItems`/`useIsFocused` effect with:

```ts
const { data: items = [], isLoading, isFetching, refetch } = useQuery({
  queryKey: wardrobeKeys.list(selectedTab),        // ['wardrobe-items', category|'all']
  queryFn: () => selectedTab === 'all'
    ? wardrobeService.getWardrobeItems()
    : wardrobeService.filterWardrobeItems({ category: selectedTab }),
  staleTime: 60_000,
  refetchInterval: (query) =>
    isFocused && anyPreparing(query.state.data) ? PREPARING_POLL_MS : false,
  refetchIntervalInBackground: false,
});
```

Behavior:
- **Skeletons only on `isLoading`** (first load, empty cache) — never on
  background refetch. This removes the flash on revisit.
- **Delete the `isFocused` data-refetch effect.** Cache + `staleTime` govern
  freshness on remount: within `staleTime` → serve cache, no network; stale →
  show cached data immediately + background refetch (stale-while-revalidate).
- **`is_preparing` poll** → conditional `refetchInterval` (replaces manual
  `setInterval`), gated on `isFocused` so it stops when the screen isn't active.
  `useItemReadySnackbar` reconciliation (`reconcileReadyItems`, currently called
  inside `fetchItems`) moves to react to query-data changes (e.g. an effect on
  `items`, or the query's success path) so the preparing→ready snackbar still
  fires.
- **Add-item flow** (`src/screens/wardrobe/useAddWardrobeItem.ts`, currently
  handed `refetch: fetchItems` at `WardrobeScreen.tsx:~249`) → replace with
  `queryClient.invalidateQueries({ queryKey: wardrobeKeys.all })` so every
  category variant refreshes after upload.
- **Analytics preserved:** keep a small focus-only effect that fires
  `track('wardrobe_viewed', { category: selectedTab })`, decoupled from data
  fetching (satisfies `.claude/rules/analytics-tracking-required.md`).

`anyPreparing(data)` reuses the existing `isPreparing` helper
(`wardrobe-grid.ts:58`, `item.is_preparing === true`).

### 2. Query keys factory + cross-screen cache sharing

Add a `wardrobeKeys` factory (single source of truth) in `wardrobeService.ts`:
```ts
export const wardrobeKeys = {
  all: ['wardrobe-items'] as const,
  list: (category: string) => ['wardrobe-items', category] as const, // 'all' for unfiltered
};
```
Repoint HomeScreen's `['home-wardrobe-items']` (`src/screens/HomeScreen/index.tsx:~807`)
to `wardrobeKeys.list('all')` so Home and Wardrobe share one cache entry —
opening Wardrobe right after Home is instant.

### 3. Global `QueryClient` defaults — `App.tsx`

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});
```
Conservative app-wide default; per-screen overrides still win. Stops the
instantly-stale behavior everywhere.

### 4. Image layer — `@d11/react-native-fast-image`

- Add dependency → `yarn pods` (iOS) → **coordinated native rebuild** (per
  `.claude/rules/ios-build-workflow-required.md`: confirm no other CC session is
  mid-build; `auxi/scripts/ios-clean-rebuild.sh` enforces the concurrency guard).
- New primitive **`src/components/atoms/CachedImage.tsx`** — thin wrapper over
  FastImage with app defaults: `resizeMode`, `cache: immutable` (per-item S3 URLs
  are stable, so `immutable` is the correct cache key), sensible `priority`,
  `testID` + `accessibilityLabel` pass-through. Isolating the lib in one file
  satisfies `.claude/rules/design-system-primitives-required.md` and makes any
  future swap a one-file change.
- `WardrobeGridTile.tsx`: swap `<Image source={{ uri, cache: 'force-cache' }}>`
  (lines ~58–63) for `<CachedImage source={{ uri }} testID=… accessibilityLabel=… />`.
  `uri` still comes from `resolveItemImage({ image_png, image_url })`
  (`src/utils/url.ts`); the S3 rewrite is stable per item, so the FastImage cache
  key is stable.
- FastImage does not render SVG — not a concern here (item images are png/jpg
  from S3).

## Files touched

**Modify**
- `src/screens/WardrobeScreen.tsx` — remove local-state fetch + focus effect;
  add `useQuery`; move reconcile + analytics; wire invalidate on add.
- `src/services/wardrobeService.ts` — add `wardrobeKeys` factory.
- `src/screens/HomeScreen/index.tsx` — repoint query key to `wardrobeKeys.list('all')`.
- `src/screens/wardrobe/useAddWardrobeItem.ts` — invalidate instead of manual refetch (if it holds the refetch handle).
- `src/screens/wardrobe/WardrobeGridTile.tsx` — use `CachedImage`.
- `App.tsx` — `QueryClient` default options.
- `package.json` / `yarn.lock` — add `@d11/react-native-fast-image` (same commit).

**Create**
- `src/components/atoms/CachedImage.tsx` — FastImage wrapper primitive.

## Verification

- `npx tsc --noEmit` clean (legacy `_HomeScreen.tsx` errors expected).
- `yarn lint` — no new errors beyond the known baseline.
- Native: `yarn pods` + coordinated rebuild; confirm the app boots.
- Manual smoke: Home → Wardrobe → back → Wardrobe = **no skeleton flash, no image
  flicker** on 2nd visit; tab-switch within Wardrobe cached; cold start loads
  images from disk cache; add-item still refreshes the grid; preparing→ready
  snackbar still fires; `wardrobe_viewed` still tracked.
- Update `auxi/docs/analytics/mixpanel-tracking-plan.md` only if the
  `wardrobe_viewed` trigger semantics change (they should not).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| **RN 0.83 + New Arch is bleeding-edge; `@d11/react-native-fast-image` build unverified on it.** | Do the native add + build **first** as a gate. If pod install / build fails, fall back: ship the JS data-layer fix alone (already removes the flash), open a follow-up to spike the image lib. |
| `refetchInterval` polling when screen not focused | Gate on `isFocused`; `refetchIntervalInBackground: false`. |
| Repointing Home's key causes a brief double-fetch during rollout | Trivial/one-time; both keys resolve to the same queryFn. |
| Reconcile/snackbar logic regressed when moving off `fetchItems` | Cover in manual smoke: create a preparing item, confirm the ready snackbar. |

## Branching note

Current branch `duc2820/au-370-reduce-the-hit-area-of-an-item` is a different
ticket with uncommitted work. Implementation should happen on a **dedicated
branch** (e.g. `feat/wardrobe-loading-caching`); do not commit this work onto the
AU-370 branch.
