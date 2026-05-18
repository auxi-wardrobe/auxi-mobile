import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  // Pressable,
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
import { useAuth } from '../context/AuthContext';
import { AppStackParamList } from '../types/navigation';
import { getImageUrl } from '../utils/url';
import { Icons } from '../assets/icons';

const { width: screenWidth } = Dimensions.get('window');

const FILTER_TABS = [
  'All',
  'Tops',
  'Bottoms',
  'Shoes',
  'One-piece',
  'AC',
] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const HORIZONTAL_PADDING = 24;
const GRID_GAP = 4;
const WARDROBE_COLUMNS = 4;
const CATALOG_COLUMNS = 3;
const TILE_WIDTH =
  (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (WARDROBE_COLUMNS - 1)) /
  WARDROBE_COLUMNS;
const TILE_HEIGHT = TILE_WIDTH * (4 / 3);
const CATALOG_TILE_WIDTH =
  (screenWidth - HORIZONTAL_PADDING * 2 - 8 * (CATALOG_COLUMNS - 1)) /
  CATALOG_COLUMNS;

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'Wardrobe'
>;

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
  item.is_common_item === true ||
  item.user_id === null ||
  item.user_id === undefined;

export const WardrobeScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const isFocused = useIsFocused();
  const { user } = useAuth();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [commonItems, setCommonItems] = useState<WardrobeItem[]>([]);
  const [selectedCommonItemId, setSelectedCommonItemId] = useState<
    string | null
  >(null);
  const [addingCatalogItem, setAddingCatalogItem] = useState(false);

  const [modalAddItemVisible, setModalAddItemVisible] = useState(false);
  // const [modalSearchDatabaseVisible, setModalSearchDatabaseVisible] = useState(false);

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

    return commonItems.filter(
      item => resolveItemTab(item.category) === selectedTab,
    );
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

      const result =
        type === 'camera'
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
        await wardrobeService.uploadWardrobeItem(
          result.assets[0],
          user!,
          resolveFilterQuery(selectedTab),
        );

        setModalAddItemVisible(false);

        Toast.show({
          type: 'success',
          text1: 'Added to your wardrobe',
          position: 'bottom',
        });

        // await fetchItems();
        navigation.navigate('Wardrobe');
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
      const clonedItem = await wardrobeService.cloneCommonItem(
        selectedCommonItemId,
      );
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
        testID={`wardrobe-catalog-tile-${item.id}`}
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

  const handleShowSearchItemModal = async () => {
    setModalAddItemVisible(false);
    // setModalSearchDatabaseVisible(true);
    // if (commonItems.length > 0) return

    // const data = await wardrobeService.getCommonItems();
    // setCommonItems(data);
    // redirect to DatabaseScreen
    navigation.navigate('Database');
  };

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header
        title="Wardrobe"
        titleTextStyle={styles.headerTitle}
        onBack={() => setIsSidebarOpen(true)}
        rightComponent={
          <TouchableOpacity
            // onPress={() => setAddSheetVisible(true)}
            onPress={() => setModalAddItemVisible(true)}
            disabled={uploading}
            style={styles.plusButton}
            activeOpacity={0.85}
            testID="wardrobe-add-btn"
            accessibilityLabel="wardrobe-add-btn"
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.figmaAction}
              />
            ) : (
              <Icons.Plus width={24} height={24} />
            )}
          </TouchableOpacity>
        }
      />

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
              {selectedTab === 'All'
                ? 'Add your first item'
                : 'No items in this category yet'}
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
          <View
            style={styles.sheetOverlay}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity activeOpacity={1}>
              <BottomSheetSurface style={styles.addSheet}>
                <View style={styles.addSheetHeader}>
                  <TopIconButton
                    onPress={() => setAddSheetVisible(false)}
                    icon={<Icons.ChevronLeft width={20} height={20} />}
                  />

                  {selectedCommonItemId ? (
                    <Text style={styles.selectionCountLabel}>1 selected</Text>
                  ) : null}

                  <PillButton
                    title="Add"
                    onPress={() => {
                      handleCloneItem();
                    }}
                    disabled={!selectedCommonItemId || addingCatalogItem}
                    loading={addingCatalogItem}
                    style={styles.addActionButton}
                    trailing={<Icons.Plus width={18} height={18} />}
                  />
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.addSheetScrollContent}
                >
                  <View style={styles.catalogGrid}>
                    <TouchableOpacity
                      testID="wardrobe-photo-tile"
                      style={styles.photoTile}
                      activeOpacity={0.85}
                      onPress={handlePhotoTilePress}
                    >
                      <Icons.Camera
                        width={24}
                        height={24}
                        color={theme.colors.figmaAction}
                      />
                    </TouchableOpacity>

                    {catalogLoading ? (
                      <View style={styles.catalogLoading}>
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.figmaAction}
                        />
                        <Text style={styles.catalogLoadingLabel}>
                          Loading catalog…
                        </Text>
                      </View>
                    ) : (
                      commonItems.map(item => {
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
                                <Text style={styles.catalogTileFallbackText}>
                                  No image
                                </Text>
                              </View>
                            )}

                            {isSelected ? (
                              <View style={styles.selectionDotWrap}>
                                <View style={styles.selectionDotSelected} />
                              </View>
                            ) : (
                              <View style={styles.selectionDotWrapEmpty} />
                            )}
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
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        accessibilityLabel="add-item-modal"
        key="add-item-modal"
        visible={modalAddItemVisible}
        onRequestClose={() => setModalAddItemVisible(false)}
        animationType="slide"
        transparent
      >
        <TouchableWithoutFeedback onPress={() => setModalAddItemVisible(false)}>
          <View style={styles.modalAddItemOverlay}>
            <TouchableWithoutFeedback
              onPress={() => setModalAddItemVisible(false)}
            >
              <View style={styles.modalAddItemBackdrop} />
            </TouchableWithoutFeedback>
            <View style={styles.modalAddItemContent}>
              {/* title */}
              <TouchableOpacity activeOpacity={1}>
                <Text style={styles.modalAddItemTitle}>Add Item</Text>
                {/* short description */}
                <Text style={styles.modalAddItemDescription}>
                  Add a new item to your wardrobe
                </Text>
                {/* implement three sections: search from db, take a photo, import from web */}
                <View style={styles.modalAddItemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShowSearchItemModal()}
                    testID="wardrobe-add-search"
                  >
                    <View style={styles.actionButtonContent}>
                      <View style={styles.actionButtonIcon}>
                        <Text>🔍</Text>
                      </View>
                      <View>
                        <Text style={styles.actionButtonText}>
                          Search from Database
                        </Text>
                        <Text style={styles.actionButtonSubtext}>
                          Browse our catalog
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handlePhotoTilePress}
                    testID="wardrobe-add-photo"
                  >
                    <View style={styles.actionButtonContent}>
                      <View style={styles.actionButtonIcon}>
                        <Text>📸</Text>
                      </View>
                      <View>
                        <Text style={styles.actionButtonText}>
                          Take a Photo
                        </Text>
                        <Text style={styles.actionButtonSubtext}>
                          Upload an image
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {}}
                    testID="wardrobe-add-import"
                  >
                    <View style={styles.actionButtonContent}>
                      <View style={styles.actionButtonIcon}>
                        <Text>🌐</Text>
                      </View>
                      <View>
                        <Text style={styles.actionButtonText}>
                          Import from Web
                        </Text>
                        <Text style={styles.actionButtonSubtext}>
                          Paste a URL
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* <Modal
        accessibilityLabel="search-database-modal"
        key="search-database-modal"
        visible={modalSearchDatabaseVisible}
        onRequestClose={() => setModalSearchDatabaseVisible(false)}
        animationType="slide"
        transparent
      >
        <View style={styles.modalAddItemOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalSearchDatabaseVisible(false)}
          />
          <View style={styles.modalAddItemList}>
              <View style={styles.abc}>
                <ScrollView
                  style={styles.modalSearchDatabaseScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalSearchDatabaseScrollContent}
                >
                  <View style={styles.catalogGrid2}>
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
                            
                            {isSelected && (
                              <View style={styles.selectionDot}>
                                <View style={styles.selectionDotSelected} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
        
                  {!catalogLoading && !visibleCatalogItems.length ? (
                    <Text style={styles.catalogEmptyText}>
                      No catalog items are available yet.
                    </Text>
                  ) : null}
                </ScrollView>
              </View>
              <PillButton
                title="Add to wardrobe"
                onPress={() => {
                  handleCloneItem();
                }}
                disabled={!selectedCommonItemId}
              />
          </View>
        </View>
      </Modal> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  abc: {
    height: 600,
    marginBottom: 16,
  },
  modalAddItemOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAddItemBackdrop: {
    flex: 1,
  },
  modalAddItemContent: {
    backgroundColor: theme.colors.figmaBackground,
    padding: 16,
    width: '90%',
    height: 'auto',
    position: 'absolute',
    borderRadius: 16,
  },
  modalAddItemTitle: {
    ...theme.typography.aliases.archivoBody,
    fontWeight: '600',
    fontSize: 20,
    marginBottom: 8,
  },
  modalAddItemDescription: {
    ...theme.typography.aliases.archivoBody,
    fontWeight: '400',
    fontSize: 14,
    marginBottom: 16,
  },
  modalAddItemActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    ...theme.typography.aliases.archivoBody,
    fontWeight: '600',
    fontSize: 16,
  },
  actionButtonSubtext: {
    ...theme.typography.aliases.archivoBody,
    fontWeight: '400',
    fontSize: 12,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.figmaAction,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modalSearchDatabaseContent: {
    backgroundColor: theme.colors.figmaBackground,
    width: '95%',
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalSearchDatabaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaSurface,
  },
  modalSearchDatabaseTitle: {
    ...theme.typography.aliases.archivoBody,
    fontWeight: '600',
    fontSize: 18,
  },
  closeButton: {
    fontSize: 20,
    color: theme.colors.figmaTextSecondary,
    padding: 4,
  },
  modalSearchDatabaseScroll: {
    flex: 1,
  },
  modalSearchDatabaseScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalSearchDatabaseFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.figmaSurface,
  },
  modalAddItemList: {
    backgroundColor: theme.colors.figmaBackground,
    width: '90%',
    height: 'auto',
    position: 'absolute',
    borderRadius: 16,
  },

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
    height: 400,
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
  addActionButton: {
    minWidth: 118,
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
  catalogGrid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
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
  catalogLoading: {
    width: CATALOG_TILE_WIDTH,
    height: 102,
    borderRadius: theme.borderRadius.s,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  catalogLoadingLabel: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
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
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: theme.colors.figmaAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDotWrapEmpty: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#272A32',
    backgroundColor: 'transparent',
  },
  selectionDotSelected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  selectionCountLabel: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  catalogEmptyText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
