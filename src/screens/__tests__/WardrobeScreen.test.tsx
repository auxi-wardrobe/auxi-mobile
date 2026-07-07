/**
 * Wardrobe grid tile status tags.
 *
 * A tile shows at most one status pill, with precedence new > less use >
 * common:
 *  1. "new"      — a user-owned item not yet opened (detail unviewed)
 *  2. "less use" — an item the user demoted (usage_frequency LESS_USED)
 *  3. "common"   — a catalog/database item
 *  4. (none)     — a user-owned item that has been viewed
 *
 * Patterns follow ItemDetailScreen.test.tsx / SettingsScreen.test.tsx
 * (react-test-renderer, query by testID, flush microtasks inside act).
 * Heavy children + native import chains (Sidebar/Header/analytics/keychain)
 * are stubbed so this test exercises WardrobeScreen's own tile wiring.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardrobeScreen } from '../WardrobeScreen';

// ---- mocks ------------------------------------------------------------------

const mockNavigate = jest.fn();

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

// Resolve t() against the real en-EN resources so the badge labels
// ("New" / "less use" / "common") catch translation regressions. Keys live
// under the single top-level "boilerplate" namespace (see translations/index.ts).
jest.mock('react-i18next', () => {
  const en = require('../../translations/en-EN.json').boilerplate;
  const t = (key: string, opts?: Record<string, unknown>) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        en,
      );
    if (typeof value !== 'string') {
      return key;
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
      String(opts?.[name] ?? ''),
    );
  };
  const translation = { t };
  return {
    useTranslation: () => translation,
  };
});

const mockGetWardrobeItems = jest.fn();
const mockFilterWardrobeItems = jest.fn();

jest.mock('../../services/wardrobeService', () => ({
  wardrobeService: {
    getWardrobeItems: (...args: unknown[]) => mockGetWardrobeItems(...args),
    filterWardrobeItems: (...args: unknown[]) =>
      mockFilterWardrobeItems(...args),
    uploadWardrobeItem: jest.fn(),
  },
  // WardrobeScreen reads usage frequency through this helper; mirror the real
  // implementation closely enough for the "less use" tag.
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

// Local "viewed" tracking — back the hook with a mutable set the tests control.
const mockViewedSet = new Set<string>();
jest.mock('../../context/WardrobeViewedContext', () => ({
  useWardrobeViewed: () => ({
    isViewed: (id: string) => mockViewedSet.has(id),
    markViewed: (id: string) => {
      mockViewedSet.add(id);
    },
  }),
}));

// Cuts the utils/url → apiClient → react-native-keychain import chain.
jest.mock('../../utils/url', () => ({
  resolveItemImage: (item?: {
    image_png?: string | null;
    image_url?: string;
  }) => item?.image_png || item?.image_url || null,
}));

jest.mock('../../services/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('../../context/SidebarContext', () => ({
  useSidebar: () => ({ open: jest.fn() }),
}));

// Feature children out of scope for this test — render nothing / passthrough.
jest.mock('../../components/layout/Header', () => ({
  Header: { MenuTitleAction: () => null, BackTitle: () => null },
}));
jest.mock('../../components/features/HomeWardrobeNavFooter', () => ({
  HomeWardrobeNavFooter: () => null,
}));
jest.mock('../../components/features/WardrobeWelcomeDialog', () => ({
  WardrobeWelcomeDialog: () => null,
}));
jest.mock('../wardrobe/AddItemSheet', () => ({
  AddItemSheet: () => null,
}));
jest.mock('../wardrobe/PreparingOverlay', () => ({
  PreparingOverlay: () => null,
}));
jest.mock('../../components/feedback/ItemReadySnackbar', () => ({
  ItemReadySnackbar: () => null,
}));
jest.mock('../../components/features/CategoryTabs', () => ({
  CategoryTabs: () => null,
}));
jest.mock('../../components/macgie', () => ({
  MacgieLoader: () => null,
}));

// ---- fixtures / helpers -----------------------------------------------------

// User-owned items (user_id set, not common). Unviewed → "new"; viewed → no tag.
const USER_ITEM = {
  id: 'mine-1',
  name: 'New tee',
  category: 'top',
  user_id: 'u1',
  image_url: 'https://cdn.example/tee.jpg',
};

const USER_ITEM_2 = {
  id: 'mine-2',
  name: 'Old jeans',
  category: 'bottom',
  user_id: 'u1',
  image_url: 'https://cdn.example/jeans.jpg',
};

// Catalog/common item — carries the "common" tag, never "new".
const COMMON_ITEM = {
  id: 'cat-1',
  name: 'Catalog jacket',
  category: 'top',
  user_id: null,
  is_common_item: true,
  image_url: 'https://cdn.example/jacket.jpg',
};

// A user item the user demoted to "less use".
const LESS_USED_ITEM = {
  id: 'less-1',
  name: 'Rarely worn',
  category: 'top',
  user_id: 'u1',
  usage_frequency: 'LESS_USED',
  image_url: 'https://cdn.example/rare.jpg',
};

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

// gcTime: 0 — prevents Jest's event loop from being kept alive by the default
// 5-minute garbage-collection timer on unmounted queries.
const makeTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

// Drain any queued setTimeout(0) callbacks (e.g. TanStack Query internal
// scheduler) plus pending microtasks.
const flushTimersAndPromises = async () => {
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 0));
    await Promise.resolve();
  });
};

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
  await flushPromises(); // settle the wardrobe useQuery initial fetch
  await flushTimersAndPromises(); // drain any chained scheduler callbacks
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockViewedSet.clear();
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
// Tile status tags
// =============================================================================
describe('WardrobeScreen tile status tags', () => {
  it('renders the New tag for an unviewed, user-owned item', async () => {
    // index 1 keeps the tile on its dynamic `wardrobe-item-<id>` testID
    // (index 0 would override with `wardrobe-item-first`); the New badge
    // testID is always `wardrobe-item-new-<id>` regardless.
    mockGetWardrobeItems.mockResolvedValue([USER_ITEM_2, USER_ITEM]);

    const r = await renderScreen();
    const root = r.root;

    expect(byTestID(root, 'wardrobe-item-new-mine-1').length).toBeGreaterThan(
      0,
    );
    const badge = byTestID(root, 'wardrobe-item-new-mine-1')[0];
    const label = badge.findAll(n => n.props?.children === 'New');
    expect(label.length).toBeGreaterThan(0);
  });

  it('does NOT render the New tag once the item has been viewed', async () => {
    mockViewedSet.add('mine-1');
    mockGetWardrobeItems.mockResolvedValue([USER_ITEM_2, USER_ITEM]);

    const r = await renderScreen();
    const root = r.root;

    // mine-1 is viewed → no tag at all; mine-2 is unviewed → still "new".
    expect(byTestID(root, 'wardrobe-item-new-mine-1').length).toBe(0);
    expect(byTestID(root, 'wardrobe-item-less-used-mine-1').length).toBe(0);
    expect(byTestID(root, 'wardrobe-item-common-mine-1').length).toBe(0);
    expect(byTestID(root, 'wardrobe-item-new-mine-2').length).toBeGreaterThan(
      0,
    );
  });

  it('renders the common tag (not New) for a catalog item', async () => {
    mockGetWardrobeItems.mockResolvedValue([USER_ITEM_2, COMMON_ITEM]);

    const r = await renderScreen();
    const root = r.root;

    expect(byTestID(root, 'wardrobe-item-common-cat-1').length).toBeGreaterThan(
      0,
    );
    expect(byTestID(root, 'wardrobe-item-new-cat-1').length).toBe(0);
  });

  it('renders the less use tag for a viewed, demoted item', async () => {
    mockViewedSet.add('less-1');
    mockGetWardrobeItems.mockResolvedValue([USER_ITEM_2, LESS_USED_ITEM]);

    const r = await renderScreen();
    const root = r.root;

    expect(
      byTestID(root, 'wardrobe-item-less-used-less-1').length,
    ).toBeGreaterThan(0);
    const badge = byTestID(root, 'wardrobe-item-less-used-less-1')[0];
    const label = badge.findAll(n => n.props?.children === 'less use');
    expect(label.length).toBeGreaterThan(0);
    // "less use" wins over "new" only because the item is viewed; not common.
    expect(byTestID(root, 'wardrobe-item-new-less-1').length).toBe(0);
  });
});
