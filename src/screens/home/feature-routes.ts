import type { AppStackParamList } from '../../types/navigation';

// Where each "Popular features" shortcut goes. Kept as data (and out of the
// screen) so the mapping is unit-testable and so it is obvious that every
// shortcut lands on a screen that already exists — no placeholder rows.
//
// 'recommender' is not a route: it means "go to the outfit engine (`Home`)",
// which the screen reaches via `popToOrNavigate` rather than a plain navigate,
// because pushing a duplicate `Home` remounts it and discards the live deck.

export type FeatureDestination =
  | { kind: 'route'; route: keyof AppStackParamList }
  | { kind: 'recommender' };

export const FEATURE_DESTINATIONS: Record<string, FeatureDestination> = {
  // The add-item flow lives on the wardrobe grid.
  add_items: { kind: 'route', route: 'Wardrobe' },
  schedule: { kind: 'route', route: 'Schedule' },
  capsule: { kind: 'route', route: 'CapsuleCreate' },
  // "Find matching" IS the recommender: it matches wardrobe items into outfits.
  find_match: { kind: 'recommender' },
  // Try-on renders an outfit onto the user's body photo, so it needs a saved
  // outfit to start from — the Favourite page is where each one carries its
  // "See on me" action.
  show_wearing: { kind: 'route', route: 'Favourite' },
  discover: { kind: 'route', route: 'Discovery' },
};

/** Unknown keys fall back to Discovery rather than leaving a dead tile. */
export const destinationFor = (key: string): FeatureDestination =>
  FEATURE_DESTINATIONS[key] ?? { kind: 'route', route: 'Discovery' };
