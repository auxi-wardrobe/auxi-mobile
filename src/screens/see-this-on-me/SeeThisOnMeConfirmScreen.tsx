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
 * AUTO-REUSE (current behaviour)
 * -----------------------------
 * Picking a body shape at the bodyShape step IS the user's confirmation of that
 * body — re-asking "reuse this photo?" on every later outfit is a redundant tap
 * between "See on me" and the result. So a profile that carries a `body_shape`
 * now SKIPS the sheet and hands off straight to the render loading screen.
 *
 * The sheet therefore only survives for a profile with a photo but NO
 * `body_shape` — i.e. one that never went through AU-358's `select` (a legacy
 * AU-346 profile, or a malformed record). There, nothing was ever confirmed, so
 * the confirm step still earns its place. Retake is not lost on the auto path:
 * the preview footer carries a Retake affordance on every completion
 * (`StomStepScreen.tsx` → `OutfitPreview.onRetake`).
 *
 * OWNERSHIP
 * ---------
 * This gate owns the reuse-confirm sheet + its three funnel events
 * (`body_photo_reuse_confirmed` / `body_photo_retake_selected` /
 * `body_photo_reuse_dismissed`). `SeeThisOnMe` owns everything after the
 * hand-off (render, capture steps, loading, preview).
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { MacgieLoader } from '../../components/macgie';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { bodyService } from '../../services/bodyService';
import { AppStackParamList } from '../../types/navigation';
import { StepReuseConfirm } from './StepReuseConfirm';
import { decideEntryMode, resolveReusePhotoUri } from './profile-entry';
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
  // Which photo the sheet would show, when it shows at all — the precedence
  // depends on the profile's generation, see `resolveReusePhotoUri`.
  const reusePhotoUri = resolveReusePhotoUri(activeProfile);
  // The user already picked this body shape — treat that as the confirmation
  // and go straight to the render (no sheet). See the AUTO-REUSE note above.
  const autoReuse = reuseMode && !!activeProfile?.body_shape;

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

  // Hand off to the render loading screen on the saved body. Shared by the
  // auto-reuse path (no sheet — the shape pick was the confirmation) and the
  // sheet's own Confirm button; `auto` separates the two in the reuse funnel.
  const handOffRender = useCallback(
    (auto: boolean) => {
      if (!activeProfile?.id) return;
      track('body_photo_reuse_confirmed', {
        outfit_hash: outfit.outfitHash,
        auto,
      });
      handOff({
        outfit,
        reuseAction: 'render',
        reuseBodyId: activeProfile.id,
        reuseShape: activeProfile.body_shape ?? null,
      });
    },
    [activeProfile, outfit, handOff],
  );

  // Decide the route once the profile is known (or immediately for a bypass).
  useEffect(() => {
    if (handedOffRef.current) return;
    if (shouldBypassSheet()) {
      handOff({ outfit });
      return;
    }
    if (profileLoading) return;
    // Body shape already picked → that WAS the confirmation. Straight to the
    // render loading screen, no sheet.
    if (autoReuse) {
      handOffRender(true);
      return;
    }
    // No saved profile → straight into capture; the sheet only makes sense
    // when there is a photo to reuse.
    if (!(reuseMode && reusePhotoUri)) {
      handOff({ outfit, reuseAction: 'capture' });
    }
  }, [
    profileLoading,
    reuseMode,
    reusePhotoUri,
    autoReuse,
    handOffRender,
    outfit,
    handOff,
    shouldBypassSheet,
  ]);

  const handleConfirm = useCallback(() => handOffRender(false), [
    handOffRender,
  ]);

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

  // A hand-off is already fired or will fire synchronously from the effect —
  // render nothing so the transparent modal reveals the originating page and
  // the sheet never flashes for a frame. `shouldBypassSheet` is a synchronous
  // store read, so checking it here (not just in the effect) is what keeps
  // that flash away.
  if (handedOffRef.current || shouldBypassSheet()) {
    return null;
  }

  // Profile still resolving. This is the ONE slow branch — everything else
  // here resolves synchronously — and it must NOT render null: this screen is
  // a TRANSPARENT modal, so "null" is indistinguishable from the button not
  // having worked. With `retry: 1` and a 30s per-request timeout
  // (services/queryClient.ts) a stalled `GET /body/active` leaves the user
  // staring at the untouched origin page for up to ~60s. Show the shared
  // loader over a scrim instead, so the tap visibly did something.
  if (profileLoading) {
    return (
      <View testID="stom-gate-loading" style={styles.loadingScrim}>
        <MacgieLoader />
      </View>
    );
  }

  // Known, and we're handing off (auto-reuse / capture) rather than staying.
  if (autoReuse || !(reuseMode && reusePhotoUri)) {
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

const styles = StyleSheet.create({
  // Same scrim token the confirm sheet itself rides on, so the loading state
  // and the sheet that may follow it read as one continuous overlay.
  loadingScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
});
