// "My Creations" store — everything the user makes in the Outfit Canvas
// (new canvases, remixed outfits) is saved here when they tap Save.
//
// Backend-first with a LOCAL fallback. The canonical store is the server
// (`/creations`, reached via `apiClient`, same as every other server-state
// service). On ANY network/HTTP error we fall back to AsyncStorage so the
// feature keeps working offline. This is resilience only — there is NO
// dual-write and NO offline→server sync: a creation saved while the server
// is unreachable lives on-device only and will not appear on other devices.
// That trade-off is acceptable (see saveCreationLocal).
//
// We expose a favouriteService-shaped API (list / save / remove) so the screen
// can drive it with React Query exactly like the Favourite list.

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { apiClient } from './apiClient';

const STORAGE_KEY = '@auxi/creations';

/** React Query cache key — shared by the canvas (invalidate on save) and the
 *  My Creations screen (read). */
export const CREATIONS_QUERY_KEY = ['creations'] as const;

// One positioned item inside a saved creation. Mirrors the canvas
// `CanvasItemData` transform fields, but stores a plain `imageUri` string (the
// canvas `imageSource` is an ImageSourcePropType that may also be a require()'d
// asset — not serializable) so the layout round-trips through AsyncStorage.
export interface CreationItem {
  id: string;
  /** Originating wardrobe item id. The canvas `id` is a synthetic per-instance
   *  key (`item-<wardrobeId>-<stamp>-<i>`), so we keep the real wardrobe id here
   *  for flows that need it — notably Self Visualization / virtual try-on, which
   *  takes wardrobe item ids. Optional: creations saved before this field
   *  existed won't have it (the My Creations screen recovers it from `id`). */
  wardrobeItemId?: string;
  imageUri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  scale?: number;
  rotation?: number;
}

export interface Creation {
  id: string;
  /** ISO timestamp — drives the per-card date label, same as a favourite. */
  created_at: string;
  /** Vibe tags the user attached on the canvas (may be empty). */
  tags: string[];
  items: CreationItem[];
  /** Canvas width the `items` transforms were laid out in, so the collage card
   *  can rescale the arrangement to its own (different) width. */
  canvasWidth: number;
}

export type NewCreation = Omit<Creation, 'id' | 'created_at'>;

// A canvas item id looks like `item-<wardrobeId>-<stamp>-<index>` (see
// OutfitCanvasScreen.handlePickerConfirm). Newer creations also store the raw
// `wardrobeItemId`; for older ones we recover it from that synthetic id.
const SYNTHETIC_ITEM_ID = /^item-(.+)-\d+-\d+$/;

/** The real wardrobe item id behind a creation item: the stored
 *  `wardrobeItemId` when present (newer saves), otherwise recovered from the
 *  synthetic canvas id. Returns undefined when neither yields one — callers use
 *  this to gate flows that need a real wardrobe id (try-on, item detail). */
export function resolveWardrobeItemId(item: CreationItem): string | undefined {
  return item.wardrobeItemId ?? SYNTHETIC_ITEM_ID.exec(item.id)?.[1];
}

/** How a save/remove failed, for the UI to react. `auth` = the session expired:
 *  the apiClient 401 interceptor has already cleared tokens and fired
 *  session-expired (which redirects to login), so the caller should stay silent
 *  and let that global flow play out. `server` = any other HTTP failure — the
 *  save/remove genuinely did NOT happen, so the caller should surface it. NOTE:
 *  a true offline failure (no HTTP response) does NOT throw — the offline-first
 *  fallback to the local store is preserved for both saveCreation and
 *  removeCreation. */
export type CreationSaveErrorKind = 'auth' | 'server';

export class CreationSaveError extends Error {
  readonly kind: CreationSaveErrorKind;
  constructor(kind: CreationSaveErrorKind, message: string) {
    super(message);
    this.name = 'CreationSaveError';
    this.kind = kind;
  }
}

// Backend wire shape. snake_case `canvas_width`; `items` is the exact
// CreationItem[] we POST, echoed back verbatim (camelCase preserved by the
// server). Internal to this module — the rest of the app speaks `Creation`.
interface ServerCreation {
  id: string;
  created_at: string;
  tags: string[];
  items: CreationItem[];
  canvas_width: number;
}

