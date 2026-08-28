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
    season,
    trendTag,
    trendTags,
    outfits,
    isFilterActive,
    loading,
    loadingMore,
    loadError,
    onSeasonChange,
    onTrendTagChange,
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
        season={season}
        onSeasonChange={onSeasonChange}
        trendTag={trendTag}
        onTrendTagChange={onTrendTagChange}
        trendTags={trendTags}
      />

      {loading ? (
        <DiscoveryFeedLoadingGrid />
      ) : loadError ? (
        <DiscoveryFeedError onRetry={onRetry} />
      ) : outfits.length === 0 ? (
        <DiscoveryFeedEmpty isFilterActive={isFilterActive} />
      ) : (
        <FlatList
          testID="discovery-grid"
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
    </SafeAreaView>
  );
};
