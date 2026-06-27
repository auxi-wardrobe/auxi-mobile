import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
  HomeViewTogglePill,
} from '../components/features/HomeViewToggleFooter';
import { track } from '../services/analytics';
import { Favourite, favouriteService } from '../services/favouriteService';
import { FavouriteEmptyState } from './favourite/EmptyState';
import { FavouriteActionBar } from './favourite/FavouriteActionBar';
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

  // The remove / Self-visualization actions now live in one screen-level sticky
  // bar (FavouriteActionBar) instead of repeating per card. The bar operates on
  // whichever saved outfit is currently snapped into view, so we track the
  // active outfit by matching the scroll offset to each card's measured Y.
  const flatFavourites = useMemo(
    () =>
      groups.flatMap(group =>
        group.favourites.map(fav => ({ fav, dayKey: group.dayKey })),
      ),
    [groups],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep the active index in range when the list shrinks (e.g. after removal).
  useEffect(() => {
    setActiveIndex(prev =>
      Math.min(prev, Math.max(0, flatFavourites.length - 1)),
    );
  }, [flatFavourites.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      let best = 0;
      let bestDist = Infinity;
      flatFavourites.forEach((entry, i) => {
        const gy = groupYRef.current[entry.dayKey];
        const cy = cardYRef.current[entry.fav.id];
        if (gy == null || cy == null) {
          return;
        }
        const dist = Math.abs(gy + cy - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(prev => (prev === best ? prev : best));
    },
    [flatFavourites],
  );

  const activeFavourite = flatFavourites[activeIndex]?.fav;

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
        // Track which outfit is in view so the sticky action bar targets it.
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
      {/* Canonical blurred bar (#158 Header). Hamburger-only on the left (no
          title, no back chevron — CEO 2026-06-19; native-stack swipe-back still
          backs out). The grid/collage view-toggle is hoisted from the old bottom
          footer into the header's top-right (CEO 2026-06-27). It rides a widened
          right slot (`rightSlotStyle`) because the compact `size="sm"` toggle
          pill (~76px) exceeds the Header's default 44px icon slot. Its own testID
          stem keeps it from colliding with the Home footer's maestro selectors.
          testID is the machine selector; accessibilityLabel is the human
          VoiceOver string. */}
      <Header
        background="blur"
        safeAreaTop
        leftTestID="favourite-header-menu"
        leftAccessibilityLabel={t('favourite.open_menu')}
        onBack={openSidebar}
        title=""
        rightSlotStyle={styles.toggleSlot}
        rightComponent={
          <HomeViewTogglePill
            testID="favourite-view-toggle"
            itemTestIDStem="favourite-view-tab"
            size="sm"
            activeView={view}
            onSelectView={setView}
          />
        }
      />

      <View style={styles.body}>{renderBody()}</View>

      {activeFavourite ? (
        <FavouriteActionBar
          testID="favourite-action-bar"
          onRemove={() => setPendingRemovalId(activeFavourite.id)}
          onSelfVisualization={() => handleSelfVisualization(activeFavourite)}
        />
      ) : null}

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
  // The header's right slot holds the ~76px view-toggle pill instead of the
  // canonical 44px icon chip, so widen it to fit (the Header's default slot is
  // sized for single icon buttons). `width: 'auto'` lets it size to the pill.
  toggleSlot: {
    width: 'auto',
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
