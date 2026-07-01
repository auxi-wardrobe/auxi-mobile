import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { WardrobeWelcomeDialog } from '../components/features/WardrobeWelcomeDialog';
import { Header } from '../components/layout/Header';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { ItemReadySnackbar } from '../components/feedback/ItemReadySnackbar';
import { PressableScale } from '../components/primitives/PressableScale';
import { MActionSheet, MButton } from '../components/design-system/lib';
import { DotsLoader } from '../components/atoms/DotsLoader';
import { useSidebar } from '../context/SidebarContext';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useWardrobeViewed } from '../context/WardrobeViewedContext';
import { AppStackParamList } from '../types/navigation';
import { Icons } from '../assets/icons';
import { track } from '../services/analytics';
import { AddItemSheet } from './wardrobe/AddItemSheet';
import { WardrobeGridTile } from './wardrobe/WardrobeGridTile';
import { PreparingOverlay } from './wardrobe/PreparingOverlay';
import { useItemReadySnackbar } from './wardrobe/useItemReadySnackbar';
import {
  FILTER_TABS,
  FilterTab,
  GRID_GAP,
  HORIZONTAL_PADDING,
  PREPARING_POLL_MS,
  TILE_HEIGHT,
  TILE_WIDTH,
  isCommonItem,
  isPreparing,
  resolveFilterQuery,
} from './wardrobe/wardrobe-grid';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'Wardrobe'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'Wardrobe'>;

