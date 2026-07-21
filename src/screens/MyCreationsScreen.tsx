import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { theme } from '../theme/theme';
import { toast } from '../components/design-system/lib';
import { useSidebar } from '../context/SidebarContext';
import { useSchedule } from '../context/ScheduleContext';
import { useCreationsSeen } from '../context/CreationsSeenContext';
import { MacgieLoader } from '../components/macgie';
import { Header } from '../components/layout/Header';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
import { track } from '../services/analytics';
import { dateFromKey, toDayKey } from '../utils/dateKey';
import { AppStackParamList } from '../types/navigation';
import {
  CREATIONS_QUERY_KEY,
  CreationSaveError,
  creationsService,
  resolveWardrobeItemId,
  type Creation,
  type CreationItem,
} from '../services/creationsService';
import { CreationCollageCard } from './myCreations/CreationCollageCard';
import { RemoveCreationDialog } from './myCreations/RemoveCreationDialog';
import { ScheduleDatePickerSheet } from './schedule/ScheduleDatePickerSheet';
import { useScheduleAddedToast } from './schedule/useScheduleAddedToast';

// The creation's items reduced to what try-on needs: a real wardrobe id paired
// with its image url. Built as ONE list (id + url kept together, deduped by id)
// so the parallel `itemIds` / `itemImageUrls` arrays handed to SeeThisOnMe can
// never desync. Items with no recoverable wardrobe id are dropped.
const resolveUsableItems = (
  creation: Creation,
): { id: string; imageUrl: string }[] => {
  const seen = new Set<string>();
  return creation.items.reduce<{ id: string; imageUrl: string }[]>(
    (acc, it) => {
      const id = resolveWardrobeItemId(it);
      if (id && !seen.has(id)) {
        seen.add(id);
        acc.push({ id, imageUrl: it.imageUri });
      }
      return acc;
    },
    [],
  );
};

