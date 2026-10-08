import React, { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { popToOrNavigate } from '../../navigation/popToOrNavigate';
import { useSidebar } from '../../context/SidebarContext';
import { track } from '../../services/analytics';
import {
  newDiscoveryShuffleSeed,
  useDiscoveryOutfits,
} from '../../hooks/useDiscovery';
import type { DiscoveryOutfitCard } from '../../services/discoveryService';
import { resolveItemImageSources } from '../../utils/url';
import type { Item } from '../../types/item';
import type { OutfitSheet } from '../HomeScreen/types';
import { AppNavFooter } from '../../components/features/AppNavFooter';
import { HomeLandingHeader } from './components/HomeLandingHeader';
import { TodaysPicksSection } from './components/TodaysPicksSection';
import {
  DiscoveryStrip,
  DISCOVERY_STRIP_SIZE,
} from './components/DiscoveryStrip';
import { PopularFeaturesGrid } from './components/PopularFeaturesGrid';
import { NotificationSheet } from './components/NotificationSheet';
import { BuildYourLookSection } from './components/BuildYourLookSection';
import { BuildYourLookTagSheet } from './components/BuildYourLookTagSheet';
import { BuildYourLookStatusSheet } from './components/BuildYourLookStatusSheet';
import { destinationFor } from './feature-routes';
import { useHomeGreeting } from './hooks/useHomeGreeting';
import { useHomeWeather } from './hooks/useHomeWeather';
import { useTodaysPicks } from './hooks/useTodaysPicks';
import { useHomeNotifications } from './hooks/useHomeNotifications';
import { useBuildYourLook } from './hooks/useBuildYourLook';
import type { HomeNotification } from './notifications/notification-feed';
import { styles } from './styles';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'HomeLanding'>;

/**
 * HomeLanding — the app's default screen after auth/onboarding.
 *
 * It is a DASHBOARD, not a second recommender: it shows what the app already
 * knows about the user's day (today's picks, the newest curated outfits,
 * shortcuts) and hands every action off to the screen that owns it. Nothing
 * here calls the V05 outfit engine, so opening the app costs no AI budget.
 *
 * Reachable from the sidebar ("Home") and from the shared 4-tab `AppNavFooter`
 * that this screen, the recommender (`Home`), `Discovery` and `Wardrobe` all
 * render at the same bottom anchor.
 */
export const HomeLandingScreen = () => {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const { open: openSidebar } = useSidebar();

  const { greeting } = useHomeGreeting();
  const { weather } = useHomeWeather();
  const {
    sheets,
    source,
    loading: picksLoading,
    failure: picksFailure,
  } = useTodaysPicks(weather ? weather.temp_c : null);
  const { feed, unseen, markSeen } = useHomeNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // "Build your look": up to three wardrobe items (+ Discovery tags) → the
  // same Discovery search / result screen as ItemDetail's "Build around this".
  const buildLook = useBuildYourLook();

  // Random picks, reshuffled every time Home comes back into focus (Home
  // usually stays mounted under the stack, so a per-mount seed would freeze
  // the strip for the whole session). The first focus keeps the mount seed —
  // no double fetch on cold start — and `keepPrevious` holds the old cards
  // on screen while the new pair loads instead of flashing the skeleton.
  const [discoverySeed, setDiscoverySeed] = useState(newDiscoveryShuffleSeed);
  const discoveryFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (discoveryFocusedRef.current) {
        setDiscoverySeed(newDiscoveryShuffleSeed());
      }
      discoveryFocusedRef.current = true;
    }, []),
  );
  const discoveryQuery = useDiscoveryOutfits(
    { limit: DISCOVERY_STRIP_SIZE, offset: 0, seed: discoverySeed },
    { keepPrevious: true },
  );
  const discoveryOutfits = (discoveryQuery.data?.outfits ?? []).slice(
    0,
    DISCOVERY_STRIP_SIZE,
  );

  useFocusEffect(
    useCallback(() => {
      track('home_landing_viewed', { picks_source: source });
    }, [source]),
  );

  const openRecommender = (reason: string) => {
    track('home_landing_outfit_opened', { reason });
    // The recommender may already be in the stack (the user came back via the
    // footer); popping to it avoids a duplicate mount that discards the deck.
    popToOrNavigate(navigation, 'Home');
  };

  const handleRemix = (sheet: OutfitSheet) => {
    track('home_landing_remix_tapped', { outfit_hash: sheet.outfitHash });
    navigation.navigate('OutfitCanvas', {
      entry: 'remix',
      items: sheet.items
        .map(item => {
          // Dead `processed/` cutout falls back to the live original on the
          // canvas, same chain ItemDetail/Home already walk (utils/url.ts).
          const [imageUrl, ...imageFallbackUrls] =
            resolveItemImageSources(item);
          return {
            id: item.id,
            imageUrl: imageUrl ?? '',
            imageFallbackUrls,
            category: item.category,
            is_common_item: item.is_common_item,
            user_id: item.user_id,
            is_new: item.is_new,
            usage_frequency: item.usage_frequency,
          };
        })
        .filter(item => !!item.imageUrl),
    });
  };

  const handleItemPress = (item: Item) => {
    navigation.navigate('ItemDetail', {
      itemId: item.id,
      // Today's picks can include V05 `common_essential` injections, whose ids
      // miss the wardrobe lookup — carry the tile's payload so the detail
      // screen still renders (same contract as the Home grid, see AU-312).
      fallbackItem: {
        id: item.id,
        image_url: item.image_url,
        image_png: item.image_png ?? undefined,
        image_studio: item.image_studio ?? undefined,
        name: item.name ?? undefined,
        category: item.category,
        is_common_item: item.is_common_item,
      },
    });
  };

  const handleDiscoveryPress = (outfit: DiscoveryOutfitCard, index: number) => {
    track('discovery_outfit_opened', {
      outfit_id: outfit.id,
      position: index,
      source: 'home_landing',
    });
    navigation.navigate('DiscoveryOutfitDetail', { outfitId: outfit.id });
  };

  const handleNotification = (notification: HomeNotification) => {
    track('home_landing_notification_opened', { kind: notification.kind });
    // Opening a result is what marks it read — the badge should survive a
    // glance at the list and only clear for the rows actually acted on.
    markSeen([notification.id]);
    setNotificationsOpen(false);
    if (notification.kind === 'tryon') {
      if (notification.compositeUrl) {
        navigation.navigate('TryOnResult', {
          compositeUrl: notification.compositeUrl,
        });
      }
      return;
    }
    // Same destination the beautify push deep link uses: EnhanceImage resolves
    // the candidate from the item id on mount, and `displayUri` is only the
    // hold-to-compare baseline, so an empty one degrades gracefully.
    navigation.navigate('EnhanceImage', {
      itemId: notification.targetId,
      displayUri: '',
      origin: 'wardrobe',
    });
  };

  const handleFeature = (key: string) => {
    track('home_landing_feature_tapped', { feature: key });
    const destination = destinationFor(key);
    if (destination.kind === 'build_look') {
      // "Find Matching" = start a Build-your-look search: open its Add-item
      // step (the wardrobe picker). Without the section (flag off) the
      // recommender is the closest thing to "find matching".
      if (buildLook.enabled) {
        buildLook.sectionProps.onAddItem();
      } else {
        openRecommender(`feature_${key}`);
      }
      return;
    }
    if (destination.kind === 'recommender') {
      openRecommender(`feature_${key}`);
      return;
    }
    if (destination.route === 'Favourite') {
      // Reached sideways from the landing page, so the Favourite header shows
      // a back chevron instead of reading as a top-level destination.
      navigation.navigate('Favourite', { showBackButton: true });
      return;
    }
    popToOrNavigate(navigation, destination.route);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        testID="home-landing-scroll"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HomeLandingHeader
          greeting={greeting}
          weather={weather}
          unseenNotifications={unseen}
          onOpenMenu={openSidebar}
          onOpenNotifications={() => {
            track('home_landing_notifications_opened', {
              unseen_count: unseen,
              total_count: feed.length,
            });
            setNotificationsOpen(true);
          }}
        />

        <TodaysPicksSection
          sheets={sheets}
          source={source}
          loading={picksLoading}
          failure={picksFailure}
          onSeeMore={() => openRecommender('picks_see_more')}
          onAddItems={() => popToOrNavigate(navigation, 'Wardrobe')}
          onRemix={handleRemix}
          onWearThis={() => openRecommender('wear_this')}
          onItemPress={handleItemPress}
        />

        <DiscoveryStrip
          outfits={discoveryOutfits}
          loading={discoveryQuery.isLoading}
          loadError={discoveryQuery.isError}
          onSeeMore={() => popToOrNavigate(navigation, 'Discovery')}
          onOutfitPress={handleDiscoveryPress}
        />

        {buildLook.enabled ? (
          <BuildYourLookSection {...buildLook.sectionProps} />
        ) : null}

        <PopularFeaturesGrid onSelect={handleFeature} />
      </ScrollView>

      {buildLook.enabled ? (
        <>
          <BuildYourLookTagSheet {...buildLook.tagSheetProps} />
          <BuildYourLookStatusSheet {...buildLook.statusSheetProps} />
        </>
      ) : null}

      <NotificationSheet
        visible={notificationsOpen}
        notifications={feed}
        onDismiss={() => setNotificationsOpen(false)}
        onSelect={handleNotification}
      />

      {/* Last in-flow child at the same bottom anchor every tab host uses —
          keep the placement identical or the persistent-bar illusion breaks. */}
      <AppNavFooter active="home" testID="home-landing-footer-nav" />
    </SafeAreaView>
  );
};
