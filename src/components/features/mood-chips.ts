/**
 * AU-318 mood feedback vocabulary (Phase 3).
 *
 * Chip ids mirror the server source of truth:
 *   wardrobe-backend/blueprints/mood/mood_vocab.py (`MOOD_VOCAB`, Phase 1).
 * Ids MUST stay byte-identical to the server set — the backend validates
 * submitted tags with `is_valid_mood()`. Display labels resolve via i18n
 * (`boilerplate.mood.*`), never hardcoded.
 */

export type MoodChipId =
  | 'feels_like_me'
  | 'confident'
  | 'relaxed'
  | 'polished'
  | 'comfortable'
  | 'sharp'
  | 'effortless'
  | 'elevated'
  | 'professional'
  | 'prepared'
  | 'easy'
  | 'attractive'
  | 'expressive'
  | 'functional'
  | 'lightweight'
  | 'not_quite_me';

export interface MoodChipDef {
  id: MoodChipId;
  labelKey: string;
}

export const MOOD_CHIPS: readonly MoodChipDef[] = [
  { id: 'feels_like_me', labelKey: 'mood.feelsLikeMe' },
  { id: 'confident', labelKey: 'mood.confident' },
  { id: 'relaxed', labelKey: 'mood.relaxed' },
  { id: 'polished', labelKey: 'mood.polished' },
  { id: 'comfortable', labelKey: 'mood.comfortable' },
  { id: 'sharp', labelKey: 'mood.sharp' },
  { id: 'effortless', labelKey: 'mood.effortless' },
  { id: 'elevated', labelKey: 'mood.elevated' },
  { id: 'professional', labelKey: 'mood.professional' },
  { id: 'prepared', labelKey: 'mood.prepared' },
  { id: 'easy', labelKey: 'mood.easy' },
  { id: 'attractive', labelKey: 'mood.attractive' },
  { id: 'expressive', labelKey: 'mood.expressive' },
  { id: 'functional', labelKey: 'mood.functional' },
  { id: 'lightweight', labelKey: 'mood.lightweight' },
  // Soft-negative — present in every set, always placed last.
  { id: 'not_quite_me', labelKey: 'mood.notQuiteMe' },
];

/**
 * Contextual chip sets keyed off `outfit_context.occasion` (lowercase).
 * Each set ≤8 entries (ticket: 6–8 visible chips max for cognitive load),
 * with `not_quite_me` last in every set.
 */
export const CONTEXT_CHIP_SETS: Record<string, readonly MoodChipId[]> = {
  work: [
    'professional',
    'sharp',
    'prepared',
    'polished',
    'confident',
    'comfortable',
    'elevated',
    'not_quite_me',
  ],
  weekend: [
    'relaxed',
    'easy',
    'comfortable',
    'effortless',
    'feels_like_me',
    'confident',
    'elevated',
    'not_quite_me',
  ],
  social: [
    'attractive',
    'elevated',
    'confident',
    'expressive',
    'sharp',
    'feels_like_me',
    'polished',
    'not_quite_me',
  ],
  travel: [
    'functional',
    'comfortable',
    'lightweight',
    'relaxed',
    'easy',
    'effortless',
    'feels_like_me',
    'not_quite_me',
  ],
};

export const DEFAULT_CHIP_SET: readonly MoodChipId[] = [
  'feels_like_me',
  'confident',
  'relaxed',
  'polished',
  'comfortable',
  'sharp',
  'effortless',
  'not_quite_me',
];

const MAX_VISIBLE_CHIPS = 8;

// Dev-time guard: fail fast if a set drifts past the cognitive-load ceiling
// or drops the trailing soft-negative.
if (__DEV__) {
  const allSets: Array<[string, readonly MoodChipId[]]> = [
    ...Object.entries(CONTEXT_CHIP_SETS),
    ['default', DEFAULT_CHIP_SET],
  ];
  for (const [name, set] of allSets) {
    if (set.length > MAX_VISIBLE_CHIPS) {
      throw new Error(
        `mood-chips: set "${name}" has ${set.length} chips (max ${MAX_VISIBLE_CHIPS})`,
      );
    }
    if (set[set.length - 1] !== 'not_quite_me') {
      throw new Error(`mood-chips: set "${name}" must end with "not_quite_me"`);
    }
  }
}

const CHIP_BY_ID = new Map(MOOD_CHIPS.map(chip => [chip.id, chip]));

/**
 * Resolve the visible chip defs for an occasion. Unknown/missing occasion
 * falls back to DEFAULT_CHIP_SET. Preserves set order (priority chips first,
 * `not_quite_me` last).
 */
export const getMoodChipsForOccasion = (occasion?: string): MoodChipDef[] => {
  const ids =
    (occasion ? CONTEXT_CHIP_SETS[occasion.trim().toLowerCase()] : undefined) ??
    DEFAULT_CHIP_SET;
  return ids
    .map(id => CHIP_BY_ID.get(id))
    .filter((chip): chip is MoodChipDef => chip !== undefined);
};

/** Soft-negative chip id — a dislike signal, never a positive descriptor. */
const NEGATIVE_MOOD_ID: MoodChipId = 'not_quite_me';

/**
 * English adjectives for each positive chip. These feed `POST /v05/feedback`,
 * whose backend LLM-2 parses free TEXT into axis-level style signals — so the
 * wording must be stable English regardless of the UI locale (the i18n
 * `labelKey`s are for display only and must NOT be used here).
 */
const MOOD_ADJECTIVE: Record<Exclude<MoodChipId, 'not_quite_me'>, string> = {
  feels_like_me: 'like myself',
  confident: 'confident',
  relaxed: 'relaxed',
  polished: 'polished',
  comfortable: 'comfortable',
  sharp: 'sharp',
  effortless: 'effortless',
  elevated: 'elevated',
  professional: 'professional',
  prepared: 'prepared and put-together',
  easy: 'easy and casual',
  attractive: 'attractive',
  expressive: 'expressive',
  functional: 'functional',
  lightweight: 'light and breezy',
};

const joinWithAnd = (parts: string[]): string =>
  parts.length <= 1
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/**
 * Turn the user's selected mood chips into a natural-language sentence for
 * `POST /v05/feedback`, so mood feedback feeds the engine's decay-weighted L4
 * ranking signals (and thus future builds). Returns `null` when there is
 * nothing meaningful to say. Positives become a "made me feel …" like; the
 * soft-negative `not_quite_me` becomes an explicit dislike.
 */
export const moodFeedbackText = (moodIds: string[]): string | null => {
  const positives = moodIds
    .filter((id): id is Exclude<MoodChipId, 'not_quite_me'> =>
      id !== NEGATIVE_MOOD_ID && id in MOOD_ADJECTIVE,
    )
    .map(id => MOOD_ADJECTIVE[id]);
  const negative = moodIds.includes(NEGATIVE_MOOD_ID);

  const parts: string[] = [];
  if (positives.length > 0) {
    parts.push(`This outfit made me feel ${joinWithAnd(positives)}.`);
  }
  if (negative) {
    parts.push("It didn't quite feel like me, though.");
  }
  return parts.length > 0 ? parts.join(' ') : null;
};
