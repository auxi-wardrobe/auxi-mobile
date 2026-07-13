/**
 * Macgie+ brand gradient — the single source of truth for the purple → pink →
 * orange ramp used across every premium (Macgie+) surface: the Settings
 * "Upgrade to Macgie+" pill, the Upgrade paywall wordmark, and its Subscribe
 * CTA. Kept as raw hex (not `theme` tokens) because this is a fixed brand
 * gradient, not a themeable UI surface — the four stops ARE the brand mark.
 */
export const MACGIE_GRADIENT_STOPS = [
  '#7C4DFF', // purple
  '#C94F9B', // magenta
  '#F0517A', // pink/coral
  '#F7A63E', // orange
] as const;

/** Evenly-spaced stop offsets ("0", "0.33", "0.66", "1") for the 4 stops. */
export const MACGIE_GRADIENT_OFFSETS = ['0', '0.4', '0.72', '1'] as const;
