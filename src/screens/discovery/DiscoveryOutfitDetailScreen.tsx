import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header, HEADER_ICON_INSET } from '../../components/layout/Header';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { toast } from '../../components/design-system/lib';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { AppStackParamList } from '../../types/navigation';
import { useDiscoveryOutfit } from '../../hooks/useDiscovery';
import { resolveItemImageSources } from '../../utils/url';
import { DiscoveryItemStrip } from './DiscoveryItemStrip';
import { DiscoveryOutfitSummary } from './DiscoveryOutfitSummary';
import {
  DiscoveryDetailError,
  DiscoveryDetailLoading,
  DiscoveryDetailUnavailable,
} from './DiscoveryDetailStates';
import { discoveryOutfitDetailStyles as styles } from './discoveryOutfitDetailStyles';
import {
  DISCOVERY_ACTION_BAR_HEIGHT,
  DiscoveryDetailActionBar,
} from './DiscoveryDetailActionBar';
import { discoveryOutfitHash, useDiscoveryFavourite } from './useDiscoveryFavourite';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'DiscoveryOutfitDetail'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'DiscoveryOutfitDetail'>;

export const DiscoveryOutfitDetailScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const { outfitId, source } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const outfitQuery = useDiscoveryOutfit(outfitId);
  const outfit = outfitQuery.data;
  const loading = outfitQuery.isLoading;
  // `data === null` (not undefined) is the 404 signal from
  // `discoveryService.getOutfit` — missing OR unpublished, indistinguishable
  // by design (backend §Discovery). `isError` is a genuine transport failure.
  const notFound = !loading && !outfitQuery.isError && outfit === null;

  // Phase 09: only a `discovery-outfit` deep link sets `source: 'deep_link'`
  // — a feed-card tap already fires `discovery_outfit_opened` (phase 07), so
  // this fires once per outfit id, only for the deep-link entry, once the
  // fetch has settled either way (`resolved: false` covers both the 404 and
  // the transport-error branch — the link simply didn't land the user on a
  // real outfit).
  const deepLinkTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (source !== 'deep_link' || loading) {
      return;
    }
    if (deepLinkTrackedRef.current === outfitId) {
      return;
    }
    deepLinkTrackedRef.current = outfitId;
    track('discovery_deep_link_opened', {
      outfit_id: outfitId,
      resolved: !!outfit,
    });
  }, [source, loading, outfit, outfitId]);

  const itemCount = outfit?.items.length ?? 0;
  const canSeeOnMe = itemCount >= 1 && itemCount <= 4;
  const favourite = useDiscoveryFavourite(outfit);

  const handleBrowseDiscovery = () => {
    toast.show({
      type: 'info',
      text1: t('discovery.outfit_unavailable_toast'),
      position: 'bottom',
    });
    // popTo (not navigate) — mirrors ItemDetailScreen.handleBuildAround /
    // try-on-completion-notice's showTryOnCompletionNotice: this screen was
    // reached via the discovery-outfit deep link, which can land here after
    // popping through an arbitrary number of screens (whatever the deep link
    // pushed). A plain `navigate('Discovery')` updates the JS nav state (pop
    // to an existing `Discovery` instance, or push a fresh one) but — per the
    // same react-native-screens desync this codebase already hit and fixed
    // twice — can leave the screen(s) it popped past only torn down at the JS
    // level, not the native one, so the OLD screen's still-registered native
    // touch handling can keep intercepting taps meant for the newly-revealed
    // `Discovery` header (reported: hamburger stops opening the drawer, only
    // on the instance reached this way — AU-457 retry #4 finding). `popTo`
    // issues real pop semantics so the removed screen(s) are properly torn
    // down; resolution (existing instance vs fresh push) is identical to
    // plain `navigate` — same as SidebarMenu's `go('Discovery', close)`.
    navigation.popTo('Discovery');
  };

  const handleSeeOnMe = () => {
    if (!outfit || !canSeeOnMe) {
      return;
    }
    track('discovery_see_on_me_tapped', {
      outfit_id: outfit.id,
      item_count: itemCount,
    });
    // Reuse-confirm gate owns consent/AI-limit/usage gating — never navigate
    // straight to `SeeThisOnMe` (see FavouriteScreen.tsx:260 worked example).
    navigation.navigate('SeeThisOnMeConfirm', {
      outfit: {
        outfitHash: discoveryOutfitHash(outfit.id),
        itemIds: outfit.items.map(item => item.id),
        itemImageUrls: outfit.items
          .map(item => item.image_png ?? item.image_url)
          .filter((url): url is string => !!url),
        stylingNote: outfit.description,
      },
    });
  };

  // Remix → drop the outfit's pieces onto the canvas editor, same param shape
  // Home's Remix sends (`entry: 'remix'` gives the canvas a back chevron).
  const handleRemix = () => {
    if (!outfit) {
      return;
    }
    track('discovery_remix_tapped', { outfit_id: outfit.id, item_count: itemCount });
    const items = outfit.items.map(item => {
      // Cutout → original fallback chain, as Home's Remix (utils/url.ts).
      const [imageUrl, ...imageFallbackUrls] = resolveItemImageSources(item);
      return {
        id: item.id,
        imageUrl: imageUrl || item.image_url,
        imageFallbackUrls,
        category: item.category,
        is_common_item: item.is_common_item,
      };
    });
    navigation.navigate(
      'OutfitCanvas',
      items.length ? { items, entry: 'remix' } : { entry: 'remix' },
    );
  };

  const back = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* The loaded screen has NO header bar: the cover image is the top of the
          screen and the back chip floats on it (design call — same treatment as
          `BodyPhotoDetailView`, the other image-hero detail view — though that
          one is still on its own pre-canonical 8/22 offset). The empty states
          have no image to float on, so they keep the canonical
          `Header.BackTitle`. Exactly one of the two renders at a time, so
          `discovery-detail-back` stays a unique Maestro selector either way —
          and both land the chip on the SAME pixel (`HEADER_ICON_INSET`, see
          `styles.floatingBack`), so it never jumps between the two branches or
          against any other screen's back button. */}
      {outfit && !loading ? null : (
        <Header.BackTitle
          title={t('discovery.title')}
          onBack={back}
          leftTestID="discovery-detail-back"
          leftAccessibilityLabel={t('uac.common.back')}
        />
      )}

      {loading ? (
        <DiscoveryDetailLoading />
      ) : notFound ? (
        <DiscoveryDetailUnavailable onBrowse={handleBrowseDiscovery} />
      ) : outfitQuery.isError ? (
        <DiscoveryDetailError onRetry={() => outfitQuery.refetch()} />
      ) : outfit ? (
        <>
          <ScrollView
            testID="discovery-detail-scroll"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + DISCOVERY_ACTION_BAR_HEIGHT + theme.spacing.l },
            ]}
          >
            <DiscoveryOutfitSummary outfit={outfit} />
            <DiscoveryItemStrip outfitId={outfit.id} items={outfit.items} />
          </ScrollView>

          {/* `top` comes from the inset at runtime — see `styles.floatingBack`:
              absolute children ignore the SafeAreaView's top padding, so
              without this the chip sits under the Dynamic Island. */}
          <View
            style={[
              styles.floatingBack,
              { top: insets.top + HEADER_ICON_INSET },
            ]}
          >
            <TopIconButton
              testID="discovery-detail-back"
              accessibilityLabel={t('uac.common.back')}
              onPress={back}
              icon={<Icons.ChevronLeft width={24} height={24} />}
            />
          </View>

          <DiscoveryDetailActionBar
            onRemix={handleRemix}
            onToggleFavourite={favourite.toggle}
            favouriteState={favourite.state}
            onSeeOnMe={handleSeeOnMe}
            canSeeOnMe={canSeeOnMe}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
};
