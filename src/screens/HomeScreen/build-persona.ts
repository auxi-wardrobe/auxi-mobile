import type { UserMetadata } from '../../types/auth';

/**
 * Persona preferences threaded into every V05 `/build` `user` payload so the
 * engine biases formality (`style_direction`) and statement level
 * (`confidence_level`). Unset keys are OMITTED so the backend keeps its own
 * defaults — do not send nulls.
 *
 * Shared because TWO screens now cold-start a build: the recommender
 * (HomeScreen) and the landing page, which fires the first build of the
 * session when nothing is cached. If they disagreed about the persona the
 * homepage would show an outfit built on different inputs from the one the
 * recommender then serves.
 */
export const buildPersonaFrom = (
  metadata: UserMetadata | null | undefined,
) => ({
  ...(metadata?.style_direction
    ? { style_direction: metadata.style_direction }
    : {}),
  ...(metadata?.confidence_level
    ? { confidence_level: metadata.confidence_level }
    : {}),
});
