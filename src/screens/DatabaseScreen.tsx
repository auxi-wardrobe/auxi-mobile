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
import Toast from 'react-native-toast-message';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '../components/layout/Header';
import { useSidebar } from '../context/SidebarContext';
import { theme } from '../theme/theme';

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
  const { open: openSidebar } = useSidebar();

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const isFocused = useIsFocused();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const category = resolveFilterQuery(selectedTab);
      const data = await wardrobeService.getCommonItems(category);
      setItems(data);
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
      Toast.show({
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
    // Note: `wardrobe_search_initiated` is NOT fired here — DatabaseScreen has
    // no search-submit step today (grid-browse-and-pick UI). Event moved to
    // tracking-plan §6 as gap; wire when a real search box ships.
    await wardrobeService.cloneCommonItems(selectedItems);
    // Best-effort: emit a wardrobe_item_added per successfully cloned id. The
    // service returns void so we use the user-selected ids (one event per id);
    // category is omitted because the local list shape from getCommonItems
    // doesn't carry a guaranteed category field on every result.
    selectedItems.forEach(id => {
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
    navigation.navigate('Wardrobe');
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
      <Header
        title={t('wardrobe.database.title')}
        titleTextStyle={styles.headerTitle}
        onBack={openSidebar}
        rightComponent={
          <TouchableOpacity>
            <Text> </Text>
          </TouchableOpacity>
        }
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
          title={t('wardrobe.database.add_item')}
          onPress={handleAddItems}
          disabled={selectedItems.length === 0}
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
  headerTitle: {
    ...theme.typography.aliases.archivoBody,
    fontWeight: '400',
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
    fontFamily: 'Manrope-Medium',
    fontSize: 8,
    lineHeight: 12,
    color: theme.colors.white,
  },
  emptyCta: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.figmaAction,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
});
