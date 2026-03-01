import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import {
  BottomSheetSurface,
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';
import { getImageUrl } from '../utils/url';

const { width: screenWidth } = Dimensions.get('window');

const FILTER_TABS = ['All', 'Tops', 'Bottoms', 'Shoes', 'One-piece', 'AC'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const HORIZONTAL_PADDING = 24;
const GRID_GAP = 4;
const WARDROBE_COLUMNS = 4;
const CATALOG_COLUMNS = 3;
const TILE_WIDTH = (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (WARDROBE_COLUMNS - 1)) / WARDROBE_COLUMNS;
const TILE_HEIGHT = TILE_WIDTH * (4 / 3);
const CATALOG_TILE_WIDTH = (screenWidth - HORIZONTAL_PADDING * 2 - 8 * (CATALOG_COLUMNS - 1)) / CATALOG_COLUMNS;

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList, 'Wardrobe'>;

const resolveItemTab = (category?: string): FilterTab => {
  const normalized = category?.trim().toLowerCase() || '';

  if (!normalized) {
    return 'AC';
  }

  if (
    normalized.includes('shoe') ||
    normalized.includes('sneaker') ||
    normalized.includes('heel') ||
    normalized.includes('boot')
  ) {
    return 'Shoes';
  }

  if (
    normalized.includes('bottom') ||
    normalized.includes('pant') ||
    normalized.includes('trouser') ||
    normalized.includes('jean') ||
    normalized.includes('skirt') ||
    normalized.includes('short')
  ) {
    return 'Bottoms';
  }

  if (
    normalized.includes('dress') ||
    normalized.includes('one-piece') ||
    normalized.includes('one piece') ||
    normalized.includes('one_piece') ||
    normalized.includes('jumpsuit') ||
    normalized.includes('romper')
  ) {
    return 'One-piece';
  }

  if (
    normalized === 'ac' ||
    normalized.includes('accessor') ||
    normalized.includes('bag') ||
    normalized.includes('belt') ||
    normalized.includes('hat') ||
    normalized.includes('jewel')
  ) {
    return 'AC';
  }

  return 'Tops';
};

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

const isCommonItem = (item: WardrobeItem): boolean =>
  item.is_common_item === true || item.user_id === null || item.user_id === undefined;

export const WardrobeScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const isFocused = useIsFocused();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [commonItems, setCommonItems] = useState<WardrobeItem[]>([]);
  const [selectedCommonItemId, setSelectedCommonItemId] = useState<string | null>(null);
  const [addingCatalogItem, setAddingCatalogItem] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const category = resolveFilterQuery(selectedTab);
      const data = category
        ? await wardrobeService.filterWardrobeItems({ category })
        : await wardrobeService.getWardrobeItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
      Toast.show({
        type: 'error',
        text1: 'Unable to load wardrobe',
        text2: 'Please try again in a moment.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTab]);

  useEffect(() => {
    if (isFocused) {
      fetchItems();
    }
  }, [fetchItems, isFocused]);

  useEffect(() => {
    if (!addSheetVisible) {
      return;
    }

    let cancelled = false;

    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setSelectedCommonItemId(null);
        const data = await wardrobeService.getCommonItems();

        if (!cancelled) {
          setCommonItems(data);
        }
      } catch (error) {
        console.error('Error loading common item catalog', error);

        if (!cancelled) {
          setCommonItems([]);
          Toast.show({
            type: 'error',
            text1: 'Catalog unavailable',
            text2: 'You can still add an item with a photo.',
            position: 'bottom',
          });
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [addSheetVisible]);

  const visibleCatalogItems = useMemo(() => {
    if (selectedTab === 'All') {
      return commonItems;
    }

    return commonItems.filter((item) => resolveItemTab(item.category) === selectedTab);
  }, [commonItems, selectedTab]);

  const handleItemPress = (itemId: string) => {
    navigation.navigate('ItemDetail', { itemId });
  };

  const handleImageSelection = async (type: 'camera' | 'gallery') => {
    setAddSheetVisible(false);

    setTimeout(async () => {
      const options = {
        mediaType: 'photo' as const,
        selectionLimit: 1,
      };

      const result = type === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (!result.assets?.length) {
        return;
      }

      try {
        setUploading(true);
        const addedItem = await wardrobeService.uploadWardrobeItem(
          result.assets[0],
          resolveFilterQuery(selectedTab),
        );

        Toast.show({
          type: 'success',
          text1: 'Added to your wardrobe',
          position: 'bottom',
        });

        await fetchItems();
        navigation.navigate('ItemDetail', { itemId: addedItem.id });
      } catch (error) {
        console.error('Upload error', error);
        Toast.show({
          type: 'error',
          text1: 'Upload failed',
          text2: 'We could not save that item.',
          position: 'bottom',
        });
      } finally {
        setUploading(false);
      }
    }, 250);
  };

  const handlePhotoTilePress = () => {
    Alert.alert('Add item', 'Choose how you want to add this item.', [
      {
        text: 'Take a photo',
        onPress: () => {
          handleImageSelection('camera');
        },
      },
      {
        text: 'Choose from library',
        onPress: () => {
          handleImageSelection('gallery');
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleCloneItem = async () => {
    if (!selectedCommonItemId) {
      return;
    }

    try {
      setAddingCatalogItem(true);
      const clonedItem = await wardrobeService.cloneCommonItem(selectedCommonItemId);
      setAddSheetVisible(false);

      Toast.show({
        type: 'success',
        text1: 'Added to your wardrobe',
        position: 'bottom',
      });

      await fetchItems();
      navigation.navigate('ItemDetail', { itemId: clonedItem.id });
    } catch (error) {
      console.error('Clone common item error', error);
      Toast.show({
        type: 'error',
        text1: 'Add failed',
        text2: 'We could not clone that catalog item.',
        position: 'bottom',
      });
    } finally {
      setAddingCatalogItem(false);
    }
  };

  const renderGridTile = (item: WardrobeItem) => {
    const imageUrl = getImageUrl(item.image_url);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.tile}
        activeOpacity={0.88}
        onPress={() => handleItemPress(item.id)}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.tileImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.tileFallback}>
            <Text style={styles.tileFallbackText}>No image</Text>
          </View>
        )}

        {isCommonItem(item) ? (
          <View style={styles.tileBadgeWrap}>
            <View style={styles.tileBadge}>
              <Text numberOfLines={1} style={styles.tileBadgeText}>
                common items
              </Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderLoadingGrid = () => (
    <View style={styles.grid}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.tileSkeleton} />
      ))}
    </View>
  );

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header
        title="Wardrobe"
        titleTextStyle={styles.headerTitle}
        onBack={() => setIsSidebarOpen(true)}
        rightComponent={(
          <TouchableOpacity
            onPress={() => setAddSheetVisible(true)}
            disabled={uploading}
            style={styles.plusButton}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.figmaAction} />
            ) : (
              <Text style={styles.plusGlyph}>+</Text>
            )}
          </TouchableOpacity>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategoryTabs
          categories={[...FILTER_TABS]}
          selectedCategory={selectedTab}
          onSelectCategory={(category) => setSelectedTab(category as FilterTab)}
        />

        {loading ? (
          renderLoadingGrid()
        ) : hasItems ? (
          <View style={styles.grid}>
            {items.map(renderGridTile)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {selectedTab === 'All' ? 'Add your first item' : 'No items in this category yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'All'
                ? 'Start with a photo or clone a common item from the catalog.'
                : 'Try another filter or add a new item to this section.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              activeOpacity={0.85}
              onPress={() => setAddSheetVisible(true)}
            >
              <Text style={styles.emptyCtaText}>Open add sheet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={addSheetVisible}
        onRequestClose={() => setAddSheetVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setAddSheetVisible(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <BottomSheetSurface style={styles.addSheet}>
                <View style={styles.addSheetHeader}>
                  <TopIconButton
                    onPress={() => setAddSheetVisible(false)}
                    icon={<Text style={styles.backGlyph}>{"<"}</Text>}
                  />

                  <PillButton
                    title="Add"
                    onPress={() => {
                      handleCloneItem();
                    }}
                    disabled={!selectedCommonItemId || addingCatalogItem}
                    loading={addingCatalogItem}
                    style={styles.addActionButton}
                    trailing={<Text style={styles.addActionGlyph}>+</Text>}
                  />
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.addSheetScrollContent}
                >
                  <View style={styles.catalogGrid}>
                    <TouchableOpacity
                      style={styles.photoTile}
                      activeOpacity={0.85}
                      onPress={handlePhotoTilePress}
                    >
                      <Text style={styles.photoTileLabel}>Photo</Text>
                    </TouchableOpacity>

                    {catalogLoading ? (
                      <View style={styles.catalogLoading}>
                        <ActivityIndicator size="small" color={theme.colors.figmaAction} />
                      </View>
                    ) : (
                      visibleCatalogItems.map((item) => {
                        const imageUrl = getImageUrl(item.image_url);
                        const isSelected = selectedCommonItemId === item.id;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.catalogTile,
                              isSelected && styles.catalogTileSelected,
                            ]}
                            activeOpacity={0.88}
                            onPress={() => setSelectedCommonItemId(item.id)}
                          >
                            {imageUrl ? (
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.catalogTileImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.catalogTileFallback}>
                                <Text style={styles.catalogTileFallbackText}>No image</Text>
                              </View>
                            )}

                            <View style={styles.selectionDotWrap}>
                              <View
                                style={[
                                  styles.selectionDot,
                                  isSelected && styles.selectionDotSelected,
                                ]}
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>

                  {!catalogLoading && !visibleCatalogItems.length ? (
                    <Text style={styles.catalogEmptyText}>
                      No catalog items are available for this filter yet.
                    </Text>
                  ) : null}
                </ScrollView>
              </BottomSheetSurface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  tile: {
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
  tileSkeleton: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#E3E6EB',
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
  emptyCta: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 22,
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
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(39, 42, 50, 0.25)',
  },
  addSheet: {
    minHeight: '48%',
    maxHeight: '68%',
    paddingTop: 16,
    paddingBottom: 18,
  },
  addSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  backGlyph: {
    fontSize: 22,
    lineHeight: 22,
    color: theme.colors.figmaAction,
    marginTop: -1,
  },
  addActionButton: {
    minWidth: 118,
  },
  addActionGlyph: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
    fontSize: 20,
    lineHeight: 20,
  },
  addSheetScrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 12,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: CATALOG_TILE_WIDTH,
    height: 102,
    borderRadius: theme.borderRadius.s,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(60,60,67,0.3)',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTileLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  catalogLoading: {
    width: CATALOG_TILE_WIDTH,
    height: 102,
    borderRadius: theme.borderRadius.s,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogTile: {
    width: CATALOG_TILE_WIDTH,
    height: 102,
    borderRadius: theme.borderRadius.s,
    overflow: 'hidden',
    backgroundColor: '#ECEFF4',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catalogTileSelected: {
    borderColor: theme.colors.figmaAction,
  },
  catalogTileImage: {
    width: '100%',
    height: '100%',
  },
  catalogTileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  catalogTileFallbackText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  selectionDotWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  selectionDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  catalogEmptyText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
