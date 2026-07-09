/**
 * In-app completion notification for a backgrounded self-visualization render
 * (AU-358). When the user quits the loading screen and the render later
 * finishes, this surfaces a tappable Toast ("Your look is ready · View") that
 * re-navigates to the SeeThisOnMe flow so they can see / pick their result.
 *
 * Uses the app's DS `toast` service (rendered once by `<MToastHost />` at the App
 * root) + the shared `navigationRef` — both work OUTSIDE the React tree, so this
 * fires even though the loading screen has unmounted.
 *
 * NOTE (infra gap): this is an IN-APP notice only. True background / lock-screen
 * push (so the user is pulled back in while the app is closed) needs native
 * push infra (expo-notifications / APNs) which is not set up in this app — see
 * tracking-plan §6.7 and the AU-358 report. KISS/YAGNI: we do not add a push
 * stack here.
 */
import { StackActions } from '@react-navigation/native';
import { toast } from '../../components/design-system/lib';
import { i18n } from '../../i18n/init';
import { track } from '../../services/analytics';
import { navigationRef } from '../../navigation/navigationRef';
import { TryOnOutfitContext } from '../../types/navigation';
import { GenerationPhase } from './try-on-generation-store';

export const showTryOnCompletionNotice = (result: {
  status: 'success' | 'error';
  // AU-358: which async step finished — picks the right copy. The 'shapes'
  // phase tells the user their body shapes are ready to PICK from; the 'render'
  // phase tells them their final look is ready to VIEW.
  phase: GenerationPhase;
  outfit: TryOnOutfitContext | null;
}): void => {
  const t = i18n.t.bind(i18n);
  const isSuccess = result.status === 'success';
  const isShapes = result.phase === 'shapes';

  const titleKey = isShapes
    ? isSuccess
      ? 'seeThisOnMe.notify.shapesReadyTitle'
      : 'seeThisOnMe.notify.shapesFailedTitle'
    : isSuccess
    ? 'seeThisOnMe.notify.readyTitle'
    : 'seeThisOnMe.notify.failedTitle';
  const bodyKey = isShapes
    ? isSuccess
      ? 'seeThisOnMe.notify.shapesReadyBody'
      : 'seeThisOnMe.notify.shapesFailedBody'
    : isSuccess
    ? 'seeThisOnMe.notify.readyBody'
    : 'seeThisOnMe.notify.failedBody';

  toast.show({
    type: isSuccess ? 'success' : 'error',
    text1: t(titleKey),
    text2: t(bodyKey),
    position: 'top',
    visibilityTime: 6000,
    // Tap-to-view: re-open the flow so the user lands back on the result.
    // StackActions.popTo (not navigate) — the tap can land while a
    // presentation:'modal' screen (e.g. ItemDetail) is on top. navigate() only
    // updates JS nav state and leaves the native modal stuck on screen (see
    // ItemDetailScreen's handleBuildAround for the same fix). popTo dismisses
    // it and either pops back to an existing SeeThisOnMe instance or pushes a
    // fresh one. navigationRef is the generic container ref (no `.popTo`
    // sugar like a screen's `navigation` prop has), so dispatch the action
    // directly.
    onPress: () => {
      if (result.outfit && navigationRef.isReady()) {
        navigationRef.dispatch(
          StackActions.popTo('SeeThisOnMe', { outfit: result.outfit }),
        );
      }
    },
  });

  // Analytics: the completion notification was shown to a backgrounded user.
  track('body_shape_generation_completed_notified', {
    result: isSuccess ? 'success' : 'error',
  });
};
