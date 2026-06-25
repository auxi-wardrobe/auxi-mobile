// Local "My Creations" store — everything the user makes in the Outfit Canvas
// (new canvases, remixed outfits) is saved here when they tap Save.
//
// There is NO backend for canvas creations yet (the rest of the app's server
// state goes through `apiClient`; this is deliberately a LOCAL seam). We persist
// to AsyncStorage, mirroring the analytics/ai-consent pattern, and expose a
// favouriteService-shaped API (list / save / remove) so the screen can drive it
// with React Query exactly like the Favourite list. When a real endpoint lands
// this module is the single swap point.

import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const creationsService = {
  /** Newest first, mirroring favouriteService.listFavourites()'s shape. */
  async listCreations(): Promise<{ creations: Creation[] }> {
    const creations = await readAll();
    return { creations };
  },

  /** Persist a new creation at the front of the list and return it. */
  async saveCreation(input: NewCreation): Promise<Creation> {
    const creation: Creation = {
      ...input,
      id: `creation-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      created_at: new Date().toISOString(),
    };
    const existing = await readAll();
    await writeAll([creation, ...existing]);
    return creation;
  },

  async removeCreation(id: string): Promise<void> {
    const existing = await readAll();
    await writeAll(existing.filter(c => c.id !== id));
  },
};
