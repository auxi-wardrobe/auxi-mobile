import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { useReducedMotion } from '../theme/motion';
import { useSidebar } from '../context/SidebarContext';
import { useFavouritesSeen } from '../context/FavouritesSeenContext';
import { MacgieLoader } from '../components/macgie';
import { AppStackParamList } from '../types/navigation';
import { Header } from '../components/layout/Header';
import {
  HomeView,
  HomeViewToggleFooter,
} from '../components/features/HomeViewToggleFooter';
import { track } from '../services/analytics';
import { Favourite, favouriteService } from '../services/favouriteService';
import { FavouriteEmptyState } from './favourite/EmptyState';
import { FavouriteOutfitCard } from './favourite/FavouriteOutfitCard';
import { RemoveFavouriteDialog } from './favourite/RemoveFavouriteDialog';
import {
  formatDateLabel,
  groupFavouritesByDate,
} from './favourite/group-by-date';
import { computeSnapOffsets } from './favourite/snap-offsets';

const FAVOURITES_QUERY_KEY = ['favourites'] as const;

export const FavouriteScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const { open: openSidebar } = useSidebar();
  const { markSeen: markFavouritesSeen } = useFavouritesSeen();

  // Viewing the saved list — by any route (header dot, sidebar, deep link) —
  // clears the Home "unseen saved looks" dot. useFocusEffect so a back-then-
  // return also re-clears if a save happened while this screen was backgrounded.
  useFocusEffect(
    useCallback(() => {
      markFavouritesSeen();
    }, [markFavouritesSeen]),
  );

  const [view, setView] = useState<HomeView>('grid');
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: FAVOURITES_QUERY_KEY,
    queryFn: () => favouriteService.listFavourites(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => favouriteService.removeFavourite(id),
    onSuccess: (_result, id) => {
      track('outfit_unfavorited', { favorite_id: id });
      queryClient.invalidateQueries({ queryKey: FAVOURITES_QUERY_KEY });
    },
    onSettled: () => setPendingRemovalId(null),
  });

  const favourites = useMemo(() => data?.favorites ?? [], [data?.favorites]);
  const groups = useMemo(() => groupFavouritesByDate(favourites), [favourites]);

  // AU-347: snap the Favourite list to one outfit at a time so users review
  // saved outfits individually (reduces cognitive load). We measure each date
  // group's Y within the scroll content and each card's Y within its group via
  // onLayout; computeSnapOffsets sums them into ScrollView.snapToOffsets, so a
  // vertical swipe settles on the nearest outfit instead of free-scrolling.
  const groupYRef = useRef<Record<string, number>>({});
  const cardYRef = useRef<Record<string, number>>({});
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);

  const snapGroups = useMemo(
    () =>
      groups.map(group => ({
        dayKey: group.dayKey,
        ids: group.favourites.map(fav => fav.id),
      })),
    [groups],
  );

  const recomputeSnap = useCallback(() => {
    setSnapOffsets(prev => {
      const next = computeSnapOffsets(
        snapGroups,
        groupYRef.current,
        cardYRef.current,
      );
      // onLayout can fire repeatedly; skip the state update when unchanged.
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) {
        return prev;
      }
      return next;
    });
  }, [snapGroups]);

  const handleGroupLayout = useCallback(
    (dayKey: string) => (e: LayoutChangeEvent) => {
      groupYRef.current[dayKey] = e.nativeEvent.layout.y;
      recomputeSnap();
    },
    [recomputeSnap],
  );

  const handleCardLayout = useCallback(
    (id: string) => (e: LayoutChangeEvent) => {
      cardYRef.current[id] = e.nativeEvent.layout.y;
      recomputeSnap();
    },
    [recomputeSnap],
  );

  const handleSelfVisualization = (favourite: Favourite) => {
    track('favourite_try_on_tapped', { favorite_id: favourite.id });
    // Build the serializable TryOnOutfitContext the "See this on me" flow needs
    // from the saved favourite: outfit hash, the garment ids + their image urls,
    // and the human-readable styling note.
    const items = favourite.outfit_items ?? [];
    navigation.navigate('SeeThisOnMe', {
      outfit: {
        outfitHash: favourite.outfit_context?.outfit_hash ?? favourite.id,
        itemIds: items.map(item => item.id),
        itemImageUrls: items
          .map(item => item.image_png ?? item.image_url)
          .filter((url): url is string => !!url),
        stylingNote: favourite.outfit_context?.reasoning_human ?? '',
      },
    });
  };

  const confirmRemove = () => {
    if (pendingRemovalId) {
      removeMutation.mutate(pendingRemovalId);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centerFill} testID="favourite-loading">
          <MacgieLoader />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centerFill} testID="favourite-error">
          <Text style={styles.errorText}>{t('favourite.load_error')}</Text>
        </View>
      );
    }

    if (favourites.length === 0) {
      return <FavouriteEmptyState testID="favourite-empty" />;
    }

    return (
      <ScrollView
        testID="favourite-list"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // AU-347: snap to one outfit at a time. Disabled under Reduce Motion
        // (avoid forced large travel) and until offsets have been measured.
        snapToOffsets={
          reduced || snapOffsets.length === 0 ? undefined : snapOffsets
        }
        disableIntervalMomentum
        decelerationRate="fast"
      >
        {groups.map(group => (
          <View
            key={group.dayKey}
            style={styles.dateGroup}
            onLayout={handleGroupLayout(group.dayKey)}
          >
            {/* CEO 2026-06-19: the date moved INTO each card's title block and
                repeats per outfit — the screen-level per-day header is gone. */}
            {group.favourites.map(favourite => (
              <View
                key={favourite.id}
                testID={`favourite-snap-${favourite.id}`}
                onLayout={handleCardLayout(favourite.id)}
              >
                <FavouriteOutfitCard
                  favourite={favourite}
                  view={view}
                  dateLabel={formatDateLabel(favourite.created_at)}
                  onRemove={setPendingRemovalId}
                  onSelfVisualization={handleSelfVisualization}
                  onItemPress={itemId =>
                    navigation.navigate('ItemDetail', { itemId })
                  }
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="favourite-screen">
      {/* Hamburger-only blurred bar (no title, no back chevron — CEO
          2026-06-19); native-stack swipe-back still backs out. testID is the
          machine selector; accessibilityLabel is the human VoiceOver string. */}
      <Header.MenuOnly
        leftTestID="favourite-header-menu"
        leftAccessibilityLabel={t('favourite.open_menu')}
        onBack={openSidebar}
      />

      <View style={styles.body}>{renderBody()}</View>

      <HomeViewToggleFooter
        testID="favourite-view-toggle"
        activeView={view}
        onSelectView={setView}
      />

      <RemoveFavouriteDialog
        visible={pendingRemovalId !== null}
        isBusy={removeMutation.isPending}
        onCancel={() => setPendingRemovalId(null)}
        onConfirm={confirmRemove}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  dateGroup: {
    gap: theme.spacing.uacDimension12,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  errorText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
