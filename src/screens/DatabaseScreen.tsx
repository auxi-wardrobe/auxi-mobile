import { StyleSheet, Text, ScrollView, View, Image } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '../components/layout/Header';
import { theme } from '../theme/theme';
import { Icons } from '../assets/icons';

import { CategoryTabs } from '../components/features/CategoryTabs';
import { Shimmer } from '../components/features/Shimmer';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { PressableScale } from '../components/primitives/PressableScale';

import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { AppStackParamList } from '../types/navigation';
import { resolveItemImage } from '../utils/url';
import { track } from '../services/analytics';
// Shared wardrobe grid spec (Figma node 2850:16492) — the Database picker
// renders the exact same 3-column grid, tabs, and tile geometry as Wardrobe.
import {
  FILTER_TABS,
  FilterTab,
  GRID_GAP,
  HORIZONTAL_PADDING,
  TILE_HEIGHT,
  TILE_WIDTH,
  resolveFilterQuery,
} from './wardrobe/wardrobe-grid';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'Wardrobe'
>;

export const DatabaseScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Wardrobe');
    }
  };

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isFocused = useIsFocused();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const category = resolveFilterQuery(selectedTab);
      const data = await wardrobeService.getCommonItems(category);
      setItems(data);
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
      toast.show({
        type: 'error',
        text1: t('common.load_wardrobe_failed_title'),
        text2: t('common.try_again_moment'),
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTab, t]);

  useEffect(() => {
    if (isFocused) {
      fetchItems();
    }
  }, [isFocused, fetchItems]);

  const renderLoadingGrid = () => (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Shimmer
          key={`skeleton-${index}`}
          width={TILE_WIDTH}
          height={TILE_HEIGHT}
          testID={`database-loading-tile-${index}`}
        />
      ))}
    </View>
  );

  const handleItemPress = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } else {
      track('wardrobe_search_result_selected', {
        item_id: itemId,
        source: 'database',
      });
      setSelectedItems(prev => [...prev, itemId]);
    }
  };

  const handleAddItems = async () => {
    if (submitting || selectedItems.length === 0) {
      return;
    }

    // Note: `wardrobe_search_initiated` is NOT fired here — DatabaseScreen has
    // no search-submit step today (grid-browse-and-pick UI). Event moved to
    // tracking-plan §6 as gap; wire when a real search box ships.
    setSubmitting(true);

    // Clone each selected item via the per-item endpoint
    // (`POST /wardrobe/common-items/<id>/clone`) — that is the route the backend
    // actually exposes. We fan out with allSettled so one bad id doesn't sink
    // the whole batch, then report success/failure honestly.
    const ids = selectedItems;
    const results = await Promise.allSettled(
      ids.map(id => wardrobeService.cloneCommonItem(id)),
    );

    const succeededIds = ids.filter(
      (_, index) => results[index].status === 'fulfilled',
    );
    const failedCount = ids.length - succeededIds.length;

    // Emit a wardrobe_item_added per successfully cloned id. Category is omitted
    // when the local list shape from getCommonItems doesn't carry one.
    succeededIds.forEach(id => {
      const matched = items.find(it => it.id === id);
      const props: Record<string, unknown> = {
        item_id: id,
        source: 'database',
        method: 'search_database',
      };
      if (matched?.category) {
        props.category = matched.category;
      }
      track('wardrobe_item_added', props);
    });

    setSubmitting(false);

    const addedCount = succeededIds.length;

    // Show exactly ONE toast. The toast service only renders the most
    // recent call, so firing a success and an error back-to-back would let the
    // success clobber the failure notice — on a partial batch the user would
    // never learn some items failed. Pick a single honest message instead.
    if (addedCount > 0 && failedCount > 0) {
      console.error(`Failed to clone ${failedCount} of ${ids.length} item(s)`);
      toast.show({
        type: 'success',
        text1: t('wardrobe.database.added_partial_toast', {
          added: addedCount,
          failed: failedCount,
        }),
        position: 'bottom',
      });
    } else if (addedCount > 0) {
      toast.show({
        type: 'success',
        text1: t('wardrobe.database.added_toast', { count: addedCount }),
        position: 'bottom',
      });
    } else if (failedCount > 0) {
      console.error(`Failed to clone ${failedCount} of ${ids.length} item(s)`);
      toast.show({
        type: 'error',
        text1: t('common.add_items_failed_title'),
        text2: t('common.try_again_moment'),
        position: 'bottom',
      });
    }

    // Navigate back as long as at least one item landed in the wardrobe. The
    // toast renders at the app root, so it persists across the navigation.
    if (addedCount > 0) {
      navigation.navigate('Wardrobe');
    }
  };

  // Same tile visual as WardrobeGridTile, with the wardrobe select-mode
  // treatment (figmaAction ring + top-right check) extended to multi-select.
  const renderGridTile = (item: WardrobeItem, index: number) => {
    const imageUrl = resolveItemImage({
      image_png: item.image_png ?? null,
      image_url: item.image_url ?? '',
    });
    const isSelected = selectedItems.includes(item.id);
    const tileTestID =
      index === 0 ? 'database-item-first' : `database-item-${item.id}`;

    return (
      <PressableScale
        key={item.id}
        style={[styles.tile, isSelected && styles.tileSelected]}
        activeOpacity={0.88}
        onPress={() => handleItemPress(item.id)}
        testID={tileTestID}
        accessibilityLabel={item.name || t('wardrobe.list.a11y_item_fallback')}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl, cache: 'force-cache' }}
            style={styles.tileImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.tileFallback}>
            <Text style={styles.tileFallbackText}>{t('common.no_image')}</Text>
          </View>
        )}

        {isSelected ? (
          <View
            style={styles.tileSelectedCheck}
            testID={`database-select-check-${item.id}`}
            pointerEvents="none"
          >
            <Icons.CheckCircle
              width={24}
              height={24}
              color={theme.colors.figmaAction}
            />
          </View>
        ) : null}
      </PressableScale>
    );
  };

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('wardrobe.database.title')}
        leftTestID="database-back-button"
        leftAccessibilityLabel={t('uac.common.back')}
        onBack={handleBack}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategoryTabs
          categories={[...FILTER_TABS]}
          selectedCategory={selectedTab}
          onSelectCategory={category => setSelectedTab(category as FilterTab)}
          wrap
        />
        {loading ? (
          renderLoadingGrid()
        ) : hasItems ? (
          <View testID="database-grid-root" style={styles.grid}>
            {items.map(renderGridTile)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('wardrobe.database.empty')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Pinned commit bar — same shape as the wardrobe picker-mode footer. */}
      <View style={[styles.addFooter, { paddingBottom: insets.bottom + 16 }]}>
        <PillButton
          testID="database-add-items-submit"
          variant="filled"
          title={t('wardrobe.database.add_item')}
          onPress={handleAddItems}
          disabled={selectedItems.length === 0 || submitting}
          loading={submitting}
          style={styles.addCta}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    // Extra bottom room so the last grid row clears the pinned "Add Item" bar.
    paddingBottom: 120,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  // Multi-select highlight ring — same treatment as the wardrobe picker mode.
  tileSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaAction,
  },
  tileSelectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tileFallbackText: {
    ...theme.typography.aliases.poppinsCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.aliases.poppinsSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  // Pinned add-items commit bar — mirrors WardrobeScreen's changeFooter.
  addFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    backgroundColor: theme.colors.figmaBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.figmaListDivider,
  },
  addCta: {
    alignSelf: 'stretch',
  },
});
