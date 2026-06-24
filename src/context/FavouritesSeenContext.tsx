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

// "Unseen saved looks" indicator for the Home header favourites heart.
//
// The mint dot signals that the user has saved a look ("Wear this") that they
// haven't reviewed yet. Opening the Favourite page clears it; the next save
// turns it back on. The flag is persisted per-user (so it survives relaunch and
// never bleeds one account's state into another after logout/login) under
// `@auxi/favourites/unseen/<userId>`, with a `guest` bucket for signed-out use.
type FavouritesSeenContextValue = {
  /** True when there are saved looks the user hasn't opened the list to see. */
  hasUnseen: boolean;
  /** Call after a successful save ("Wear this") — turns the dot on. */
  markSaved: () => void;
  /** Call when the Favourite list is viewed — turns the dot off. */
  markSeen: () => void;
};

const STORAGE_PREFIX = '@auxi/favourites/unseen/';
const GUEST_KEY = `${STORAGE_PREFIX}guest`;

const FavouritesSeenContext = createContext<FavouritesSeenContextValue>({
  hasUnseen: false,
  markSaved: () => {},
  markSeen: () => {},
});

export const FavouritesSeenProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : GUEST_KEY;
  // Writes read the key from a ref so the persisted target always matches the
  // CURRENT account, even if a save/seen fires right around a login boundary.
  const storageKeyRef = useRef(storageKey);
  const [hasUnseen, setHasUnseen] = useState(false);

  // Reload the flag whenever the active account changes. Defaults to "seen"
  // (no dot) for accounts with no stored value — we never nag about looks the
  // user saved before this feature existed; only NEW saves light the dot.
  useEffect(() => {
    storageKeyRef.current = storageKey;
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(value => {
        if (active) {
          setHasUnseen(value === 'true');
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storageKey]);

  const markSaved = useCallback(() => {
    setHasUnseen(true);
    AsyncStorage.setItem(storageKeyRef.current, 'true').catch(() => {});
  }, []);

  const markSeen = useCallback(() => {
    setHasUnseen(false);
    AsyncStorage.setItem(storageKeyRef.current, 'false').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ hasUnseen, markSaved, markSeen }),
    [hasUnseen, markSaved, markSeen],
  );

  return (
    <FavouritesSeenContext.Provider value={value}>
      {children}
    </FavouritesSeenContext.Provider>
  );
};

export const useFavouritesSeen = (): FavouritesSeenContextValue =>
  useContext(FavouritesSeenContext);
