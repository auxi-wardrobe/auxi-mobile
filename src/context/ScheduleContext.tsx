import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Favourite } from '../services/favouriteService';
import { Creation } from '../services/creationsService';

// A thing the user has planned onto a calendar day. Either a saved outfit
// (Favourite page) or a saved canvas creation (My Creations page) — both are
// schedulable, so the store holds a tagged union and the Schedule page renders
// each with its own existing card.
export type ScheduledOutfit =
  | { kind: 'favourite'; favourite: Favourite }
  | { kind: 'creation'; creation: Creation };

/** Stable identity for dedupe / unschedule, regardless of kind. */
export const scheduledOutfitId = (o: ScheduledOutfit): string =>
  o.kind === 'favourite' ? o.favourite.id : o.creation.id;

// day ("YYYY-MM-DD") → outfits planned for that day.
export type ScheduleMap = Record<string, ScheduledOutfit[]>;

// Persisted per-user under `@auxi/schedule/<userId>` (a `guest` bucket when
// signed out) so it survives relaunch and never bleeds one account's plan into
// another after logout/login — same scheme as FavouritesSeenContext.
//
// NOTE: this is a local, client-only store. When a real scheduling backend
// lands it replaces this provider; the consumer surface (`useSchedule()`) is
// intentionally small so that swap is contained.
type ScheduleContextValue = {
  scheduledByDay: ScheduleMap;
  /** Plan an outfit on a day. No-op if it is already on that day. */
  scheduleOutfit: (dayKey: string, outfit: ScheduledOutfit) => void;
  /** Remove an outfit from a day (by its favourite/creation id). */
  unscheduleOutfit: (dayKey: string, outfitId: string) => void;
};

const STORAGE_PREFIX = '@auxi/schedule/';
const GUEST_KEY = `${STORAGE_PREFIX}guest`;

const ScheduleContext = createContext<ScheduleContextValue>({
  scheduledByDay: {},
  scheduleOutfit: () => {},
  unscheduleOutfit: () => {},
});

// Coerce a persisted entry into a ScheduledOutfit. Tolerates the legacy shape
// (a bare Favourite stored before the union existed) so an upgrade doesn't drop
// previously-scheduled outfits.
const normalizeEntry = (e: unknown): ScheduledOutfit | null => {
  if (!e || typeof e !== 'object') {
    return null;
  }
  const obj = e as Record<string, unknown>;
  if (obj.kind === 'favourite' && obj.favourite) {
    return { kind: 'favourite', favourite: obj.favourite as Favourite };
  }
  if (obj.kind === 'creation' && obj.creation) {
    return { kind: 'creation', creation: obj.creation as Creation };
  }
  // Legacy: a bare Favourite (has outfit_items + id).
  if (Array.isArray(obj.outfit_items) && typeof obj.id === 'string') {
    return { kind: 'favourite', favourite: obj as unknown as Favourite };
  }
  return null;
};

const normalizeMap = (raw: unknown): ScheduleMap => {
  const out: ScheduleMap = {};
  if (raw && typeof raw === 'object') {
    for (const [day, list] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        const items = list
          .map(normalizeEntry)
          .filter((x): x is ScheduledOutfit => x !== null);
        if (items.length) {
          out[day] = items;
        }
      }
    }
  }
  return out;
};

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : GUEST_KEY;
  // Writes read the key from a ref so the persisted target always matches the
  // CURRENT account, even if a schedule/unschedule fires around a login change.
  const storageKeyRef = useRef(storageKey);
  const [scheduledByDay, setScheduledByDay] = useState<ScheduleMap>({});

  // Reload the plan whenever the active account changes.
  useEffect(() => {
    storageKeyRef.current = storageKey;
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(value => {
        if (!active) {
          return;
        }
        try {
          setScheduledByDay(value ? normalizeMap(JSON.parse(value)) : {});
        } catch {
          setScheduledByDay({});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storageKey]);

  const persist = useCallback((next: ScheduleMap) => {
    AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(next)).catch(
      () => {},
    );
  }, []);

  const scheduleOutfit = useCallback(
    (dayKey: string, outfit: ScheduledOutfit) => {
      const id = scheduledOutfitId(outfit);
      setScheduledByDay(prev => {
        const dayList = prev[dayKey] ?? [];
        if (dayList.some(o => scheduledOutfitId(o) === id)) {
          return prev; // already planned for this day — keep state identity
        }
        const next = { ...prev, [dayKey]: [outfit, ...dayList] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const unscheduleOutfit = useCallback(
    (dayKey: string, outfitId: string) => {
      setScheduledByDay(prev => {
        const dayList = prev[dayKey];
        if (!dayList) {
          return prev;
        }
        const filtered = dayList.filter(o => scheduledOutfitId(o) !== outfitId);
        const next = { ...prev };
        if (filtered.length) {
          next[dayKey] = filtered;
        } else {
          delete next[dayKey];
        }
        persist(next);
        return next;
      });
    },
    [persist],
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