// "My Creations" — the saved-canvas list reached from the canvas header's
// My Creations icon. Structurally mirrors FavouriteScreen (blurred menu header
// + scrolling list + loader/empty states); the body reuses the Favourite page's
// COLLAGE presentation via CreationCollageCard, so a saved remix reads the same
// as a saved outfit in collage mode.
export const MyCreationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { open: openSidebar } = useSidebar();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'MyCreations'>>();
  const returnToSchedule = route.params?.returnToSchedule === true;
  // Day selected on Schedule (when reached via its "+"), so the date sheet opens
  // pre-selected on it instead of today. Undefined when opened directly.
  const scheduleInitialDate = route.params?.scheduleDate
    ? dateFromKey(route.params.scheduleDate) ?? undefined
    : undefined;
  // When reached from a sub-flow (Outfit Canvas, Schedule "+" picker, …), show a
  // back chevron instead of the hamburger so the user can return there.
  const showBackButton = route.params?.showBackButton === true;
  const { scheduleOutfit } = useSchedule();
  const showScheduleAddedToast = useScheduleAddedToast();
  const { markSeen: markCreationsSeen } = useCreationsSeen();
  // The creation awaiting a day in the "Add to Schedule" sheet (null = closed).
  const [scheduleTarget, setScheduleTarget] = useState<Creation | null>(null);
  // Deleting a creation is confirmed via a bottom sheet (same pattern as the
  // Favourite list): the card's ⊖ stages the id, the sheet confirms the delete.
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  // Viewing the list clears the canvas header's "unseen saved creation" dot —
  // same pattern as the Favourite page clearing the saved-looks dot.
  useFocusEffect(
    useCallback(() => {
      markCreationsSeen();
    }, [markCreationsSeen]),
  );

  const { data, isLoading } = useQuery({
    queryKey: CREATIONS_QUERY_KEY,
    queryFn: () => creationsService.listCreations(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => creationsService.removeCreation(id),
    onSuccess: (_result, id) => {
      track('creation_removed', { creation_id: id });
      queryClient.invalidateQueries({ queryKey: CREATIONS_QUERY_KEY });
    },
    onError: (error, id) => {
      // `auth` = session expired: the apiClient interceptor already redirected
      // to login, so stay silent and let that flow play out.
      const isAuth =
        error instanceof CreationSaveError && error.kind === 'auth';
      if (!isAuth) {
        Sentry.captureException(error, {
          tags: { feature: 'creation_remove' },
          extra: { creation_id: id },
        });
        toast.show({ type: 'error', text1: t('myCreations.remove_error') });
      }
    },
    onSettled: () => setPendingRemovalId(null),
  });

  const confirmRemove = () => {
    if (pendingRemovalId) {
      removeMutation.mutate(pendingRemovalId);
    }
  };

  const creations = data?.creations ?? [];

  const handleSchedule = (creation: Creation) => {
    // Open the "Add to Schedule" sheet so the user picks which day.
    track('creation_schedule_opened', { creation_id: creation.id });
    setScheduleTarget(creation);
  };

  // Launch Self Visualization / try-on for a saved creation. Synthesizes the
  // TryOnOutfitContext the "See this on me" flow needs from the creation's
  // items (real wardrobe ids + their image urls). Guarded against the no-id
  // case (the button is hidden then, but belt-and-braces here too).
  const handleVisualize = (creation: Creation) => {
    const usable = resolveUsableItems(creation);
    if (usable.length === 0) {
      return;
    }
    track('creation_self_visualization_opened', { creation_id: creation.id });
    // Via the reuse-confirm gate (see FavouriteScreen) so the confirm sheet
    // shows over the Creations page rather than an empty See-on-me shell.
    navigation.navigate('SeeThisOnMeConfirm', {
      outfit: {
        outfitHash: creation.id,
        itemIds: usable.map(u => u.id),
        itemImageUrls: usable.map(u => u.imageUrl),
        stylingNote: '',
      },
    });
  };

  // Open a tapped collage item's detail. Resolves the real wardrobe id behind
  // the creation item (stored `wardrobeItemId`, else recovered from the
  // synthetic canvas id); items with no recoverable id are a no-op. Navigates
  // to ItemDetail with just the id — same as the Favourite collage's per-item
  // tap — so ItemDetail loads the live wardrobe record.
  const handleItemPress = (item: CreationItem) => {
    const wardrobeId = resolveWardrobeItemId(item);
    if (!wardrobeId) {
      return;
    }
    track('creation_item_detail_opened', { wardrobe_item_id: wardrobeId });
    navigation.navigate('ItemDetail', { itemId: wardrobeId });
  };

  const handleConfirmSchedule = (date: Date) => {
    if (!scheduleTarget) {
      return;
    }
    const dayKey = toDayKey(date);
    scheduleOutfit(dayKey, { kind: 'creation', creation: scheduleTarget });
    track('creation_added_to_schedule', {
      creation_id: scheduleTarget.id,
      date: dayKey,
    });
    setScheduleTarget(null);
    // Only return to Schedule when the user came from there (mid-planning).
    // Otherwise they're managing creations — stay put (toast confirms).
    if (returnToSchedule) {
      navigation.navigate('Schedule', { focusDate: dayKey });
    }
    showScheduleAddedToast();
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centerFill} testID="my-creations-loading">
          <MacgieLoader />
        </View>
      );
    }

    if (creations.length === 0) {
      return (
        <View style={styles.centerFill} testID="my-creations-empty">
          <IconMyCreation
            width={24}
            height={24}
            color={theme.colors.figmaTextDark}
          />
          <Text style={styles.emptyText}>{t('myCreations.empty_body')}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        testID="my-creations-list"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {creations.map(creation => (
          <CreationCollageCard
            key={creation.id}
            creation={creation}
            onRemove={setPendingRemovalId}
            onItemPress={handleItemPress}
            onSchedule={handleSchedule}
            onVisualize={
              resolveUsableItems(creation).length > 0
                ? handleVisualize
                : undefined
            }
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="my-creations-screen">
      {/* Canonical Header (#158). Back chevron when reached as a sub-flow
          (Outfit Canvas / Schedule "+" picker) so the user returns to that
          context; hamburger otherwise. */}
      {showBackButton ? (
        <Header.BackTitle
          title={t('myCreations.title')}
          background="blur"
          safeAreaTop
          leftTestID="my-creations-header-back"
          leftAccessibilityLabel={t('myCreations.back')}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <Header.MenuTitle
          title={t('myCreations.title')}
          background="blur"
          safeAreaTop
          leftTestID="my-creations-header-menu"
          leftAccessibilityLabel={t('myCreations.open_menu')}
          onBack={openSidebar}
        />
      )}

      <View style={styles.body}>{renderBody()}</View>

      <ScheduleDatePickerSheet
        visible={scheduleTarget !== null}
        initialDate={scheduleInitialDate}
        onCancel={() => setScheduleTarget(null)}
        onConfirm={handleConfirmSchedule}
      />

      <RemoveCreationDialog
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
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.uacDimension12,
    paddingHorizontal: theme.spacing.l,
  },
  emptyText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
});
