/**
 * Wardrobe "Delete items" (Figma "wardrobe - delete" / "wardrobe - delete
 * selected"). Reached from the trash chip after "Analysis" on the Wardrobe grid.
 *
 *   - Same 3-column grid as Wardrobe, every tile a multi-select toggle; a
 *     selected tile wears the selection ring.
 *   - Pinned footer: "Cancel" (back to Wardrobe) + a danger "Delete" that stays
 *     disabled until at least one item is picked, then reads "Delete (n)".
 *   - Delete asks for confirmation (MDialog), deletes in parallel, and pops back
 *     to Wardrobe. On a partial failure the screen stays, the deleted tiles
 *     drop out and the failed ones stay selected for a retry.
 *
 * Reads the shared wardrobe list cache (`wardrobeKeys.list('All')`), so arriving
 * from Wardrobe renders instantly, and narrows/sorts it with the filter + sort
 * the grid had when the chip was tapped.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { MButton, MDialog, toast } from '../../components/design-system/lib';
import { Shimmer } from '../../components/features/Shimmer';
import { Icons } from '../../assets/icons';
import { track } from '../../services/analytics';
import {
  WardrobeItem,
  wardrobeKeys,
  wardrobeService,
} from '../../services/wardrobeService';
import { theme } from '../../theme/theme';
import type { AppStackParamList } from '../../types/navigation';
import { WardrobeGridTile } from './WardrobeGridTile';
import {
  GRID_GAP,
  HORIZONTAL_PADDING,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './wardrobe-grid';
import { filterItemsByCategories } from './wardrobe-filter';
import { DEFAULT_SORT, sortWardrobeItems } from './wardrobe-sort';
import {
  deleteItemsSettled,
  isDeletableItem,
  toggleSelectedId,
} from './wardrobe-delete';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'WardrobeDeleteItems'
>;
type Route = RouteProp<AppStackParamList, 'WardrobeDeleteItems'>;

export const WardrobeDeleteItemsScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const wardrobeQuery = useQuery({
    queryKey: wardrobeKeys.list('All'),
    queryFn: () => wardrobeService.getWardrobeItems(),
    staleTime: 60_000,
  });

  const categories = route.params?.categories;
  const sort = route.params?.sort ?? DEFAULT_SORT;
  const items = useMemo(() => {
    const deletable = (wardrobeQuery.data ?? []).filter(isDeletableItem);
    return sortWardrobeItems(
      filterItemsByCategories(deletable, categories ?? []),
      sort,
    );
  }, [wardrobeQuery.data, categories, sort]);

  // Only count ids still on screen — a background refetch can drop an item
  // that's selected (deleted elsewhere), and the CTA must not count a ghost.
  const selectedCount = useMemo(
    () => items.filter(item => selectedIds.has(item.id)).length,
    [items, selectedIds],
  );

  const handleToggle = (item: WardrobeItem) => {
    if (deleting) {
      return;
    }
    setSelectedIds(prev => toggleSelectedId(prev, item.id));
  };

  const handleCancel = () => navigation.goBack();

  const handleConfirmDelete = async () => {
    const ids = items
      .filter(item => selectedIds.has(item.id))
      .map(item => item.id);
    if (ids.length === 0) {
      setConfirmVisible(false);
      return;
    }
    setDeleting(true);
    const { deletedIds, failedIds } = await deleteItemsSettled(
      ids,
      wardrobeService.deleteWardrobeItem,
    );

    if (deletedIds.length > 0) {
      const deleted = new Set(deletedIds);
      // Drop the deleted rows from the shared list right away so Wardrobe
      // doesn't flash them while the invalidation refetch is in flight.
      queryClient.setQueryData<WardrobeItem[]>(wardrobeKeys.list('All'), prev =>
        prev ? prev.filter(item => !deleted.has(item.id)) : prev,
      );
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
    }
    track('wardrobe_items_bulk_deleted', {
      selected_count: ids.length,
      deleted_count: deletedIds.length,
      failed_count: failedIds.length,
    });

    setDeleting(false);
    setConfirmVisible(false);

    if (failedIds.length === 0) {
      toast.show({
        type: 'success',
        text1: t('wardrobe.delete_items.toast_deleted', {
          count: deletedIds.length,
        }),
        position: 'bottom',
      });
      navigation.goBack();
      return;
    }

    // Partial / total failure: stay here with only the failed items selected.
    setSelectedIds(new Set(failedIds));
    toast.show({
      type: 'error',
      text1: t('wardrobe.delete_items.toast_failed_title'),
      text2:
        deletedIds.length > 0
          ? t('wardrobe.delete_items.toast_partial', {
              failed: failedIds.length,
              count: ids.length,
            })
          : t('wardrobe.delete_items.toast_failed_body'),
      position: 'bottom',
    });
  };

  const renderBody = () => {
    if (wardrobeQuery.isLoading) {
      return (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Shimmer
              key={`skeleton-${index}`}
              width={TILE_WIDTH}
              height={TILE_HEIGHT}
              testID={`wardrobe-delete-loading-tile-${index}`}
            />
          ))}
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <Text style={styles.emptyBody} testID="wardrobe-delete-empty">
          {t('wardrobe.delete_items.empty_body')}
        </Text>
      );
    }
    return (
      <View style={styles.grid} testID="wardrobe-delete-grid">
        {items.map((item, index) => {
          const selected = selectedIds.has(item.id);
          return (
            <WardrobeGridTile
              key={item.id}
              item={item}
              index={index}
              isSelectMode={false}
              selectedItemId={null}
              selected={selected}
              testID={`wardrobe-delete-item-${item.id}${
                selected ? '-selected' : ''
              }`}
              onPress={handleToggle}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('wardrobe.delete_items.title')}
        leftTestID="wardrobe-delete-back"
        leftAccessibilityLabel={t('wardrobe.delete_items.a11y_back')}
        onBack={handleCancel}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderBody()}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + theme.spacing.m },
        ]}
      >
        <View style={styles.footerButton}>
          <MButton
            variant="secondary"
            onPress={handleCancel}
            disabled={deleting}
            testID="wardrobe-delete-cancel"
          >
            {t('wardrobe.delete_items.cancel')}
          </MButton>
        </View>
        <View style={styles.footerButton}>
          <MButton
            variant="danger"
            rightIcon={Icons.Trash}
            onPress={() => setConfirmVisible(true)}
            disabled={selectedCount === 0 || deleting}
            testID={
              selectedCount > 0
                ? 'wardrobe-delete-submit'
                : 'wardrobe-delete-submit-disabled'
            }
            accessibilityLabel={
              selectedCount > 0
                ? t('wardrobe.delete_items.a11y_delete', {
                    count: selectedCount,
                  })
                : t('wardrobe.delete_items.delete')
            }
          >
            {selectedCount > 0
              ? t('wardrobe.delete_items.delete_count', {
                  count: selectedCount,
                })
              : t('wardrobe.delete_items.delete')}
          </MButton>
        </View>
      </View>

      <MDialog
        visible={confirmVisible}
        title={t('wardrobe.delete_items.confirm_title', {
          count: selectedCount,
        })}
        message={t('wardrobe.delete_items.confirm_body')}
        confirmLabel={t('wardrobe.delete_items.delete')}
        cancelLabel={t('wardrobe.delete_items.cancel')}
        destructive
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) {
            setConfirmVisible(false);
          }
        }}
        testID="wardrobe-delete-dialog"
        confirmTestID="wardrobe-delete-dialog-confirm"
        cancelTestID="wardrobe-delete-dialog-cancel"
      />
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
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.l,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  emptyBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.xxl,
  },
  // Pinned two-up commit bar — Cancel | Delete, equal widths.
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    backgroundColor: theme.colors.figmaBackground,
  },
  footerButton: {
    flex: 1,
  },
});
