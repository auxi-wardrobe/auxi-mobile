import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { toast } from '../../components/design-system/lib';
import { useFavouritesSeen } from '../../context/FavouritesSeenContext';
import { favouriteService } from '../../services/favouriteService';
import { track } from '../../services/analytics';
import type { DiscoveryOutfitDetail } from '../../services/discoveryService';
import type { AppStackParamList } from '../../types/navigation';

/** How long the "saved — tap to view" toast stays up (product call: 3s). */
export const FAVOURITE_SAVED_TOAST_MS = 3000;

export type DiscoveryFavouriteState = 'idle' | 'saving' | 'saved' | 'removing';

/**
 * Stable favourite key for a Discovery outfit. Same `discovery_<id>` hash the
 * "See on me" handoff already uses, so both flows point at one outfit identity.
 * The backend upserts favourites by `(user_id, outfit_hash)`, so re-saving the
 * same Discovery outfit never creates a duplicate row. 46 chars — well under
 * the backend's 64-char `outfit_hash` cap.
 */
export const discoveryOutfitHash = (outfitId: string) => `discovery_${outfitId}`;

/**
 * Heart toggle for the Discovery outfit detail action bar.
 *
 * Save → `POST /favourites` with the outfit's catalog item ids (all
 * `is_common_item`, which the backend's ownership check lets through). The
 * returned favourite id is kept so a second tap can `DELETE` it again.
 *
 * Known limit: there is no "is this hash already a favourite?" endpoint, so a
 * fresh visit starts unfilled even if the outfit was saved earlier. Tapping it
 * then is harmless — the upsert returns the existing row (no duplicate) and the
 * heart fills.
 */
export const useDiscoveryFavourite = (outfit: DiscoveryOutfitDetail | undefined | null) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { markSaved } = useFavouritesSeen();
  const [state, setState] = useState<DiscoveryFavouriteState>('idle');
  const favouriteIdRef = useRef<string | null>(null);
  const savedToastIdRef = useRef<string | null>(null);
  const outfitId = outfit?.id;

  // A different outfit (deep link swapping params in place) starts unsaved.
  useEffect(() => {
    setState('idle');
    favouriteIdRef.current = null;
  }, [outfitId]);

  const showFailure = useCallback(() => {
    toast.show({
      type: 'error',
      text1: t('discovery.favourite_failed_toast'),
      position: 'bottom',
    });
  }, [t]);

  // Confirmation after a successful save: tells the user the outfit's pieces
  // are now in Favourites; tapping it jumps there. `showBackButton` — same as
  // HomeLanding's shortcut — so Favourite renders a back chevron to return here
  // instead of the drawer hamburger.
  const showSavedToast = useCallback(() => {
    savedToastIdRef.current = toast.show({
      type: 'success',
      text1: t('discovery.favourite_saved_toast'),
      text2: t('discovery.favourite_saved_toast_cta'),
      position: 'bottom',
      visibilityTime: FAVOURITE_SAVED_TOAST_MS,
      accessibilityHint: t('discovery.a11y_open_favourites'),
      testID: 'discovery-detail-favourite-saved-toast',
      onPress: () => {
        track('discovery_favourite_toast_tapped');
        navigation.navigate('Favourite', { showBackButton: true });
      },
    });
  }, [t, navigation]);

  const toggle = useCallback(() => {
    if (!outfit || state === 'saving' || state === 'removing') {
      return;
    }
    const outfitHash = discoveryOutfitHash(outfit.id);

    if (state === 'saved' && favouriteIdRef.current) {
      const favouriteId = favouriteIdRef.current;
      setState('removing');
      favouriteService
        .removeFavourite(favouriteId)
        .then(() => {
          favouriteIdRef.current = null;
          setState('idle');
          // Un-hearted while the "saved — tap to view" toast is still up: drop
          // it so it can't send the user to a Favourites list without the look.
          if (savedToastIdRef.current) {
            toast.hide(savedToastIdRef.current);
            savedToastIdRef.current = null;
          }
          track('discovery_outfit_unfavorited', { outfit_id: outfit.id });
          queryClient.invalidateQueries({ queryKey: ['favourites'] });
        })
        .catch(() => {
          // favouriteService already reports to Sentry.
          setState('saved');
          showFailure();
        });
      return;
    }

    setState('saving');
    favouriteService
      .saveFavourite({
        outfit_hash: outfitHash,
        item_ids: outfit.items.map(item => item.id),
        source: 'discovery',
        ...(outfit.title ? { title: outfit.title } : {}),
      })
      .then(response => {
        favouriteIdRef.current = response.id;
        setState('saved');
        track('outfit_favorited', {
          outfit_hash: outfitHash,
          item_count: outfit.items.length,
          source: 'discovery',
        });
        // Same bookkeeping as Home's heart: light the header "unseen saved
        // looks" dot and keep the Favourite list cache fresh.
        markSaved();
        queryClient.invalidateQueries({ queryKey: ['favourites'] });
        showSavedToast();
      })
      .catch(() => {
        setState('idle');
        showFailure();
      });
  }, [outfit, state, queryClient, markSaved, showFailure, showSavedToast]);

  return { state, toggle };
};
