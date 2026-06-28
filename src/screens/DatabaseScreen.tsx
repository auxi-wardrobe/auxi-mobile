import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  View,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '../components/layout/Header';
import { theme } from '../theme/theme';
import { Icons } from '../assets/icons';

import { CategoryTabs } from '../components/features/CategoryTabs';
import { PillButton } from '../components/primitives/FigmaPrimitives';

import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { AppStackParamList } from '../types/navigation';
import { getImageUrl } from '../utils/url';
import { track } from '../services/analytics';

const { width: screenWidth } = Dimensions.get('window');

const HORIZONTAL_PADDING = 24;
const GRID_GAP = 4;
const WARDROBE_COLUMNS = 4;

const TILE_WIDTH = screenWidth / WARDROBE_COLUMNS;
const TILE_HEIGHT = TILE_WIDTH * (4 / 3);

const FILTER_TABS = [
  'All',
  'Tops',
  'Bottoms',
  'Shoes',
  'One-piece',
  'AC',
] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const resolveFilterQuery = (selectedTab: FilterTab): string | undefined => {
  switch (selectedTab) {
    case 'Tops':
      return 'top';
    case 'Bottoms':
      return 'bottom';
    case 'Shoes':
      return 'shoes';
    case 'One-piece':
      return 'one_piece';
    case 'AC':
      return 'accessory';
    case 'All':
    default:
      return undefined;
  }
};

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'Wardrobe'
>;

export const DatabaseScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const { t } = useTranslation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Wardrobe');
    }
  };

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [items, setItems] = useState<any[]>([]);
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
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.tileSkeleton} />
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

  const renderGridTile = (item: WardrobeItem) => {
    const imageUrl = getImageUrl(item.image_png ?? item.image_url);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.tile,
          selectedItems.includes(item.id) && {
            borderWidth: 4,
            borderRadius: 12,
            borderColor: '#5B5550',
          },
        ]}
        activeOpacity={0.88}
        onPress={() => handleItemPress(item.id)}
      >
        <View>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.tileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.tileFallback}>
              <Text style={styles.tileFallbackText}>
                {t('common.no_image')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header.MenuTitle
        title={t('wardrobe.database.title')}
        leftTestID="database-menu-button"
        onBack={openSidebar}
      />

      <View style={{ paddingHorizontal: 16, flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <CategoryTabs
            categories={[...FILTER_TABS]}
            selectedCategory={selectedTab}
            onSelectCategory={category => setSelectedTab(category as FilterTab)}
          />
          {loading ? (
            renderLoadingGrid()
          ) : hasItems ? (
            <View style={styles.grid}>{items.map(renderGridTile)}</View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {t('wardrobe.database.empty')}
              </Text>
            </View>
          )}
        </ScrollView>
        <PillButton
          testID="database-add-items-submit"
          title={t('wardrobe.database.add_item')}
          onPress={handleAddItems}
          disabled={selectedItems.length === 0 || submitting}
          loading={submitting}
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
  plusButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 28,
    lineHeight: 28,
    marginTop: -2,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  tileSkeleton: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#E3E6EB',
  },
  tile: {
    padding: 2,
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    backgroundColor: '#E8EBF0',
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
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  tileBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tileBadge: {
    minWidth: 58,
    maxWidth: TILE_WIDTH - 8,
    height: 19,
    paddingHorizontal: 12,
    borderTopLeftRadius: theme.borderRadius.m,
    borderTopRightRadius: theme.borderRadius.m,
    backgroundColor: 'rgba(39, 42, 50, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBadgeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 8,
    lineHeight: 12,
    color: theme.colors.white,
  },
});
