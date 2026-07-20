/**
 * Reuse-confirm GATE for the "See this on me" flow.
 *
 * WHY THIS EXISTS
 * ---------------
 * When a user with a saved reusable body profile taps "See on me", design wants
 * a confirm bottom sheet ("reuse this photo?") to appear OVER the page they came
 * from (Favourite / Creations / Schedule) — the originating page dimmed behind
 * the sheet's scrim.
 *
 * The old flow pushed the opaque `SeeThisOnMe` screen first and only then showed
 * the sheet, so the page BEHIND the scrim was an empty See-on-me shell, not the
 * originating page. This gate fixes that: it is a TRANSPARENT modal, so the
 * originating page stays visible; it loads the profile, and either
 *   - shows the confirm sheet (reuse mode) over that page, or
 *   - hands straight off to `SeeThisOnMe` (capture mode / cached / in-flight)
 * via `replace` so the gate never lingers in the back stack.
 *
 * OWNERSHIP
 * ---------
 * This gate owns the reuse-confirm sheet + its three funnel events
 * (`body_photo_reuse_confirmed` / `body_photo_retake_selected` /
 * `body_photo_reuse_dismissed`). `SeeThisOnMe` owns everything after the
 * hand-off (render, capture steps, loading, preview).
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { track } from '../../services/analytics';
import { bodyService } from '../../services/bodyService';
import { AppStackParamList } from '../../types/navigation';
import { StepReuseConfirm } from './StepReuseConfirm';
import { decideEntryMode } from './profile-entry';
import { tryOnGenerationStore } from './try-on-generation-store';
import { getTryOnResult } from '../../services/tryOnResultStore';

// Shared with SeeThisOnMe so the profile it re-reads on hand-off is warm.
const ACTIVE_PROFILE_QUERY_KEY = ['body', 'active'] as const;

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'SeeThisOnMeConfirm'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'SeeThisOnMeConfirm'>;

export const SeeThisOnMeConfirmScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { outfit } = useRoute<ScreenRoute>().params;

  const { data: activeProfile, isLoading: profileLoading } = useQuery({
    queryKey: ACTIVE_PROFILE_QUERY_KEY,
    queryFn: () => bodyService.getActiveProfile(),
  });

  const reuseMode = decideEntryMode(activeProfile) === 'reuse';
  const reusePhotoUri =
    activeProfile?.full_body_url ?? activeProfile?.image_url ?? null;

  // Guard against firing the hand-off twice (React 18 strict-mode double
  // effects, or a re-render after the query resolves).
  const handedOffRef = useRef(false);
  const handOff = useCallback(
    (params: AppStackParamList['SeeThisOnMe']) => {
      if (handedOffRef.current) return;
      handedOffRef.current = true;
      // replace (not navigate): the gate must not sit in the back stack — a
      // header back from SeeThisOnMe should land on the originating page.
      navigation.replace('SeeThisOnMe', params);
    },
    [navigation],
  );

  // Skip the sheet entirely when SeeThisOnMe would immediately short-circuit
  // anyway: an in-flight/finished job for this outfit (rehydrate) or a cached
  // successful result (instant preview). This mirrors SeeThisOnMe's own mount
  // logic so the confirm sheet only shows on a genuinely fresh reuse entry.
  const shouldBypassSheet = useCallback((): boolean => {
    const existing = tryOnGenerationStore.getState();
    const hasInFlight =
      existing.outfit?.outfitHash === outfit.outfitHash &&
      existing.status !== 'idle';
    return hasInFlight || getTryOnResult(outfit.outfitHash) != null;
  }, [outfit.outfitHash]);

  // Decide the route once the profile is known (or immediately for a bypass).
  useEffect(() => {
    if (handedOffRef.current) return;
    if (shouldBypassSheet()) {
      handOff({ outfit });
      return;
    }
    if (profileLoading) return;
    // No saved profile → straight into capture; the sheet only makes sense
    // when there is a photo to reuse.
    if (!(reuseMode && reusePhotoUri)) {
      handOff({ outfit, reuseAction: 'capture' });
    }
  }, [
    profileLoading,
    reuseMode,
    reusePhotoUri,
    outfit,
    handOff,
    shouldBypassSheet,
  ]);

  const handleConfirm = useCallback(() => {
    if (!activeProfile?.id) return;
    track('body_photo_reuse_confirmed', { outfit_hash: outfit.outfitHash });
    handOff({
      outfit,
      reuseAction: 'render',
      reuseBodyId: activeProfile.id,
      reuseShape: activeProfile.body_shape ?? null,
    });
  }, [activeProfile, outfit, handOff]);

  const handleRetake = useCallback(() => {
    track('body_photo_retake_selected', { outfit_hash: outfit.outfitHash });
    handOff({ outfit, reuseAction: 'capture' });
  }, [outfit, handOff]);

  const handleDismiss = useCallback(() => {
    if (handedOffRef.current) return;
    track('body_photo_reuse_dismissed', { outfit_hash: outfit.outfitHash });
    // Backdrop / swipe-down leaves the flow entirely — back to the origin page.
    navigation.goBack();
  }, [navigation, outfit.outfitHash]);

  // Only render the sheet once we know we're staying (reuse + photo, not
  // bypassing). Until then render nothing so the transparent modal reveals the
  // originating page while the profile query resolves / a hand-off is pending.
  // `shouldBypassSheet` is a synchronous store read, so checking it here (not
  // just in the effect) keeps the sheet from flashing for one frame on the
  // cached-result / in-flight-job paths before the effect hands off.
  if (
    handedOffRef.current ||
    shouldBypassSheet() ||
    profileLoading ||
    !(reuseMode && reusePhotoUri)
  ) {
    return null;
  }

  return (
    <StepReuseConfirm
      photoUri={reusePhotoUri}
      onConfirm={handleConfirm}
      onRetake={handleRetake}
      onDismiss={handleDismiss}
    />
  );
};
