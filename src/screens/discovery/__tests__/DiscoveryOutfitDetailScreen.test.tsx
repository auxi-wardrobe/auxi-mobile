/**
 * AU-457 retry #4 regression — "Browse Discovery" recovery CTA (deep-link
 * 404/unpublished fallback) must leave via `popTo`, not `navigate`.
 *
 * Root cause: `navigate('Discovery')` only updates JS nav state. When this
 * screen was reached by popping through however many screens the
 * discovery-outfit deep link pushed, a plain `navigate` can pop the JS state
 * back to (or push) `Discovery` while leaving the screen(s) it popped past
 * torn down only at the JS level, not react-native-screens' native layer —
 * the same class of bug already fixed twice in this codebase (see
 * ItemDetailScreen.handleBuildAround and
 * see-this-on-me/try-on-completion-notice.ts, both using `popTo`/
 * `StackActions.popTo` instead of `navigate` for exactly this reason). QA
 * observed the symptom as the Discovery header's hamburger button silently
 * no-op'ing (4/4) only on the screen instance reached this way.
 *
 * This test only asserts the navigation call this screen makes — it can't
 * exercise the native-screens teardown itself (that requires a real
 * simulator; see qa-mobile's live verification).
 */
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscoveryOutfitDetailScreen } from '../DiscoveryOutfitDetailScreen';
import { theme } from '../../../theme/theme';
import { HEADER_ICON_INSET } from '../../../components/layout/Header';
import { COVER_SIDE_GUTTER } from '../discoveryOutfitDetailStyles';
import { toast } from '../../../components/design-system/lib';

// ---- mocks ------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockPopTo = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {
  outfitId: 'bogus-outfit-id',
  source: 'deep_link',
};

// The global jest.setup mock pins insets to 0 — which is exactly why a static
// `top: 12` on the floating chip LOOKED correct while sitting under the Dynamic
// Island on a real device. Override it locally so the offset can be exercised
// with a realistic notch inset.
let mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
jest.mock('react-native-safe-area-context', () => {
  // `require` inside the factory (not the outer `React` import): a jest.mock
  // factory is hoisted above the imports and may not close over them. Aliased
  // to avoid shadowing the outer binding.
  const ReactRuntime = require('react');
  const passthrough = ({ children }: { children: unknown }) =>
    ReactRuntime.createElement(ReactRuntime.Fragment, null, children);
  return {
    SafeAreaProvider: passthrough,
    SafeAreaView: passthrough,
    useSafeAreaInsets: () => mockInsets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('@react-navigation/native', () => {
  const navigation = {
    navigate: (...args: unknown[]) => mockNavigate(...args),
    popTo: (...args: unknown[]) => mockPopTo(...args),
    goBack: (...args: unknown[]) => mockGoBack(...args),
    addListener: jest.fn(() => jest.fn()),
    dispatch: jest.fn(),
  };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({ params: mockRouteParams }),
    useIsFocused: () => true,
  };
});

// Resolve t() against real en-EN copy so testID/label wiring stays honest.
jest.mock('react-i18next', () => {
  const en = require('../../../translations/en-EN.json').boilerplate;
  const t = (key: string) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        en,
      );
    return typeof value === 'string' ? value : key;
  };
  return { useTranslation: () => ({ t }) };
});

const mockGetOutfit = jest.fn();
jest.mock('../../../services/discoveryService', () => ({
  discoveryService: {
    getOutfit: (...args: unknown[]) => mockGetOutfit(...args),
  },
}));

const mockSaveFavourite = jest.fn();
const mockRemoveFavourite = jest.fn();
jest.mock('../../../services/favouriteService', () => ({
  favouriteService: {
    saveFavourite: (...args: unknown[]) => mockSaveFavourite(...args),
    removeFavourite: (...args: unknown[]) => mockRemoveFavourite(...args),
  },
}));

