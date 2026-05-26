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
import type { ImageSourcePropType } from 'react-native';
import type {
  FitPreference,
  StyleTag,
  WardrobeDirection,
} from '../services/v05Api';
import type { V05OnboardingSelection } from '../types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Tile artwork (Figma node 2849:8331 — "Image 3:4" fills)
//
// Every onboarding selection tile shows a distinct flat-lay garment render
// lifted from Figma (no placeholder — confirmed each tile has real art). The
// images are clean garment flat-lays on a neutral ground; the tile's cream
// `figmaCardSurface` shows as the inset margin, matching the Figma "Image 3:4"
// component (garment is inset ~18px, not full-bleed).
//
// require() is resolved at bundle time by Metro — these are static refs.
// ─────────────────────────────────────────────────────────────────────────────

const TILE_ART = {
  // Step 1 — wardrobe direction (node 2849:8339, `image 18/16/17`).
  wardrobe: {
    Womenswear: require('../assets/images/onboarding/wardrobe-womenswear.png'),
    Menswear: require('../assets/images/onboarding/wardrobe-menswear.png'),
    Mixed: require('../assets/images/onboarding/wardrobe-mixed.png'),
  } as Record<WardrobeDirection, ImageSourcePropType>,
  // Step 2 — fit, per wardrobe branch (nodes 2849:8423 / 8443 / 8460). Keyed
  // by the fit WIRE value so the screen resolves art straight from selection.
  fit: {
    Menswear: {
      'Slim Fit': require('../assets/images/onboarding/fit-men-slim.png'),
      'Classic Fit': require('../assets/images/onboarding/fit-men-regular.png'),
      'Relaxed Fit': require('../assets/images/onboarding/fit-men-relaxed.png'),
    },
    Womenswear: {
      'Slim Fit': require('../assets/images/onboarding/fit-women-slim.png'),
      'Classic Fit': require('../assets/images/onboarding/fit-women-regular.png'),
      'Relaxed Fit': require('../assets/images/onboarding/fit-women-relaxed.png'),
    },
    Mixed: {
      'Slim Fit': require('../assets/images/onboarding/fit-mixed-slim.png'),
      'Classic Fit': require('../assets/images/onboarding/fit-mixed-regular.png'),
      'Relaxed Fit': require('../assets/images/onboarding/fit-mixed-relaxed.png'),
    },
  } as Record<WardrobeDirection, Record<FitPreference, ImageSourcePropType>>,
  // Step 3 — style picks (node 2849:9748). `Formal` reuses Figma's "Classic"
  // flat-lay (white shirt + tailored trousers) — the closest visual match,
  // since the backend vocabulary has `Formal` where Figma labelled "Classic".
  style: {
    Minimal: require('../assets/images/onboarding/style-minimal.png'),
    Casual: require('../assets/images/onboarding/style-casual.png'),
    Soft: require('../assets/images/onboarding/style-soft.png'),
    Bold: require('../assets/images/onboarding/style-bold.png'),
    Formal: require('../assets/images/onboarding/style-formal.png'),
  } as Record<StyleTag, ImageSourcePropType>,
};

/** Step 1 tile art for a wardrobe option. */
export const wardrobeTileArt = (
  value: WardrobeDirection,
): ImageSourcePropType => TILE_ART.wardrobe[value];

/**
 * Step 2 tile art for a fit option within the chosen wardrobe branch (D8 —
 * fit imagery differs per wardrobe; the screen is parameterised by route).
 */
export const fitTileArt = (
  wardrobe: WardrobeDirection,
  fit: FitPreference,
): ImageSourcePropType => TILE_ART.fit[wardrobe][fit];

/** Step 3 tile art for a style option. */
export const styleTileArt = (value: StyleTag): ImageSourcePropType =>
  TILE_ART.style[value];

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

// Figma node 2849:8339 order: Womenswear (left), Menswear (right), then Mixed.
export const WARDROBE_OPTIONS: WardrobeOption[] = [
  { value: 'Womenswear', label: 'Womenswear' },
  { value: 'Menswear', label: 'Menswear' },
  { value: 'Mixed', label: 'Mixed' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fit preference (D2: UI label ≠ wire value)
// ─────────────────────────────────────────────────────────────────────────────

export interface FitOption {
  /** Wire value sent to `/onboarding/generate` (backend literal allowlist). */
  wireValue: FitPreference;
  /** User-facing label. Note "Regular Fit" → wire `Classic Fit` (D2). */
  label: string;
}

/**
 * D2 mapping: Slim Fit→`Slim Fit`, Regular Fit→`Classic Fit`,
 * Relaxed Fit→`Relaxed Fit`. Display labels carry the "Fit" suffix to match
 * Figma (node 2849:8423/8443/8460); the UI shows "Regular Fit" while the wire
 * value stays `Classic Fit` — the wire never sees the display label. Art is
 * resolved per wardrobe branch in the screen (men_/women_*_fit.png), not here.
 */
export const FIT_OPTIONS: FitOption[] = [
  { wireValue: 'Slim Fit', label: 'Slim Fit' },
  { wireValue: 'Classic Fit', label: 'Regular Fit' },
  { wireValue: 'Relaxed Fit', label: 'Relaxed Fit' },
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

/**
 * Display order matches Figma node 2849:9748 — [Minimal, Classic, Casual, Soft,
 * Bold] — so the "Classic" tile sits in position 2. Reordering this array is
 * purely visual: the ranked-selection array in OnboardingStylesScreen stores
 * StyleTag VALUES by pick order (via indexOf on `ranked`), not by display
 * index, so grid order and selection ranking are independent.
 *
 * Label note (mirrors the D2 fit Regular→`Classic Fit` pattern): the display
 * label "Classic" maps to wire value `Formal` (the backend StyleTag enum has no
 * "Classic"). Figma labels this white-shirt + tailored-trousers flat-lay
 * (`style-formal.png`) "Classic"; only the user-facing label changes — the wire
 * value stays `Formal`.
 */
export const STYLE_OPTIONS: StyleOption[] = [
  { value: 'Minimal', label: 'Minimal' },
  { value: 'Formal', label: 'Classic' },
  { value: 'Casual', label: 'Casual' },
  { value: 'Soft', label: 'Soft' },
  { value: 'Bold', label: 'Bold' },
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
    title: 'Which fit makes you feel most confident?',
    subtitle:
      "This will be Auxi's starting point. You can switch up your style anytime.",
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