export const WardrobeScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  // Single-item picker mode — opened from ItemDetail's "Change" swap button.
  // Tiles select instead of navigating; a bottom "Change" CTA commits the pick.
  const isSelectMode = route.params?.mode === 'select';
  // The item being changed — hidden from the picker so the swap is always to a
  // different item ("change by other items only").
  const excludeItemId = route.params?.excludeItemId;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const { isViewed, markViewed } = useWardrobeViewed();

  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  // F7: distinguish a genuine empty wardrobe from a failed load. `loadError`
  // is set on a (non-silent) fetch failure so the screen shows a dedicated
  // error state + Retry rather than the misleading "add your first item" copy.
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhotoUri, setUploadingPhotoUri] = useState<string | null>(
    null,
  );
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  // Add-item sheet visibility. The slide/fade ENTER + faster CLOSE motion +
  // reduce-motion fallback are now encapsulated inside MBottomSheet (it keeps
  // itself mounted through the close animation), so the screen only tracks the
  // boolean.
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  // Take-photo source chooser. Migrated from a 3-button Alert.alert to the DS
  // MActionSheet (GH-364); driven by this controlled boolean.
  const [photoSourceSheetVisible, setPhotoSourceSheetVisible] = useState(false);

  // AU-361: item-ready snackbar concern (preparing→ready transition detection,
  // dedup refs, auto-hide timer, overlay state). `showReadySnackbar` is also
  // reused by the add-item flow for the "item added" confirmation.
  const {
    readySnackbarVisible,
    readySnackbarMessage,
    showReadySnackbar,
    reconcileReadyItems,
  } = useItemReadySnackbar();

  // `silent` skips the skeleton spinner — used by the AU-361 background poll so
  // it doesn't flash the loading grid on every tick.
  const fetchItems = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true);
          setLoadError(false);
        }
        const category = resolveFilterQuery(selectedTab);
        const data = category
          ? await wardrobeService.filterWardrobeItems({ category })
          : await wardrobeService.getWardrobeItems();
        setItems(data);
        reconcileReadyItems(data);
      } catch (error) {
        console.error('Error fetching wardrobe items', error);
        if (!options?.silent) {
          // F7: surface a dedicated, recoverable error state (icon + message +
          // Retry) instead of falling through to the empty-wardrobe copy. The
          // toast stays as the transient confirmation; the inline state is the
          // journey-continuity fix.
          setLoadError(true);
          track('wardrobe_load_failed', { category: selectedTab });
          toast.show({
            type: 'error',
            text1: t('common.load_wardrobe_failed_title'),
            text2: t('common.try_again_moment'),
            position: 'bottom',
          });
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [selectedTab, t, reconcileReadyItems],
  );

  const handleRetryLoad = useCallback(() => {
    track('wardrobe_load_retry_tapped', { category: selectedTab });
    fetchItems();
  }, [fetchItems, selectedTab]);

  useEffect(() => {
    if (isFocused) {
      fetchItems();
      track('wardrobe_viewed', { category: selectedTab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchItems, isFocused]);

  // AU-361: while focused AND any item is still preparing, poll the wardrobe so
  // the preparing→ready transition is observed and the toast fires. Stops as
  // soon as nothing is preparing or the screen loses focus.
  const hasPreparingItems = items.some(isPreparing);
  useEffect(() => {
    if (!isFocused || !hasPreparingItems) {
      return;
    }
    const interval = setInterval(() => {
      fetchItems({ silent: true });
    }, PREPARING_POLL_MS);
    return () => clearInterval(interval);
  }, [isFocused, hasPreparingItems, fetchItems]);

  const handleSelectTab = (category: FilterTab) => {
    setSelectedTab(category);
    track('wardrobe_filter_changed', { category });
  };

  const handleItemPress = (item: WardrobeItem) => {
    if (isSelectMode) {
      // Don't let the user anchor an item that isn't ready yet.
      if (isPreparing(item)) {
        return;
      }
      track('wardrobe_change_item_selected', { item_id: item.id });
      setSelectedItemId(item.id);
      return;
    }
    track('wardrobe_item_opened', {
      item_id: item.id,
      is_common: isCommonItem(item),
    });
    // Opening the detail clears the item's "new" tag (uploaded → seen).
    markViewed(item.id);
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  const handleConfirmChange = () => {
    if (!selectedItemId || !excludeItemId) {
      return;
    }
    const chosen = items.find(item => item.id === selectedItemId);
    if (!chosen) {
      return;
    }
    track('wardrobe_change_item_confirmed', {
      from_item_id: excludeItemId,
      to_item_id: selectedItemId,
    });
    // popTo Home dismisses this picker AND the ItemDetail modal beneath it,
    // landing on Home with a one-off swap intent: replace the viewed item with
    // the chosen one in the active outfit. NOT a pin — the item is not anchored
    // and suggestions are not regenerated around it.
    navigation.popTo('Home', {
      swapItem: {
        fromItemId: excludeItemId,
        toItem: {
          id: chosen.id,
          ...(chosen.image_url ? { image_url: chosen.image_url } : {}),
          ...(chosen.image_png ? { image_png: chosen.image_png } : {}),
          ...(chosen.name ? { name: chosen.name } : {}),
          ...(chosen.category ? { category: chosen.category } : {}),
          ...(chosen.color_hex ? { color_hex: chosen.color_hex } : {}),
          ...(chosen.is_common_item != null
            ? { is_common_item: chosen.is_common_item }
            : {}),
        },
      },
    });
  };

  const openAddSheet = (source: 'header' | 'empty_state' | 'welcome') => {
    track('add_item_opened', { source });
    setAddSheetVisible(true);
  };

  const handleSearchDatabase = () => {
    track('add_item_method_selected', { method: 'search_database' });
    setAddSheetVisible(false);
    navigation.navigate('Database');
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
        Alert.alert(
          t('common.error_title'),
          result.errorMessage || t('common.pick_image_failed'),
        );
        return;
      }

      const asset: Asset | undefined = result.assets?.[0];
      if (!asset) {
        return;
      }

      try {
        setUploadingPhotoUri(asset.uri ?? null);
        setUploading(true);
        track('add_item_upload_started', { source: type });
        if (type === 'camera') {
          track('wardrobe_photo_captured', { source: 'add_item' });
        }

        const createdItem = await wardrobeService.uploadWardrobeItem(
          asset,
          user!,
          resolveFilterQuery(selectedTab),
        );

        track('add_item_upload_succeeded', { source: type });
        const addedProps: Record<string, unknown> = {
          source: type,
          method: 'take_photo',
        };
        if (createdItem?.id) {
          addedProps.item_id = createdItem.id;
        }
        if (createdItem?.category) {
          addedProps.category = createdItem.category;
        }
        track('wardrobe_item_added', addedProps);
        // AU-372: surface add-success via the mint M3 ItemReadySnackbar overlay
        // (same component as the ready moment), not the default bottom toast.
        // Copy reads "Item added. We'll finish preparing it in the background."
        showReadySnackbar(t('wardrobe.list.added_title'));

        await fetchItems();
      } catch (error) {
        console.error('Upload error', error);
        track('add_item_upload_failed', { source: type });
        toast.show({
          type: 'error',
          text1: t('wardrobe.list.upload_failed_title'),
          text2: t('wardrobe.list.upload_failed_body'),
          position: 'bottom',
        });
      } finally {
        setUploading(false);
        setUploadingPhotoUri(null);
      }
    }, 250);
  };

  const handleTakePhoto = () => {
    track('add_item_method_selected', { method: 'take_photo' });
    setAddSheetVisible(false);
    // Let the add sheet finish its close animation before the source chooser
    // slides up (matches the prior Alert timing).
    setTimeout(() => {
      setPhotoSourceSheetVisible(true);
    }, 250);
  };

  const renderLoadingGrid = () => (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.tileSkeleton} />
      ))}
    </View>
  );

  // In select mode hide the item being changed so it can't be re-picked.
  const displayItems =
    isSelectMode && excludeItemId
      ? items.filter(item => item.id !== excludeItemId)
      : items;
  const hasItems = displayItems.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isSelectMode ? (
        // Picker mode (from ItemDetail "Change"): back chevron + title, no add
        // action — the user is choosing an existing item, not adding one.
        <Header.BackTitle
          title={t('wardrobe.list.change_title')}
          leftTestID="wardrobe-change-back"
          leftAccessibilityLabel={t('uac.common.back')}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <Header.MenuTitleAction
          title={t('wardrobe.list.title')}
          leftTestID="wardrobe-menu-button"
          onBack={openSidebar}
          right={
            <PressableScale
              onPress={() => openAddSheet('header')}
              disabled={uploading}
              style={[styles.plusButton, styles.headerIconButton]}
              activeOpacity={0.85}
              testID="wardrobe-add-btn"
              accessibilityLabel={t('common.a11y_add_item')}
            >
              {uploading ? (
                <DotsLoader color={theme.colors.figmaAction} />
              ) : (
                <Icons.Plus width={24} height={24} />
              )}
            </PressableScale>
          }
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isSelectMode && styles.scrollContentSelect,
        ]}
      >
        <CategoryTabs
          categories={[...FILTER_TABS]}
          selectedCategory={selectedTab}
          onSelectCategory={category => handleSelectTab(category as FilterTab)}
          wrap
        />

        {loading ? (
          renderLoadingGrid()
        ) : loadError ? (
          // F7: failed load → dedicated error state with Retry, distinct from
          // the genuine empty-wardrobe copy below.
          <View style={styles.errorState} testID="wardrobe-error-state">
            <Text style={styles.errorTitle}>
              {t('common.load_wardrobe_failed_title')}
            </Text>
            <Text style={styles.errorBody}>
              {t('wardrobe.list.error_body')}
            </Text>
            <View style={styles.errorRetryWrap}>
              <MButton
                variant="secondary"
                onPress={handleRetryLoad}
                testID="wardrobe-error-retry"
                accessibilityLabel={t('common.a11y_retry_load')}
              >
                {t('common.retry')}
              </MButton>
            </View>
          </View>
        ) : hasItems ? (
          <View testID="wardrobe-grid-root" style={styles.grid}>
            {displayItems.map((item, index) => (
              <WardrobeGridTile
                key={item.id}
                item={item}
                index={index}
                isSelectMode={isSelectMode}
                selectedItemId={selectedItemId}
                viewed={isViewed(item.id)}
                onPress={handleItemPress}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {selectedTab === 'All'
                ? t('wardrobe.list.empty_first_title')
                : t('wardrobe.list.empty_filtered_title')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'All'
                ? t('wardrobe.list.empty_first_body')
                : t('wardrobe.list.empty_filtered_body')}
            </Text>
            <View style={styles.emptyCtaWrap}>
              <MButton
                variant="primary"
                onPress={() => openAddSheet('empty_state')}
                testID="wardrobe-empty-add-btn"
                accessibilityLabel={t('common.a11y_add_item')}
              >
                {t('wardrobe.list.add_an_item')}
              </MButton>
            </View>
          </View>
        )}
      </ScrollView>

      <AddItemSheet
        visible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}
        bottomInset={insets.bottom}
        onSearchDatabase={handleSearchDatabase}
        onTakePhoto={handleTakePhoto}
      />

      {/* Take-photo source chooser — DS MActionSheet (GH-364, replaces the
          3-button Alert.alert). The per-source upload/capture analytics still
          fire inside handleImageSelection; cancel dismisses via onDismiss. */}
      <MActionSheet
        visible={photoSourceSheetVisible}
        onDismiss={() => setPhotoSourceSheetVisible(false)}
        title={t('wardrobe.list.add_photo_title')}
        options={[
          {
            label: t('common.take_photo'),
            onPress: () => {
              setPhotoSourceSheetVisible(false);
              handleImageSelection('camera');
            },
          },
          {
            label: t('common.choose_from_library'),
            onPress: () => {
              setPhotoSourceSheetVisible(false);
              handleImageSelection('gallery');
            },
          },
        ]}
        cancelLabel={t('common.cancel')}
        testID="wardrobe-photo-source-sheet"
      />

      <PreparingOverlay visible={uploading} photoUri={uploadingPhotoUri} />

      {/* AU-361: self-controlled "item ready" snackbar overlay. Sits above the
          grid near the bottom (Figma node 3915:30077). Informational only, so
          pointerEvents="none" keeps touches passing through to the grid. */}
      {readySnackbarVisible ? (
        <View
          style={[
            styles.readySnackbarOverlay,
            // F6: respect the home-indicator inset so the snackbar never sits
            // behind it. 24 is the design gap above the safe area.
            { bottom: insets.bottom + 24 },
          ]}
          pointerEvents="none"
          testID="wardrobe-item-ready-snackbar-overlay"
        >
          <ItemReadySnackbar message={readySnackbarMessage} />
        </View>
      ) : null}

      {/* First-open welcome popup — shown once the wardrobe finishes its initial
          load (so it never overlays the skeleton), then never again. "Add My
          Clothes" opens the add-item sheet; "Explore for Now" just dismisses. */}
      <WardrobeWelcomeDialog
        enabled={!isSelectMode && isFocused && !loading && !loadError}
        onAddClothes={() => openAddSheet('welcome')}
      />

      {/* Picker-mode commit bar — pinned to the bottom, disabled until a tile
          is selected. "Change" pops back to Home with the chosen item. */}
      {isSelectMode ? (
        <View
          style={[styles.changeFooter, { paddingBottom: insets.bottom + 16 }]}
        >
          <PillButton
            testID="wardrobe-change-cta"
            variant="filled"
            title={t('wardrobe.list.change_cta')}
            onPress={handleConfirmChange}
            disabled={!selectedItemId}
            style={styles.changeCta}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  // AU-361: bottom-anchored, centred overlay for the item-ready snackbar.
  // High zIndex/elevation so it floats above the grid; the inner snackbar
  // carries its own width + styling.
  readySnackbarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    // `bottom` is supplied inline (insets.bottom + 24) so it respects the
    // home-indicator safe area — see F6.
    alignItems: 'center',
    zIndex: theme.zIndex.toast,
    elevation: 1000,
  },
  plusButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pinned picker-mode commit bar.
  changeFooter: {
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
  changeCta: {
    alignSelf: 'stretch',
  },
  headerIconButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.m,
    ...theme.ds.shadow.headerIcon,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Extra bottom room so the last grid row clears the pinned "Change" bar.
  scrollContentSelect: {
    paddingBottom: 120,
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
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaDetailSurface,
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
  emptySubtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  // Wraps the migrated MButton so the marginTop spacing lives on the screen,
  // not the primitive (MButton owns its own height/radius/colour via m-tokens).
  emptyCtaWrap: {
    marginTop: 20,
  },
  // F7: error state — distinct from empty, with a Retry CTA. Mirrors the
  // HomeScreen error-state layout/tokens for cross-screen consistency.
  errorState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  errorTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  errorBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  // Wraps the migrated MButton (secondary/outline variant) so the marginTop
  // spacing stays on the screen, not the primitive.
  errorRetryWrap: {
    marginTop: 20,
  },
});
