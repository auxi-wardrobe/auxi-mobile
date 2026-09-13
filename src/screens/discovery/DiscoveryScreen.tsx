import React, { useCallback } from 'react';
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/layout/Header';
import { useSidebar } from '../../context/SidebarContext';
import { track } from '../../services/analytics';
import { AppStackParamList } from '../../types/navigation';
import { useDiscoveryFeed } from '../../hooks/useDiscoveryFeed';
import type { DiscoveryOutfitCard as DiscoveryOutfitCardData } from '../../services/discoveryService';
import { AppNavFooter } from '../../components/features/AppNavFooter';
import { DiscoveryOutfitCard } from './DiscoveryOutfitCard';
import { DiscoveryFilterRow } from './DiscoveryFilterRow';
import { useDiscoveryMasonry } from './useDiscoveryMasonry';
import {
  DiscoveryFeedEmpty,
  DiscoveryFeedError,
  DiscoveryFeedLoadingGrid,
  DiscoveryFeedLoadingMoreFooter,
} from './DiscoveryFeedStates';
import { discoveryFeedStyles as styles } from './discoveryFeedStyles';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'Discovery'
>;

// Same reach as the FlatList `onEndReachedThreshold` this grid replaced: fetch
// once the tail is within 0.4 viewports. A masonry grid can't be a FlatList —
// the two columns advance independently, so there are no rows to virtualise.
const END_REACHED_THRESHOLD = 0.4;

export const DiscoveryScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();

  const {
    seasons,
    selectedTrendTags,
    trendTags,
    outfits,
    isFilterActive,
    loading,
    loadingMore,
    loadError,
    onSeasonsChange,
    onTrendTagsChange,
    onEndReached,
    onRetry,
  } = useDiscoveryFeed();

  const { columns, sizing } = useDiscoveryMasonry(outfits);

  const handleOutfitPress = (outfit: DiscoveryOutfitCardData, index: number) => {
    track('discovery_outfit_opened', {
      outfit_id: outfit.id,
      position: index,
      source: 'feed',
    });
    navigation.navigate('DiscoveryOutfitDetail', { outfitId: outfit.id });
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Tiles still being measured are not on screen yet, so "near the end"
      // is a lie until they land — paginating here would fetch a page the
      // user hasn't reached.
      if (sizing) {
        return;
      }
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromEnd <= layoutMeasurement.height * END_REACHED_THRESHOLD) {
        onEndReached();
      }
    },
    [onEndReached, sizing],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.MenuTitle
        title={t('discovery.title')}
        leftTestID="discovery-menu-button"
        leftAccessibilityLabel={t('wardrobe.list.a11y_open_menu')}
        onBack={openSidebar}
      />

      <DiscoveryFilterRow
        seasons={seasons}
        onSeasonsChange={onSeasonsChange}
        selectedTrendTags={selectedTrendTags}
        onTrendTagsChange={onTrendTagsChange}
        trendTags={trendTags}
      />

      {/* `loadingMore` with nothing on screen is the client-narrowing path:
          a multi-select filter can blank out whole server pages, and the hook
          is walking forward to fill the grid. Showing the skeleton rather than
          the empty state keeps "no matches" from flashing mid-search. */}
      {loading || (loadingMore && outfits.length === 0) ? (
        <DiscoveryFeedLoadingGrid />
      ) : loadError ? (
        <DiscoveryFeedError onRetry={onRetry} />
      ) : outfits.length === 0 ? (
        <DiscoveryFeedEmpty isFilterActive={isFilterActive} />
      ) : (
        <ScrollView
          testID="discovery-grid"
          style={styles.list}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.masonry}>
            {columns.map((column, columnIndex) => (
              <View
                key={`discovery-column-${columnIndex}`}
                testID={`discovery-column-${columnIndex}`}
                style={styles.masonryColumn}
              >
                {column.map(tile => (
                  <DiscoveryOutfitCard
                    key={tile.item.id}
                    outfit={tile.item}
                    index={tile.index}
                    aspectRatio={tile.ratio}
                    onPress={outfit => handleOutfitPress(outfit, tile.index)}
                  />
                ))}
              </View>
            ))}
          </View>

          {loadingMore || sizing ? <DiscoveryFeedLoadingMoreFooter /> : null}
        </ScrollView>
      )}

      {/* Same bottom anchor as the other three tab hosts — see AppNavFooter. */}
      <AppNavFooter active="discovery" testID="discovery-footer-nav" />
    </SafeAreaView>
  );
};
