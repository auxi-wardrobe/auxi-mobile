import axios from 'axios';
import { apiClient } from './apiClient';

// Body reference photos — backend router prefix `/api/body`:
//   GET    ""          → { count, items: BodyItem[] }
//   POST   ""          → multipart `file` upload → { message, body: BodyItem }
//   DELETE "/{id}"     → { message, id }
// All routes go through `apiClient` so they inherit the Bearer-token request
// interceptor and the 401 refresh-and-replay response interceptor.
//
// `POST /api/body` rejects bad body photos with HTTP 422 + a JSON body
// carrying `error_kind` ∈ {no_person, screenshot_or_graphic, multiple_people,
// too_small_or_occluded} and a user-facing `message`. The body-photo guard is
// the ONLY 422 cause on this route, so `uploadBody` treats ANY 422 as a
// body-photo rejection (regardless of `error_kind`, or its absence) and throws
// `BodyPhotoNotPersonError`. The `error_kind` / `message` may sit at the top
// level (lifted by the app.py exception handler) or nested under `detail`
// (FastAPI's raw envelope), so we check both positions for the `message`.

/** Body shapes the backend recognises for the reusable self-visualization profile. */
export type BodyShape = 'pear' | 'hourglass' | 'rectangle';

export interface BodyItem {
  id: string;
  user_id: string;
  image_url: string;
  created_at?: string;
  // AU-346 reusable self-visualization profile fields. Optional so legacy
  // body records (and the existing BodyScreen list) keep working unchanged.
  body_shape?: BodyShape | null;
  photo_type?: string;
  full_body_url?: string | null;
  is_primary?: boolean;
}

/**
 * A reusable self-visualization profile. Structurally identical to a body
 * record — the "active profile" is just the user's primary body record carrying
 * the shape + full-body reference so future outfits can be rendered without
 * re-capturing photos (AU-346).
 */
export type BodyProfile = BodyItem;

/**
 * Thrown by `uploadBody` when the backend rejects the uploaded photo as not a
 * usable body photo (ANY HTTP 422 — `no_person`, `screenshot_or_graphic`,
 * `multiple_people`, `too_small_or_occluded`, or none). Carries the backend's
 * user-facing `message` so callers can surface it directly (with an i18n
 * fallback). Callers should catch this specifically to distinguish "re-pick a
 * body photo of yourself" from a generic upload failure.
 */
export class BodyPhotoNotPersonError extends Error {
  /** The backend `message` field, when present (may be empty). */
  readonly backendMessage?: string;

  constructor(backendMessage?: string) {
    super(backendMessage || 'Uploaded photo does not contain a person');
    this.name = 'BodyPhotoNotPersonError';
    this.backendMessage = backendMessage;
    // Restore prototype chain for `instanceof` across the TS/RN transpile.
    Object.setPrototypeOf(this, BodyPhotoNotPersonError.prototype);
  }
}

// Narrow an unknown record-ish value to a string-keyed object, else undefined.
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * Detect a body-photo rejection: ANY HTTP 422 from `POST /api/body`. The guard
 * is the route's only 422 cause, so we don't gate on a specific `error_kind`
 * (it may be any of {no_person, screenshot_or_graphic, multiple_people,
 * too_small_or_occluded}, or absent). Returns the user-facing `message` —
 * which can live at `data.message` (lifted envelope) or `data.detail.message`
 * (nested) — when present, else `null` for any non-422 error shape.
 */
const matchBodyPhotoRejection = (
  error: unknown,
): { message?: string } | null => {
  if (!axios.isAxiosError(error)) return null;
  if (error.response?.status !== 422) return null;

  const data = asRecord(error.response.data) ?? {};
  const detail = asRecord(data.detail);

  const message =
    (typeof data.message === 'string' && data.message) ||
    (detail && typeof detail.message === 'string' && detail.message) ||
    undefined;
  return { message };
};

export const bodyService = {
  getBodies: async (): Promise<BodyItem[]> => {
    try {
      const response = await apiClient.get('/body');
      // Backend returns `{ count, items }`; tolerate a few legacy shapes.
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data?.bodies)) return data.bodies;
      return [];
    } catch (error) {
      console.error('Error fetching body items', error);
      throw error;
    }
  },

  // AU-346: the user's active reusable self-visualization profile (their
  // primary body record + shape + full-body reference). `GET /api/body/active`
  // returns `{ profile: Body | null }`; we tolerate a missing/legacy envelope
  // by coercing anything non-profile-shaped to null so a first-time user (no
  // profile yet) cleanly falls through to the capture flow.
  getActiveProfile: async (): Promise<BodyProfile | null> => {
    try {
      const response = await apiClient.get('/body/active');
      return response.data?.profile ?? null;
    } catch (error) {
      console.error('Error fetching active body profile', error);
      throw error;
    }
  },

  // AU-346: patch an existing body record into a reusable profile — set its
  // shape, attach the full-body reference, and/or mark it primary. Backend
  // `PATCH /api/body/{id}` returns `{ body: Body }`.
  updateBody: async (
    id: string,
    patch: { body_shape?: string; full_body_url?: string; is_primary?: boolean },
  ): Promise<BodyProfile> => {
    try {
      const response = await apiClient.patch(`/body/${id}`, patch);
      return response.data.body ?? response.data;
    } catch (error) {
      console.error('Error updating body', error);
      throw error;
    }
  },

  uploadBody: async (
    file: any,
    opts?: { body_shape?: string; photo_type?: string; is_primary?: boolean },
  ): Promise<BodyItem> => {
    try {
      // `POST /api/body` accepts the multipart file directly — no separate
      // `/upload/file` step. The route reads the `file` form field, validates
      // it, and creates the body record in one call. When provided, the AU-346
      // profile fields ride along as multipart fields so the record is created
      // already tagged (shape / photo_type / primary) — call sites that omit
      // `opts` are unaffected.
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName || 'upload.jpg',
      } as any);
      if (opts?.body_shape) {
        formData.append('body_shape', opts.body_shape);
      }
      if (opts?.photo_type) {
        formData.append('photo_type', opts.photo_type);
      }
      if (opts?.is_primary !== undefined) {
        formData.append('is_primary', String(opts.is_primary));
      }

      const response = await apiClient.post('/body', formData, {
        headers: {
          // Let RN/axios set the multipart boundary; overriding the default
          // application/json content-type from apiClient.
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: data => data,
      });

      // Route returns `{ message, body }`.
      return response.data.body ?? response.data;
    } catch (error) {
      // Any 422 → the photo isn't a usable body photo (the only 422 cause on
      // this route). Surface a typed error so the STOM flow can route the user
      // back to re-pick rather than showing the generic "try again" copy.
      const rejected = matchBodyPhotoRejection(error);
      if (rejected) {
        throw new BodyPhotoNotPersonError(rejected.message);
      }
      console.error('Error uploading body', error);
      throw error;
    }
  },

  deleteBody: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/body/${id}`);
    } catch (error) {
      console.error('Error deleting body', error);
      throw error;
    }
  },
};
