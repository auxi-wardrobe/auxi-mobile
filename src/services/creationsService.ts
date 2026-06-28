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
  /** User-given outfit name from the save-flow naming step. Optional: creations
   *  saved before naming existed (or saved without a name) won't have one. */
  name?: string;
  /** Vibe tags the user attached on the canvas (may be empty). */
  tags: string[];
  items: CreationItem[];
  /** Canvas width the `items` transforms were laid out in, so the collage card
   *  can rescale the arrangement to its own (different) width. */
  canvasWidth: number;
}

export type NewCreation = Omit<Creation, 'id' | 'created_at'>;

/** How a save failed, for the UI to react. `auth` = the session expired: the
 *  apiClient 401 interceptor has already cleared tokens and fired
 *  session-expired (which redirects to login), so the caller should stay silent
 *  and let that global flow play out. `server` = any other HTTP failure — the
 *  save genuinely did NOT happen, so the caller should surface it. NOTE: a true
 *  offline failure (no HTTP response) does NOT throw — `saveCreation` falls back
 *  to the local store, preserving the deliberate offline-first resilience. */
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
  name?: string;
  tags: string[];
  items: CreationItem[];
  canvas_width: number;
}

/** Map the backend wire shape → the app's camelCase `Creation`. */
function mapServerCreation(s: ServerCreation): Creation {
  return {
    id: s.id,
    created_at: s.created_at,
    name: s.name,
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
  value.every(c => c && typeof c === 'object' && Array.isArray((c as Creation).items));

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

// ---------------------------------------------------------------------------
// Local creationId → name map. The backend `/creations` does not persist the
// `name` field yet, so a server round-trip would drop the title the user typed.
// We remember names the user gave on this device, keyed by the (server-assigned)
// creation id, and merge them back in listCreations — so titles show regardless
// of backend support. Drop the row in this map (server adds `name`) once the API
// echoes it. (Local-fallback creations already carry their name; we mirror it
// here too so there's one merge path.)
// ---------------------------------------------------------------------------

const NAME_STORAGE_KEY = '@auxi/creation-names';

async function readNameMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NAME_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/** Best-effort: remember the user's name for a creation id. A failed write must
 *  never break the save, so errors are swallowed. No-op when there's no name. */
async function rememberName(id: string, name?: string): Promise<void> {
  if (!name) {
    return;
  }
  try {
    const map = await readNameMap();
    map[id] = name;
    await AsyncStorage.setItem(NAME_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore — the name just won't survive a server round-trip this time.
  }
}

async function forgetName(id: string): Promise<void> {
  try {
    const map = await readNameMap();
    if (id in map) {
      delete map[id];
      await AsyncStorage.setItem(NAME_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore — an orphaned name row is harmless.
  }
}

/** Fill in `name` from the local map for any creation the server returned
 *  without one (because the backend dropped the field). */
async function mergeLocalNames(creations: Creation[]): Promise<Creation[]> {
  if (creations.every(c => c.name)) {
    return creations;
  }
  const nameMap = await readNameMap();
  return creations.map(c => (c.name ? c : { ...c, name: nameMap[c.id] }));
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
  await rememberName(creation.id, input.name);
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
      const creations = await mergeLocalNames(
        response.data.creations.map(mapServerCreation),
      );
      return { creations };
    } catch (error) {
      console.warn('listCreations: server unavailable, using local store', error);
      const creations = await mergeLocalNames(await readAll());
      return { creations };
    }
  },

  /** Persist a new creation and return it. Backend-first; on error saves
   *  locally (offline creations stay on-device only — see saveCreationLocal). */
  async saveCreation(input: NewCreation): Promise<Creation> {
    try {
      const response = await apiClient.post<ServerCreation>('/creations', {
        name: input.name,
        tags: input.tags,
        items: input.items,
        canvas_width: input.canvasWidth,
      });
      const created = mapServerCreation(response.data);
      // Remember the name locally keyed by the server id, so it survives even
      // when the backend drops the field (see mergeLocalNames). Fill it onto the
      // returned creation too for any immediate consumer.
      await rememberName(created.id, input.name);
      return created.name ? created : { ...created, name: input.name };
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
    // Drop any remembered name for this id (best-effort, runs regardless of
    // where the delete itself lands).
    await forgetName(id);
    try {
      await apiClient.delete(`/creations/${id}`);
    } catch (error) {
      console.warn('removeCreation: server unavailable, removing locally', error);
      const existing = await readAll();
      await writeAll(existing.filter(c => c.id !== id));
    }
  },
};
