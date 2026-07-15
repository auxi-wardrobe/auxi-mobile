/**
 * Regression: advancing the deck must NOT remount the card that transitions
 * from peek → active. A remount replays the OptionSheet reveal animation —
 * that replay is the "image pop / jump" the user sees after each swipe.
 * See docs/superpowers/specs/2026-07-02-home-swipe-image-pop-fix-design.md.
 *
 * Isolated render (no HomeScreen/providers): a probe renderCard counts mounts
 * per item id via a mount-only effect. If a card is remounted on advance, its
 * id's count rises above 1.
 */
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { OutfitSwipeDeck } from '../OutfitSwipeDeck';

type Card = { id: string };

describe('OutfitSwipeDeck reconciliation', () => {
  it('does not remount a card promoted from peek to active', () => {
    const mountCounts: Record<string, number> = {};

    const Probe = ({ id }: { id: string; role: 'active' | 'peek' }) => {
      useEffect(() => {
        mountCounts[id] = (mountCounts[id] ?? 0) + 1;
      }, [id]);
      return <Text>{id}</Text>;
    };

    const items: Card[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const props = {
      items,
      swipeEnabled: true,
      keyOf: (c: Card) => c.id,
      renderCard: (c: Card, role: 'active' | 'peek') => (
        <Probe id={c.id} role={role} />
      ),
      onSwipeNext: jest.fn(),
      onSwipeBack: jest.fn(),
    };

    let renderer!: ReturnType<typeof TestRenderer.create>;
    act(() => {
      renderer = TestRenderer.create(
        <OutfitSwipeDeck {...props} activeIndex={0} />,
      );
    });

    // Cold start: 'b' mounted once as the next-peek behind active 'a'.
    expect(mountCounts.b).toBe(1);

    // Advance one card: 'b' becomes active. Must be the SAME instance.
    act(() => {
      renderer.update(<OutfitSwipeDeck {...props} activeIndex={1} />);
    });

    expect(mountCounts.b).toBe(1); // preserved — no remount, no reveal replay
    expect(mountCounts.a).toBe(1); // former active, now prev-peek — preserved
  });

  // Regression (AU: "cards sometimes stay in smaller size"): the deck can swap
  // which item sits at the active slot without moving the numeric activeIndex —
  // e.g. a scheduled-outfit prefix is prepended at index 0. The pan reset that
  // returns the active card to full scale must key off the active card's
  // IDENTITY, not the index, or the newly-seated leading card renders stranded
  // at the smaller neighbour scale. Here we prepend a new card at index 0 and
  // assert the deck reconciles cleanly (the surviving card is not remounted).
  it('reconciles when a new item is seated at the active slot (index unchanged)', () => {
    const mountCounts: Record<string, number> = {};

    const Probe = ({ id }: { id: string; role: 'active' | 'peek' }) => {
      useEffect(() => {
        mountCounts[id] = (mountCounts[id] ?? 0) + 1;
      }, [id]);
      return <Text>{id}</Text>;
    };

    const baseProps = {
      swipeEnabled: true,
      keyOf: (c: Card) => c.id,
      renderCard: (c: Card, role: 'active' | 'peek') => (
        <Probe id={c.id} role={role} />
      ),
      onSwipeNext: jest.fn(),
      onSwipeBack: jest.fn(),
    };

    let renderer!: ReturnType<typeof TestRenderer.create>;
    act(() => {
      renderer = TestRenderer.create(
        <OutfitSwipeDeck
          {...baseProps}
          items={[{ id: 'a' }, { id: 'b' }]}
          activeIndex={0}
        />,
      );
    });
    expect(mountCounts.a).toBe(1);

    // Prepend 'sched' at index 0: activeIndex stays 0 but the active card is now
    // a different item. Former active 'a' slides to the next-peek slot; it must
    // not be remounted, and the deck must not throw resetting the pan.
    act(() => {
      renderer.update(
        <OutfitSwipeDeck
          {...baseProps}
          items={[{ id: 'sched' }, { id: 'a' }, { id: 'b' }]}
          activeIndex={0}
        />,
      );
    });

    expect(mountCounts.sched).toBe(1); // new leading card mounted once
    expect(mountCounts.a).toBe(1); // survivor preserved, no remount
  });
});
