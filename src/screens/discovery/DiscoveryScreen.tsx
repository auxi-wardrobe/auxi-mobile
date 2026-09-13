import React from 'react';
import { FlatList } from 'react-native';
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

  const handleOutfitPress = (outfit: DiscoveryOutfitCardData, index: number) => {
    track('discovery_outfit_opened', {
      outfit_id: outfit.id,
      position: index,
      source: 'feed',
    });
    navigation.navigate('DiscoveryOutfitDetail', { outfitId: outfit.id });
  };

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
        <FlatList
          testID="discovery-grid"
          style={styles.list}
          data={outfits}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          renderItem={({ item, index }) => (
            <DiscoveryOutfitCard
              outfit={item}
              index={index}
              onPress={outfit => handleOutfitPress(outfit, index)}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListFooterComponent={
            loadingMore ? <DiscoveryFeedLoadingMoreFooter /> : null
          }
        />
      )}

      {/* Same bottom anchor as the other three tab hosts — see AppNavFooter. */}
      <AppNavFooter active="discovery" testID="discovery-footer-nav" />
    </SafeAreaView>
  );
};
