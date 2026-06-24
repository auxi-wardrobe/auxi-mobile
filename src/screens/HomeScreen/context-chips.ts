import {
  ContextChipId,
  ContextChipOption,
} from '../../components/features/ContextChipsModal';

// Progressive-refinement quick feedback (spec: Outfit Discovery & Refinement).
// Tap-only style/weather signals — no typing required. The refine sheet surfaces
// a RANDOM 3–5 chip subset of this pool; the shuffle control swaps in a fresh
// subset (preferring chips that weren't just shown) so the user can explore
// other directions without scrolling a long flat list.
export const CONTEXT_CHIP_POOL: ContextChipOption[] = [
  { id: 'more_casual', label: 'More casual' },
  { id: 'more_minimalist', label: 'More minimalist' },
  { id: 'more_colorful', label: 'More colorful' },
  { id: 'more_formal', label: 'More formal' },
  { id: 'weather_warm', label: 'Weather feels too warm' },
  { id: 'weather_cold', label: 'Weather feels too cold' },
  { id: 'more_relaxed', label: 'More relaxed' },
  { id: 'different_vibe', label: 'Different vibe' },
  { id: 'more_polished', label: 'More polished' },
  { id: 'bolder_choice', label: 'Bolder choice' },
  { id: 'simpler_look', label: 'Simpler look' },
];

export const MIN_VISIBLE_CHIPS = 3;
export const MAX_VISIBLE_CHIPS = 5;

// Fisher–Yates — returns a new shuffled copy, leaves the source untouched.
const shuffleChips = (items: ContextChipOption[]): ContextChipOption[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Pick a random 3–5 chip subset. Chips in `exclude` (typically the set just
// shown) are deprioritised so a shuffle reveals fresh options first, only
// recycling them when the pool is too small to reach the target count.
export const pickContextChips = (
  exclude: ContextChipId[] = [],
): ContextChipOption[] => {
  const span = MAX_VISIBLE_CHIPS - MIN_VISIBLE_CHIPS + 1;
  const count = MIN_VISIBLE_CHIPS + Math.floor(Math.random() * span);
  const excluded = new Set(exclude);
  const fresh = shuffleChips(
    CONTEXT_CHIP_POOL.filter(chip => !excluded.has(chip.id)),
  );
  const recycled = shuffleChips(
    CONTEXT_CHIP_POOL.filter(chip => excluded.has(chip.id)),
  );
  return [...fresh, ...recycled].slice(0, count);
};

export const CONTEXT_CHIP_LABEL_KEYS: Record<ContextChipId, string> = {
  more_casual: 'home.chip_more_casual',
  more_minimalist: 'home.chip_more_minimalist',
  more_colorful: 'home.chip_more_colorful',
  more_formal: 'home.chip_more_formal',
  weather_warm: 'home.chip_weather_warm',
  weather_cold: 'home.chip_weather_cold',
  more_relaxed: 'home.chip_more_relaxed',
  different_vibe: 'home.chip_different_vibe',
  more_polished: 'home.chip_more_polished',
  bolder_choice: 'home.chip_bolder',
  simpler_look: 'home.chip_simpler',
};
