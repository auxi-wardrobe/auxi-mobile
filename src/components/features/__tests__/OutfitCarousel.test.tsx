/**
 * OutfitCarousel — center-focused (coverflow) carousel that replaced the Home
 * swipe deck. These render tests (no HomeScreen/providers) assert the window
 * contract that the visuals depend on:
 *   1. at rest the active card AND its visible neighbours are mounted (a
 *      carousel shows the peeks — the old deck hid them);
 *   2. advancing does NOT remount the card promoted from peek → active (a
 *      remount replays the OptionSheet reveal, the "image pop" after a swipe);
 *   3. swapping which item sits at the active slot WITHOUT moving the numeric
 *      index (scheduled-prefix prepend / buffer reconcile) reconciles cleanly.
 *
 * A probe renderCard counts mounts per item id via a mount-only effect; a
 * remount pushes that id's count above 1.
 *
 * The neighbours sit one full screen-width off either side at rest (only the
 * active card is visible) — "mounted" below means present in the render window,
 * ready to slide in, not on-screen.
 */
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { OutfitCarousel } from '../OutfitCarousel';

type Card = { id: string };

const makeProps = (mountCounts: Record<string, number>) => {
  const Probe = ({ id }: { id: string; role: 'active' | 'peek' }) => {
    useEffect(() => {
      mountCounts[id] = (mountCounts[id] ?? 0) + 1;
    }, [id]);
    return <Text>{id}</Text>;
  };
  return {
    swipeEnabled: true,
    keyOf: (c: Card) => c.id,
    renderCard: (c: Card, role: 'active' | 'peek') => (
      <Probe id={c.id} role={role} />
    ),
    onSwipeNext: jest.fn(),
    onSwipeBack: jest.fn(),
  };
};

describe('OutfitCarousel', () => {
  it('windows the active card and both neighbours at rest', () => {
    const mountCounts: Record<string, number> = {};
    const props = makeProps(mountCounts);
    const items: Card[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    act(() => {
      TestRenderer.create(
        <OutfitCarousel {...props} items={items} activeIndex={1} />,
      );
    });

    // prev 'a', active 'b', next 'c' — all in the window, ready to slide.
    expect(mountCounts.a).toBe(1);
    expect(mountCounts.b).toBe(1);
    expect(mountCounts.c).toBe(1);
  });

  it('does not remount a card promoted from peek to active', () => {
    const mountCounts: Record<string, number> = {};
    const props = makeProps(mountCounts);
    const items: Card[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    let renderer!: ReturnType<typeof TestRenderer.create>;
    act(() => {
      renderer = TestRenderer.create(
        <OutfitCarousel {...props} items={items} activeIndex={0} />,
      );
    });
    expect(mountCounts.b).toBe(1); // next-peek behind active 'a'

    act(() => {
      renderer.update(
        <OutfitCarousel {...props} items={items} activeIndex={1} />,
      );
    });

    expect(mountCounts.b).toBe(1); // promoted in place — no remount, no replay
    expect(mountCounts.a).toBe(1); // former active, now prev-peek — preserved
    expect(mountCounts.c).toBe(1); // new next-peek entered the window
  });

  it('reconciles when a new item is seated at the active slot (index unchanged)', () => {
    const mountCounts: Record<string, number> = {};
    const props = makeProps(mountCounts);

    let renderer!: ReturnType<typeof TestRenderer.create>;
    act(() => {
      renderer = TestRenderer.create(
        <OutfitCarousel
          {...props}
          items={[{ id: 'a' }, { id: 'b' }]}
          activeIndex={0}
        />,
      );
    });
    expect(mountCounts.a).toBe(1);

    // Prepend 'sched' at index 0: activeIndex stays 0 but the centred card is
    // now a different item. Former active 'a' slides to the next-peek slot; it
    // must not remount and the reset must not throw.
    act(() => {
      renderer.update(
        <OutfitCarousel
          {...props}
          items={[{ id: 'sched' }, { id: 'a' }, { id: 'b' }]}
          activeIndex={0}
        />,
      );
    });

    expect(mountCounts.sched).toBe(1);
    expect(mountCounts.a).toBe(1); // survivor preserved, no remount
  });
});
