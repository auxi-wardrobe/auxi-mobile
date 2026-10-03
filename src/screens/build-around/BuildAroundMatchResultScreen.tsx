import React, { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import IconHeartFilled from '../../assets/images/icon_heart_filled.svg';
import { MButton, toast } from '../../components/design-system/lib';
import { HEADER_ICON_INSET } from '../../components/layout/Header';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { useFavouriteToggles } from '../../hooks/useFavouriteToggles';
import { track } from '../../services/analytics';
import { matchedItemIds, matchedItems } from '../../services/buildAroundMatchService';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import {
  DISCOVERY_ACTION_BAR_HEIGHT,
  DiscoveryDetailActionBar,
  actionBarStyles,
} from '../discovery/DiscoveryDetailActionBar';
import { DiscoveryOutfitSummary } from '../discovery/DiscoveryOutfitSummary';
import { discoveryOutfitDetailStyles as detailStyles } from '../discovery/discoveryOutfitDetailStyles';
import { makeItYoursStyles as miyStyles } from '../make-it-yours/makeItYoursStyles';
import { TileImage } from '../make-it-yours/MakeItYoursTileImage';

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList, 'BuildAroundMatchResult'>;
type ScreenRoute = RouteProp<AppStackParamList, 'BuildAroundMatchResult'>;

/**
 * Result of "Find the best match from Discovery" (Figma "find the best .
 * detail"): the matched Discovery look as the cover, its title, and the pieces
 * the user OWNS that rebuild it (anchor item A + B + C …). Only owned pieces
 * are shown — never a catalog image. Close dismisses; Save favourites the
 * owned outfit (`source: 'build_around_discovery'`).
 */
export const BuildAroundMatchResultScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const { itemId, result } = useRoute<ScreenRoute>().params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const outfit = result.outfit;
  const items = matchedItems(outfit);

  const favourites = useFavouriteToggles({
    onError: () =>
      toast.show({ type: 'error', text1: t('discovery.favourite_failed_toast'), position: 'bottom' }),
  });
  const saveState = outfit ? favourites.stateOf(outfit.outfit_hash) : 'idle';
  const saved = saveState === 'saved' || saveState === 'saving';

  const toggleSave = useCallback(() => {
    if (!outfit) return;
    track(saved ? 'build_around_discovery_unfavourited' : 'build_around_discovery_favourited', {
      item_id: itemId,
      outfit_id: result.inspiration.id,
    });
    favourites.toggle(outfit.outfit_hash, () => ({
      outfit_hash: outfit.outfit_hash,
      item_ids: matchedItemIds(outfit),
      source: 'build_around_discovery',
      title: result.inspiration.title,
    }));
  }, [outfit, saved, favourites, itemId, result.inspiration]);

  const close = () => navigation.goBack();

  return (
    <SafeAreaView style={detailStyles.container} edges={['top']} testID="build-around-result">
      <ScrollView
        testID="build-around-result-scroll"
        contentContainerStyle={{
          paddingBottom: insets.bottom + DISCOVERY_ACTION_BAR_HEIGHT + theme.spacing.l,
        }}
      >
        <DiscoveryOutfitSummary
          showDetails={false}
          outfit={{
            id: result.inspiration.id,
            title: result.inspiration.title,
            composite_image_url: result.inspiration.composite_image_url,
            season: null,
            gender: null,
            trend_tags: [],
            description: '',
            items: [],
          }}
        />

        <View style={miyStyles.panel}>
          <Text style={miyStyles.title} accessibilityRole="header" testID="build-around-result-title">
            {result.inspiration.title}
          </Text>
          <View style={miyStyles.page} testID="build-around-result-items">
            {items.map(item => (
              <View
                key={item.id}
                style={miyStyles.tile}
                accessible
                accessibilityLabel={item.name ?? item.category}
                testID={`build-around-result-item-${item.id}${item.id === itemId ? '-anchor' : ''}`}
              >
                <TileImage item={item} />
              </View>
            ))}
          </View>
          <Text style={miyStyles.prompt} testID="build-around-result-prompt">
            {t('buildAround.save_prompt')}
          </Text>
        </View>
      </ScrollView>

      <View style={[detailStyles.floatingBack, { top: insets.top + HEADER_ICON_INSET }]}>
        <TopIconButton
          testID="build-around-result-back"
          accessibilityLabel={t('uac.common.back')}
          onPress={close}
          icon={<Icons.ChevronLeft width={24} height={24} />}
        />
      </View>

      <DiscoveryDetailActionBar>
        <MButton
          variant="text"
          rightIcon={Icons.CloseThin}
          onPress={close}
          testID="build-around-result-close"
        >
          {t('buildAround.close')}
        </MButton>
        <View style={actionBarStyles.grow}>
          <MButton
            rightIcon={saved ? IconHeartFilled : Icons.Heart}
            onPress={toggleSave}
            disabled={saveState === 'removing'}
            accessibilityLabel={t(saved ? 'buildAround.a11y_unsave' : 'buildAround.a11y_save')}
            testID={saved ? 'build-around-result-save-saved' : 'build-around-result-save'}
          >
            {t(saved ? 'buildAround.saved' : 'buildAround.save')}
          </MButton>
        </View>
      </DiscoveryDetailActionBar>
    </SafeAreaView>
  );
};
