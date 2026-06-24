import {
  ContextChipId,
  ContextChipOption,
} from '../../components/features/ContextChipsModal';

// Progressive-refinement quick feedback (spec: Outfit Discovery & Refinement).
// A single flat page of <5s tap-only signals — no typing required.
export const CONTEXT_CHIP_SETS: ContextChipOption[][] = [
  [
    { id: 'more_casual', label: 'More casual' },
    { id: 'more_minimalist', label: 'More minimalist' },
    { id: 'more_colorful', label: 'More colorful' },
    { id: 'more_formal', label: 'More formal' },
    { id: 'weather_warm', label: 'Weather feels too warm' },
    { id: 'weather_cold', label: 'Weather feels too cold' },
  ],
];

export const CONTEXT_CHIP_LABEL_KEYS: Record<ContextChipId, string> = {
  // Active refinement chips.
  more_casual: 'home.chip_more_casual',
  more_minimalist: 'home.chip_more_minimalist',
  more_colorful: 'home.chip_more_colorful',
  more_formal: 'home.chip_more_formal',
  weather_warm: 'home.chip_weather_warm',
  weather_cold: 'home.chip_weather_cold',
  // Legacy ids retained for type completeness (no longer surfaced).
  more_relaxed: 'home.chip_more_relaxed',
  different_vibe: 'home.chip_different_vibe',
  more_polished: 'home.chip_more_polished',
  bolder_choice: 'home.chip_bolder',
  simpler_look: 'home.chip_simpler',
};
