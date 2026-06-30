/**
 * Body-shape vocabulary for the "See this on me" Step 3 picker (AU-358).
 *
 * The shapes are no longer a static labeled set — the backend GENERATES 3
 * body-shape photos (slim / average / fuller) of the user, which the carousel
 * renders as real images. This module is the small shared vocabulary: the
 * canonical shape id (re-exported from `bodyService`), the stable display
 * order, and a sort helper (the worker returns the 3 builds out of order).
 *
 * i18n labels live under `seeThisOnMe.shapes.<id>` (`slim` | `average` |
 * `fuller`). The `id` is what rides in `select` + the persisted profile.
 */
import { BodyShape } from '../../services/bodyService';
import { GeneratedShape } from '../../services/bodyShapeService';

// Single source of truth — identical to bodyService.BodyShape so the store,
// screen, and picker all speak the same union.
export type BodyShapeId = BodyShape;

// Re-export so see-this-on-me components have one vocabulary import source.
export type { GeneratedShape };

/**
 * Stable display order for the 3 generated builds. The backend renders them in
 * parallel, so a poll result can arrive in any order (or partially) — always
 * present them slim → average → fuller.
 */
export const SHAPE_ORDER: BodyShapeId[] = ['slim', 'average', 'fuller'];

/**
 * Sort generated shapes into the canonical SHAPE_ORDER for display. Unknown
 * shapes (shouldn't happen) sort to the end. Returns a new array.
 */
export const sortShapes = (shapes: GeneratedShape[]): GeneratedShape[] => {
  const rank = (s: BodyShapeId): number => {
    const i = SHAPE_ORDER.indexOf(s);
    return i === -1 ? SHAPE_ORDER.length : i;
  };
  return [...shapes].sort((a, b) => rank(a.shape) - rank(b.shape));
};
