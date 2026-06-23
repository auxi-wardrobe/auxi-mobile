/**
 * ds-tokens.ts — DS-PAGE-LOCAL design tokens for the NEW claude.ai showcase.
 *
 * Source of truth: plans/260624-0030-GH-364-design-system-page/reference/
 *                  auxi-showcase.reference.css (exported from claude.ai/design
 *                  project "auxi", 2026-06-24). Poppins-only.
 *
 * IMPORTANT — these values INTENTIONALLY DIVERGE from src/theme/theme.ts.
 * They are the NEW target design system and are used ONLY by the in-app
 * Design System reference page (src/components/design-system/** +
 * src/screens/DesignSystemScreen.tsx). Do NOT import these into product
 * screens, and do NOT mutate theme.ts to match — product migration is a
 * separate, later task (see GH-364 spec "Unresolved").
 *
 * Token-lint note: this file is the DS page's own theme module — hex + font
 * literals live here by design (it sits under components/design-system/, which
 * the lint scope excludes). The DS *screen* file itself stays token-only.
 */
import { Platform } from 'react-native';

// ── Type · Poppins only (mono = platform fallback, overlines only) ──────────
// Poppins ships Regular/Medium/SemiBold/Bold faces (src/assets/fonts/).
export const FONT = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
} as const;

// JetBrains Mono is NOT bundled — fall back to the platform monospace face.
// Used ONLY for spec overlines / mono captions per the showcase.
export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

// ── Color ramps (new) ───────────────────────────────────────────────────────
export const color = {
  // Primary · warm sand/taupe (brand neutral)
  p50: '#F2EFEB',
  p100: '#EEE6DE',
  p200: '#E0D2C4',
  p300: '#C6BBB1',
  p400: '#9E968E',
  p500: '#5B554F',
  p600: '#262321',
  p700: '#070606',

  // Neutral · cool gray ramp
  n50: '#FCFCFD',
  n100: '#F2F4F7',
  n200: '#E4E7EC',
  n300: '#D0D5DD',
  n400: '#AAB1BA',
  n500: '#797E89',
  n600: '#40444D',
  n700: '#282B31',
  n800: '#1D1F23',
  n900: '#16181C',
  nBlack: '#121212',
  white: '#FFFFFF',

  // Success · teal/green
  su100: '#A0F5E4',
  su200: '#4BF3D2',
  su400: '#16A085',
  su500: '#045130',

  // Danger
  da50: '#FEF3F2',
  da100: '#FDE1E1',
  da200: '#FCA5A5',
  da300: '#E74C3C',
  da400: '#C0392B',
  da500: '#831A12',
  da600: '#4B0F0A',
  da700: '#250705',

  // Warning
  wa50: '#FFF9F4',
  wa100: '#FCF0DB',
  wa400: '#D35400',
  wa500: '#983C00',

  // Info
  in50: '#F1F7FD',
  in100: '#DCEDFC',
  in200: '#84CAFF',
  in300: '#53A1EB',
  in400: '#1465B4',
  in500: '#0C3D6C',
  in600: '#0A335A',
  in700: '#061E36',

  // Mint accent (snackbar action variant)
  mint: '#4CF4D3',
} as const;

// ── Semantic roles ──────────────────────────────────────────────────────────
export const role = {
  ink: color.n800, // primary text
  ink2: color.n600, // secondary text
  ink3: color.n500, // muted / hints
  surface: color.white,
  surface2: color.n50,
  surfaceCream: color.p50,
  line: color.n200,
  lineCream: color.p100,
  borderSubtle: color.n100,
} as const;

// ── Radius (new scale) ──────────────────────────────────────────────────────
export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  '4xl': 32,
  full: 999,
} as const;

// ── Spacing (4-pt scale) ────────────────────────────────────────────────────
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

// ── Elevation (RN shadow objects approximating the CSS box-shadows) ──────────
export const shadow = {
  card: {
    shadowColor: '#1D2646',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#1D2646',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dialog: {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  sheet: {
    shadowColor: '#1D2646',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

// ── Icon sizes ──────────────────────────────────────────────────────────────
export const icon = { L: 32, M: 24, S: 16 } as const;

// ── Type scale (Poppins; sizes from the showcase) ──────────────────────────
export const type = {
  display: { fontFamily: FONT.bold, fontSize: 40, lineHeight: 46 },
  h1: { fontFamily: FONT.bold, fontSize: 32, lineHeight: 38 },
  h2: { fontFamily: FONT.semibold, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: FONT.semibold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: FONT.regular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: FONT.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: FONT.regular, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: MONO,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export const dsTokens = {
  FONT,
  MONO,
  color,
  role,
  radius,
  space,
  shadow,
  icon,
  type,
} as const;

export type DsTokens = typeof dsTokens;
