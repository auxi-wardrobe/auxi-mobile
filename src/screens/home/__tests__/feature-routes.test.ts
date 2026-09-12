/* eslint-env jest */
/**
 * Every "Popular features" shortcut must land on a screen that actually
 * exists — a dead tile is worse than no tile. This asserts the mapping is
 * complete (one destination per rendered tile) and that unknown keys still
 * resolve somewhere real.
 */
import { POPULAR_FEATURES } from '../components/PopularFeaturesGrid';
import { destinationFor, FEATURE_DESTINATIONS } from '../feature-routes';

describe('popular-feature destinations', () => {
  it('maps every rendered tile to a destination', () => {
    POPULAR_FEATURES.forEach(feature => {
      expect(FEATURE_DESTINATIONS[feature.key]).toBeDefined();
    });
  });

  it('declares no destination for a tile that is not rendered', () => {
    const rendered = POPULAR_FEATURES.map(feature => feature.key).sort();
    expect(Object.keys(FEATURE_DESTINATIONS).sort()).toEqual(rendered);
  });

  it('routes "find matching" to the recommender, not a plain route', () => {
    expect(destinationFor('find_match')).toEqual({ kind: 'recommender' });
  });

  it.each([
    ['add_items', 'Wardrobe'],
    ['schedule', 'Schedule'],
    ['capsule', 'CapsuleCreate'],
    ['show_wearing', 'Favourite'],
    ['discover', 'Discovery'],
  ])('routes %s to %s', (key, route) => {
    expect(destinationFor(key as string)).toEqual({ kind: 'route', route });
  });

  it('falls back to a real screen for an unknown key', () => {
    expect(destinationFor('nope')).toEqual({
      kind: 'route',
      route: 'Discovery',
    });
  });
});
