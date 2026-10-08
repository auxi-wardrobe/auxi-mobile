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
  trendTagsProps,
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

/**
 * State behind the Home "Build your look" section:
 *
 *   add item ──▶ push BuildYourLookPickItems ──▶ hands ids back via route
 *                params (`buildLookAddItemIds`, consumed + cleared here)
 *   add tags ──▶ tag sheet (draft → Done)
 *   find     ──▶ loading ──▶ push BuildAroundMatchResult (success)
 *                   ├──▶ error (retry / close)
 *                   └──▶ empty (no look contains the items)
 *
 * The selection lives for as long as HomeLanding stays mounted (it is the
 * stack's root, so effectively the session). Gated by the same
 * `build_around_discovery` flag as the ItemDetail entry — OFF hides the
 * section entirely, since the endpoint it needs is not there.
 */
export const useBuildYourLook = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const enabled = useFeatureFlag(FLAGS.BUILD_AROUND_DISCOVERY);

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [empty, setEmpty] = useState(false);

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
      setEmpty(true);
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
    track('home_build_look_add_tags_tapped', { tag_count: tags.length });
    setTagSheetOpen(true);
  }, [tags.length]);

  const removeTag = useCallback((tag: string) => {
    setTags(prev => {
      const next = prev.filter(other => other !== tag);
      track('home_build_look_tags_changed', { tag_count: next.length, ...trendTagsProps(next) });
      return next;
    });
  }, []);

  const doneTags = useCallback((next: string[]) => {
    setTags(next);
    setTagSheetOpen(false);
    track('home_build_look_tags_changed', { tag_count: next.length, ...trendTagsProps(next) });
  }, []);

  const find = useCallback(() => {
    if (itemIds.length === 0) return;
    track('home_build_look_find_tapped', {
      item_count: itemIds.length,
      tag_count: tags.length,
      ...trendTagsProps(tags),
    });
    setEmpty(false);
    run.start(tags);
  }, [itemIds.length, tags, run]);

  const status: BuildYourLookStatus =
    run.status === 'loading'
      ? { kind: 'loading' }
      : run.status === 'error'
        ? { kind: 'error', code: run.errorCode }
        : empty
          ? { kind: 'empty' }
          : { kind: 'idle' };

  const dismissStatus = useCallback(() => {
    cancel();
    setEmpty(false);
  }, [cancel]);

  return {
    enabled,
    sectionProps: {
      items,
      tags,
      onAddItem: addItem,
      onRemoveItem: removeItem,
      onAddTags: openTags,
      onRemoveTag: removeTag,
      onFind: find,
    },
    tagSheetProps: {
      visible: tagSheetOpen,
      selected: tags,
      onDismiss: () => setTagSheetOpen(false),
      onDone: doneTags,
    },
    statusSheetProps: {
      status,
      onDismiss: dismissStatus,
      onCancelLoading: cancel,
      onRetry: run.retry,
    },
  };
};
