import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../components/design-system/lib';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { Shimmer } from '../components/features/Shimmer';
import { HomeWardrobeNavFooter } from '../components/features/HomeWardrobeNavFooter';
import { FeedbackFab } from '../components/features/FeedbackFab';
import { WardrobeWelcomeDialog } from '../components/features/WardrobeWelcomeDialog';
import { Header } from '../components/layout/Header';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { ItemReadySnackbar } from '../components/feedback/ItemReadySnackbar';
import { PressableScale } from '../components/primitives/PressableScale';
import {
  MActionSheet,
  MBottomSheet,
  MButton,
  MRadioMenu,
} from '../components/design-system/lib';
import { DotsLoader } from '../components/atoms/DotsLoader';
import { useSidebar } from '../context/SidebarContext';
import {
  wardrobeService,
  WardrobeItem,
  wardrobeKeys,
} from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { AppStackParamList } from '../types/navigation';
import { Icons } from '../assets/icons';
import { track } from '../services/analytics';
import { AiConsentDialog } from '../components/features/AiConsentDialog';
import { AddItemSheet } from './wardrobe/AddItemSheet';
import { WardrobeGridTile } from './wardrobe/WardrobeGridTile';
import { PreparingOverlay } from './wardrobe/PreparingOverlay';
import { useAddWardrobeItem } from './wardrobe/useAddWardrobeItem';
import { useItemReadySnackbar } from './wardrobe/useItemReadySnackbar';
import { useStalePreparingCleanup } from './wardrobe/useStalePreparingCleanup';
import { anyBeautifying } from './wardrobe/beautify-status';
import {
  FILTER_TABS,
  FilterTab,
  GRID_GAP,
  HORIZONTAL_PADDING,
  PENDING_IMPORT_ID,
  PREPARING_POLL_MS,
  TILE_HEIGHT,
  TILE_WIDTH,
  anyPreparing,
  isCommonItem,
  isPreparing,
  resolveFilterQuery,
} from './wardrobe/wardrobe-grid';
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  SORT_OPTION_BY_VALUE,
  SortValue,
  sortWardrobeItems,
} from './wardrobe/wardrobe-sort';

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

  const insets = useSafeAreaInsets();

  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  // Add-item sheet visibility. The full-width panel + "Refine suggestions"
  // reveal motion + reduce-motion fallback are encapsulated inside
  // ContextualBottomSheet (it keeps itself mounted through the close
  // animation), so the screen only tracks the boolean.
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  // Take-photo source chooser. Migrated from a 3-button Alert.alert to the DS
  // MActionSheet (GH-364); driven by this controlled boolean.
  const [photoSourceSheetVisible, setPhotoSourceSheetVisible] = useState(false);
  // Client-side sort of the (already category-filtered) grid. Session-only:
  // resets to newest-first on app restart. Default matches the backend's
  // created_at DESC ordering, so first paint is unchanged.
  const [sortValue, setSortValue] = useState<SortValue>(DEFAULT_SORT);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  // AU-361: item-ready snackbar concern (preparing→ready transition detection,
  // dedup refs, auto-hide timer, overlay state). `showReadySnackbar` is also
  // reused by the add-item flow for the "item added" confirmation.
  const {
    readySnackbarVisible,
    readySnackbarMessage,
    showReadySnackbar,
    reconcileReadyItems,
    beautifySnackbarVisible,
    beautifySnackbarItemId,
    beautifySnackbarOriginalUri,
  } = useItemReadySnackbar();

  const queryClient = useQueryClient();

  const wardrobeQuery = useQuery({
    queryKey: wardrobeKeys.list(selectedTab),
    queryFn: () => {
      const category = resolveFilterQuery(selectedTab);
      return category
        ? wardrobeService.filterWardrobeItems({ category })
        : wardrobeService.getWardrobeItems();
    },
    staleTime: 60_000,
    // AU-361 + Task 14: while focused AND something is preparing OR beautifying,
    // poll so the preparing→ready / beautify pending→ready transitions are
    // observed (their snackbars fire off reconcileReadyItems). Stops otherwise.
    refetchInterval: query =>
      isFocused &&
      (anyPreparing(query.state.data) || anyBeautifying(query.state.data ?? []))
        ? PREPARING_POLL_MS
        : false,
    refetchIntervalInBackground: false,
  });

  const { refetch } = wardrobeQuery;
  const items = wardrobeQuery.data ?? [];
  // Skeleton only on the first load (no cached data yet) — never on a
  // background revalidate, so revisiting the screen doesn't flash.
  const loading = wardrobeQuery.isLoading;
  // F7: only show the dedicated error state when we have nothing to display;
  // a failed background refetch over cached data stays silent.
  const loadError = wardrobeQuery.isError && items.length === 0;

  // Invalidate ALL wardrobe list caches after an upload — a new item may land
  // in any category, so refresh every filter variant.
  const refetchWardrobe = useCallback(
    () => queryClient.invalidateQueries({ queryKey: wardrobeKeys.all }),
    [queryClient],
  );

  // Detect preparing→ready transitions whenever the list changes (fetch/poll).
  useEffect(() => {
    if (wardrobeQuery.data) {
      reconcileReadyItems(wardrobeQuery.data);
    }
  }, [wardrobeQuery.data, reconcileReadyItems]);

  // Stale-upload watchdog: an item stuck in the preparing state for more than
  // PREPARING_TIMEOUT_MS is assumed failed — auto-removed with an error toast
  // telling the user to try again.
  useStalePreparingCleanup({ items: wardrobeQuery.data, enabled: isFocused });

  // Non-blocking web import: ImportFromWeb hands the picked image URL back via
  // `pendingImportUrl` and navigates here immediately — this screen owns the
  // create call so the user is never held in the preview watching a spinner
  // (mirrors the take-photo flow's ownership). On consume: clear the param
  // (re-focus must not refire the import), show the same "item added"
  // snackbar as the photo path, and render an optimistic preparing placeholder
  // tile until the backend item lands, at which point the refetched
  // is_preparing item takes over and rides the normal preparing→ready
  // lifecycle. On failure the placeholder is removed and the error surfaces
  // via the root toast (no Modal above it anymore, so it's visible).
  const [pendingImportUri, setPendingImportUri] = useState<string | null>(null);
  useEffect(() => {
    const imageUrl = route.params?.pendingImportUrl;
    if (!imageUrl) {
      return;
    }
    navigation.setParams({ pendingImportUrl: undefined });
    showReadySnackbar(t('wardrobe.list.added_title'));
    setPendingImportUri(imageUrl);

    (async () => {
      try {
        const created = await wardrobeService.importWardrobeItemFromUrl(
          imageUrl,
          user!,
        );
        const props: Record<string, unknown> = { method: 'import_web' };
        if (created?.id) {
          props.item_id = created.id;
        }
        if (created?.category) {
          props.category = created.category;
        }
        track('wardrobe_url_import_completed', props);
        track('wardrobe_item_added', props);
        // Awaited so the placeholder is only removed once the real
        // is_preparing tile is in the list — one visual swap, no gap.
        await refetchWardrobe();
      } catch (error) {
        console.error('Import from web failed', error);
        track('wardrobe_url_import_failed', {});
        toast.show({
          type: 'error',
          text1: t('wardrobe.import_web.import_failed'),
          text2: t('common.try_again_moment'),
          position: 'bottom',
        });
      } finally {
        // Functional update: don't clobber the placeholder if a newer import
        // has replaced it while this one was in flight.
        setPendingImportUri(prev => (prev === imageUrl ? null : prev));
      }
    })();
  }, [
    route.params?.pendingImportUrl,
    showReadySnackbar,
    refetchWardrobe,
    navigation,
    user,
    t,
  ]);

  // Analytics: screen viewed — decoupled from data fetching, fires on focus and
  // on filter change (preserves the prior wardrobe_viewed cadence).
  useEffect(() => {
    if (isFocused) {
      track('wardrobe_viewed', { category: selectedTab });
    }
  }, [isFocused, selectedTab]);

  // F7: surface the load-failed toast + analytics once per error episode.
  const loadFailedRef = useRef(false);

  // A tab change starts a fresh error episode — allow the load-failed toast +
  // analytics to fire once for the newly selected tab.
  useEffect(() => {
    loadFailedRef.current = false;
  }, [selectedTab]);

  useEffect(() => {
    if (loadError && !loadFailedRef.current) {
      loadFailedRef.current = true;
      track('wardrobe_load_failed', { category: selectedTab });
      toast.show({
        type: 'error',
        text1: t('common.load_wardrobe_failed_title'),
        text2: t('common.try_again_moment'),
        position: 'bottom',
      });
    } else if (!loadError) {
      loadFailedRef.current = false;
    }
  }, [loadError, selectedTab, t]);

  const handleRetryLoad = useCallback(() => {
    track('wardrobe_load_retry_tapped', { category: selectedTab });
    refetch();
  }, [refetch, selectedTab]);

  const handleSelectTab = (category: FilterTab) => {
    setSelectedTab(category);
    track('wardrobe_filter_changed', { category });
  };

  const handleSelectSort = (value: SortValue) => {
    setSortSheetVisible(false);
    if (value === sortValue) {
      return;
    }
    setSortValue(value);
    const opt = SORT_OPTION_BY_VALUE[value];
    track('wardrobe_sort_changed', {
      sort_by: opt.sortBy,
      direction: opt.direction,
    });
  };

  const handleItemPress = (item: WardrobeItem) => {
    // The optimistic web-import placeholder is display-only — there's no
    // backend item to open yet.
    if (item.id === PENDING_IMPORT_ID) {
      return;
    }
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

  const handleImportFromWeb = () => {
    track('add_item_method_selected', { method: 'import_web' });
    setAddSheetVisible(false);
    navigation.navigate('ImportFromWeb');
  };

  // Add-item upload orchestration (image pick → upload → analytics →
  // add-success snackbar → refetch) + the take-photo source chooser hand-off.
  // `uploading` / `uploadingPhotoUri` drive the header spinner + PreparingOverlay.
  // Uploads always run the default remove-background processing — the AI
  // studio-shot step moved on-demand to Item Detail's Enhance flow, so the
  // upload-time mode selector (and its pending-mode ref) is gone.
  const {
    uploading,
    uploadingPhotoUri,
    handleImageSelection,
    handleTakePhoto,
    aiConsentDialogProps,
  } = useAddWardrobeItem({
    selectedTab,
    user,
    showReadySnackbar,
    refetch: refetchWardrobe,
    closeAddSheet: () => setAddSheetVisible(false),
    openPhotoSourceSheet: () => setPhotoSourceSheetVisible(true),
  });

  const renderLoadingGrid = () => (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Shimmer
          key={`skeleton-${index}`}
          width={TILE_WIDTH}
          height={TILE_HEIGHT}
          testID={`wardrobe-loading-tile-${index}`}
        />
      ))}
    </View>
  );

  // In select mode hide the item being changed so it can't be re-picked.
  const filteredItems =
    isSelectMode && excludeItemId
      ? items.filter(item => item.id !== excludeItemId)
      : items;
  // Client-side reorder of the category-filtered set (pure, non-mutating).
  const displayItems = useMemo(
    () => sortWardrobeItems(filteredItems, sortValue),
    [filteredItems, sortValue],
  );

  // Optimistic preparing placeholder for an in-flight web import, prepended so
  // the freshly added image is immediately visible with its processing status.
  // WardrobeGridTile renders the standard preparing overlay off `is_preparing`;
  // presses are ignored via the PENDING_IMPORT_ID guard in handleItemPress.
  const gridItems = pendingImportUri
    ? [
        {
          id: PENDING_IMPORT_ID,
          image_url: pendingImportUri,
          is_preparing: true,
        } as WardrobeItem,
        ...displayItems,
      ]
    : displayItems;
  const hasItems = gridItems.length > 0;

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
          leftAccessibilityLabel={t('wardrobe.list.a11y_open_menu')}
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
        style={styles.scroll}
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

        {!isSelectMode && hasItems ? (
          <View style={styles.sortRow}>
            <MButton
              variant="secondary"
              size="sm"
              onPress={() => setSortSheetVisible(true)}
              testID="wardrobe-sort-trigger"
              accessibilityLabel={t('wardrobe.list.sort.a11y_open', {
                option: t(SORT_OPTION_BY_VALUE[sortValue].shortKey),
              })}
            >
              {`${t('wardrobe.list.sort.label')} · ${t(
                SORT_OPTION_BY_VALUE[sortValue].shortKey,
              )}`}
            </MButton>
          </View>
        ) : null}

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
            {gridItems.map((item, index) => (
              <WardrobeGridTile
                key={item.id}
                item={item}
                index={index}
                isSelectMode={isSelectMode}
                selectedItemId={selectedItemId}
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
        onSearchDatabase={handleSearchDatabase}
        onTakePhoto={handleTakePhoto}
        onImportFromWeb={handleImportFromWeb}
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

      {/* Sort chooser — MBottomSheet + MRadioMenu (single-select of six flat
          options). onChange sets sort + fires wardrobe_sort_changed. */}
      <MBottomSheet
        visible={sortSheetVisible}
        onDismiss={() => setSortSheetVisible(false)}
        testID="wardrobe-sort-sheet"
      >
        <Text style={styles.sortSheetTitle}>
          {t('wardrobe.list.sort.title')}
        </Text>
        <View style={styles.sortSheetBody}>
          <MRadioMenu
            options={SORT_OPTIONS.map(o => ({
              value: o.value,
              label: t(o.labelKey),
            }))}
            value={sortValue}
            onChange={value => handleSelectSort(value as SortValue)}
            testID="wardrobe-sort-menu"
          />
        </View>
      </MBottomSheet>

      {/* B1: AI data-sharing consent prompt — gated by useAiConsentGate inside
          useAddWardrobeItem; shown before the first beautify upload. */}
      <AiConsentDialog {...aiConsentDialogProps} />

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

      {/* Task 14: "Studio shot ready — Review" snackbar. Actionable (tappable
          → BeautifyReview), so the overlay does NOT carry pointerEvents="none".
          Sits at the same bottom anchor; auto-hides after READY_SNACKBAR_MS. */}
      {beautifySnackbarVisible && beautifySnackbarItemId ? (
        <View
          style={[
            styles.readySnackbarOverlay,
            { bottom: insets.bottom + 24 },
          ]}
          testID="beautify-ready-snackbar-overlay"
        >
          <ItemReadySnackbar
            message={t('wardrobe.list.beautify_ready_title')}
            testID="beautify-ready-snackbar"
            onPress={() => {
              navigation.navigate('BeautifyReview', {
                itemId: beautifySnackbarItemId,
                originalUri: beautifySnackbarOriginalUri ?? '',
                from: 'snackbar',
              });
            }}
          />
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
      ) : (
        // Shared Home | Wardrobe bottom nav — the wardrobe tab reads as active
        // here; tapping the home tab returns to Home. Hidden in picker mode,
        // where the "Change" commit bar owns the bottom. The feedback FAB
        // mounts alongside so the footer cluster matches Home pixel-for-pixel
        // across the animation-less nav swap.
        <>
          <HomeWardrobeNavFooter
            active="wardrobe"
            testID="wardrobe-footer-nav-toggle"
          />
          <FeedbackFab testID="wardrobe-feedback-fab" />
        </>
      )}
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
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 8,
    marginBottom: 4,
  },
  sortSheetTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  sortSheetBody: {
    alignItems: 'center',
    paddingBottom: 8,
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
  scroll: {
    flex: 1,
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
