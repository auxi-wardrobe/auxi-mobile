# Wardrobe Loading & Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Wardrobe page from re-fetching data and re-downloading images on every visit — the list should render instantly from cache with no skeleton flash, and image files should persist on disk.

**Architecture:** Migrate `WardrobeScreen` off local-state + `useIsFocused` fetching onto TanStack Query (stale-while-revalidate, shared cache key with Home), and route all item thumbnails through a new `CachedImage` primitive backed by `@d11/react-native-fast-image` for persistent disk caching.

**Tech Stack:** React Native 0.83.1 (New Architecture + Hermes), React 19.2, TypeScript 5.8, `@tanstack/react-query` 5.90, `@d11/react-native-fast-image`, jest 29 + `react-test-renderer`.

## Global Constraints

- Target stack: **RN 0.83.1, New Architecture (Fabric) ON, Hermes ON, no Expo**.
- Image library: **`@d11/react-native-fast-image`** (no `expo-image`, no unmaintained `react-native-fast-image`).
- Wardrobe/global query `staleTime`: **`60_000`** (ms).
- Analytics: every `track()` call goes through `src/services/analytics.ts` with **literal string** event names (no template literals). Preserve existing events: `wardrobe_viewed`, `wardrobe_load_failed`, `wardrobe_load_retry_tapped`. (`.claude/rules/analytics-tracking-required.md`)
- `testID` + `accessibilityLabel` on interactive/asset elements; keep existing testIDs stable. (`auxi/CLAUDE.md`)
- Tokens only — colors from `theme`/`ds`, spacing on the 4px grid. No new raw hex. (`design-system` rules)
- Native rebuild is a **shared-machine, coordinated** operation — confirm no other CC session is mid-build; use `auxi/scripts/ios-clean-rebuild.sh` (has a concurrency guard). Never kill Metro/watchman unilaterally. (`.claude/rules/ios-build-workflow-required.md`)
- `yarn.lock` is the Cloudflare build-cache key — commit it in the **same commit** as the `package.json` dependency change. (`.claude/rules/yarn-lock-cache-management.md`)
- Verification baseline: `npx tsc --noEmit` clean except known legacy `_HomeScreen.tsx` errors; `yarn lint` no new errors beyond baseline (4 errors / 3 warnings in `_HomeScreen.tsx`).

---

## Prerequisites (do before Task 1)

The current branch `duc2820/au-370-reduce-the-hit-area-of-an-item` is a **different ticket** and has an uncommitted change to `src/components/features/OutfitCanvasSurface.tsx`.

- [ ] Commit or stash the AU-370 change so it doesn't ride along.
- [ ] Create a dedicated branch off `main`:
  ```bash
  git -C /Users/nguyenminhduc/dev/wardrobe_project/auxi checkout main
  git -C /Users/nguyenminhduc/dev/wardrobe_project/auxi pull --ff-only
  git -C /Users/nguyenminhduc/dev/wardrobe_project/auxi checkout -b feat/wardrobe-loading-caching
  ```
- [ ] Ensure Node 20 is active: `cd auxi && nvm use` (reads `.nvmrc`).

---

## Task 1: Add `@d11/react-native-fast-image` + jest stub (native gate)

This is the **risk-first gate**. RN 0.83 + New Arch is bleeding-edge; if the native build fails here, STOP and escalate (fallback in the spec: ship the data-layer tasks 4–7 alone, defer the image lib). Do NOT proceed to Task 2 until the app boots with the dep installed.

**Files:**
- Modify: `package.json` (+ `yarn.lock`) — add dependency
- Modify: `jest.config.js:4-8` — map the native module to a stub
- Create: `__mocks__/fastImageMock.tsx` — jest stub

**Interfaces:**
- Produces: the `@d11/react-native-fast-image` module (default export `FastImage` with static `resizeMode`, `priority`, `cacheControl`, `preload`) available to app code; a jest stub so the suite still runs headless.

