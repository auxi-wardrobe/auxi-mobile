import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { track } from '../../../services/analytics';
import {
  BUILD_LOOK_MAX_ITEMS,
  isBuildAroundSuccess,
  trendTagProps,
} from '../../../services/buildAroundMatchService';
import { FLAGS } from '../../../services/featureFlags';
import {
  wardrobeKeys,
  wardrobeService,
  type WardrobeItem,
} from '../../../services/wardrobeService';
import type { AppStackParamList } from '../../../types/navigation';
import { useBuildAroundMatch } from '../../build-around/useBuildAroundMatch';
import type { BuildYourLookStatus } from '../components/BuildYourLookStatusSheet';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'HomeLanding'>;
type Route = RouteProp<AppStackParamList, 'HomeLanding'>;

type EmptyReason = 'no_match' | 'no_wardrobe';

/**
 * State behind the Home "Build your look" section:
 *
 *   add item ──▶ push BuildYourLookPickItems ──▶ hands ids back via route
 *                params (`buildLookAddItemIds`, consumed + cleared here)
 *   add tags ──▶ tag sheet (Surprise me | one tag → Done)
 *   find     ──▶ loading ──▶ push BuildAroundMatchResult (success)
 *                   ├──▶ error (retry / close)
 *                   └──▶ empty (no_match / no_wardrobe) ─ "Use my items" ─▶
 *                        the wardrobe-only build on the recommender, pinned
 *                        on the first item — what ItemDetail's sheet does
 *
 * The search is `useBuildAroundMatch` with the chosen ids: the exact
 * ItemDetail request per item, merged on the client. The selection lives for
 * as long as HomeLanding stays mounted (it is the stack's root, so
 * effectively the session). Gated by the same `build_around_discovery` flag
 * as the ItemDetail entry — OFF hides the section entirely, since the
 * endpoint it needs is not there.
 */
export const useBuildYourLook = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const enabled = useFeatureFlag(FLAGS.BUILD_AROUND_DISCOVERY);

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [tag, setTag] = useState<string | null>(null);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [empty, setEmpty] = useState<EmptyReason | null>(null);

  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  const run = useBuildAroundMatch(
    itemIds,
    result => {
      if (isBuildAroundSuccess(result)) {
        navigation.navigate('BuildAroundMatchResult', {
          itemId: itemIds[0],
          itemIds,
          result,
        });
        return;
      }
      setEmpty(result.state === 'no_wardrobe' ? 'no_wardrobe' : 'no_match');
    },
    'home_landing',
  );
  const { cancel } = run;

  // The picker hands back ids only (route params stay small + serializable);
  // the items themselves come from the wardrobe query the picker just filled.
  const addedIds = route.params?.buildLookAddItemIds;
  useEffect(() => {
    if (!addedIds || addedIds.length === 0) {
      return;
    }
    // Clearing the param re-runs this effect with `undefined` straight away,
    // so the lookup below must NOT be tied to the effect's cleanup — it would
    // be cancelled before an uncached wardrobe read could land.
    navigation.setParams({ buildLookAddItemIds: undefined });
    const resolve = async () => {
      const cached = queryClient.getQueryData<WardrobeItem[]>(wardrobeKeys.list());
      const all: WardrobeItem[] =
        cached ??
        (await queryClient.fetchQuery<WardrobeItem[]>({
          queryKey: wardrobeKeys.list(),
          queryFn: wardrobeService.getWardrobeItems,
        }));
      setItems(prev => {
        const have = new Set(prev.map(item => item.id));
        const next = addedIds
          .filter(id => !have.has(id))
          .map(id => all.find(item => item.id === id))
          .filter((item): item is WardrobeItem => !!item);
        return [...prev, ...next].slice(0, BUILD_LOOK_MAX_ITEMS);
      });
    };
    resolve().catch(() => {
      /* the picker already showed the wardrobe; a failed re-read only loses the add */
    });
  }, [addedIds, navigation, queryClient]);

  const addItem = useCallback(() => {
    track('home_build_look_add_item_tapped', { item_count: itemIds.length });
    navigation.navigate('BuildYourLookPickItems', { selectedIds: itemIds });
  }, [navigation, itemIds]);

  const removeItem = useCallback((itemId: string) => {
    track('home_build_look_item_removed', { item_id: itemId });
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const openTags = useCallback(() => {
    track('home_build_look_add_tags_tapped', trendTagProps(tag));
    setTagSheetOpen(true);
  }, [tag]);

  const removeTag = useCallback(() => {
    setTag(null);
    track('home_build_look_tag_changed', {});
  }, []);

  const doneTag = useCallback((next: string | null) => {
    setTag(next);
    setTagSheetOpen(false);
    track('home_build_look_tag_changed', trendTagProps(next));
  }, []);

  const find = useCallback(() => {
    if (itemIds.length === 0) return;
    track('home_build_look_find_tapped', {
      item_count: itemIds.length,
      ...trendTagProps(tag),
    });
    setEmpty(null);
    run.start(tag);
  }, [itemIds.length, tag, run]);

  const status: BuildYourLookStatus =
    run.status === 'loading'
      ? { kind: 'loading' }
      : run.status === 'error'
        ? { kind: 'error', code: run.errorCode }
        : empty
          ? { kind: 'empty', reason: empty }
          : { kind: 'idle' };

  const dismissStatus = useCallback(() => {
    cancel();
    setEmpty(null);
  }, [cancel]);

  // Same hand-off as ItemDetail's "Use my items": the wardrobe-only build on
  // the recommender, pinned on the (first) item. The recommender pins one
  // item, so a multi-item look anchors on the first one chosen.
  const useMyItems = useCallback(() => {
    track('build_around_method_chosen', {
      item_id: itemIds[0],
      item_count: itemIds.length,
      entry: 'home_landing',
      method: 'wardrobe',
    });
    setEmpty(null);
    navigation.navigate('Home', { pinFromDetail: itemIds[0] });
  }, [navigation, itemIds]);

  return {
    enabled,
    sectionProps: {
      items,
      tag,
      onAddItem: addItem,
      onRemoveItem: removeItem,
      onAddTags: openTags,
      onRemoveTag: removeTag,
      onFind: find,
    },
    tagSheetProps: {
      visible: tagSheetOpen,
      selected: tag,
      onDismiss: () => setTagSheetOpen(false),
      onDone: doneTag,
    },
    statusSheetProps: {
      status,
      onDismiss: dismissStatus,
      onCancelLoading: cancel,
      onRetry: run.retry,
      onUseMyItems: useMyItems,
    },
  };
};
