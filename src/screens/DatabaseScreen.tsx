import { Keyboard, StyleSheet, Text, ScrollView, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MInput, toast } from '../components/design-system/lib';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '../components/layout/Header';
import { LoadableRemoteImage } from '../components/features/LoadableRemoteImage';
import { theme } from '../theme/theme';
import { Icons } from '../assets/icons';

import { CategoryTabs } from '../components/features/CategoryTabs';
import { Shimmer } from '../components/features/Shimmer';
import {
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { PressableScale } from '../components/primitives/PressableScale';

import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { AppStackParamList } from '../types/navigation';
import { resolveItemImageSources } from '../utils/url';
import { track } from '../services/analytics';
import { matchesItemName } from '../utils/item-name-search';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isFocused = useIsFocused();

  // Name search runs client-side over the already-fetched (category-filtered)
  // catalog — the common-items endpoint has no query param. Selections are
  // keyed by id, so narrowing the grid never drops items already picked.
  const visibleItems = useMemo(
    () => items.filter(item => matchesItemName(item.name, searchQuery)),
    [items, searchQuery],
  );
  const isSearching = searchQuery.trim().length > 0;

  const toggleSearch = () => {
    if (searchOpen) {
      Keyboard.dismiss();
      setSearchQuery('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  const handleSearchSubmit = () => {
    if (!isSearching) {
      return;
    }
    // Never ship the raw query (free text) — length + hit count only.
    track('wardrobe_search_initiated', {
      source: 'database',
      query_length: searchQuery.trim().length,
      result_count: visibleItems.length,
    });
  };

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

    // `wardrobe_search_initiated` fires on the search field's submit key
    // (handleSearchSubmit), not here — this is the basket-commit step.
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
    // AU-437: same tile visual as WardrobeGridTile, so it must feed the
    // same three sources — omitting image_studio showed the pre-enhance
    // photo here while the wardrobe grid showed the enhanced one. Taken as an
    // ordered chain so a dead `processed/` cutout falls back to the still-alive
    // `common_items/` original rather than rendering blank.
    const [imageUrl, ...imageFallbacks] = resolveItemImageSources({
      image_studio: item.image_studio ?? null,
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
          <LoadableRemoteImage
            uri={imageUrl}
            fallbackUris={imageFallbacks}
            cache="force-cache"
            resizeMode="contain"
            skeletonTestID={`database-image-skeleton-${item.id}`}
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

  const hasItems = visibleItems.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('wardrobe.database.title')}
        leftTestID="database-back-button"
        leftAccessibilityLabel={t('uac.common.back')}
        onBack={handleBack}
        right={
          <TopIconButton
            onPress={toggleSearch}
            testID={
              searchOpen
                ? 'database-search-toggle-open'
                : 'database-search-toggle'
            }
            accessibilityLabel={t(
              searchOpen
                ? 'wardrobe.database.search_close_a11y'
                : 'wardrobe.database.search_open_a11y',
            )}
            icon={
              searchOpen ? (
                <Icons.CloseThin width={24} height={24} />
              ) : (
                <Icons.Search width={24} height={24} />
              )
            }
          />
        }
      />

      {searchOpen ? (
        <View style={styles.searchBar}>
          <MInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('wardrobe.database.search_placeholder')}
            leftIcon={Icons.Search}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            testID="database-search-input"
            accessibilityLabel={t('wardrobe.database.search_input_a11y')}
          />
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            {visibleItems.map(renderGridTile)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle} testID="database-empty-state">
              {isSearching
                ? t('wardrobe.database.search_empty', {
                    query: searchQuery.trim(),
                  })
                : t('wardrobe.database.empty')}
            </Text>
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
  searchBar: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: theme.spacing.s,
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
  tileFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tileFallbackText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.aliases.interSemiboldSm,
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
