import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../components/design-system/lib';
import { theme } from '../theme/theme';
import { useReducedMotion } from '../theme/motion';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useFavouritesSeen } from '../context/FavouritesSeenContext';
import { useSchedule } from '../context/ScheduleContext';
import { readWearLog, type WearLog } from './HomeScreen/wear-log';
import { dateFromKey, toDayKey } from '../utils/dateKey';
import { MacgieLoader } from '../components/macgie';
import { AppStackParamList } from '../types/navigation';
import { Header } from '../components/layout/Header';
import { Icons } from '../assets/icons';
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
import { ScheduleDatePickerSheet } from './schedule/ScheduleDatePickerSheet';
import { useScheduleAddedToast } from './schedule/useScheduleAddedToast';
import {
  effectiveWornAt,
  formatDateLabel,
  groupFavouritesByDate,
} from './favourite/group-by-date';
import { useIsOutfitGenerating } from './see-this-on-me/use-outfit-generating';
import { computeSnapOffsets } from './favourite/snap-offsets';
import { computeActiveIndex } from './favourite/active-index';

const FAVOURITES_QUERY_KEY = ['favourites'] as const;

export const FavouriteScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Favourite'>>();
  const returnToSchedule = route.params?.returnToSchedule === true;
  // Day selected on Schedule (when reached via its "+"), so the date sheet opens
  // pre-selected on it instead of today. Undefined when opened directly.
  const scheduleInitialDate = route.params?.scheduleDate
    ? dateFromKey(route.params.scheduleDate) ?? undefined
    : undefined;
  // When reached from a sub-flow (Schedule "+" picker, …), show a back chevron
  // instead of the hamburger so the user can return to that context.
  const showBackButton = route.params?.showBackButton === true;
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const { open: openSidebar } = useSidebar();
  const { user } = useAuth();
  const { markSeen: markFavouritesSeen } = useFavouritesSeen();
  const { scheduleOutfit } = useSchedule();
  const showScheduleAddedToast = useScheduleAddedToast();

  // Viewing the saved list — by any route (header dot, sidebar, deep link) —
  // clears the Home "unseen saved looks" dot. useFocusEffect so a back-then-
  // return also re-clears if a save happened while this screen was backgrounded.
  useFocusEffect(
    useCallback(() => {
      markFavouritesSeen();
    }, [markFavouritesSeen]),
  );

  // The app's own wear log (see HomeScreen/wear-log.ts). The backend never
  // advances a favourite's date on a re-wear, so a just-worn look would keep
  // sorting under its original save date. Re-read it on focus (a wear may have
  // happened on Home moments ago) and let it override each favourite's date so
  // a re-worn outfit floats to today at the top of the list.
  const [localWears, setLocalWears] = useState<WearLog>({});
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      readWearLog(user?.id).then(log => {
        if (!cancelled) {
          setLocalWears(log);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  const [view, setView] = useState<HomeView>('grid');
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  // The outfit awaiting a day in the "Add to Schedule" sheet (null = closed).
  const [scheduleTarget, setScheduleTarget] = useState<Favourite | null>(null);

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
    onError: () => {
      // favouriteService.removeFavourite already reports to Sentry
      // (feature: 'favourite') — this handler is UI-facing only.
      toast.show({ type: 'error', text1: t('favourite.remove_error') });
    },
    onSettled: () => setPendingRemovalId(null),
  });

  const favourites = useMemo(() => data?.favorites ?? [], [data?.favorites]);
  const groups = useMemo(
    () => groupFavouritesByDate(favourites, localWears),
    [favourites, localWears],
  );

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

  // Lightweight {dayKey, id} view of the list for the pure active-index math
  // (computeActiveIndex), memoized so scroll handling doesn't re-map per frame.
  const activeIndexEntries = useMemo(
    () => flatFavourites.map(({ fav, dayKey }) => ({ dayKey, id: fav.id })),
    [flatFavourites],
  );

  // Keep the active index in range when the list shrinks (e.g. after removal).
  useEffect(() => {
    setActiveIndex(prev =>
      Math.min(prev, Math.max(0, flatFavourites.length - 1)),
    );
  }, [flatFavourites.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const best = computeActiveIndex(
        activeIndexEntries,
        groupYRef.current,
        cardYRef.current,
        e.nativeEvent.contentOffset.y,
      );
      setActiveIndex(prev => (prev === best ? prev : best));
    },
    [activeIndexEntries],
  );

  const activeFavourite = flatFavourites[activeIndex]?.fav;
  // The outfit hash the try-on flow keys on (mirrors handleSelfVisualization),
  // so the action bar can show a loading "See on me" button when THIS outfit's
  // AI photo is still generating after the user left the loading screen.
  const activeOutfitHash = activeFavourite
    ? activeFavourite.outfit_context?.outfit_hash ?? activeFavourite.id
    : undefined;
  const activeIsGenerating = useIsOutfitGenerating(activeOutfitHash);

  const handleSelfVisualization = (favourite: Favourite) => {
    track('favourite_try_on_tapped', { favorite_id: favourite.id });
    // Build the serializable TryOnOutfitContext the "See this on me" flow needs
    // from the saved favourite: outfit hash, the garment ids + their image urls,
    // and the human-readable styling note.
    const items = favourite.outfit_items ?? [];
    // Route through the reuse-confirm gate so a saved-body user sees the confirm
    // sheet over THIS page (not an empty See-on-me shell). The gate hands off to
    // SeeThisOnMe for capture / render.
    navigation.navigate('SeeThisOnMeConfirm', {
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

  const handleSchedule = (favourite: Favourite) => {
    // Open the "Add to Schedule" sheet so the user picks which day.
    track('favourite_schedule_opened', { favorite_id: favourite.id });
    setScheduleTarget(favourite);
  };

  const handleConfirmSchedule = (date: Date) => {
    if (!scheduleTarget) {
      return;
    }
    const dayKey = toDayKey(date);
    scheduleOutfit(dayKey, { kind: 'favourite', favourite: scheduleTarget });
    track('favourite_added_to_schedule', {
      favorite_id: scheduleTarget.id,
      date: dayKey,
    });
    setScheduleTarget(null);
    // Only return to Schedule when the user came from there (mid-planning).
    // Otherwise they're browsing favourites — stay put (toast confirms).
    if (returnToSchedule) {
      navigation.navigate('Schedule', { focusDate: dayKey });
    }
    showScheduleAddedToast();
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
                  dateLabel={formatDateLabel(
                    effectiveWornAt(favourite, localWears),
                  )}
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
      {/* Canonical blurred bar (#158 Header). The grid/collage view-toggle is
          hoisted from the old bottom footer into the header's top-right (CEO
          2026-06-27). It rides a widened right slot (`rightSlotStyle`) because
          the compact `size="sm"` toggle pill (~76px) exceeds the Header's
          default 44px icon slot. Its own testID stem keeps it from colliding
          with the Home footer's maestro selectors. The left button shows a back
          chevron when Favourite is reached as a sub-flow (Schedule "+" picker)
          so the user can return there; otherwise the hamburger opens the drawer
          (CEO 2026-06-19; native-stack swipe-back still backs out). testID is
          the machine selector; accessibilityLabel is the human VoiceOver
          string. */}
      <Header
        background="blur"
        safeAreaTop
        leftTestID={
          showBackButton ? 'favourite-header-back' : 'favourite-header-menu'
        }
        leftAccessibilityLabel={
          showBackButton ? t('favourite.back') : t('favourite.open_menu')
        }
        leftIcon={
          showBackButton ? (
            <Icons.ChevronLeft width={24} height={24} />
          ) : undefined
        }
        onBack={showBackButton ? () => navigation.goBack() : openSidebar}
        title=""
        rightSlotStyle={styles.toggleSlot}
        rightComponent={
          <HomeViewTogglePill
            testID="favourite-view-toggle"
            itemTestIDStem="favourite-view-tab"
            size="sm"
            source="favourite"
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
          onSchedule={() => handleSchedule(activeFavourite)}
          onSelfVisualization={() => handleSelfVisualization(activeFavourite)}
          selfVisualizationLoading={activeIsGenerating}
        />
      ) : null}

      <RemoveFavouriteDialog
        visible={pendingRemovalId !== null}
        isBusy={removeMutation.isPending}
        onCancel={() => setPendingRemovalId(null)}
        onConfirm={confirmRemove}
      />

      <ScheduleDatePickerSheet
        visible={scheduleTarget !== null}
        initialDate={scheduleInitialDate}
        onCancel={() => setScheduleTarget(null)}
        onConfirm={handleConfirmSchedule}
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
