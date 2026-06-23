import { http, HttpResponse, delay } from 'msw';
import user from './fixtures/user.json';

const variant = () =>
  new URLSearchParams(window.location.search).get('home') ?? 'full';

// Design-review toggle: `?onboarding` (or `?onboarding=1`) flips the mock user
// to first-login so the app boots straight into the V2 onboarding flow
// (Welcome → LocationPermission → Wardrobe → Fit → Styles → Loading →
// Completed → Outro). Default (no param) is unchanged → lands on Home.
const onboardingMode = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('onboarding');

const meResponse = () =>
  onboardingMode() ? { ...user, is_first_login: true } : user;

// Self-contained data-URI placeholder (no external host -> never fails).
const palette: Record<string, string> = {
  top: '#cfe3ff', bottom: '#d8d2c6', footwear: '#e7d6c2', outerwear: '#c8d0d8',
};
const FAMS=['top','bottom','footwear','outerwear'];
 const img = (_label, fam) => (typeof location!=='undefined'?location.origin:'') + '/ph-' + (FAMS.includes(fam)?fam:'generic') + '.svg';

 const vibe = () => ({
  dominant_color_family: 'neutral', dominant_silhouette: 'tailored',
  formality_band: 'smart_casual', statement_level_avg: 0.4,
  aesthetic_tags: ['clean', 'minimal'],
});

const item = (id: string, name: string, fam: string) => ({
  id, human_readable_id: id, name, image_url: img(name, fam), image_png: null,
  category_family: fam, color_code: null, style_tags: ['minimal'],
  formality_level: 'smart_casual', source: 'user', is_exploration_item: false,
});

const OUTFITS = [
  { items: [item('itm-1', 'White Oxford Shirt', 'top'), item('itm-2', 'Navy Trousers', 'bottom'), item('itm-3', 'Leather Loafers', 'footwear')],
    vibe_signature: vibe(), reasoning_human: 'Clean weekday: crisp oxford with tailored trousers.', reasoning_debug: 'mock', score: 0.92, outfit_hash: 'mock-hash-1', tier_role: 'safe' },
  { items: [item('itm-4', 'Beige Knit', 'top'), item('itm-5', 'Straight Denim', 'bottom'), item('itm-6', 'White Sneakers', 'footwear')],
    vibe_signature: vibe(), reasoning_human: 'Relaxed: knit over tee with straight denim.', reasoning_debug: 'mock', score: 0.88, outfit_hash: 'mock-hash-2', tier_role: 'elevated' },
  { items: [item('itm-7', 'Charcoal Blazer', 'outerwear'), item('itm-8', 'Wool Trousers', 'bottom'), item('itm-9', 'Chelsea Boots', 'footwear')],
    vibe_signature: vibe(), reasoning_human: 'Polished: blazer with a fine-gauge layer.', reasoning_debug: 'mock', score: 0.85, outfit_hash: 'mock-hash-3', tier_role: 'exploratory' },
];

const trace = () => ({ engine_version: 'mock-1', layer_timings_ms: {}, pool_sizes_after_L1: {}, skipped_log_count: 0, fallback_flags: [] });
const buildResponse = () => ({ outfits: OUTFITS, suggested_default: 0, trace: trace(), session_id: 'mock-session-1', wardrobe_gap: false, tier_pools_partial: false, low_confidence: false });
let ta = 0;
const tryAnotherResponse = () => { ta += 1; return { outfit: OUTFITS[ta % OUTFITS.length], session_id: 'mock-session-1', fallback: false, fallback_flags: [], trace: trace(), message: null }; };
const tokens = () => ({ access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', expires_in: 31536000, refresh_expires_in: 31536000, token_type: 'Bearer' });

export const handlers = [
  http.get('*/api/me', () => HttpResponse.json(meResponse())),
  http.get('*/me', () => HttpResponse.json(meResponse())),
  http.post('*/api/auth/refresh', () => HttpResponse.json(tokens())),

  // Onboarding starter-wardrobe generation — stubbed so the Loading screen's
  // in-flight POST resolves and the flow advances to Completed → Outro.
  http.post('*/api/v05/onboarding/generate', async () => {
    await delay(900);
    const styleAffinities = {
      minimal: 1.0, classic: 0.7, street: 0.4, romantic: 0.0, bold: 0.0,
    } as Record<string, number>;
    return HttpResponse.json({
      wardrobe_items: OUTFITS.flatMap(o => o.items).map((it, i) => ({
        id: `usr-${i}`, human_readable_id: `USR_${i}`, name: it.name,
        image_url: it.image_url, category: it.category_family,
        category_code: it.category_family, category_family: it.category_family,
        layer_code: 'base', style_tags: ['minimal'], gender_tags: ['female'],
        styling_metadata: {}, physical_attributes: {},
      })),
      profile_classification: {
        gender_style: 'female', fit_classification: 'balanced',
        style_affinities: styleAffinities,
      },
      trace: {
        pool_size_after_gender_filter: 120, pool_size_with_style_tags: 80,
        fallback_used: false, fallback_reason: null,
        style_tag_diversity_count: 3,
        category_distribution: { top: 3, bottom: 3, footwear: 2, outerwear: 1 },
        total_items: 9, style_affinity_weights: styleAffinities, elapsed_ms: 900,
      },
    });
  }),

  http.post('*/api/v05/recommendation/build', async () => {
    if (variant() === 'loading') await delay('infinite');
    if (variant() === 'error') return new HttpResponse(null, { status: 500 });
    if (variant() === 'empty')
      return HttpResponse.json({ outfits: [], suggested_default: 0, trace: trace(), wardrobe_gap: true, wardrobe_gap_reason: 'cold_weather_no_outerwear' });
    return HttpResponse.json(buildResponse());
  }),
  http.post('*/api/v05/recommendation/try_another', async () => {
    if (variant() === 'error') return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(tryAnotherResponse());
  }),

  http.post('*/api/recommendation/start', () => HttpResponse.json({ session_id: 'mock-session-1', outfit: { items: OUTFITS[0].items, styling_note: OUTFITS[0].reasoning_human, outfit_hash: 'mock-hash-1', fallback_flags: [] } })),
  http.post('*/api/recommendation/next', () => HttpResponse.json({ session_id: 'mock-session-1', outfit: { items: OUTFITS[(ta += 1) % 3].items, styling_note: 'mock', outfit_hash: 'mock-hash-' + ((ta % 3) + 1), fallback_flags: [] } })),

  http.all('*/api/v05/mood-feedback/policy', () => HttpResponse.json({ enabled: false })),
  http.post('*/api/v05/feedback', () => HttpResponse.json({ ok: true })),
  http.post('*/api/favourites', () => HttpResponse.json({ ok: true })),
  http.get('*/api/favorites', () => HttpResponse.json([])),
  http.delete('*/api/favorites/:id', () => HttpResponse.json({ ok: true })),
  http.get('*/api/body*', () => HttpResponse.json([])),
  http.get('*/api/items*', () => HttpResponse.json([])),
  http.get('*/api/wardrobe*', () => HttpResponse.json([])),
  http.get('*/api/weather*', () => HttpResponse.json({ temp_c: 24, is_rainy: false })),

  http.all('*/api/*', () => HttpResponse.json({})),
];
