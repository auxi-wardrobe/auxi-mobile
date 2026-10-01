import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFavouritesSeen } from '../context/FavouritesSeenContext';
import {
  favouriteService,
  type SaveFavouritePayload,
} from '../services/favouriteService';

export type FavouriteToggleState = 'idle' | 'saving' | 'saved' | 'removing';

type Callbacks = {
  onSaved?: (payload: SaveFavouritePayload) => void;
  onRemoved?: (key: string) => void;
  /** favouriteService already reports to Sentry — this is for user feedback. */
  onError?: (operation: 'save' | 'remove') => void;
};

/**
 * Heart toggles for several outfits at once, keyed by outfit hash — e.g. the
 * Make It Yours carousel, where swiping back to a saved outfit must still show
 * it saved. Owns each key's state machine + the favourite id needed to DELETE
 * again, and the bookkeeping every save does: light the header "unseen saved
 * looks" dot and refresh the Favourite list cache. Surface-specific toasts /
 * analytics go through the callbacks.
 *
 * Known limit: there is no "is this hash already a favourite?" endpoint, so a
 * fresh mount starts unfilled even if the outfit was saved earlier. Tapping
 * it then is harmless — the backend upserts by `(user, outfit_hash)` and
 * returns the existing row.
 */
export const useFavouriteToggles = ({ onSaved, onRemoved, onError }: Callbacks = {}) => {
  const queryClient = useQueryClient();
  const { markSaved } = useFavouritesSeen();
  const [states, setStates] = useState<Record<string, FavouriteToggleState>>({});
  // Mirrors `states` so `toggle` never acts on a stale render's snapshot.
  const statesRef = useRef(states);
  const idsRef = useRef<Record<string, string>>({});

  const setState = useCallback((key: string, next: FavouriteToggleState) => {
    statesRef.current = { ...statesRef.current, [key]: next };
    setStates(statesRef.current);
  }, []);

  const reset = useCallback(() => {
    statesRef.current = {};
    idsRef.current = {};
    setStates({});
  }, []);

  const stateOf = useCallback(
    (key: string): FavouriteToggleState => states[key] ?? 'idle',
    [states],
  );

  const toggle = useCallback(
    (key: string, buildPayload: () => SaveFavouritePayload | null) => {
      const current = statesRef.current[key] ?? 'idle';
      if (current === 'saving' || current === 'removing') {
        return;
      }

      const favouriteId = idsRef.current[key];
      if (current === 'saved' && favouriteId) {
        setState(key, 'removing');
        favouriteService
          .removeFavourite(favouriteId)
          .then(() => {
            delete idsRef.current[key];
            setState(key, 'idle');
            onRemoved?.(key);
            queryClient.invalidateQueries({ queryKey: ['favourites'] });
          })
          .catch(() => {
            setState(key, 'saved');
            onError?.('remove');
          });
        return;
      }

      const payload = buildPayload();
      if (!payload) {
        return;
      }
      setState(key, 'saving');
      favouriteService
        .saveFavourite(payload)
        .then(response => {
          idsRef.current[key] = response.id;
          setState(key, 'saved');
          onSaved?.(payload);
          markSaved();
          queryClient.invalidateQueries({ queryKey: ['favourites'] });
        })
        .catch(() => {
          setState(key, 'idle');
          onError?.('save');
        });
    },
    [setState, onSaved, onRemoved, onError, queryClient, markSaved],
  );

  return { stateOf, toggle, reset };
};
