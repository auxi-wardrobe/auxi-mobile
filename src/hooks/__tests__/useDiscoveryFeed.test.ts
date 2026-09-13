// useDiscoveryFeed — the feed's analytics contract.
//
// Pins the two things gender targeting added, both of which are easy to get
// silently wrong:
//
//   1. `discovery_feed_empty` fires EXACTLY ONCE per empty result set. It is
//      the blackout alarm for a cohort whose gender has no published outfits,
//      so a re-render or background refetch inflating it would turn a real
//      signal into noise.
//   2. It never fires while a filter is active — a filter matching nothing is
//      a normal user action, not a coverage failure.
//
// Plus: `wardrobe_gender` rides `discovery_feed_viewed` from the SERVER's
// `applied_gender`, and is OMITTED (never null) when unknown.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useAiLimitGate.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockTrack = jest.fn();
jest.mock('../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// useFocusEffect fires the callback on mount, like a real screen focus.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React_ = jest.requireActual('react');
    React_.useEffect(cb, [cb]);
  },
}));

type FeedQuery = {
  data?: {
    outfits: unknown[];
    total: number;
    applied_gender: 'M' | 'W' | 'U' | null;
  };
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: jest.Mock;
};

let mockFeedQuery: FeedQuery;

jest.mock('../useDiscovery', () => ({
  useDiscoveryOutfits: () => mockFeedQuery,
  useDiscoveryTrendTags: () => ({ data: [] }),
}));

// Imported after the mocks so the hook picks them up.
import { useDiscoveryFeed, type UseDiscoveryFeed } from '../useDiscoveryFeed';

const emptyFeed = (applied_gender: 'M' | 'W' | 'U' | null = 'M'): FeedQuery => ({
  data: { outfits: [], total: 0, applied_gender },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
});

const populatedFeed = (): FeedQuery => ({
  data: {
    outfits: [{ id: 'o1', title: 'Look' }],
    total: 1,
    applied_gender: 'M',
  },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
});

const mountHook = () => {
  const ref: { current: UseDiscoveryFeed | null } = { current: null };
  const Harness = (): null => {
    ref.current = useDiscoveryFeed();
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  return {
    get: (): UseDiscoveryFeed => {
      if (!ref.current) {
        throw new Error('hook did not render');
      }
      return ref.current;
    },
    rerender: () => act(() => root.update(React.createElement(Harness))),
    unmount: () => act(() => root.unmount()),
  };
};

const emptyEvents = () => mockTrack.mock.calls.filter((c) => c[0] === 'discovery_feed_empty');
const viewedEvents = () => mockTrack.mock.calls.filter((c) => c[0] === 'discovery_feed_viewed');

beforeEach(() => {
  mockTrack.mockClear();
  mockFeedQuery = populatedFeed();
});

describe('useDiscoveryFeed — discovery_feed_empty', () => {
  it('fires once when an unfiltered feed settles empty', () => {
    mockFeedQuery = emptyFeed('M');
    const { unmount } = mountHook();

    expect(emptyEvents()).toHaveLength(1);
    expect(emptyEvents()[0][1]).toEqual({ wardrobe_gender: 'M' });
    unmount();
  });

  it('does not re-fire on re-render (the guard that keeps the count honest)', () => {
    mockFeedQuery = emptyFeed('W');
    const { rerender, unmount } = mountHook();
    expect(emptyEvents()).toHaveLength(1);

    rerender();
    rerender();

    expect(emptyEvents()).toHaveLength(1);
    unmount();
  });

  it('does not fire while the feed is still fetching', () => {
    mockFeedQuery = { ...emptyFeed('M'), isFetching: true };
    const { unmount } = mountHook();

    expect(emptyEvents()).toHaveLength(0);
    unmount();
  });

  it('does not fire before any data has arrived', () => {
    mockFeedQuery = {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: jest.fn(),
    };
    const { unmount } = mountHook();

    expect(emptyEvents()).toHaveLength(0);
    unmount();
  });

  it('does not fire for a non-empty feed', () => {
    const { unmount } = mountHook();

    expect(emptyEvents()).toHaveLength(0);
    unmount();
  });

  it('does not fire when a filter is active — that is a user action, not a blackout', () => {
    mockFeedQuery = emptyFeed('M');
    const { get, rerender, unmount } = mountHook();
    expect(emptyEvents()).toHaveLength(1);
    mockTrack.mockClear();

    act(() => get().onSeasonsChange(['summer']));
    rerender();

    expect(emptyEvents()).toHaveLength(0);
    unmount();
  });

  it('omits wardrobe_gender rather than sending null when the feed was unfiltered', () => {
    mockFeedQuery = emptyFeed(null);
    const { unmount } = mountHook();

    expect(emptyEvents()).toHaveLength(1);
    expect(emptyEvents()[0][1]).toEqual({});
    unmount();
  });
});

describe('useDiscoveryFeed — wardrobe_gender on discovery_feed_viewed', () => {
  it('omits wardrobe_gender on a cold first focus (query not yet resolved)', () => {
    mockFeedQuery = {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: jest.fn(),
    };
    const { unmount } = mountHook();

    expect(viewedEvents()).toHaveLength(1);
    expect(viewedEvents()[0][1]).toEqual({});
    unmount();
  });

  it('reports the gender the server applied once data has arrived', () => {
    mockFeedQuery = populatedFeed();
    const { unmount } = mountHook();

    expect(viewedEvents()[0][1]).toEqual({ wardrobe_gender: 'M' });
    unmount();
  });
});

describe('useDiscoveryFeed — multi-select filter state', () => {
  it('starts with both axes on "All" (empty selection) and no filter active', () => {
    const { get, unmount } = mountHook();

    expect(get().seasons).toEqual([]);
    expect(get().selectedTrendTags).toEqual([]);
    expect(get().isFilterActive).toBe(false);
    unmount();
  });

  it('keeps more than one season at a time', () => {
    const { get, rerender, unmount } = mountHook();

    act(() => get().onSeasonsChange(['summer', 'winter']));
    rerender();

    expect(get().seasons).toEqual(['summer', 'winter']);
    expect(get().isFilterActive).toBe(true);
    unmount();
  });

  it('keeps more than one trend tag at a time', () => {
    const { get, rerender, unmount } = mountHook();

    act(() => get().onTrendTagsChange(['quiet luxury', 'workwear']));
    rerender();

    expect(get().selectedTrendTags).toEqual(['quiet luxury', 'workwear']);
    expect(get().isFilterActive).toBe(true);
    unmount();
  });

  it('reports a multi-selection as a joined filter_value, and "all" when cleared', () => {
    const { get, rerender, unmount } = mountHook();
    mockTrack.mockClear();

    act(() => get().onSeasonsChange(['spring', 'fall']));
    rerender();
    act(() => get().onTrendTagsChange([]));
    rerender();

    const applied = mockTrack.mock.calls.filter(
      (c) => c[0] === 'discovery_filter_applied',
    );
    expect(applied[0][1]).toEqual({
      filter_type: 'season',
      filter_value: 'spring,fall',
    });
    expect(applied[1][1]).toEqual({
      filter_type: 'trend',
      filter_value: 'all',
    });
    unmount();
  });
});
