/**
 * In-app completion notification for a backgrounded self-visualization render
 * (AU-358). When the user quits the loading screen and the render later
 * finishes, this surfaces a tappable Toast ("Your look is ready · View") that
 * re-navigates to the SeeThisOnMe flow so they can see / pick their result.
 *
 * Uses the app's existing `react-native-toast-message` infra (mounted once at
 * the App root) + the shared `navigationRef` — both work OUTSIDE the React tree,
 * so this fires even though the loading screen has unmounted.
 *
 * NOTE (infra gap): this is an IN-APP notice only. True background / lock-screen
 * push (so the user is pulled back in while the app is closed) needs native
 * push infra (expo-notifications / APNs) which is not set up in this app — see
 * tracking-plan §6.7 and the AU-358 report. KISS/YAGNI: we do not add a push
 * stack here.
 */
import Toast from 'react-native-toast-message';
import { i18n } from '../../i18n/init';
import { track } from '../../services/analytics';
import { navigationRef } from '../../navigation/navigationRef';
import { TryOnOutfitContext } from '../../types/navigation';

export const showTryOnCompletionNotice = (result: {
  status: 'success' | 'error';
  outfit: TryOnOutfitContext | null;
}): void => {
  const t = i18n.t.bind(i18n);
  const isSuccess = result.status === 'success';

  Toast.show({
    type: isSuccess ? 'success' : 'error',
    text1: isSuccess
      ? t('seeThisOnMe.notify.readyTitle')
      : t('seeThisOnMe.notify.failedTitle'),
    text2: isSuccess
      ? t('seeThisOnMe.notify.readyBody')
      : t('seeThisOnMe.notify.failedBody'),
    position: 'top',
    visibilityTime: 6000,
    // Tap-to-view: re-open the flow so the user lands back on the result.
    onPress: () => {
      Toast.hide();
      if (result.outfit && navigationRef.isReady()) {
        navigationRef.navigate('SeeThisOnMe', { outfit: result.outfit });
      }
    },
  });

  // Analytics: the completion notification was shown to a backgrounded user.
  track('body_shape_generation_completed_notified', {
    result: isSuccess ? 'success' : 'error',
  });
};
