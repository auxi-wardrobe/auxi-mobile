/**
 * Read-only landing screen for a tapped "your try-on is ready" push
 * notification (backend `tryon_render_completed`, see
 * `services/deepLinkHandler.resolveNotificationData`). The push payload only
 * carries the rendered image URL — not the full `TryOnOutfitContext`
 * `SeeThisOnMeScreen` needs to resume its step flow — so this reuses the same
 * preview UI (Figma 3398:17581) as a standalone viewer instead of re-entering
 * SeeThisOnMe.
 */
import React, { useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import { popToOrNavigate } from '../../navigation/popToOrNavigate';
import { StomHeader, StomDownloadButton } from './components';
import { OutfitPreview } from './OutfitPreview';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'TryOnResult'>;
type ScreenRoute = RouteProp<AppStackParamList, 'TryOnResult'>;

export const TryOnResultScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { compositeUrl } = useRoute<ScreenRoute>().params;

  // "Back to home" = the app's landing page (`HomeLanding`, the AppNavFooter
  // home tab and the stack's default screen) — NOT the `Home` recommender,
  // which is the separate "See my outfits" destination. popToOrNavigate pops
  // back to the landing instance already below us (RN7 `navigate` would push a
  // duplicate and remount it) and pushes one only when the stack has none —
  // the cold-start push-notification case, where TryOnResult is the root.
  const goHome = useCallback(
    () => popToOrNavigate(navigation, 'HomeLanding'),
    [navigation],
  );

  // The header chevron is a plain back: it returns to whatever page opened this
  // result (HomeLanding's notification list today), never to Home. Only a tap
  // that landed here with nothing beneath it — a cold-start push tap — has no
  // previous page, and that falls back to the landing page.
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    goHome();
  }, [navigation, goHome]);

  return (
    <SafeAreaView style={styles.container}>
      <StomHeader
        title={t('seeThisOnMe.title')}
        onBack={goBack}
        rightAction={<StomDownloadButton uri={compositeUrl} />}
      />
      <OutfitPreview imageUri={compositeUrl} onBackHome={goHome} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
});
