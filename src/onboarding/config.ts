/**
 * Onboarding V2 — single source for all user-facing copy, labels, art,
 * and the fit label→wire mapping. Screens render from here; NO copy is
 * inlined in screen components (auxi convention — trivially liftable to
 * i18n later).
 *
 * Decisions encoded here come from the Phase 0 decision gates
 * (`plans/260526-1451-onboarding-redesign-implementation/phase-00-decision-gates.md`):
 *   D2 — Fit UI label "Regular" maps to wire value `Classic Fit`.
 *   D3 — "Your wardrobe" replaces the "MACGIE wardrobe" placeholder.
 *   D4 — copy typos fixed ("Minimal", "in your profile", stray quotes dropped).
 *   D7 — max 2 ranked style picks (matches Figma pin badges).
 *   D8 — Step 2/3 are ONE screen parameterised by the wardrobe choice.
 *
 * Wire values (`WardrobeDirection`, `FitPreference`, `StyleTag`) are reused
 * from `v05Api` so the backend allowlist stays the single authority — never
 * hardcode the literal wire strings in a screen; read them from here.
 */
import type {
  FitPreference,
  StyleTag,
  WardrobeDirection,
} from '../services/v05Api';
import type { V05OnboardingSelection } from '../types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Welcome (intro splash → LocationPermission)
// ─────────────────────────────────────────────────────────────────────────────

export interface WelcomeCopy {
  /** Two visual lines in Figma; rendered with a hard break. */
  title: string;
  subtitle: string;
  ctaLabel: string;
}

export const WELCOME_COPY: WelcomeCopy = {
  title: 'Welcome to\nauxi',
  subtitle: 'Get outfit suggestions\nthat work for your day.',
  ctaLabel: 'Get started — takes 1 min',
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Wardrobe direction
// ─────────────────────────────────────────────────────────────────────────────

export interface WardrobeOption {
  /** Wire value sent to `/onboarding/generate`. */
  value: WardrobeDirection;
  /** User-facing label. */
  label: string;
}

export const WARDROBE_OPTIONS: WardrobeOption[] = [
  { value: 'Menswear', label: 'Menswear' },
  { value: 'Womenswear', label: 'Womenswear' },
  { value: 'Mixed', label: 'Mixed' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fit preference (D2: UI label ≠ wire value)
// ─────────────────────────────────────────────────────────────────────────────

export interface FitOption {
  /** Wire value sent to `/onboarding/generate` (backend literal allowlist). */
  wireValue: FitPreference;
  /** User-facing label. Note "Regular" → wire `Classic Fit` (D2). */
  label: string;
}

/**
 * D2 mapping: Slim→`Slim Fit`, Regular→`Classic Fit`, Relaxed→`Relaxed Fit`.
 * The UI shows "Regular"; the wire never sees it. Art is resolved per
 * wardrobe branch in the screen (men_/women_*_fit.png), not stored here.
 */
export const FIT_OPTIONS: FitOption[] = [
  { wireValue: 'Slim Fit', label: 'Slim' },
  { wireValue: 'Classic Fit', label: 'Regular' },
  { wireValue: 'Relaxed Fit', label: 'Relaxed' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Style picks (D4: typos fixed · D7: max 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface StyleOption {
  /** Wire value + ranked `style_preferences` element. */
  value: StyleTag;
  /** User-facing label (D4: "Minimal", not "Minmal"). */
  label: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  { value: 'Minimal', label: 'Minimal' },
  { value: 'Casual', label: 'Casual' },
  { value: 'Soft', label: 'Soft' },
  { value: 'Bold', label: 'Bold' },
  { value: 'Formal', label: 'Formal' },
];

/** D7 — exactly the max number of ranked picks (Figma pins show "1","2"). */
export const MAX_STYLE_PICKS = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Per-step header copy (D8: keyed by wardrobe branch where copy differs)
// ─────────────────────────────────────────────────────────────────────────────

export interface StepCopy {
  /** "Step n/3" muted label above the title. */
  stepLabel: string;
  title: string;
  subtitle: string;
}

/**
 * Steps 1-3 use a 3-segment progress + back-only header. Copy is shared
 * across wardrobe branches today (the screen is parameterised, not forked
 * — D8); the branch-keyed shape is kept so Phase 4 can specialise a title
 * per direction without a structural change.
 */
export const STEP_COPY: Record<'step1' | 'step2' | 'step3', StepCopy> = {
  step1: {
    stepLabel: 'Step 1/3',
    title: "What's your wardrobe like?",
    subtitle: 'No judgment. Just so we know what to work with.',
  },
  step2: {
    stepLabel: 'Step 2/3',
    title: 'How do you like things to fit?',
    subtitle: 'Think about the pieces you reach for without thinking.',
  },
  step3: {
    stepLabel: 'Step 3/3',
    title: 'Which of these feels most like you?',
    subtitle: 'Pick up to two. Your taste is rarely just one thing.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading view (D3/D4/D10 — Loading IS the in-flight /generate call)
// ─────────────────────────────────────────────────────────────────────────────

export interface LoadingCopy {
  headline: string;
  helper: string;
  /** Step rows shown while the wardrobe materialises. */
  rows: string[];
  footer: string;
}

export const LOADING_COPY: LoadingCopy = {
  headline: 'Your wardrobe will be ready in a moment',
  helper: 'Get outfit suggestions that work for you.',
  rows: [
    'Reading your style picks',
    'Choosing pieces that fit',
    'Building your starter wardrobe',
  ],
  footer: 'This only takes a moment.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Completed view (D3)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletedCopy {
  headline: string;
  footer: string;
  ctaLabel: string;
}

export const COMPLETED_COPY: CompletedCopy = {
  headline: 'Your wardrobe is ready',
  footer: 'You can fine-tune everything in your profile.',
  ctaLabel: 'Continue',
};

// ─────────────────────────────────────────────────────────────────────────────
// Outro view (final CTA fires the deferred completeOnboarding — see Phase 4)
// ─────────────────────────────────────────────────────────────────────────────

export interface OutroCopy {
  quote: string;
  ctaLabel: string;
}

export const OUTRO_COPY: OutroCopy = {
  quote: 'Great style is built one good choice at a time.',
  ctaLabel: 'See my outfit',
};

// ─────────────────────────────────────────────────────────────────────────────
// "You selected" chips (Loading + Completed share this row)
// ─────────────────────────────────────────────────────────────────────────────

/** Static lead-in above the chips row (Figma "You selected"). */
export const SELECTED_CHIPS_LEADIN = 'You selected';

/**
 * Resolve the user's selection to display labels for the "You selected" chips.
 * Wire values never appear in the UI: fit `Classic Fit` renders as "Regular"
 * (D2), and the wardrobe/style wire values map back to their option labels.
 * Falls back to the raw wire value if a label is somehow missing (defensive —
 * the enums are closed so this should never fire).
 */
export const selectionChipLabels = (
  selection: V05OnboardingSelection,
): string[] => {
  const wardrobeLabel =
    WARDROBE_OPTIONS.find(o => o.value === selection.wardrobe_direction)
      ?.label ?? selection.wardrobe_direction;
  const fitLabel =
    FIT_OPTIONS.find(o => o.wireValue === selection.fit_preference)?.label ??
    selection.fit_preference;
  const styleLabels = selection.style_preferences.map(
    tag => STYLE_OPTIONS.find(o => o.value === tag)?.label ?? tag,
  );
  return [wardrobeLabel, fitLabel, ...styleLabels];
};
