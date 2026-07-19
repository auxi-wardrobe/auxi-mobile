import { http, HttpResponse, delay } from 'msw';
import user from './fixtures/user.json';

const variant = () =>
  new URLSearchParams(window.location.search).get('home') ?? 'full';

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

// ── Capsule Wardrobe mock data ───────────────────────────────────────────────
// Rich WardrobeItem-shaped items so the capsule tiles/detail render with images.
const cItem = (id: string, name: string, fam: string, category: string, formality: string) => ({
  id, name, image_url: img(name, fam), image_png: null, image_studio: null,
  category, category_family: fam.toUpperCase(), color_code: null, colors: [],
  dominant_color: null, color_hex: null, occasion: [], mood: [], style_tags: ['minimal'],
  description: null, formality_level: formality, is_common_item: false, is_favorited: false,
  usage_frequency: 'NORMAL', is_preparing: false, is_exploration_item: false,
  beautify_status: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
});
const C_ITEMS = [
  cItem('citm-1', 'White Oxford Shirt', 'top', 'shirt', 'smart_casual'),
  cItem('citm-2', 'Navy Trousers', 'bottom', 'trousers', 'smart_casual'),
  cItem('citm-3', 'Leather Loafers', 'footwear', 'shoes', 'smart_casual'),
  cItem('citm-4', 'Charcoal Blazer', 'outerwear', 'blazer', 'formal'),
  cItem('citm-5', 'Beige Knit', 'top', 'knit', 'casual'),
  cItem('citm-6', 'Wool Scarf', 'accessory', 'scarf', 'casual'),
];
const cById: Record<string, ReturnType<typeof cItem>> = Object.fromEntries(C_ITEMS.map(i => [i.id, i]));
const cOutfit = (id: string, ids: string[], note: string) => ({
  id, outfit_hash: 'cap-' + id, styling_note: note, item_ids: ids, items: ids.map(x => cById[x]),
});
const C_OUTFITS = [
  cOutfit('co-1', ['citm-1', 'citm-2', 'citm-3'], 'Clean weekday: crisp oxford with tailored trousers.'),
  cOutfit('co-2', ['citm-5', 'citm-2', 'citm-3'], 'Relaxed: soft knit over the same tailored base.'),
  cOutfit('co-3', ['citm-4', 'citm-1', 'citm-2', 'citm-3'], 'Polished: charcoal blazer for the sharpest days.'),
];
const capsuleFull = () => ({
  id: 'cap-1', name: 'Work Week', status: 'success', item_count: C_ITEMS.length, outfit_count: C_OUTFITS.length,
  created_at: '2026-07-18T08:00:00Z',
  requirements: { temp_min: 12, temp_max: 24, formalness_level: 6, outfit_target: 3, shoe_limit: 2 },
  category_groups: { outer: 1, top: 2, bottom: 1, footwear: 1, accessory: 1 },
  summary: { outer_count: 1, top_count: 2, bottom_count: 1, shoe_count: 1, accessory_count: 1, weather_range: '12°–24°C', formalness_score: 6 },
  items: C_ITEMS, outfits: C_OUTFITS, missing_categories: [],
});
const capsuleList = () => ({ capsules: [
  { id: 'cap-1', name: 'Work Week', status: 'success', item_count: 6, outfit_count: 3, created_at: '2026-07-18T08:00:00Z' },
  { id: 'cap-2', name: 'Weekend Travel', status: 'success_with_gaps', item_count: 4, outfit_count: 2, created_at: '2026-07-15T08:00:00Z' },
] });

// Registered before the catch-all so capsule calls get real shapes, not `{}`.
const capsuleHandlers = [
  http.get('*/api/capsules', () => HttpResponse.json(capsuleList())),
  http.get('*/api/capsules/:id', () => HttpResponse.json(capsuleFull())),
  // Slow create so the "generating" progress screen is visible for a preview.
  http.post('*/api/capsules', async () => { await delay(6000); return HttpResponse.json(capsuleFull(), { status: 201 }); }),
  http.post('*/api/capsules/:id/generate/retry', () => HttpResponse.json(capsuleFull())),
  http.post('*/api/capsules/:id/items/from-outfits', () => HttpResponse.json({ items_added: 4, already_existed: 2, new_outfits: 3, capsule: capsuleFull() })),
  http.post('*/api/capsules/:id/items/:itemId/change', () => HttpResponse.json(capsuleFull())),
  http.post('*/api/capsules/:id/items', () => HttpResponse.json({ items_added: 3, already_existed: 1, new_outfits: 2, capsule: capsuleFull() })),
  http.delete('*/api/capsules/:id/items/:itemId', () => HttpResponse.json({ removed: true, capsule: capsuleFull() })),
  http.delete('*/api/capsules/:id', () => HttpResponse.json({ deleted: true })),
];

export const handlers = [
  ...capsuleHandlers,
  http.get('*/api/me', () => HttpResponse.json(user)),
  http.get('*/me', () => HttpResponse.json(user)),
  http.post('*/api/auth/refresh', () => HttpResponse.json(tokens())),

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
  http.get('*/api/wardrobe*', () => HttpResponse.json({ items: C_ITEMS })),
  http.get('*/api/weather*', () => HttpResponse.json({ temp_c: 24, is_rainy: false })),

  http.all('*/api/*', () => HttpResponse.json({})),
];
