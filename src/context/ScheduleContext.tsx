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

// Outfits the user has planned onto calendar days. Keyed by day ("YYYY-MM-DD")
// → the saved outfits scheduled for that day. The Favourite page's "add to
// schedule" action writes here and the Schedule page reads from it, so the two
// screens stay in lock-step without a backend.
//
// Persisted per-user under `@auxi/schedule/<userId>` (a `guest` bucket when
// signed out) so it survives relaunch and never bleeds one account's plan into
// another after logout/login — same scheme as FavouritesSeenContext.
//
// NOTE: this is a local, client-only store. When a real scheduling backend
// lands it replaces this provider; the screen/consumer surface
// (`useSchedule()`) is intentionally small so that swap is contained.
export type ScheduleMap = Record<string, Favourite[]>;

type ScheduleContextValue = {
  scheduledByDay: ScheduleMap;
  /** Plan an outfit on a day. No-op if that outfit is already on that day. */
  scheduleOutfit: (dayKey: string, outfit: Favourite) => void;
  /** Remove an outfit from a day. */
  unscheduleOutfit: (dayKey: string, outfitId: string) => void;
};

const STORAGE_PREFIX = '@auxi/schedule/';
const GUEST_KEY = `${STORAGE_PREFIX}guest`;

const ScheduleContext = createContext<ScheduleContextValue>({
  scheduledByDay: {},
  scheduleOutfit: () => {},
  unscheduleOutfit: () => {},
});

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
          setScheduledByDay(value ? (JSON.parse(value) as ScheduleMap) : {});
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
    (dayKey: string, outfit: Favourite) => {
      setScheduledByDay(prev => {
        const dayList = prev[dayKey] ?? [];
        if (dayList.some(o => o.id === outfit.id)) {
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
        const filtered = dayList.filter(o => o.id !== outfitId);
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
