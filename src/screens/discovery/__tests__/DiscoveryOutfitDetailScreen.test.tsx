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
import { COVER_SIDE_GUTTER } from '../discoveryOutfitDetailStyles';

// ---- mocks ------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockPopTo = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {
  outfitId: 'bogus-outfit-id',
  source: 'deep_link',
};

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

    press(oneByTestID(r.root, 'discovery-detail-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