- [ ] **Step 1: Install the dependency** (pinned, no caret drift beyond yarn's resolution)

```bash
cd /Users/nguyenminhduc/dev/wardrobe_project/auxi
yarn add @d11/react-native-fast-image
```

- [ ] **Step 2: Install pods (iOS)**

```bash
cd /Users/nguyenminhduc/dev/wardrobe_project/auxi
yarn pods
```
Expected: pod install completes and links `DreamFastImage`/`SDWebImage` (or the fork's pod name) without error.

- [ ] **Step 3: Coordinated native rebuild + boot check**

First confirm with the user that no other CC session is mid-build (shared Metro/Simulator). Then:
```bash
cd /Users/nguyenminhduc/dev/wardrobe_project/auxi
yarn ios:sim
```
Expected: app builds and boots on the simulator. **If the build fails on the native module, STOP — this is the spec's primary risk; escalate before writing any more code.**

- [ ] **Step 4: Create the jest stub**

Create `__mocks__/fastImageMock.tsx`:
```tsx
import React from 'react';
import { Image, ImageProps } from 'react-native';

// Jest stub for @d11/react-native-fast-image (a native module Jest can't load).
// Renders a plain RN Image so `testID` and `source.uri` assertions still work,
// and exposes the static enums the CachedImage wrapper reads.
type MockSource = { uri?: string } | number | undefined;

const FastImage = ({
  source,
  style,
  testID,
  resizeMode,
  accessibilityLabel,
}: {
  source?: MockSource;
  style?: ImageProps['style'];
  testID?: string;
  resizeMode?: string;
  accessibilityLabel?: string;
}) => {
  const uri =
    source && typeof source === 'object' && 'uri' in source
      ? source.uri
      : undefined;
  return (
    <Image
      source={uri ? { uri } : (source as ImageProps['source'])}
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

FastImage.resizeMode = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'stretch',
  center: 'center',
} as const;
FastImage.priority = { low: 'low', normal: 'normal', high: 'high' } as const;
FastImage.cacheControl = {
  immutable: 'immutable',
  web: 'web',
  cacheOnly: 'cacheOnly',
} as const;
FastImage.preload = () => undefined;

export default FastImage;
```

- [ ] **Step 5: Map the module to the stub in jest**

Edit `jest.config.js` `moduleNameMapper` (currently only the `.svg` entry):
```js
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
    '@d11/react-native-fast-image': '<rootDir>/__mocks__/fastImageMock.tsx',
  },
```

- [ ] **Step 6: Verify the existing suite still runs**

```bash
cd /Users/nguyenminhduc/dev/wardrobe_project/auxi
yarn jest __tests__/App.test.tsx
```
Expected: PASS (App tree renders with the FastImage stub resolved).

- [ ] **Step 7: Commit**

```bash
git add package.json yarn.lock jest.config.js __mocks__/fastImageMock.tsx
git commit -m "chore: add @d11/react-native-fast-image + jest stub"
```

---

## Task 2: `CachedImage` primitive

A one-file wrapper isolating FastImage, so the rest of the app never imports the library directly (design-system-primitives rule) and a future swap is a one-file change.

**Files:**
- Create: `src/components/atoms/CachedImage.tsx`
- Test: `src/components/atoms/__tests__/CachedImage.test.tsx`

**Interfaces:**
- Consumes: `@d11/react-native-fast-image` (Task 1).
- Produces: `CachedImage` component — props `{ uri: string; style?; resizeMode?: 'contain'|'cover'|'stretch'|'center'; priority?: 'low'|'normal'|'high'; testID?: string; accessibilityLabel?: string }`. Default `resizeMode='contain'`, `priority='normal'`, `cache=immutable`.

- [ ] **Step 1: Write the failing test**

Create `src/components/atoms/__tests__/CachedImage.test.tsx`:
```tsx
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { CachedImage } from '../CachedImage';

const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id);

it('renders the resolved uri and forwards testID', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <CachedImage uri="https://cdn.example/x.png" testID="cached-x" />,
    );
  });
  const nodes = byTestID(r.root, 'cached-x');
  expect(nodes.length).toBe(1);
  expect(nodes[0].props.source.uri).toBe('https://cdn.example/x.png');
  act(() => r.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/components/atoms/__tests__/CachedImage.test.tsx`
Expected: FAIL — "Cannot find module '../CachedImage'".

- [ ] **Step 3: Write the implementation**

Create `src/components/atoms/CachedImage.tsx`:
```tsx
import React from 'react';
import FastImage, { FastImageProps } from '@d11/react-native-fast-image';

type CachedImageResizeMode = 'contain' | 'cover' | 'stretch' | 'center';
type CachedImagePriority = 'low' | 'normal' | 'high';

interface CachedImageProps {
  /** Fully-resolved absolute image URL (already run through resolveItemImage). */
  uri: string;
  style?: FastImageProps['style'];
  resizeMode?: CachedImageResizeMode;
  priority?: CachedImagePriority;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * App-standard cached image. Wraps @d11/react-native-fast-image so thumbnails
 * persist on disk (SDWebImage/Glide) across navigations and app restarts — no
 * re-download. Isolating the library here keeps a future swap to a one-file
 * change (.claude/rules/design-system-primitives-required.md).
 *
 * cache = immutable: item image URLs are stable per item (the S3 URL changes
 * only when the file itself changes), so the URL is a safe cache key and no
 * revalidation round-trip is needed.
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  style,
  resizeMode = 'contain',
  priority = 'normal',
  testID,
  accessibilityLabel,
}) => (
  <FastImage
    source={{
      uri,
      cache: FastImage.cacheControl.immutable,
      priority: FastImage.priority[priority],
    }}
    resizeMode={FastImage.resizeMode[resizeMode]}
    style={style}
    testID={testID}
    accessibilityLabel={accessibilityLabel}
  />
);
```
> If `@d11/react-native-fast-image` does not export a `FastImageProps` type (fork API drift), replace the import with `import FastImage from '@d11/react-native-fast-image';` and type `style` as `React.ComponentProps<typeof FastImage>['style']`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest src/components/atoms/__tests__/CachedImage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (legacy `_HomeScreen.tsx` errors only).

- [ ] **Step 6: Commit**

```bash
git add src/components/atoms/CachedImage.tsx src/components/atoms/__tests__/CachedImage.test.tsx
git commit -m "feat: add CachedImage primitive over FastImage"
```

---

## Task 3: Swap `WardrobeGridTile` image to `CachedImage`

**Files:**
- Modify: `src/screens/wardrobe/WardrobeGridTile.tsx:2` (import) and `:58-63` (render)

**Interfaces:**
- Consumes: `CachedImage` (Task 2).

- [ ] **Step 1: Replace the `react-native` `Image` import**

In `src/screens/wardrobe/WardrobeGridTile.tsx` line 2, drop `Image` from the `react-native` import and add the `CachedImage` import after the PressableScale import:
```tsx
import { StyleSheet, Text, View } from 'react-native';
```
```tsx
import { CachedImage } from '../../components/atoms/CachedImage';
```

- [ ] **Step 2: Replace the `<Image>` block**

Replace lines ~58-63:
```tsx
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl, cache: 'force-cache' }}
          style={styles.tileImage}
          resizeMode="contain"
        />
      ) : (
```
with:
```tsx
      {imageUrl ? (
        <CachedImage
          uri={imageUrl}
          style={styles.tileImage}
          resizeMode="contain"
          testID={`wardrobe-item-image-${item.id}`}
          accessibilityLabel={
            item.name || t('wardrobe.list.a11y_item_fallback')
          }
        />
      ) : (
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Run the existing tile-status test (still green under the FastImage stub)**

Run: `yarn jest src/screens/__tests__/WardrobeScreen.test.tsx`
Expected: PASS (the tile now renders `CachedImage` → stub → RN Image; status-badge assertions are unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/screens/wardrobe/WardrobeGridTile.tsx
git commit -m "feat: render wardrobe tiles via CachedImage (persistent disk cache)"
```

---

## Task 4: `wardrobeKeys` factory + `anyPreparing` helper

Pure, unit-testable building blocks the screen migration depends on.

**Files:**
- Modify: `src/services/wardrobeService.ts` (add `wardrobeKeys` export)
- Modify: `src/screens/wardrobe/wardrobe-grid.ts` (add `anyPreparing` export)
- Test: `src/services/__tests__/wardrobeKeys.test.ts`
- Test: `src/screens/wardrobe/__tests__/wardrobe-grid.test.ts`

**Interfaces:**
- Produces:
  - `wardrobeKeys.all` → `['wardrobe-items']`; `wardrobeKeys.list(filter?: string)` → `['wardrobe-items', filter]`, default `filter='All'`.
  - `anyPreparing(items?: WardrobeItem[] | null): boolean`.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/wardrobeKeys.test.ts`:
```ts
import { wardrobeKeys } from '../wardrobeService';

describe('wardrobeKeys', () => {
  it('exposes a stable base key', () => {
    expect(wardrobeKeys.all).toEqual(['wardrobe-items']);
  });

  it('builds a per-filter list key', () => {
    expect(wardrobeKeys.list('Top')).toEqual(['wardrobe-items', 'Top']);
  });

  it("defaults to the 'All' filter so Home and Wardrobe share one cache entry", () => {
    expect(wardrobeKeys.list()).toEqual(['wardrobe-items', 'All']);
    expect(wardrobeKeys.list()).toEqual(wardrobeKeys.list('All'));
  });
});
```

Create `src/screens/wardrobe/__tests__/wardrobe-grid.test.ts`:
```ts
import { anyPreparing } from '../wardrobe-grid';
import { WardrobeItem } from '../../../services/wardrobeService';

const item = (over: Partial<WardrobeItem>): WardrobeItem =>
  ({ id: 'x', category: 'top', ...over } as WardrobeItem);

describe('anyPreparing', () => {
  it('is false for undefined / null / empty', () => {
    expect(anyPreparing(undefined)).toBe(false);
    expect(anyPreparing(null)).toBe(false);
    expect(anyPreparing([])).toBe(false);
  });

  it('is false when no item is preparing', () => {
    expect(anyPreparing([item({ is_preparing: false }), item({})])).toBe(false);
  });

  it('is true when at least one item is preparing', () => {
    expect(
      anyPreparing([item({ is_preparing: false }), item({ is_preparing: true })]),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn jest src/services/__tests__/wardrobeKeys.test.ts src/screens/wardrobe/__tests__/wardrobe-grid.test.ts`
Expected: FAIL — `wardrobeKeys` / `anyPreparing` are not exported.

- [ ] **Step 3a: Add `wardrobeKeys` to `wardrobeService.ts`**

Add near the top of `src/services/wardrobeService.ts` (after the `WardrobeItem` interface, before the axios instance):
```ts
/**
 * React Query keys for wardrobe item lists. `list()` defaults to the 'All'
 * filter so HomeScreen and the Wardrobe screen's "All" tab share ONE cache
 * entry — opening Wardrobe right after Home is instant.
 */
export const wardrobeKeys = {
  all: ['wardrobe-items'] as const,
  list: (filter: string = 'All') => ['wardrobe-items', filter] as const,
};
```

- [ ] **Step 3b: Add `anyPreparing` to `wardrobe-grid.ts`**

In `src/screens/wardrobe/wardrobe-grid.ts`, add right after `isPreparing` (line ~58):
```ts
// True if the list contains any item still being processed. Drives the query's
// conditional refetch poll (replaces the old focus-time setInterval).
export const anyPreparing = (items?: WardrobeItem[] | null): boolean =>
  Array.isArray(items) && items.some(isPreparing);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn jest src/services/__tests__/wardrobeKeys.test.ts src/screens/wardrobe/__tests__/wardrobe-grid.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check + commit**

```bash
npx tsc --noEmit
git add src/services/wardrobeService.ts src/screens/wardrobe/wardrobe-grid.ts src/services/__tests__/wardrobeKeys.test.ts src/screens/wardrobe/__tests__/wardrobe-grid.test.ts
git commit -m "feat: add wardrobeKeys factory + anyPreparing helper"
```

---

## Task 5: Global `QueryClient` defaults

Fix the bare `new QueryClient()` so the whole app stops treating data as instantly stale. Conservative; per-query overrides still win.

**Files:**
- Modify: `App.tsx:29`

**Interfaces:**
- Consumes: nothing new. Produces: app-wide `staleTime: 60_000`, `retry: 1`.

- [ ] **Step 1: Set default options**

In `App.tsx`, replace line 29:
```tsx
const queryClient = new QueryClient();
```
with:
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays "fresh" for 60s so revisiting a screen serves cache instead
      // of refetching on every mount/focus. Per-query staleTime still overrides.
      staleTime: 60_000,
      retry: 1,
    },
  },
});
```

- [ ] **Step 2: Type-check + verify the app test still renders**

```bash
npx tsc --noEmit
yarn jest __tests__/App.test.tsx
```
Expected: tsc clean (legacy errors only); App.test PASS.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: set conservative QueryClient default staleTime/retry"
```

---

## Task 6: Migrate `WardrobeScreen` to `useQuery`

The core fix. Replace local-state + `useIsFocused` fetching with a single query (stale-while-revalidate + conditional preparing-poll), preserving the error state, reconcile, add-item refresh, and `wardrobe_viewed` analytics.

**Files:**
- Modify: `src/screens/WardrobeScreen.tsx` (imports, data layer, effects, retry, add-item wiring)
- Modify: `src/screens/__tests__/WardrobeScreen.test.tsx` (wrap in `QueryClientProvider`, add `wardrobeKeys` to the service mock)

**Interfaces:**
- Consumes: `useQuery`/`useQueryClient` (react-query), `wardrobeKeys` (Task 4), `anyPreparing` (Task 4), `CachedImage` (via tile, Task 3).
- Preserves: `items: WardrobeItem[]`, `loading: boolean`, `loadError: boolean` locals (now derived from the query) so the existing JSX (lines 254-467) is untouched below the data layer.

- [ ] **Step 1: Update imports**

In `src/screens/WardrobeScreen.tsx`:

Line 1 — add `useRef`:
```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
```
After the react-i18next import (line 14), add:
```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
```
Line 26 — add `wardrobeKeys` to the service import:
```tsx
import { wardrobeService, WardrobeItem, wardrobeKeys } from '../services/wardrobeService';
```
In the `./wardrobe/wardrobe-grid` import block (lines 38-49) — add `anyPreparing`:
```tsx
  anyPreparing,
```
> `WardrobeItem` may become unused as a direct type annotation after this task; if `tsc`/lint flags it, keep it only if still referenced (it is, via `items.find`/`chosen` typing through inference — verify and drop the explicit import only if truly unused).

- [ ] **Step 2: Replace the data layer (lines ~75-166)**

Delete these blocks:
- `const [items, setItems] = useState<WardrobeItem[]>([]);` (75)
- `const [loading, setLoading] = useState(true);` (76)
- `const [loadError, setLoadError] = useState(false);` (80)
- the entire `fetchItems` `useCallback` (103-139)
- the focus-refetch `useEffect` (146-152)
- the `hasPreparingItems` + poll `useEffect` (154-166)

Keep `handleRetryLoad` but rewrite it (below). Insert this in their place (right after the `useItemReadySnackbar()` destructure at line ~99):
```tsx
  const queryClient = useQueryClient();

  const wardrobeQuery = useQuery({
    queryKey: wardrobeKeys.list(selectedTab),
    queryFn: () => {
      const category = resolveFilterQuery(selectedTab);
      return category
        ? wardrobeService.filterWardrobeItems({ category })
        : wardrobeService.getWardrobeItems();
    },
    staleTime: 60_000,
    // AU-361: while focused AND something is preparing, poll so the
    // preparing→ready transition is observed. Stops otherwise.
    refetchInterval: query =>
      isFocused && anyPreparing(query.state.data) ? PREPARING_POLL_MS : false,
    refetchIntervalInBackground: false,
  });

  const { refetch } = wardrobeQuery;
  const items = wardrobeQuery.data ?? [];
  // Skeleton only on the first load (no cached data yet) — never on a
  // background revalidate, so revisiting the screen doesn't flash.
  const loading = wardrobeQuery.isLoading;
  // F7: only show the dedicated error state when we have nothing to display;
  // a failed background refetch over cached data stays silent.
  const loadError = wardrobeQuery.isError && items.length === 0;

  // Invalidate ALL wardrobe list caches after an upload — a new item may land
  // in any category, so refresh every filter variant.
  const refetchWardrobe = useCallback(
    () => queryClient.invalidateQueries({ queryKey: wardrobeKeys.all }),
    [queryClient],
  );

  // Detect preparing→ready transitions whenever the list changes (fetch/poll).
  useEffect(() => {
    if (wardrobeQuery.data) {
      reconcileReadyItems(wardrobeQuery.data);
    }
  }, [wardrobeQuery.data, reconcileReadyItems]);

  // Analytics: screen viewed — decoupled from data fetching, fires on focus and
  // on filter change (preserves the prior wardrobe_viewed cadence).
  useEffect(() => {
    if (isFocused) {
      track('wardrobe_viewed', { category: selectedTab });
    }
  }, [isFocused, selectedTab]);

  // F7: surface the load-failed toast + analytics once per error episode.
  const loadFailedRef = useRef(false);
  useEffect(() => {
    if (loadError && !loadFailedRef.current) {
      loadFailedRef.current = true;
      track('wardrobe_load_failed', { category: selectedTab });
      toast.show({
        type: 'error',
        text1: t('common.load_wardrobe_failed_title'),
        text2: t('common.try_again_moment'),
        position: 'bottom',
      });
    } else if (!loadError) {
      loadFailedRef.current = false;
    }
  }, [loadError, selectedTab, t]);
```

- [ ] **Step 3: Rewrite `handleRetryLoad` (was lines 141-144)**

```tsx
  const handleRetryLoad = useCallback(() => {
    track('wardrobe_load_retry_tapped', { category: selectedTab });
    refetch();
  }, [refetch, selectedTab]);
```

- [ ] **Step 4: Point the add-item flow at the invalidator (line ~249)**

In the `useAddWardrobeItem({ ... })` call, change:
```tsx
    refetch: fetchItems,
```
to:
```tsx
    refetch: refetchWardrobe,
```

> Everything below (render, `displayItems`, handlers, styles) is unchanged — it already reads `items`, `loading`, `loadError`.

- [ ] **Step 5: Update the screen test — provider wrapper + service mock**

In `src/screens/__tests__/WardrobeScreen.test.tsx`:

(a) Add the react-query import after the `react-test-renderer` import (line ~17):
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
```

(b) Extend the `wardrobeService` mock factory (lines 68-85) to export `wardrobeKeys` — WardrobeScreen now imports it, so the mock must provide it:
```tsx
jest.mock('../../services/wardrobeService', () => ({
  wardrobeService: {
    getWardrobeItems: (...args: unknown[]) => mockGetWardrobeItems(...args),
    filterWardrobeItems: (...args: unknown[]) =>
      mockFilterWardrobeItems(...args),
    uploadWardrobeItem: jest.fn(),
  },
  getItemUsageFrequency: (item: {
    usage_frequency?: string;
    style_tags?: string[];
  }) =>
    item?.usage_frequency === 'LESS_USED' ||
    (item?.style_tags ?? []).includes('less-used')
      ? 'LESS_USED'
      : 'NORMAL',
  wardrobeKeys: {
    all: ['wardrobe-items'],
    list: (filter: string = 'All') => ['wardrobe-items', filter],
  },
}));
```

(c) Replace the `renderScreen` helper (lines 180-188) to wrap in a fresh test QueryClient:
```tsx
const makeTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });

const renderScreen = async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={makeTestClient()}>
        <WardrobeScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  await flushPromises(); // settle the wardrobe useQuery
  return renderer;
};
```

- [ ] **Step 6: Run the screen test**

Run: `yarn jest src/screens/__tests__/WardrobeScreen.test.tsx`
Expected: PASS — all four tile-status cases (New / viewed / common / less-use) still resolve. If a case flakes on timing, add one more `await Promise.resolve();` inside `flushPromises`.

- [ ] **Step 7: Type-check + lint**

```bash
npx tsc --noEmit
yarn lint
```
Expected: tsc clean (legacy `_HomeScreen.tsx` only); lint no new errors/warnings beyond baseline.

- [ ] **Step 8: Commit**

```bash
git add src/screens/WardrobeScreen.tsx src/screens/__tests__/WardrobeScreen.test.tsx
git commit -m "feat: migrate WardrobeScreen to TanStack Query (cache + no refetch-on-focus)"
```

---

## Task 7: Share the cache with Home

Repoint HomeScreen's wardrobe query to the shared key so opening Wardrobe right after Home is instant.

**Files:**
- Modify: `src/screens/HomeScreen/index.tsx` (import + query key at lines 806-810)

**Interfaces:**
- Consumes: `wardrobeKeys` (Task 4).

- [ ] **Step 1: Add `wardrobeKeys` to the HomeScreen `wardrobeService` import**

Find the existing `import { wardrobeService } from '../../services/wardrobeService';` (or grouped) in `src/screens/HomeScreen/index.tsx` and add `wardrobeKeys`:
```tsx
import { wardrobeService, wardrobeKeys } from '../../services/wardrobeService';
```
> If the import already pulls other names (e.g. `WardrobeItem`), just add `wardrobeKeys` to the braces.

- [ ] **Step 2: Repoint the query key (line 807)**

Change:
```tsx
  const { data: wardrobeItemsData } = useQuery({
    queryKey: ['home-wardrobe-items'],
    queryFn: () => wardrobeService.getWardrobeItems(),
    staleTime: 30_000,
  });
