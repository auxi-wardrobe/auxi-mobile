import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import IconHeartFilled from '../../assets/images/icon_heart_filled.svg';
import { MBadge, MButton, toast } from '../../components/design-system/lib';
import { HEADER_ICON_INSET } from '../../components/layout/Header';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { useFavouriteToggles } from '../../hooks/useFavouriteToggles';
import { track } from '../../services/analytics';
import { type BuildAroundSlot, outfitItemIds } from '../../services/buildAroundMatchService';
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
import { buildAroundResultStyles as styles } from './buildAroundResultStyles';

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList, 'BuildAroundMatchResult'>;
type ScreenRoute = RouteProp<AppStackParamList, 'BuildAroundMatchResult'>;

const DiscoveryAwareTile: React.FC<{ slot: BuildAroundSlot; anchorId: string }> = ({
  slot,
  anchorId,
}) => {
  const { t } = useTranslation();
  const { item } = slot;
  const name = item.name ?? item.category;
  const fromDiscovery = slot.source === 'discovery';
  const suffix = item.id === anchorId ? '-anchor' : fromDiscovery ? '-discovery' : '';
  return (
    <View
      style={miyStyles.tile}
      accessible
      accessibilityLabel={fromDiscovery ? t('buildAround.a11y_discovery_piece', { name }) : name}
      testID={`build-around-result-item-${item.id}${suffix}`}
    >
      <TileImage item={item} />
      {fromDiscovery ? (
        <View style={styles.tileBadge} pointerEvents="none">
          <MBadge tone="cream" testID={`build-around-result-item-${item.id}-badge`}>
            {t('buildAround.discovery_tag')}
          </MBadge>
        </View>
      ) : null}
    </View>
  );
};

/**
 * Result of "Find the best match from Discovery" (Figma "find the best .
 * detail"): one swipeable page per Discovery look that contains the anchor's
 * piece (N such looks ⇒ N pages). Exact matches first, then near-color ones
 * labelled "Close match"; within each, the looks the user owns most of first. The cover + title follow the look on screen. Each look's pieces
 * are the user's own where possible (the anchor always is); a piece they don't
 * own is the Discovery item with a "Discovery" badge. Close dismisses; Save
 * favourites the look on screen (`source: 'build_around_discovery'`).
 */
export const BuildAroundMatchResultScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const { itemId, result } = useRoute<ScreenRoute>().params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { outfits } = result;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const outfit = outfits[Math.min(pageIndex, outfits.length - 1)];
  const inspiration = outfit.inspiration;

  const favourites = useFavouriteToggles({
    onError: () =>
      toast.show({ type: 'error', text1: t('discovery.favourite_failed_toast'), position: 'bottom' }),
  });
  const saveState = favourites.stateOf(outfit.outfit_hash);
  const saved = saveState === 'saved' || saveState === 'saving';

  const toggleSave = useCallback(() => {
    track(saved ? 'build_around_discovery_unfavourited' : 'build_around_discovery_favourited', {
      item_id: itemId,
      outfit_id: outfit.inspiration.id,
      rank: pageIndex + 1,
      is_complete: outfit.is_complete,
      anchor_match: outfit.anchor_match,
    });
    favourites.toggle(outfit.outfit_hash, () => ({
      outfit_hash: outfit.outfit_hash,
      item_ids: outfitItemIds(outfit),
      source: 'build_around_discovery',
      title: outfit.inspiration.title,
    }));
  }, [outfit, saved, favourites, itemId, pageIndex]);

  const onPagerLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);
  // Track the page from `onScroll`, not `onMomentumScrollEnd`: react-native-web
  // never fires momentum events, so on web the cover, title and Save stayed on
  // the first look while the items swiped. Rounding switches the look as soon
  // as the next page is more than half in view, on every platform.
  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const clamped = Math.min(Math.max(next, 0), outfits.length - 1);
    if (clamped === pageIndex) return;
    setPageIndex(clamped);
    track('build_around_discovery_outfit_viewed', {
      item_id: itemId,
      outfit_id: outfits[clamped].inspiration.id,
      rank: clamped + 1,
      outfit_count: outfits.length,
    });
  };

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
            id: inspiration.id,
            title: inspiration.title,
            composite_image_url: inspiration.composite_image_url,
            season: null,
            gender: null,
            trend_tags: [],
            description: '',
            items: [],
          }}
        />

        <View style={miyStyles.panel}>
          <View style={styles.titleBlock}>
            <Text style={miyStyles.title} accessibilityRole="header" testID="build-around-result-title">
              {inspiration.title}
            </Text>
            {outfit.anchor_match === 'similar' ? (
              <MBadge tone="soft" testID="build-around-result-similar">
                {t('buildAround.similar_badge')}
              </MBadge>
            ) : null}
          </View>
          <View style={miyStyles.resultBlock}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={onPagerLayout}
              onScroll={onPagerScroll}
              scrollEventThrottle={16}
              style={miyStyles.pager}
              testID="build-around-result-pager"
            >
              {outfits.map((look, index) => (
                <View
                  key={look.outfit_hash}
                  style={[miyStyles.page, { width: pageWidth || undefined }]}
                  testID={index === 0 ? 'build-around-result-items' : `build-around-result-items-${index}`}
                  accessibilityLabel={t('buildAround.a11y_outfit_page', {
                    index: index + 1,
                    count: outfits.length,
                  })}
                >
                  {look.slots.map(slot => (
                    <DiscoveryAwareTile
                      key={`${slot.inspiration_item_id}-${slot.item.id}`}
                      slot={slot}
                      anchorId={itemId}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
            {outfits.length > 1 ? (
              <View style={miyStyles.dots} testID="build-around-result-dots">
                {outfits.map((look, index) => (
                  <View
                    key={look.outfit_hash}
                    style={[
                      miyStyles.dot,
                      index === pageIndex ? miyStyles.dotActive : miyStyles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
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
