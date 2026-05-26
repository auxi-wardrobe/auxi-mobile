/* eslint-env jest */
/**
 * Onboarding V2 config — pure mapping/label assertions (Phase 6 unit scope).
 *
 * Guards the load-bearing contract seams that the screens depend on:
 *  1. D2 fit UI-label → wire-value mapping (Regular → "Classic Fit").
 *  2. selectionChipLabels() reverses the wire values back to UI labels
 *     (Classic Fit → "Regular"); wire strings must NEVER reach the chips.
 *  3. WARDROBE / FIT / STYLE option wire values stay inside the v05Api
 *     closed allowlists (no drift from the backend authority).
 *  4. D7 — MAX_STYLE_PICKS is exactly 2.
 *  5. D3/D4 — placeholder/typo copy is gone ("MACGIE"/"Minmal"/"in you").
 *
 * Pure module — no renderer, no mocks needed.
 */
import {
  FIT_OPTIONS,
  MAX_STYLE_PICKS,
  STYLE_OPTIONS,
  WARDROBE_OPTIONS,
  COMPLETED_COPY,
  LOADING_COPY,
  STEP_COPY,
  WELCOME_COPY,
  selectionChipLabels,
} from '../config';
import {
  FIT_PREFERENCES,
  STYLE_TAGS,
  WARDROBE_DIRECTIONS,
} from '../../services/v05Api';

describe('config — D2 fit label↔wire mapping', () => {
  it('maps the three UI labels to the exact wire allowlist values', () => {
    const byLabel = Object.fromEntries(
      FIT_OPTIONS.map(o => [o.label, o.wireValue]),
    );
    expect(byLabel).toEqual({
      Slim: 'Slim Fit',
      Regular: 'Classic Fit',
      Relaxed: 'Relaxed Fit',
    });
  });

  it('UI label "Regular" is NOT a wire value (the wire never sees it)', () => {
    expect(FIT_PREFERENCES).not.toContain('Regular' as never);
    // wire value for Regular is the spaced "Classic Fit"
    const regular = FIT_OPTIONS.find(o => o.label === 'Regular');
    expect(regular?.wireValue).toBe('Classic Fit');
  });
});

describe('config — selectionChipLabels reverse-mapping', () => {
  it('resolves Classic Fit → "Regular" and keeps wire values out of the UI', () => {
    const chips = selectionChipLabels({
      wardrobe_direction: 'Menswear',
      fit_preference: 'Classic Fit',
      style_preferences: ['Minimal', 'Bold'],
    });
    expect(chips).toEqual(['Menswear', 'Regular', 'Minimal', 'Bold']);
    expect(chips).not.toContain('Classic Fit');
  });

  it('preserves the ranked style order in the chip output', () => {
    const chips = selectionChipLabels({
      wardrobe_direction: 'Womenswear',
      fit_preference: 'Slim Fit',
      style_preferences: ['Formal', 'Soft'],
    });
    // wardrobe, fit, then styles in ranked order
    expect(chips).toEqual(['Womenswear', 'Slim', 'Formal', 'Soft']);
  });
});

describe('config — enum parity with v05Api allowlist', () => {
  it('every WARDROBE_OPTIONS wire value is in WARDROBE_DIRECTIONS', () => {
    WARDROBE_OPTIONS.forEach(o =>
      expect(WARDROBE_DIRECTIONS).toContain(o.value),
    );
    // and the option set covers the full allowlist (no missing direction)
    expect(WARDROBE_OPTIONS.map(o => o.value).sort()).toEqual(
      [...WARDROBE_DIRECTIONS].sort(),
    );
  });

  it('every FIT_OPTIONS wire value is in FIT_PREFERENCES', () => {
    FIT_OPTIONS.forEach(o => expect(FIT_PREFERENCES).toContain(o.wireValue));
    expect(FIT_OPTIONS.map(o => o.wireValue).sort()).toEqual(
      [...FIT_PREFERENCES].sort(),
    );
  });

  it('every STYLE_OPTIONS wire value is in STYLE_TAGS', () => {
    STYLE_OPTIONS.forEach(o => expect(STYLE_TAGS).toContain(o.value));
    expect(STYLE_OPTIONS.map(o => o.value).sort()).toEqual(
      [...STYLE_TAGS].sort(),
    );
  });
});

describe('config — D7 pick count', () => {
  it('MAX_STYLE_PICKS is exactly 2', () => {
    expect(MAX_STYLE_PICKS).toBe(2);
  });
});

describe('config — D3/D4 copy hygiene (no placeholders/typos)', () => {
  const allCopy = JSON.stringify({
    WELCOME_COPY,
    STEP_COPY,
    LOADING_COPY,
    COMPLETED_COPY,
    STYLE_OPTIONS,
  });

  it('has no "MACGIE" placeholder (D3)', () => {
    expect(allCopy).not.toMatch(/MACGIE/i);
  });

  it('has no "Minmal" typo and includes the corrected "Minimal" (D4)', () => {
    expect(allCopy).not.toMatch(/Minmal/);
    expect(STYLE_OPTIONS.some(o => o.label === 'Minimal')).toBe(true);
  });

  it('has no "in you profile" typo (D4)', () => {
    expect(allCopy).not.toMatch(/in you profile/);
  });

  it('Loading/Completed headlines use "Your wardrobe" (D3)', () => {
    expect(LOADING_COPY.headline).toMatch(/Your wardrobe/);
    expect(COMPLETED_COPY.headline).toMatch(/Your wardrobe/);
  });
});