// The real context imports AuthContext → RevenueCat, which Jest can't parse.
const mockMarkSaved = jest.fn();
jest.mock('../../../context/FavouritesSeenContext', () => ({
  useFavouritesSeen: () => ({
    hasUnseen: false,
    markSaved: mockMarkSaved,
    markSeen: jest.fn(),
  }),
}));

jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));

// ---- helpers ----------------------------------------------------------------

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const oneByTestID = (root: ReactTestInstance, id: string): ReactTestInstance => {
  const matches = byTestID(root, id);
  if (matches.length === 0) {
    throw new Error(`no node with testID="${id}"`);
  }
  return matches[0];
};

/** Nearest ancestor host view carrying a `position` in its style. */
const nearestPositionedAncestor = (
  node: ReactTestInstance,
): ReactTestInstance | null => {
  let current = node.parent;
  while (current) {
    if (
      typeof current.type === 'string' &&
      StyleSheet.flatten(current.props?.style)?.position
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
};

const press = (node: ReactTestInstance) => {
  act(() => {
    node.props.onPress();
  });
};

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// react-query's notifyManager batches via a macrotask in some configs —
// a microtask-only flush is occasionally not enough to settle the query
// (flaky on `retry: false` cold resolution). Mirrors HomeScreen.test.tsx's
// `flushTimersAndPromises`.
const flushTimersAndPromises = async () => {
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await Promise.resolve();
  });
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const makeTestClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderScreen = async () => {
  const client = makeTestClient();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <DiscoveryOutfitDetailScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  await flushPromises();
  await flushTimersAndPromises();
  return renderer;
};

const COVER_W = 1200;
const COVER_H = 900;

const outfitFixture = {
  id: 'outfit-1',
  title: 'Soft tailoring',
  composite_image_url: 'https://cdn.example/outfit-1.png',
  season: 'fall',
  gender: 'W',
  trend_tags: ['confident'],
  description: 'A blue peplum top over dark denim.',
  items: [
    {
      id: 'item-1',
      position: 0,
      name: 'Peplum top',
      image_url: 'https://cdn.example/item-1.png',
      image_png: null,
      category: 'Top',
      category_code: 'TOP',
      layer_code: 'L2',
      is_common_item: true,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  mockRouteParams = { outfitId: 'bogus-outfit-id', source: 'deep_link' };
  // Natural size of the uploaded composite — the hero frame must adopt it.
  jest
    .spyOn(Image, 'getSize')
    .mockImplementation((_uri: string, onSuccess: (w: number, h: number) => void) => {
      onSuccess(COVER_W, COVER_H);
    });
});

afterEach(() => {
  liveRenderers.splice(0).forEach(r => {
    try {
      act(() => r.unmount());
    } catch {
      // already unmounted
    }
  });
});

describe('DiscoveryOutfitDetailScreen — "Browse Discovery" recovery CTA', () => {
  it('pops to Discovery (not navigate) when the outfit is missing/unpublished', async () => {
    // discoveryService.getOutfit resolves null on a 404 — see useDiscoveryOutfit.
    mockGetOutfit.mockResolvedValue(null);

    const r = await renderScreen();
    const browseBtn = oneByTestID(r.root, 'discovery-detail-browse-btn');

    press(browseBtn);

    expect(mockPopTo).toHaveBeenCalledWith('Discovery');
    expect(mockNavigate).not.toHaveBeenCalledWith('Discovery');
  });
});

/**
 * Hero-cover layout (design call, 2026-09): the composite image is the top of
 * the screen — full width but for a 1px hairline gutter each side, height free
 * (the uploaded image's own ratio, never a fixed crop box), with the back chip
 * floating ON the image instead of in a header bar above it.
 */
describe('DiscoveryOutfitDetailScreen — hero cover', () => {
  it('renders the cover full-width (1px side gutter) at the image\'s own ratio', async () => {
    mockGetOutfit.mockResolvedValue(outfitFixture);

    const r = await renderScreen();
    const cover = oneByTestID(r.root, 'discovery-detail-cover');
    const style = StyleSheet.flatten(cover.props.style);

    expect(style.marginHorizontal).toBe(COVER_SIDE_GUTTER);
    expect(style.width).toBeUndefined(); // stretches; never a fixed width
    expect(style.aspectRatio).toBeCloseTo(COVER_W / COVER_H, 5);
  });

  it('floats the back control over the image — no header bar above it', async () => {
    mockGetOutfit.mockResolvedValue(outfitFixture);

    const r = await renderScreen();
    // One rendered control, not two — the loaded branch drops the header bar,
    // so `discovery-detail-back` stays a unique Maestro selector.
    const backs = r.root.findAll(
      n => typeof n.type === 'string' && n.props?.testID === 'discovery-detail-back',
    );
    expect(backs).toHaveLength(1);

    // It hangs in an absolutely-positioned wrapper at the sticky tier — i.e.
    // painted ON the cover, not stacked in a bar above it.
    const flat = StyleSheet.flatten(
      nearestPositionedAncestor(backs[0])?.props?.style,
    );
    expect(flat?.position).toBe('absolute');
    expect(flat?.zIndex).toBe(theme.zIndex.sticky);

    // ...at the canonical back-button offset, not an eyeballed one: the chip
    // must sit exactly where `Header`'s left slot sits so it doesn't shift
    // against every other screen's back button — nor against this screen's own
    // empty-state `Header.BackTitle` when the outfit finishes loading.
    expect(flat?.left).toBe(HEADER_ICON_INSET);
    expect(flat?.top).toBe(HEADER_ICON_INSET); // insets.top === 0 here

    press(oneByTestID(r.root, 'discovery-detail-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  // Regression: the chip is `position: absolute`, and an absolute child with an
  // explicit `top` is laid out from its parent's padding-box EDGE — so the
  // `SafeAreaView edges={['top']}` padding that pushes a normal `Header` down
  // does NOT move it. A static `top: 12` therefore sat ~47-59px too high, under
  // the status bar / Dynamic Island, while the empty-state `Header.BackTitle`
  // on this same screen sat correctly at `insets.top + 12`.
  it('adds the top safe-area inset so the chip clears the status bar', async () => {
    mockInsets = { top: 59, right: 0, bottom: 34, left: 0 }; // iPhone 15 portrait
    mockGetOutfit.mockResolvedValue(outfitFixture);

    const r = await renderScreen();
    const back = byTestID(r.root, 'discovery-detail-back')[0];
    const flat = StyleSheet.flatten(
      nearestPositionedAncestor(back)?.props?.style,
    );

    // Same y as a `Header` left slot inside the same SafeAreaView, which is a
    // flow child and so lands at insets.top + its own 12px padding.
    expect(flat?.top).toBe(59 + HEADER_ICON_INSET);
    expect(flat?.top).toBeGreaterThan(HEADER_ICON_INSET);
    // Horizontal has no inset in portrait — it must NOT pick one up.
    expect(flat?.left).toBe(HEADER_ICON_INSET);
  });
});

/**
 * Bottom action bar: [Remix ✂] · ♡ · [See on me].
 */
describe('DiscoveryOutfitDetailScreen — action bar', () => {
  beforeEach(() => {
    mockRouteParams = { outfitId: 'outfit-1', source: 'feed' };
    mockGetOutfit.mockResolvedValue(outfitFixture);
  });

  it('renders all three actions', async () => {
    const r = await renderScreen();
    expect(byTestID(r.root, 'discovery-detail-remix').length).toBeGreaterThan(0);
    expect(byTestID(r.root, 'discovery-detail-favourite').length).toBeGreaterThan(0);
    expect(byTestID(r.root, 'discovery-detail-see-on-me-cta').length).toBeGreaterThan(0);
  });

  it('Remix sends the outfit pieces to the canvas editor', async () => {
    const r = await renderScreen();
    press(oneByTestID(r.root, 'discovery-detail-remix'));

    expect(mockNavigate).toHaveBeenCalledWith('OutfitCanvas', {
      entry: 'remix',
      items: [
        expect.objectContaining({
          id: 'item-1',
          imageUrl: 'https://cdn.example/item-1.png',
          category: 'Top',
          is_common_item: true,
        }),
      ],
    });
  });

  it('heart saves the outfit to favourites, then a second tap removes it', async () => {
    mockSaveFavourite.mockResolvedValue({
      id: 'fav-9',
      outfit_hash: 'discovery_outfit-1',
      created_at: '2026-09-24T00:00:00Z',
      updated: false,
    });
    mockRemoveFavourite.mockResolvedValue({ message: 'ok' });

    const r = await renderScreen();
    press(oneByTestID(r.root, 'discovery-detail-favourite'));
    await flushPromises();

    expect(mockSaveFavourite).toHaveBeenCalledWith({
      outfit_hash: 'discovery_outfit-1',
      item_ids: ['item-1'],
      source: 'discovery',
      title: 'Soft tailoring',
    });
    expect(mockMarkSaved).toHaveBeenCalled();
    // Stateful testID flips instead of going undefined.
    press(oneByTestID(r.root, 'discovery-detail-favourite-saved'));
    await flushPromises();

    expect(mockRemoveFavourite).toHaveBeenCalledWith('fav-9');
    expect(byTestID(r.root, 'discovery-detail-favourite').length).toBeGreaterThan(0);
  });

  it('a successful save shows a 3s "tap to view" toast that opens Favourites', async () => {
    // m-toast-service is a global jest.fn mock (jest.setup.js); give `show` an id.
    const showSpy = jest.mocked(toast.show).mockReturnValue('toast-7');
    const hideSpy = jest.mocked(toast.hide);
    mockSaveFavourite.mockResolvedValue({
      id: 'fav-9',
      outfit_hash: 'discovery_outfit-1',
      created_at: '2026-09-24T00:00:00Z',
      updated: false,
    });
    mockRemoveFavourite.mockResolvedValue({ message: 'ok' });

    const r = await renderScreen();
    press(oneByTestID(r.root, 'discovery-detail-favourite'));
    await flushPromises();

    expect(showSpy).toHaveBeenCalledTimes(1);
    const opts = showSpy.mock.calls[0][0];
    expect(opts).toMatchObject({
      type: 'success',
      text1: "This outfit's items are saved to Favourites",
      text2: 'Tap to see them',
      visibilityTime: 3000,
      testID: 'discovery-detail-favourite-saved-toast',
    });

    act(() => {
      opts.onPress?.();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Favourite', { showBackButton: true });

    // Un-hearting while the toast may still be up retracts it.
    press(oneByTestID(r.root, 'discovery-detail-favourite-saved'));
    await flushPromises();
    expect(hideSpy).toHaveBeenCalledWith('toast-7');
    showSpy.mockReset();
  });

  it('a failed save never shows the saved toast', async () => {
    const showSpy = jest.mocked(toast.show);
    mockSaveFavourite.mockRejectedValue(new Error('boom'));

    const r = await renderScreen();
    press(oneByTestID(r.root, 'discovery-detail-favourite'));
    await flushPromises();

    expect(showSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ testID: 'discovery-detail-favourite-saved-toast' }),
    );
  });

  it('heart falls back to unsaved when the save fails', async () => {
    mockSaveFavourite.mockRejectedValue(new Error('boom'));

    const r = await renderScreen();
    press(oneByTestID(r.root, 'discovery-detail-favourite'));
    await flushPromises();

    expect(byTestID(r.root, 'discovery-detail-favourite').length).toBeGreaterThan(0);
    expect(byTestID(r.root, 'discovery-detail-favourite-saved')).toHaveLength(0);
  });

  it('See on me routes through the reuse-confirm gate', async () => {
    const r = await renderScreen();
    press(oneByTestID(r.root, 'discovery-detail-see-on-me-cta'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'SeeThisOnMeConfirm',
      expect.objectContaining({
        outfit: expect.objectContaining({
          outfitHash: 'discovery_outfit-1',
          itemIds: ['item-1'],
        }),
      }),
    );
  });
});
