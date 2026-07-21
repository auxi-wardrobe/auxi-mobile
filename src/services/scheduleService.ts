// Schedule store — outfits the user plans onto calendar days (Favourite outfits
// and canvas Creations are both schedulable).
//
// Backend-first with a LOCAL fallback, mirroring creationsService. The canonical
// store is the server (`/schedule`, reached via `apiClient`). On ANY network/HTTP
// error we fall back to AsyncStorage so planning keeps working offline. This is
// resilience only — there is NO dual-write and NO offline→server sync: an entry
// scheduled while the server is unreachable lives on-device only (under
// `@auxi/schedule/<userId>`) and will not appear on other devices. Pre-existing
// local-only schedule data from the AsyncStorage-only era is NOT migrated to the
// server — once online, the server is canonical and the old local plan is
// ignored (and overwritten on the first offline write). That trade-off is
// acceptable (same posture as creations).

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { apiClient } from './apiClient';
// Type-only import: erased at compile time, so there is no runtime require cycle
// with ScheduleContext (which imports this service's value at runtime).
import type { ScheduledOutfit } from '../context/ScheduleContext';

// Per-user fallback bucket (a `guest` bucket when signed out) so one account's
// offline plan never bleeds into another after logout/login.
const STORAGE_PREFIX = '@auxi/schedule/';
const localKeyFor = (userId: string | null): string =>
  `${STORAGE_PREFIX}${userId ?? 'guest'}`;

/**
 * A planned outfit on a calendar day.
 *
 * `id` is the SERVER-assigned uuid for the schedule entry — DISTINCT from the
 * inner favourite/creation id. The same `id` is also stamped onto `outfit` so a
 * consumer holding only the `ScheduledOutfit` (e.g. the context state) can
 * DELETE it by the right id.
 */
export interface ScheduleEntry {
  id: string;
  /** `scheduled_date` — the local-date dayKey "YYYY-MM-DD" (see utils/dateKey). */
  dayKey: string;
  outfit: ScheduledOutfit;
}

// Backend wire shape. snake_case `scheduled_date` + `created_at`; `outfit` is the
// whole `ScheduledOutfit` union stored verbatim; `kind` mirrors `outfit.kind`.
// Internal to this module — the rest of the app speaks `ScheduleEntry`.
interface ServerScheduleEntry {
  id: string;
  scheduled_date: string;
  kind: 'favourite' | 'creation';
  outfit: ScheduledOutfit;
  created_at: string;
}

/** Map the backend wire shape → the app's `ScheduleEntry`. Stamps the server
 *  entry `id` onto the outfit so a later unschedule can DELETE by it. */
function mapServerEntry(s: ServerScheduleEntry): ScheduleEntry {
  return {
    id: s.id,
    dayKey: s.scheduled_date,
    outfit: { ...s.outfit, id: s.id },
  };
}

// ---------------------------------------------------------------------------
// Local AsyncStorage fallback impl. Used when the server is unreachable.
// Stores a flat `ScheduleEntry[]` (newest at the end → oldest-first within a
// day, matching the backend's `created_at` ASC ordering).
// ---------------------------------------------------------------------------

// True for a genuine offline failure (no HTTP response ever arrived) — the
// expected, frequent case that shouldn't be reported. Anything else is a real
// server/HTTP error worth reporting, even though we still gracefully fall back
// to the local store for it (resilience posture unchanged).
const isOffline = (error: unknown): boolean =>
  axios.isAxiosError(error) && !error.response;

const isScheduleEntryArray = (value: unknown): value is ScheduleEntry[] =>
  Array.isArray(value) &&
  value.every(
    e =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as ScheduleEntry).id === 'string' &&
      typeof (e as ScheduleEntry).dayKey === 'string' &&
      (e as ScheduleEntry).outfit != null,
  );

async function readAllLocal(userId: string | null): Promise<ScheduleEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(localKeyFor(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    // Anything that is not the current flat-entry shape (e.g. the legacy
    // ScheduleMap from the AsyncStorage-only era) is treated as empty rather
    // than crashing — it is non-canonical and intentionally not migrated.
    return isScheduleEntryArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllLocal(
  userId: string | null,
  entries: ScheduleEntry[],
): Promise<void> {
  await AsyncStorage.setItem(localKeyFor(userId), JSON.stringify(entries));
}

/** Local-only add (AsyncStorage). The offline fallback for addToSchedule.
 *  NOTE: an entry persisted here lives on-device only — there is no
 *  offline→server sync, so it will not propagate to the backend or other
 *  devices later. */
async function addToScheduleLocal(
  userId: string | null,
  input: { dayKey: string; outfit: ScheduledOutfit },
): Promise<ScheduleEntry> {
  const id = `schedule-local-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const entry: ScheduleEntry = {
    id,
    dayKey: input.dayKey,
    outfit: { ...input.outfit, id },
  };
  const existing = await readAllLocal(userId);
  // Append (oldest-first within a day) to stay consistent with the server order.
  await writeAllLocal(userId, [...existing, entry]);
  return entry;
}

export const scheduleService = {
  /** Load planned outfits. `GET /schedule?start&end` (both optional + inclusive;
   *  omit = all). Returns a flat list ordered by date then created_at ASC.
   *  Backend-first; falls back to the local store on any error. */
  async getSchedule(
    userId: string | null,
    start?: string,
    end?: string,
  ): Promise<{ entries: ScheduleEntry[] }> {
    try {
      // axios drops `undefined` params, so omitting start/end sends neither.
      const response = await apiClient.get<{ entries: ServerScheduleEntry[] }>(
        '/schedule',
        { params: { start, end } },
      );
      return { entries: response.data.entries.map(mapServerEntry) };
    } catch (error) {
      if (!isOffline(error)) {
        Sentry.captureException(error, { tags: { feature: 'schedule_get' } });
      }
      console.warn('getSchedule: server unavailable, using local store', error);
      return { entries: await readAllLocal(userId) };
    }
  },

  /** Plan an outfit on a day. `POST /schedule` → the persisted entry (with the
   *  server `id`). Backend-first; on error saves locally (offline entries stay
   *  on-device only — see addToScheduleLocal). The server does NOT dedupe —
   *  the caller (ScheduleContext) owns the per-day dedupe guard. */
  async addToSchedule(
    userId: string | null,
    input: { dayKey: string; outfit: ScheduledOutfit },
  ): Promise<ScheduleEntry> {
    try {
      const response = await apiClient.post<ServerScheduleEntry>('/schedule', {
        scheduled_date: input.dayKey,
        kind: input.outfit.kind,
        outfit: input.outfit,
      });
      return mapServerEntry(response.data);
    } catch (error) {
      if (!isOffline(error)) {
        Sentry.captureException(error, { tags: { feature: 'schedule_add' } });
      }
      console.warn('addToSchedule: server unavailable, saving locally', error);
      return addToScheduleLocal(userId, input);
    }
  },

  /** Remove a planned outfit by its SERVER entry id. `DELETE /schedule/{id}`.
   *  Backend-first; on error removes from the local store by the same id. */
  async removeFromSchedule(userId: string | null, id: string): Promise<void> {
    try {
      await apiClient.delete(`/schedule/${id}`);
    } catch (error) {
      if (!isOffline(error)) {
        Sentry.captureException(error, {
          tags: { feature: 'schedule_remove' },
        });
      }
      console.warn(
        'removeFromSchedule: server unavailable, removing locally',
        error,
      );
      const existing = await readAllLocal(userId);
      await writeAllLocal(
        userId,
        existing.filter(e => e.id !== id),
      );
    }
  },
};
