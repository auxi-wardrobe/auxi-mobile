/**
 * AU-312 — Home item tap PUSHES ItemDetail (no bottom-sheet popup).
 *
 * Coverage:
 *  1. tapping an outfit tile calls navigation.navigate('ItemDetail', …)
 *     with the item id + the Q7 fallback payload (common_essential guard)
 *  2. the tap opens NO modal — the old ItemDetailBottomSheet presentation
 *     is gone from HomeScreen
 *
 * Heavy children (Sidebar/ContextChipsModal/CollageSheetCanvas/…) are
 * stubbed: this test exercises HomeScreen's own tile wiring, not theirs.
 * Patterns follow SettingsScreen.test.tsx (react-test-renderer, testID
 * queries, flush inside act).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeScreen } from '../HomeScreen';
import { recommendV05 } from '../../services/v05Api';

// ---- mocks ------------------------------------------------------------------

const mockNavigate = jest.fn();

// Stable navigation instance — HomeScreen memoizes handlers on `navigation`.
jest.mock('@react-navigation/native', () => {
  const navigation = {
    navigate: (...args: unknown[]) => mockNavigate(...args),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({ params: {} }),
    useIsFocused: () => true,
  };
});

jest.mock('../../services/v05Api', () => ({
  recommendV05: jest.fn(),
  resetV05Session: jest.fn(),
}));

jest.mock('../../services/weatherService', () => ({
  weatherService: {
    getWeather: jest.fn().mockResolvedValue({ temp_c: 22, icon_code: '01d' }),
  },
}));

jest.mock('../../services/favouriteService', () => ({
  favouriteService: { saveFavourite: jest.fn() },
}));

jest.mock('../../services/analytics', () => ({
  track: jest.fn(),
}));

// Cuts the utils/url → apiClient → react-native-keychain import chain.
jest.mock('../../utils/url', () => ({
  resolveItemImage: (item?: {
    image_png?: string | null;
    image_url?: string;
  }) => item?.image_png || item?.image_url || null,
  getImageUrl: (url?: string | null) => url ?? undefined,
}));

// Feature children out of scope for this test — render nothing.
jest.mock('../../components/layout/Sidebar', () => ({
  Sidebar: () => null,
}));
jest.mock('../../components/features/ContextChipsModal', () => ({
  ContextChipsModal: () => null,
}));
jest.mock('../../components/features/SwipeCoachMark', () => ({
  SwipeCoachMark: () => null,
  LEGACY_COACHMARK_STORAGE_KEY: 'coachmark-swipe-home',
}));
jest.mock('../../components/features/CollageSheetCanvas', () => ({
  CollageSheetCanvas: () => null,
}));
jest.mock('../../components/features/WeatherWidget', () => ({
  WeatherWidget: () => null,
}));

const mockedRecommendV05 = recommendV05 as jest.Mock;

// ---- fixtures / helpers -----------------------------------------------------

// V05 build response with one outfit. `source: 'common_essential'` maps to
// Item.isSystem=true — exactly the id-space that misses the wardrobe lookup
// and needs the fallback payload (extraction note Q7).
const V05_RESPONSE = {
  outfits: [
    {
      items: [
        {
          id: 'v05-item-1',
          human_readable_id: 'SYS_TOP_001',
          name: 'Denim jacket',
          image_url: 'https://cdn.example/denim.jpg',
          image_png: null,
          category_family: 'TOP',
          color_code: 'blue',
          style_tags: [],
          source: 'common_essential',
        },
      ],
      vibe_signature: {},
      reasoning_human: 'test caption',
      reasoning_debug: '',
      score: 1,
      outfit_hash: 'hash-0001',
    },
  ],
  cycled: false,
  wardrobeGap: false,
};

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// onSuccess chains a setTimeout(0) prefetch — settle it so assertions and
// unmount happen on a quiet tree.
const flushTimersAndPromises = async () => {
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 0));
    await Promise.resolve();
  });
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const renderHome = async () => {
  // gcTime: 0 — the default 5-minute gc timer keeps the node event loop
  // alive and stalls jest's exit for the full 300s.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  await flushPromises(); // cold-start build resolves → outfits render
  await flushTimersAndPromises(); // chained prefetch resolves (dedup → stop)
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedRecommendV05.mockResolvedValue(V05_RESPONSE);
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

// =============================================================================
// AU-312: tile tap → pushed ItemDetail route (not a modal)
// =============================================================================
describe('HomeScreen item tap (AU-312)', () => {
  it('navigates to ItemDetail with itemId + Q7 fallback payload', async () => {
    const r = await renderHome();
    const root = r.root;

    const tiles = byTestID(root, 'home-tile-hash-0001-0');
    expect(tiles.length).toBeGreaterThan(0);

    act(() => {
      tiles[0].props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'ItemDetail',
      expect.objectContaining({
        itemId: 'v05-item-1',
        fallbackItem: expect.objectContaining({
          id: 'v05-item-1',
          image_url: 'https://cdn.example/denim.jpg',
          // AU-312 review fix: backend `name` (V05OutfitItem.name) is now
          // threaded through mapItem → fallbackItem so the pushed detail
          // screen titles with the real name, not the category label.
          name: 'Denim jacket',
          category: 'Top',
          is_common_item: true,
        }),
      }),
    );
  });

  it('opens no modal on tap — bottom-sheet presentation is gone', async () => {
    const r = await renderHome();
    const root = r.root;

    act(() => {
      byTestID(root, 'home-tile-hash-0001-0')[0].props.onPress();
    });

    // Every RN Modal in the tree (pickers, dialogs) must stay closed; the
    // old ItemDetailBottomSheet (visible-on-tap Modal) no longer exists.
    const openModals = root.findAll(
      n => typeof n.type !== 'string' && n.props?.visible === true,
    );
    expect(openModals.length).toBe(0);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// AU-351: "Your Piece" exploration badge on outfit tiles
// =============================================================================
describe('HomeScreen "Your Piece" badge (AU-351)', () => {
  // Build a one-outfit V05 response whose single item carries the given
  // exploration flag. Mirrors V05_RESPONSE; only `is_exploration_item` varies.
  const responseWithExploration = (isExploration: boolean) => ({
    ...V05_RESPONSE,
    outfits: [
      {
        ...V05_RESPONSE.outfits[0],
        items: [
          {
            ...V05_RESPONSE.outfits[0].items[0],
            is_exploration_item: isExploration,
          },
        ],
      },
    ],
  });

  it('renders the badge when is_exploration_item is true', async () => {
    mockedRecommendV05.mockResolvedValue(responseWithExploration(true));
    const r = await renderHome();

    // AU-307 BUG-3: testID now slot-indexed (outfit 0 = active, slot 0 = first tile).
    const badges = byTestID(r.root, 'home-tile-yourpiece-outfit-0-slot-0');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('omits the badge when is_exploration_item is false', async () => {
    mockedRecommendV05.mockResolvedValue(responseWithExploration(false));
    const r = await renderHome();

    // tile still renders, but no "Your Piece" overlay
    // AU-307 BUG-3: testID now slot-indexed (outfit 0 = active, slot 0 = first tile).
    expect(
      byTestID(r.root, 'home-tile-outfit-0-slot-0').length,
    ).toBeGreaterThan(0);
    expect(byTestID(r.root, 'home-tile-yourpiece-outfit-0-slot-0').length).toBe(
      0,
    );
  });
});
