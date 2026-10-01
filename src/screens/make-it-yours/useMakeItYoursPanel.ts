import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { toast } from '../../components/design-system/lib';
import { useFavouriteToggles } from '../../hooks/useFavouriteToggles';
import { track } from '../../services/analytics';
import {
  filledItemIds,
  type MakeItYoursOutfit,
  type MakeItYoursResponse,
} from '../../services/makeItYoursService';
import type { AppStackParamList } from '../../types/navigation';
import { useMakeItYoursRun, type MakeItYoursErrorCode } from './useMakeItYoursRun';

export type MakeItYoursMode =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; code: MakeItYoursErrorCode | null }
  | { kind: 'result'; result: MakeItYoursResponse };

/**
 * State machine for the Make It Yours panel on the Discovery detail
 * (Figma 5456:18648 — the flow swaps the detail's bottom panel in place):
 *
 *   idle ──start──▶ loading ──▶ result (success/partial/no_match/no_wardrobe)
 *                     │  └────▶ error ──retry──▶ loading
 *                     └─cancel─▶ idle          result/error ──close──▶ idle
 *
 * Back (floating chip, Android hardware back, iOS swipe) never leaves the
 * screen while the panel is open: it cancels / closes back to the detail
 * (ticket Scenarios 12–13). Generated outfits are favourited per outfit hash
 * so swiping between them keeps each heart's state.
 */
export const useMakeItYoursPanel = (outfitId: string | undefined) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [result, setResult] = useState<MakeItYoursResponse | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const favourites = useFavouriteToggles({
    onError: () =>
      toast.show({ type: 'error', text1: t('discovery.favourite_failed_toast'), position: 'bottom' }),
  });
  const { reset: resetFavourites } = favourites;

  const { status, errorCode, start, retry, cancel } = useMakeItYoursRun(outfitId, next => {
    resetFavourites();
    setPageIndex(0);
    setResult(next);
  });

  const mode: MakeItYoursMode =
    status === 'loading'
      ? { kind: 'loading' }
      : status === 'error'
        ? { kind: 'error', code: errorCode }
        : result
          ? { kind: 'result', result }
          : { kind: 'idle' };
  const isOpen = mode.kind !== 'idle';
  const current: MakeItYoursOutfit | undefined = result?.outfits[pageIndex];

  const close = useCallback(() => {
    cancel();
    setResult(null);
  }, [cancel]);

  // Loading → Cancel (Scenario 13); result / error → back to the detail.
  const back = useCallback(() => {
    if (status === 'loading') {
      cancel();
      return;
    }
    close();
  }, [status, cancel, close]);

  // iOS edge-swipe would pop the detail instead of closing the panel.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isOpen });
  }, [navigation, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, back]);

  const toggleSave = useCallback(() => {
    if (!current || !outfitId) return;
    const rank = pageIndex + 1;
    const wasSaved = favourites.stateOf(current.outfit_hash) === 'saved';
    favourites.toggle(current.outfit_hash, () => ({
      outfit_hash: current.outfit_hash,
      item_ids: filledItemIds(current),
      source: 'make_it_yours',
    }));
    track(wasSaved ? 'make_it_yours_outfit_unfavourited' : 'make_it_yours_outfit_favourited', {
      outfit_id: outfitId,
      rank,
      is_complete: current.is_complete,
    });
  }, [current, outfitId, pageIndex, favourites]);

  const openFavourites = useCallback(() => {
    if (outfitId) track('make_it_yours_favourites_opened', { outfit_id: outfitId });
    navigation.navigate('Favourite', { showBackButton: true });
  }, [navigation, outfitId]);

  const trackEmptyCta = useCallback(
    (cta: 'explore_another' | 'back' | 'add_clothes') => {
      if (result) track('make_it_yours_empty_cta_tapped', { state: result.state, cta });
    },
    [result],
  );

  const addClothes = useCallback(() => {
    trackEmptyCta('add_clothes');
    close();
    navigation.navigate('Wardrobe');
  }, [trackEmptyCta, close, navigation]);

  return {
    mode,
    isOpen,
    pageIndex,
    setPageIndex,
    currentSaveState: current ? favourites.stateOf(current.outfit_hash) : 'idle',
    start,
    retry,
    cancel,
    close,
    back,
    toggleSave,
    openFavourites,
    addClothes,
    trackEmptyCta,
  };
};

export type MakeItYoursPanel = ReturnType<typeof useMakeItYoursPanel>;