```
to:
```tsx
  const { data: wardrobeItemsData } = useQuery({
    // Shared with the Wardrobe screen's "All" tab (wardrobeKeys.list('All')) so
    // the two screens reuse one cache entry. Home keeps its tighter 30s stale.
    queryKey: wardrobeKeys.list(),
    queryFn: () => wardrobeService.getWardrobeItems(),
    staleTime: 30_000,
  });
```

- [ ] **Step 3: Type-check + run the Home test**

```bash
npx tsc --noEmit
yarn jest src/screens/__tests__/HomeScreen.test.tsx
```
Expected: tsc clean; HomeScreen test PASS. If the test asserted the literal `['home-wardrobe-items']` key, update that assertion to `wardrobeKeys.list()`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen/index.tsx
git commit -m "refactor: share wardrobe cache key between Home and Wardrobe"
```

---

## Final verification

- [ ] **Full type-check:** `npx tsc --noEmit` — clean except legacy `_HomeScreen.tsx`.
- [ ] **Lint:** `yarn lint` — no new errors/warnings beyond baseline.
- [ ] **Full test suite:** `yarn jest` — green (or only pre-existing known failures).
- [ ] **Coordinated sim smoke** (confirm no other CC session mid-build first):
  - Home → Wardrobe → back → Wardrobe: **no skeleton flash, no image flicker** on the 2nd visit.
  - Switch a category tab, switch back: cached tab is instant.
  - Cold-start the app, open Wardrobe: images load from disk cache (no visible re-download on a warm cache).
  - Add an item: the "item added" snackbar shows and the grid refreshes (invalidate works).
  - With a preparing item, confirm the preparing overlay clears and the "item ready" snackbar fires (reconcile + poll intact).
  - Kill the network, open a fresh tab with no cache: the error state + Retry appears; Retry re-queries.
- [ ] **Analytics doc:** No change needed to `auxi/docs/analytics/mixpanel-tracking-plan.md` — event names/semantics (`wardrobe_viewed`, `wardrobe_load_failed`, `wardrobe_load_retry_tapped`) are preserved. Confirm and note it in the PR.
- [ ] **PR** on `feat/wardrobe-loading-caching` with the checklist; call out the native dependency add (reviewers should pull + `yarn pods`).

---

## Self-review notes (author)

- **Spec coverage:** data-layer migration → Tasks 4/6; shared key → Tasks 4/7; global defaults → Task 5; image lib + primitive → Tasks 1/2/3; verification/risks → Final + Task 1 gate. All spec sections mapped.
- **Type consistency:** `wardrobeKeys.list(filter?='All')` and `anyPreparing(items?)` signatures match between definition (Task 4), screen usage (Task 6), Home usage (Task 7), and the test mock (Task 6 step 5). `refetchWardrobe: () => Promise<void>` matches `useAddWardrobeItem`'s `refetch: () => Promise<void>`.
- **Risk gate:** Task 1 is explicitly stop-on-fail for the RN 0.83 native-build risk; fallback (data-layer-only) is Tasks 4-7 which have no native dependency.
