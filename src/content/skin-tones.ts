/**
 * Skin-tone catalogue for the Wardrobe Analysis "best colours" card and the
 * "Change your skin tone" sheet (Figma: Analysis + skin-tone sheet, men/women
 * variants).
 *
 * The swatch hexes are CONTENT, not styling — each is a garment colour we
 * recommend for that tone, sampled from the design — so they live here rather
 * than in `theme.ts`. Screens render them as swatch fills only.
 *
 * Portraits differ by the user's wardrobe gender (`SkinToneGender`); the copy
 * keys are resolved through i18n under `wardrobe.analysis.skin_tone.*`.
 */
import type { ImageSourcePropType } from 'react-native';

export const SKIN_TONE_IDS = [
  'fair_light',
  'light_medium',
  'medium_tan',
  'deep_dark',
] as const;
export type SkinToneId = (typeof SKIN_TONE_IDS)[number];

export const isSkinToneId = (value: unknown): value is SkinToneId =>
  typeof value === 'string' &&
  (SKIN_TONE_IDS as readonly string[]).includes(value);

/** Which portrait set the skin-tone UI shows. */
export type SkinToneGender = 'men' | 'women';

export interface SkinToneSwatch {
  /** i18n key suffix under `wardrobe.analysis.colors.*`. */
  nameKey: string;
  hex: string;
}

export interface SkinToneDefinition {
  id: SkinToneId;
  /** i18n key suffix under `wardrobe.analysis.skin_tone.tones.*`. */
  labelKey: string;
  /** Garment colours that flatter this tone, most recommended first. */
  palette: SkinToneSwatch[];
}

export const SKIN_TONES: SkinToneDefinition[] = [
  {
    id: 'fair_light',
    labelKey: 'fair_light',
    palette: [
      { nameKey: 'lavender', hex: '#c5a5d3' },
      { nameKey: 'dusty_rose', hex: '#cc8698' },
      { nameKey: 'mint_green', hex: '#c3ebe3' },
      { nameKey: 'baby_blue', hex: '#a0c2f1' },
      { nameKey: 'pearl_white', hex: '#f4f0ed' },
      { nameKey: 'cool_taupe', hex: '#a78f78' },
      { nameKey: 'soft_navy', hex: '#233661' },
      { nameKey: 'icy_grey', hex: '#c5bfc1' },
      { nameKey: 'blush_pink', hex: '#f7e3df' },
      { nameKey: 'ivory', hex: '#fef5ee' },
    ],
  },
  {
    id: 'light_medium',
    labelKey: 'light_medium',
    palette: [
      { nameKey: 'peach', hex: '#fda881' },
      { nameKey: 'coral', hex: '#f96259' },
      { nameKey: 'turquoise', hex: '#57adc6' },
      { nameKey: 'sage', hex: '#b6c19f' },
      { nameKey: 'camel', hex: '#e6c194' },
      { nameKey: 'warm_taupe', hex: '#9a8069' },
      { nameKey: 'rust', hex: '#b77234' },
      { nameKey: 'marigold', hex: '#f1b432' },
      { nameKey: 'honey', hex: '#ebbd8b' },
    ],
  },
  {
    id: 'medium_tan',
    labelKey: 'medium_tan',
    palette: [
      { nameKey: 'olive', hex: '#596114' },
      { nameKey: 'burnt_orange', hex: '#c5490d' },
      { nameKey: 'mustard', hex: '#e99b05' },
      { nameKey: 'teal', hex: '#017e97' },
      { nameKey: 'chocolate', hex: '#3d210c' },
      { nameKey: 'cobalt', hex: '#033a95' },
      { nameKey: 'burgundy', hex: '#6c0111' },
      { nameKey: 'khaki', hex: '#95895f' },
      { nameKey: 'forest_green', hex: '#025a44' },
    ],
  },
  {
    id: 'deep_dark',
    labelKey: 'deep_dark',
    palette: [
      { nameKey: 'sapphire', hex: '#032f6e' },
      { nameKey: 'oxblood', hex: '#7f151a' },
      { nameKey: 'emerald', hex: '#03593c' },
      { nameKey: 'pure_white', hex: '#fefefe' },
      { nameKey: 'sunflower', hex: '#fcb829' },
      { nameKey: 'ruby_red', hex: '#9c0000' },
      { nameKey: 'hunter_green', hex: '#0f2e1c' },
      { nameKey: 'fuchsia', hex: '#ca055d' },
      { nameKey: 'midnight', hex: '#12243b' },
    ],
  },
];

export const SKIN_TONE_BY_ID: Record<SkinToneId, SkinToneDefinition> =
  SKIN_TONES.reduce(
    (acc, tone) => ({ ...acc, [tone.id]: tone }),
    {} as Record<SkinToneId, SkinToneDefinition>,
  );

// Portraits (Figma skin-tone sheet). Static requires so Metro / Vite bundle
// them; one set per wardrobe gender.
const PORTRAITS: Record<
  SkinToneGender,
  Record<SkinToneId, ImageSourcePropType>
> = {
  men: {
    fair_light: require('../assets/images/skin-tone/men-fair.png'),
    light_medium: require('../assets/images/skin-tone/men-light-medium.png'),
    medium_tan: require('../assets/images/skin-tone/men-medium-tan.png'),
    deep_dark: require('../assets/images/skin-tone/men-deep.png'),
  },
  women: {
    fair_light: require('../assets/images/skin-tone/women-fair.png'),
    light_medium: require('../assets/images/skin-tone/women-light-medium.png'),
    medium_tan: require('../assets/images/skin-tone/women-medium-tan.png'),
    deep_dark: require('../assets/images/skin-tone/women-deep.png'),
  },
};

export const skinTonePortrait = (
  gender: SkinToneGender,
  id: SkinToneId,
): ImageSourcePropType => PORTRAITS[gender][id];
