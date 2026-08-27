import { setTokens } from '../../src/services/tokenStorage';
import { persistLatestOutfits } from '../../src/screens/HomeScreen/last-outfits-store';
import {
  recordTryOnResult,
  setTryOnResultUser,
} from '../../src/services/tryOnResultStore';
import { PREVIEW_TRY_ON_HASH } from '../mocks/handlers';
import type { OutfitSheet } from '../../src/screens/HomeScreen/types';
import type { Item } from '../../src/types/item';

// Placeholder art served from /public (see web/mocks/handlers.ts `img`).
const ph = (fam: string): string =>
  (typeof location !== 'undefined' ? location.origin : '') + '/ph-' + fam + '.svg';

const seedItem = (id: string, name: string, fam: string, category: string): Item => ({
  id,
  image_url: ph(fam),
  image_png: null,
  name,
  category,
  color: '',
  isSystem: false,
  isExploration: false,
});

// A prior session's looks, so `?mock=1&home=ai_limit` demos the "View latest
// outfits" CTA end-to-end in a single load (no need to visit ?home=full first
// to record a real deck). Keyed to the /me fixture id (mock-user-1).
const SEED_LATEST: OutfitSheet[] = [
  { outfitHash: 'seed-1', caption: 'Clean weekday: crisp oxford with tailored trousers.', items: [seedItem('s1', 'White Oxford Shirt', 'top', 'Top'), seedItem('s2', 'Navy Trousers', 'bottom', 'Bottom'), seedItem('s3', 'Leather Loafers', 'footwear', 'Shoes')] },
  { outfitHash: 'seed-2', caption: 'Relaxed: soft knit over the same tailored base.', items: [seedItem('s4', 'Beige Knit', 'top', 'Top'), seedItem('s2', 'Navy Trousers', 'bottom', 'Bottom'), seedItem('s5', 'White Sneakers', 'footwear', 'Shoes')] },
  { outfitHash: 'seed-3', caption: 'Polished: charcoal blazer for the sharpest days.', items: [seedItem('s6', 'Charcoal Blazer', 'outerwear', 'Outerwear'), seedItem('s1', 'White Oxford Shirt', 'top', 'Top'), seedItem('s2', 'Navy Trousers', 'bottom', 'Bottom')] },
];

// Seed a far-future mock token so AuthContext boots authenticated and the app
// lands straight on Home (loads /me fixture via MSW). Stub mode: no real login.
export const seedMockAuth = async (): Promise<void> => {
  const farFuture = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  await setTokens({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    access_token_expires_at: farFuture,
    refresh_token_expires_at: farFuture,
    user_email: 'designer@auxi.test',
  });
  // Preview-only: seed the "latest outfits" store for the mock user.
  persistLatestOutfits('mock-user-1', SEED_LATEST, SEED_LATEST.length);
  // Preview-only: pretend the mock user already ran "See on me" on the first
  // saved outfit (`web/mocks/handlers.ts`), so the Favourite list shows BOTH
  // card states — one leading with its try-on photo, one without. Nothing on
  // the web can produce a real render (no camera, no AI job), and the photo
  // lives client-side keyed per user, so this is the only way the sandbox can
  // show that state. Points the cache at the mock user first — AuthContext's
  // own `setTryOnResultUser('mock-user-1')` on boot then no-ops (same key) and
  // the seeded entry survives.
  await setTryOnResultUser('mock-user-1');
  recordTryOnResult(PREVIEW_TRY_ON_HASH, ph('tryon'));
};
