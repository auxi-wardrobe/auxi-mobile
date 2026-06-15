/**
 * AU-351 — Wardrobe "New" exploration badge.
 *
 * Coverage:
 *  1. an item with is_exploration_item: true renders the
 *     `wardrobe-item-new-<id>` badge overlay
 *  2. an item with is_exploration_item falsy renders NO such badge
 *
 * Patterns follow ItemDetailScreen.test.tsx / SettingsScreen.test.tsx
 * (react-test-renderer, query by testID, flush microtasks inside act).
 * Heavy children + native import chains (Sidebar/Header/analytics/keychain)
 * are stubbed so this test exercises WardrobeScreen's own tile wiring.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
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

// Resolve t() against the real en-EN resources so the badge label
// ("New") catches translation regressions. Keys live under the single
// top-level "boilerplate" namespace (see translations/index.ts).
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
  Header: () => null,
}));
jest.mock('../../components/features/CategoryTabs', () => ({
  CategoryTabs: () => null,
}));
jest.mock('../../components/macgie', () => ({
  MacgieLoader: () => null,
}));

// ---- fixtures / helpers -----------------------------------------------------

const EXPLORATION_ITEM = {
  id: 'expl-1',
  name: 'New tee',
  category: 'top',
  user_id: 'u1',
  image_url: 'https://cdn.example/tee.jpg',
  is_exploration_item: true,
};

const PLAIN_ITEM = {
  id: 'plain-1',
  name: 'Old jeans',
  category: 'bottom',
  user_id: 'u1',
  image_url: 'https://cdn.example/jeans.jpg',
  is_exploration_item: false,
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

const renderScreen = async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<WardrobeScreen />);
  });
  liveRenderers.push(renderer);
  await flushPromises(); // settle the focus-effect fetchItems()
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
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
// AU-351: "New" exploration badge
// =============================================================================
describe('WardrobeScreen "New" badge (AU-351)', () => {
  it('renders wardrobe-item-new-<id> when is_exploration_item is true', async () => {
    // index 1 keeps the tile on its dynamic `wardrobe-item-<id>` testID
    // (index 0 would override with `wardrobe-item-first`); the New badge
    // testID is always `wardrobe-item-new-<id>` regardless.
    mockGetWardrobeItems.mockResolvedValue([PLAIN_ITEM, EXPLORATION_ITEM]);

    const r = await renderScreen();
    const root = r.root;

    expect(byTestID(root, 'wardrobe-item-new-expl-1').length).toBeGreaterThan(
      0,
    );
    const badge = byTestID(root, 'wardrobe-item-new-expl-1')[0];
    const label = badge.findAll(n => n.props?.children === 'New');
    expect(label.length).toBeGreaterThan(0);
  });

  it('does NOT render the New badge when is_exploration_item is false/absent', async () => {
    mockGetWardrobeItems.mockResolvedValue([
      PLAIN_ITEM,
      { id: 'plain-2', category: 'top', user_id: 'u1' },
    ]);

    const r = await renderScreen();
    const root = r.root;

    expect(byTestID(root, 'wardrobe-item-new-plain-1').length).toBe(0);
    expect(byTestID(root, 'wardrobe-item-new-plain-2').length).toBe(0);
  });
});
