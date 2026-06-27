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

// "Unseen saved creations" indicator for the canvas header My Creations icon.
//
// Mirrors FavouritesSeenContext (the "Wear this" mint dot): the dot signals
// that the user has saved a creation from the canvas that they haven't reviewed
// yet. Opening the My Creations page clears it; the next save turns it back on.
// The flag is persisted per-user (so it survives relaunch and never bleeds one
// account's state into another after logout/login) under
// `@auxi/creations/unseen/<userId>`, with a `guest` bucket for signed-out use.
type CreationsSeenContextValue = {
  /** True when there are saved creations the user hasn't opened the list to see. */
  hasUnseen: boolean;
  /** Call after a successful save — turns the dot on. */
  markSaved: () => void;
  /** Call when the My Creations list is viewed — turns the dot off. */
  markSeen: () => void;
};

const STORAGE_PREFIX = '@auxi/creations/unseen/';
const GUEST_KEY = `${STORAGE_PREFIX}guest`;

const CreationsSeenContext = createContext<CreationsSeenContextValue>({
  hasUnseen: false,
  markSaved: () => {},
  markSeen: () => {},
});

export const CreationsSeenProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : GUEST_KEY;
  // Writes read the key from a ref so the persisted target always matches the
  // CURRENT account, even if a save/seen fires right around a login boundary.
  const storageKeyRef = useRef(storageKey);
  const [hasUnseen, setHasUnseen] = useState(false);

  // Reload the flag whenever the active account changes. Defaults to "seen"
  // (no dot) for accounts with no stored value — we never nag about creations
  // the user saved before this feature existed; only NEW saves light the dot.
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
    <CreationsSeenContext.Provider value={value}>
      {children}
    </CreationsSeenContext.Provider>
  );
};

export const useCreationsSeen = (): CreationsSeenContextValue =>
  useContext(CreationsSeenContext);