/** Map the backend wire shape → the app's camelCase `Creation`. */
function mapServerCreation(s: ServerCreation): Creation {
  return {
    id: s.id,
    created_at: s.created_at,
    tags: s.tags,
    items: s.items,
    canvasWidth: s.canvas_width,
  };
}

// ---------------------------------------------------------------------------
// Local AsyncStorage fallback impl. Used when the server is unreachable.
// ---------------------------------------------------------------------------

const isCreationArray = (value: unknown): value is Creation[] =>
  Array.isArray(value) &&
  value.every(
    c => c && typeof c === 'object' && Array.isArray((c as Creation).items),
  );

async function readAll(): Promise<Creation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return isCreationArray(parsed) ? parsed : [];
  } catch {
    // Corrupt/unreadable store → behave as empty rather than crashing the list.
    return [];
  }
}

async function writeAll(creations: Creation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(creations));
}

/** Local-only save (AsyncStorage). The offline fallback for saveCreation.
 *  NOTE: a creation persisted here lives on-device only — there is no
 *  offline→server sync, so it will not propagate to the backend or other
 *  devices later. Acceptable per scope. */
async function saveCreationLocal(input: NewCreation): Promise<Creation> {
  const creation: Creation = {
    ...input,
    id: `creation-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    created_at: new Date().toISOString(),
  };
  const existing = await readAll();
  await writeAll([creation, ...existing]);
  return creation;
}

export const creationsService = {
  /** Newest first, mirroring favouriteService.listFavourites()'s shape.
   *  Backend-first; falls back to the local store on any error. */
  async listCreations(): Promise<{ creations: Creation[] }> {
    try {
      const response = await apiClient.get<{ creations: ServerCreation[] }>(
        '/creations',
      );
      return { creations: response.data.creations.map(mapServerCreation) };
    } catch (error) {
      // Keep the graceful local-cache fallback for BOTH genuine offline and a
      // real server error (a read degrading to cached data is acceptable UX),
      // but only report the latter — offline is expected/frequent and would
      // just be Sentry noise.
      if (!(axios.isAxiosError(error) && !error.response)) {
        Sentry.captureException(error, { tags: { feature: 'creations_list' } });
      }
      console.warn(
        'listCreations: server unavailable, using local store',
        error,
      );
      const creations = await readAll();
      return { creations };
    }
  },

  /** Persist a new creation and return it. Backend-first; on error saves
   *  locally (offline creations stay on-device only — see saveCreationLocal). */
  async saveCreation(input: NewCreation): Promise<Creation> {
    try {
      const response = await apiClient.post<ServerCreation>('/creations', {
        tags: input.tags,
        items: input.items,
        canvas_width: input.canvasWidth,
      });
      return mapServerCreation(response.data);
    } catch (error) {
      // Genuine offline (the request never reached a server — no HTTP response)
      // keeps the deliberate offline-first resilience: persist locally so the
      // user doesn't lose the creation. NOTE: device-only, no later sync.
      if (axios.isAxiosError(error) && !error.response) {
        console.warn('saveCreation: offline, saving locally', error);
        return saveCreationLocal(input);
      }
      // A real HTTP failure. 401 = session expired: the apiClient interceptor
      // already tried to refresh and, on failure, cleared tokens + fired
      // session-expired (→ login). Flag it `auth` so the screen stays silent.
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new CreationSaveError('auth', 'session expired');
      }
      // Any other server/HTTP error: the save did NOT happen. Surface it so the
      // screen tells the user instead of faking success with a local write.
      console.warn('saveCreation: server error', error);
      throw new CreationSaveError('server', 'creation save failed');
    }
  },

  async removeCreation(id: string): Promise<void> {
    try {
      await apiClient.delete(`/creations/${id}`);
    } catch (error) {
      // Genuine offline (no HTTP response) — same resilience posture as
      // saveCreation: remove locally so the UI stays consistent.
      if (axios.isAxiosError(error) && !error.response) {
        console.warn('removeCreation: offline, removing locally', error);
        const existing = await readAll();
        await writeAll(existing.filter(c => c.id !== id));
        return;
      }
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new CreationSaveError('auth', 'session expired');
      }
      // A real HTTP failure: the remove did NOT happen server-side. Don't fake
      // a local-only removal — the creation would silently reappear on the
      // next server refetch. Surface it so the screen tells the user.
      console.warn('removeCreation: server error', error);
      throw new CreationSaveError('server', 'creation remove failed');
    }
  },
};
