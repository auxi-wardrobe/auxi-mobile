import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { Favourite } from '../services/favouriteService';
import { Creation } from '../services/creationsService';
import {
  scheduleService,
  type ScheduleEntry,
} from '../services/scheduleService';
import { trackOutfitUnscheduled } from '../services/analytics';

// A thing the user has planned onto a calendar day. Either a saved outfit
// (Favourite page) or a saved canvas creation (My Creations page) — both are
// schedulable, so the store holds a tagged union and the Schedule page renders
// each with its own existing card.
//
// `id` (optional) is the SERVER-assigned schedule-entry uuid — set when the
// outfit is loaded from, or persisted to, the backend. It is DISTINCT from the
// inner favourite/creation id and is what `unscheduleOutfit` uses to DELETE the
// entry server-side. It is only briefly absent during the optimistic window
// between an add and its server reconcile.
export type ScheduledOutfit =
  | { kind: 'favourite'; favourite: Favourite; id?: string }
  | { kind: 'creation'; creation: Creation; id?: string };

/** Stable CLIENT-side identity for the per-day dedupe guard, regardless of
 *  kind. NOTE: this is the inner favourite/creation id, NOT the server entry
 *  `id` — the two are intentionally different (one outfit can be planned on
 *  several days, each a distinct server entry). */
export const scheduledOutfitId = (o: ScheduledOutfit): string =>
  o.kind === 'favourite' ? o.favourite.id : o.creation.id;

// day ("YYYY-MM-DD") → outfits planned for that day.
export type ScheduleMap = Record<string, ScheduledOutfit[]>;

// Backend-first store. The canonical source is the server (`/schedule`, via
// scheduleService); AsyncStorage is an offline fallback only, handled entirely
// inside the service (no dual-write from here). The consumer surface
// (`useSchedule()`) is intentionally small and unchanged from the previous
// local-only implementation, so screens did not need to change.
type ScheduleContextValue = {
  scheduledByDay: ScheduleMap;
  /** Plan an outfit on a day. No-op if it is already on that day. */
  scheduleOutfit: (dayKey: string, outfit: ScheduledOutfit) => void;
  /** Remove an outfit from a day (by its favourite/creation id). */
  unscheduleOutfit: (dayKey: string, outfitId: string) => void;
};

const ScheduleContext = createContext<ScheduleContextValue>({
  scheduledByDay: {},
  scheduleOutfit: () => {},
  unscheduleOutfit: () => {},
});

/** Group the backend's flat entry list into the per-day map. The server returns
 *  entries ordered by date then `created_at` ASC, so pushing in order yields
 *  oldest-first within each day — the single ordering convention we keep in
 *  state (optimistic inserts append to match). */
const groupByDay = (entries: ScheduleEntry[]): ScheduleMap => {
  const out: ScheduleMap = {};
  for (const entry of entries) {
    (out[entry.dayKey] ??= []).push(entry.outfit);
  }
  return out;
};

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  // `user.id` is `number | string`; normalise to the string the service uses
  // for the per-user offline fallback key (null = guest).
  const userId = user?.id != null ? String(user.id) : null;
  const [scheduledByDay, setScheduledByDay] = useState<ScheduleMap>({});

  // Load (or reload) the plan whenever the active account changes. Reset to
  // empty first so the previous account's plan never flashes for the new user.
  useEffect(() => {
    let active = true;
    setScheduledByDay({});
    scheduleService
      .getSchedule(userId)
      .then(({ entries }) => {
        if (active) {
          setScheduledByDay(groupByDay(entries));
        }
      })
      .catch(() => {
        // getSchedule already falls back to local and does not throw; this is
        // belt-and-suspenders so a load failure leaves an empty plan, not a hang.
        if (active) {
          setScheduledByDay({});
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const scheduleOutfit = useCallback(
    (dayKey: string, outfit: ScheduledOutfit) => {
      const innerId = scheduledOutfitId(outfit);
      let didInsert = false;
      setScheduledByDay(prev => {
        const dayList = prev[dayKey] ?? [];
        // Client-side dedupe guard — the server does NOT dedupe, so this is what
        // prevents the same outfit being planned twice on one day.
        if (dayList.some(o => scheduledOutfitId(o) === innerId)) {
          return prev; // already planned for this day — keep state identity
        }
        didInsert = true;
        // Append (oldest-first within the day) to match the backend ordering.
        return { ...prev, [dayKey]: [...dayList, outfit] };
      });
      if (!didInsert) {
        return;
      }
      // Persist, then stamp the returned server entry `id` onto the in-state
      // outfit so a later unschedule can DELETE the right entry. addToSchedule
      // resolves with a local-id entry on network failure, so this reconcile
      // path is the same online and offline.
      scheduleService
        .addToSchedule(userId, { dayKey, outfit })
        .then(entry => {
          setScheduledByDay(prev => {
            const dayList = prev[dayKey];
            if (!dayList) {
              return prev;
            }
            return {
              ...prev,
              [dayKey]: dayList.map(o =>
                scheduledOutfitId(o) === innerId ? entry.outfit : o,
              ),
            };
          });
        })
        .catch(() => {
          // addToSchedule never throws (it falls back to local); leave the
          // optimistic entry in place if it somehow does.
        });
    },
    [userId],
  );

  const unscheduleOutfit = useCallback(
    (dayKey: string, outfitId: string) => {
      let removed: ScheduledOutfit | undefined;
      setScheduledByDay(prev => {
        const dayList = prev[dayKey];
        if (!dayList) {
          return prev;
        }
        removed = dayList.find(o => scheduledOutfitId(o) === outfitId);
        const filtered = dayList.filter(o => scheduledOutfitId(o) !== outfitId);
        const next = { ...prev };
        if (filtered.length) {
          next[dayKey] = filtered;
        } else {
          delete next[dayKey];
        }
        return next;
      });
      if (!removed) {
        return;
      }
      trackOutfitUnscheduled(removed.kind);
      // DELETE by the SERVER entry id (NOT scheduledOutfitId). When `id` is
      // absent — only in the brief optimistic window before an add reconciles —
      // there is nothing to delete server-side yet; the entry is gone from state
      // and the still-resolving add leaves an orphan (rare, acceptable).
      if (removed.id) {
        scheduleService.removeFromSchedule(userId, removed.id).catch(() => {});
      }
    },
    [userId],
  );

  const value = useMemo(
    () => ({ scheduledByDay, scheduleOutfit, unscheduleOutfit }),
    [scheduledByDay, scheduleOutfit, unscheduleOutfit],
  );

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = (): ScheduleContextValue =>
  useContext(ScheduleContext);
