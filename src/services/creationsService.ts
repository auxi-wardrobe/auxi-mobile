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
      console.warn('listCreations: server unavailable, using local store', error);
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
      console.warn('saveCreation: server unavailable, saving locally', error);
      return saveCreationLocal(input);
    }
  },

  async removeCreation(id: string): Promise<void> {
    try {
      await apiClient.delete(`/creations/${id}`);
    } catch (error) {
      console.warn('removeCreation: server unavailable, removing locally', error);
      const existing = await readAll();
      await writeAll(existing.filter(c => c.id !== id));
    }
  },
};
