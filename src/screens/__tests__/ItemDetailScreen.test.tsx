/**
 * AU-312 — ItemDetailScreen read-mode redesign (Figma 2852:14557).
 *
 * Coverage:
 *  1. formatItemDate (pure)        — created_at → "dd/mm/yyyy" | null
 *  2. read mode                    — title + "Date: dd/mm/yyyy" + "Build
 *                                    around this" CTA; NO heart, NO
 *                                    attribute rows (moved to Edit flow)
 *  3. fallback route param (Q7)    — getWardrobeItem miss + fallbackItem →
 *                                    renders from payload (category title,
 *                                    no date, catalog rules), no goBack
 *  4. edit-mode entry              — bottom "Edit" button still opens the
 *                                    attribute rows + Cancel/Save bar
 *
 * Patterns follow SettingsScreen.test.tsx: react-test-renderer (no
 * @testing-library), query by testID, flush microtasks inside act().
 * Toast / safe-area / SVGs come from jest.setup.js + moduleNameMapper.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import Toast from 'react-native-toast-message';
import { formatItemDate, ItemDetailScreen } from '../ItemDetailScreen';

// ---- mocks ------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: Record<string, unknown> = { itemId: 'item-1' };

// The screen's load effect depends on `navigation` and `t` — both MUST be
// referentially stable across renders or the effect re-runs forever
// (setLoading → render → new dep → effect …). Hoist single instances.
jest.mock('@react-navigation/native', () => {
  const navigation = {
    navigate: (...args: unknown[]) => mockNavigate(...args),
    goBack: (...args: unknown[]) => mockGoBack(...args),
    dispatch: jest.fn(),
  };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({ params: mockRouteParams }),
    useIsFocused: () => true,
  };
});

// Resolve t() against the real en-EN resources so copy assertions ("Build
// around this", "Date: …") catch translation regressions. Keys live under
// the single top-level "boilerplate" namespace (see translations/index.ts).
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

const mockGetWardrobeItem = jest.fn();

jest.mock('../../services/wardrobeService', () => ({
  wardrobeService: {
    getWardrobeItem: (...args: unknown[]) => mockGetWardrobeItem(...args),
    toggleFavorite: jest.fn(),
    updateUsageFrequency: jest.fn(),
    deleteWardrobeItem: jest.fn(),
    updateWardrobeItemAttributes: jest.fn(),
  },
  getItemFitLabel: () => 'Regular',
  getItemStyleTags: () => [],
  getItemUsageFrequency: () => 'NORMAL',
}));

// Cuts the utils/url → apiClient → react-native-keychain import chain.
jest.mock('../../utils/url', () => ({
  getImageUrl: (url?: string | null) => url ?? undefined,
}));

const mockedToastShow = (Toast as unknown as { show: jest.Mock }).show;

// ---- fixtures / helpers -----------------------------------------------------

const USER_ITEM = {
  id: 'item-1',
  name: 'Denim jacket',
  category: 'top',
  // No trailing Z → parsed as LOCAL time, so dd/mm assertions are
  // timezone-independent on any CI machine.
  created_at: '2026-06-11T10:00:00',
  image_url: 'https://cdn.example/denim.jpg',
  style_tags: [],
};

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const oneByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance => {
  const matches = byTestID(root, id);
  if (matches.length === 0) {
    throw new Error(`no node with testID="${id}"`);
  }
  return matches[0];
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

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const renderScreen = async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<ItemDetailScreen />);
  });
  liveRenderers.push(renderer);
  await flushPromises(); // settle the loadItem mount effect
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { itemId: 'item-1' };
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
// 1. formatItemDate (pure)
// =============================================================================
describe('formatItemDate', () => {
  it('renders created_at as dd/mm/yyyy with zero padding', () => {
    expect(formatItemDate('2026-06-11T10:00:00')).toBe('11/06/2026');
    expect(formatItemDate('2026-01-02T08:30:00')).toBe('02/01/2026');
  });

  it('returns null on missing or invalid input (date row hidden)', () => {
    expect(formatItemDate(undefined)).toBeNull();
    expect(formatItemDate('')).toBeNull();
    expect(formatItemDate('not-a-date')).toBeNull();
  });
});

// =============================================================================
// 2. read mode — Figma 2852:14557
// =============================================================================
describe('read mode', () => {
  it('renders title + Date line + "Build around this" CTA', async () => {
    mockGetWardrobeItem.mockResolvedValue(USER_ITEM);

    const r = await renderScreen();
    const root = r.root;

    expect(oneByTestID(root, 'item-detail-title').props.children).toBe(
      'Denim jacket',
    );
    expect(oneByTestID(root, 'item-detail-date').props.children).toBe(
      'Date: 11/06/2026',
    );

    // CTA copy renamed from "Mix with this" (testID preserved for Maestro)
    const cta = oneByTestID(root, 'item-detail-mix-btn');
    const ctaLabel = cta.findAll(n => n.props?.children === 'Build around this');
    expect(ctaLabel.length).toBeGreaterThan(0);
    expect(
      root.findAll(n => n.props?.children === 'Mix with this').length,
    ).toBe(0);
  });

  it('has no heart button and no read-mode attribute rows', async () => {
    mockGetWardrobeItem.mockResolvedValue(USER_ITEM);

    const r = await renderScreen();
    const root = r.root;

    // Heart removed — updated header variant is rightIcon=no
    expect(byTestID(root, 'item-detail-favorite-btn').length).toBe(0);
    expect(byTestID(root, 'item-detail-favorite-btn-active').length).toBe(0);
    expect(byTestID(root, 'item-detail-back-btn').length).toBeGreaterThan(0);

    // Attribute rows + More/Less expander live in the Edit flow now
    expect(byTestID(root, 'item-detail-row-category').length).toBe(0);
    expect(byTestID(root, 'item-detail-row-style').length).toBe(0);
    expect(byTestID(root, 'item-detail-more-btn').length).toBe(0);
    expect(byTestID(root, 'item-detail-edit-link').length).toBe(0);
  });

  it('hides the Date line when created_at is absent', async () => {
    mockGetWardrobeItem.mockResolvedValue({
      ...USER_ITEM,
      created_at: undefined,
    });

    const r = await renderScreen();
    expect(byTestID(r.root, 'item-detail-date').length).toBe(0);
  });
});

// =============================================================================
// 3. Q7 fallback — Home V05 common_essential ids miss the wardrobe lookup
// =============================================================================
describe('fallbackItem route param', () => {
  it('renders from the fallback payload instead of bouncing back', async () => {
    mockRouteParams = {
      itemId: 'sys-1',
      fallbackItem: {
        id: 'sys-1',
        image_url: 'https://cdn.example/sys.jpg',
        category: 'Top',
        is_common_item: true,
      },
    };
    mockGetWardrobeItem.mockResolvedValue(null);

    const r = await renderScreen();
    const root = r.root;

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockedToastShow).not.toHaveBeenCalled();

    // No name → category-label title; no created_at → date row hidden
    expect(oneByTestID(root, 'item-detail-title').props.children).toBe('Top');
    expect(byTestID(root, 'item-detail-date').length).toBe(0);

    // Catalog rules (AU-287): trash hidden, Edit disabled
    expect(byTestID(root, 'item-detail-delete-btn').length).toBe(0);
    expect(oneByTestID(root, 'item-detail-change-btn').props.disabled).toBe(
      true,
    );
  });

  it('renders the image for a png-only fallback item (png preferred)', async () => {
    // AU-312 review fixes: (1) the image source must prefer `image_png` —
    // a png-only payload previously hit getImageUrl(image_url=undefined)
    // and rendered "Image unavailable"; (2) `fallbackItem.name` is now
    // threaded from Home, so the real name renders as the title instead
    // of degrading to the category label.
    mockRouteParams = {
      itemId: 'sys-2',
      fallbackItem: {
        id: 'sys-2',
        image_png: 'https://cdn.example/sys-cutout.png',
        name: 'Linen shirt',
        category: 'Top',
        is_common_item: true,
      },
    };
    mockGetWardrobeItem.mockResolvedValue(null);

    const r = await renderScreen();
    const root = r.root;

    // The 3:4 image frame mounts only after the flexible region reports a
    // size — react-test-renderer has no layout pass, so fire onLayout
    // manually (the region View is the only node carrying onLayout).
    const region = root.findAll(
      n => typeof n.props?.onLayout === 'function',
    )[0];
    act(() => {
      region.props.onLayout({
        nativeEvent: { layout: { width: 414, height: 600 } },
      });
    });

    // png cutout renders…
    expect(
      root.findAll(
        n => n.props?.source?.uri === 'https://cdn.example/sys-cutout.png',
      ).length,
    ).toBeGreaterThan(0);
    // …and the "Image unavailable" fallback does not
    expect(
      root.findAll(n => n.props?.children === 'Image unavailable').length,
    ).toBe(0);

    // real name from the fallback payload renders as the title
    expect(oneByTestID(root, 'item-detail-title').props.children).toBe(
      'Linen shirt',
    );
  });

  it('still toasts + goes back when there is no fallback payload', async () => {
    mockRouteParams = { itemId: 'missing-1' };
    mockGetWardrobeItem.mockResolvedValue(null);

    await renderScreen();

    expect(mockedToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// =============================================================================
// 4. edit-mode entry via the bottom Edit button
// =============================================================================
describe('edit mode', () => {
  it('Edit button swaps read mode for attribute rows + Cancel/Save', async () => {
    mockGetWardrobeItem.mockResolvedValue(USER_ITEM);

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'item-detail-change-btn'));

    expect(byTestID(root, 'item-detail-row-category').length).toBeGreaterThan(
      0,
    );
    expect(byTestID(root, 'item-detail-row-fit').length).toBeGreaterThan(0);
    expect(byTestID(root, 'item-detail-cancel-btn').length).toBeGreaterThan(0);
    expect(byTestID(root, 'item-detail-save-btn').length).toBeGreaterThan(0);
    // read-mode block replaced
    expect(byTestID(root, 'item-detail-title').length).toBe(0);
    expect(byTestID(root, 'item-detail-mix-btn').length).toBe(0);
  });
});
