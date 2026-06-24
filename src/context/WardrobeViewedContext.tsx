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

// Per-item "seen" tracking for the wardrobe grid's "New" badge.
//
// The grid surfaces a "new" tag on any of the user's own items until they open
// the item detail for the first time ("uploaded successfully but not viewed
// yet"). Opening detail records the id here, which clears the tag on the next
// render.
//
// The set is persisted per-user (so it survives relaunch and never bleeds one
// account's state into another after logout/login) under
// `@auxi/wardrobe/viewed/<userId>`, with a `guest` bucket for signed-out use.
type WardrobeViewedContextValue = {
  /** True when the user has opened this item's detail at least once. */
  isViewed: (itemId: string) => boolean;
  /** Record that the user opened this item's detail — clears its "new" tag. */
  markViewed: (itemId: string) => void;
};

const STORAGE_PREFIX = '@auxi/wardrobe/viewed/';
const GUEST_KEY = `${STORAGE_PREFIX}guest`;

const WardrobeViewedContext = createContext<WardrobeViewedContextValue>({
  isViewed: () => false,
  markViewed: () => {},
});

export const WardrobeViewedProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : GUEST_KEY;
  // Writes read the key from a ref so the persisted target always matches the
  // CURRENT account, even if a markViewed fires right around a login boundary.
  const storageKeyRef = useRef(storageKey);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Reload the viewed set whenever the active account changes. Defaults to an
  // empty set for accounts with no stored value.
  useEffect(() => {
    storageKeyRef.current = storageKey;
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(value => {
        if (!active) {
          return;
        }
        if (!value) {
          setViewedIds(new Set());
          return;
        }
        try {
          const parsed = JSON.parse(value);
          setViewedIds(
            new Set(Array.isArray(parsed) ? parsed.map(String) : []),
          );
        } catch {
          setViewedIds(new Set());
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storageKey]);

  const markViewed = useCallback((itemId: string) => {
    if (!itemId) {
      return;
    }
    setViewedIds(prev => {
      if (prev.has(itemId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(itemId);
      AsyncStorage.setItem(
        storageKeyRef.current,
        JSON.stringify([...next]),
      ).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<WardrobeViewedContextValue>(
    () => ({
      isViewed: (itemId: string) => viewedIds.has(itemId),
      markViewed,
    }),
    [viewedIds, markViewed],
  );

  return (
    <WardrobeViewedContext.Provider value={value}>
      {children}
    </WardrobeViewedContext.Provider>
  );
};

export const useWardrobeViewed = (): WardrobeViewedContextValue =>
  useContext(WardrobeViewedContext);
