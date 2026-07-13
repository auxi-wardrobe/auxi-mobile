/**
 * Read-only landing screen for a tapped "your try-on is ready" push
 * notification (backend `tryon_render_completed`, see
 * `services/deepLinkHandler.resolveNotificationData`). The push payload only
 * carries the rendered image URL — not the full `TryOnOutfitContext`
 * `SeeThisOnMeScreen` needs to resume its step flow — so this reuses the same
 * preview UI (Figma 3398:17581) as a standalone viewer instead of re-entering
 * SeeThisOnMe.
 */
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import { StomHeader, StomDownloadButton } from './components';
import { OutfitPreview } from './OutfitPreview';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'TryOnResult'>;
type ScreenRoute = RouteProp<AppStackParamList, 'TryOnResult'>;

export const TryOnResultScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { compositeUrl } = useRoute<ScreenRoute>().params;

  // popTo (not navigate): reuse the existing Home instance so the current
  // outfit suggestions + swipe position survive the round-trip. navigate() can
  // push a duplicate Home under RN7 (see HomeWardrobeNavFooter), remounting it
  // and resetting the deck. popTo falls back to pushing a fresh Home if none is
  // in the stack.
  const goHome = () => navigation.popTo('Home');

  return (
    <SafeAreaView style={styles.container}>
      <StomHeader
        title={t('seeThisOnMe.title')}
        onBack={goHome}
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
