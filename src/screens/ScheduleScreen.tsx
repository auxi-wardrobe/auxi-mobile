import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import { MButton } from '../components/design-system/lib';
import { useSidebar } from '../context/SidebarContext';
import { useSchedule } from '../context/ScheduleContext';
import { theme } from '../theme/theme';
import { Icons } from '../assets/icons';
import IconMinusCircle from '../assets/images/icon_minus_circle.svg';
import IconSparkle from '../assets/images/icon_sparkle.svg';
import { track } from '../services/analytics';
import { dateFromKey, toDayKey } from '../utils/dateKey';
import { AppStackParamList } from '../types/navigation';
import { Favourite } from '../services/favouriteService';
import { FavouriteOutfitCard } from './favourite/FavouriteOutfitCard';
import { CreationCollageCard } from './myCreations/CreationCollageCard';
import { AddToScheduleSheet } from './schedule/AddToScheduleSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Week-strip metrics. Cells are fixed-width so we can deterministically scroll
// the selected day toward the centre on mount.
const CELL_WIDTH = 52;
const CELL_GAP = 8;
const STRIP_PADDING = 16;

// The strip is a horizontal, swipeable rail. It spans a couple of weeks of
// history (reachable by swiping right→left... i.e. dragging left) plus several
// weeks ahead, anchored so today sits in the middle and the rail opens centred
// on it (see scrollToSelected). Matches Figma 4252:26702, which opens on the
// current week.
const STRIP_DAYS_BEFORE = 14; // ~2 weeks of past days reachable by swiping
const STRIP_TOTAL_DAYS = 49; // ~7 weeks total (history + upcoming)

// Weekday abbreviations indexed by Date.getDay() (0 = Sunday). Matches the
// exact (slightly irregular) labels in the design — "Wed" is three letters
// while the rest are two.
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'Wed', 'Th', 'Fr', 'Sa'];

interface ScheduleDay {
  /** Sortable key, "YYYY-MM-DD". */
  key: string;
  dayNumber: number;
  weekday: string;
  isToday: boolean;
}

/** Monday 00:00 of the week containing `d`. */
const startOfWeek = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offsetToMonday = (date.getDay() + 6) % 7; // Sun(0)→6, Mon(1)→0, …
  date.setDate(date.getDate() - offsetToMonday);
  return date;
};

const DAY_MS = 86400000;

const buildStripDays = (today: Date, selectedKey?: string): ScheduleDay[] => {
  const todayKey = toDayKey(today);
  const sow = startOfWeek(today);
  // Default window: back up a couple of weeks from this week's Monday so past
  // days are swipe-reachable to the left of today.
  let start = new Date(
    sow.getFullYear(),
    sow.getMonth(),
    sow.getDate() - STRIP_DAYS_BEFORE,
  );
  let endExclusive = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + STRIP_TOTAL_DAYS,
  );
  // Ensure a selected day outside the default window still gets a cell on the
  // rail (e.g. a far-future date chosen in the picker) — otherwise the
  // selection has no visible/highlightable cell. Expand by whole weeks so the
  // grid stays week-aligned.
  const sel = selectedKey ? dateFromKey(selectedKey) : null;
  if (sel) {
    const selWeekStart = startOfWeek(sel);
    if (selWeekStart.getTime() < start.getTime()) {
      start = selWeekStart;
    }
    const selWeekEnd = new Date(
      selWeekStart.getFullYear(),
      selWeekStart.getMonth(),
      selWeekStart.getDate() + 7,
    );
    if (selWeekEnd.getTime() > endExclusive.getTime()) {
      endExclusive = selWeekEnd;
    }
  }
  const total = Math.round(
    (endExclusive.getTime() - start.getTime()) / DAY_MS,
  );
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = toDayKey(d);
    return {
      key,
      dayNumber: d.getDate(),
      weekday: WEEKDAY_LABELS[d.getDay()],
      isToday: key === todayKey,
    };
  });
};

export const ScheduleScreen: React.FC = () => {
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Schedule'>>();
  const focusDate = route.params?.focusDate;
  const { scheduledByDay, unscheduleOutfit } = useSchedule();
  const stripRef = useRef<ScrollView>(null);

  // `today` is captured once per mount so the strip and the default selection
  // stay consistent through re-renders.
  const today = useMemo(() => new Date(), []);

  // Start on the day passed from the Favourite date-picker (if any), else today.
  const [selectedKey, setSelectedKey] = useState<string>(
    () => focusDate ?? toDayKey(today),
  );
  // "Add an outfit" source-picker sheet (Favourite / My Creations).
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  // Re-focus when arriving again with a new `focusDate` (the screen may already
  // be mounted in the stack). Clear the param once consumed so a later re-focus
  // with the same stale value can't snap the user's manual selection back to it.
  useEffect(() => {
    if (focusDate) {
      setSelectedKey(focusDate);
      navigation.setParams({ focusDate: undefined });
    }
  }, [focusDate, navigation]);

  // The strip window includes the selected day even when it falls outside the
  // default ±-weeks range (far-future picks), so it always has a cell.
  const days = useMemo(
    () => buildStripDays(today, selectedKey),
    [today, selectedKey],
  );

  // Outfits planned for the selected day (from the local ScheduleContext store,
  // written by the Favourite page's "add to schedule" action).
  const selectedDayOutfits = scheduledByDay[selectedKey] ?? [];

  // Centre the selected day in the rail.
  const scrollToSelected = useCallback(() => {
    const index = days.findIndex(d => d.key === selectedKey);
    if (index < 0) {
      return;
    }
    const cellStride = CELL_WIDTH + CELL_GAP;
    const x = Math.max(
      0,
      index * cellStride - SCREEN_WIDTH / 2 + CELL_WIDTH / 2,
    );
    stripRef.current?.scrollTo({ x, animated: false });
  }, [days, selectedKey]);

  // Re-centre on first layout and whenever the selection changes (e.g.
  // returning from the date-picker focused on a far-future day).
  useEffect(() => {
    scrollToSelected();
  }, [scrollToSelected]);

  const handleSelectDay = (day: ScheduleDay) => {
    setSelectedKey(day.key);
    track('schedule_day_selected', { date: day.key, is_today: day.isToday });
  };

  const handleAddOutfit = () => {
    // Open the source picker — the user chooses Favourite or My Creations,
    // then adds an outfit from there (each page's calendar-add button).
    track('schedule_add_tapped', { date: selectedKey });
    setAddSheetVisible(true);
  };

  const handlePickSource = (source: 'favourite' | 'creations') => {
    setAddSheetVisible(false);
    track('schedule_add_source_selected', { source });
    // returnToSchedule so the chosen page sends the user back here after they
    // schedule an outfit (they're mid-planning); scheduleDate so the date sheet
    // there opens pre-selected on the day currently selected here.
    navigation.navigate(
      source === 'favourite' ? 'Favourite' : 'MyCreations',
      { returnToSchedule: true, scheduleDate: selectedKey, showBackButton: true },
    );
  };

  // Mirror the Favourite page's "See this on me" entry so a scheduled outfit
  // offers the same self-visualization action.
  const handleSelfVisualization = (favourite: Favourite) => {
    track('favourite_try_on_tapped', { favorite_id: favourite.id });
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

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="schedule-screen">
      {/* Canonical Header (#158) — Menu + centred title + a right action
          ("+" opens the source picker). The preset owns title typography and
          the 44px white icon chip, so no per-screen style overrides. */}
      <Header.MenuTitleAction
        title={t('schedule.title')}
        leftTestID="schedule-header-menu"
        leftAccessibilityLabel={t('schedule.a11y_open_menu')}
        onBack={openSidebar}
        right={
          <TopIconButton
            testID="schedule-header-add"
            accessibilityLabel={t('schedule.a11y_add')}
            onPress={handleAddOutfit}
            icon={<Icons.Plus width={24} height={24} />}
          />
        }
      />

      <ScrollView
        ref={stripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={scrollToSelected}
        contentContainerStyle={styles.stripContent}
        style={styles.strip}
        testID="schedule-week-strip"
      >
        {days.map(day => {
          const isSelected = day.key === selectedKey;
          // One dot per outfit scheduled on this day (3 outfits → 3 dots).
          const dotCount = scheduledByDay[day.key]?.length ?? 0;
          return (
            <TouchableOpacity
              key={day.key}
              activeOpacity={0.8}
              onPress={() => handleSelectDay(day)}
              style={[
                styles.dayCell,
                day.isToday && !isSelected && styles.dayCellToday,
                isSelected && styles.dayCellSelected,
              ]}
              testID={
                isSelected ? `schedule-day-${day.key}-selected` : `schedule-day-${day.key}`
              }
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.dayNumber} ${day.weekday}`}
            >
              <Text
                style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}
              >
                {day.dayNumber}
              </Text>
              <Text
                style={[styles.dayWeekday, isSelected && styles.dayWeekdaySelected]}
              >
                {day.weekday}
              </Text>
              {/* One dot per scheduled outfit. The row always renders (with a
                  reserved min height) so weekday baselines stay aligned whether
                  or not a day has outfits; it wraps if a day has many. */}
              <View
                style={styles.dayDots}
                testID={`schedule-day-${day.key}-dots-${dotCount}`}
              >
                {Array.from({ length: dotCount }).map((_, idx) => (
                  <View key={idx} style={styles.dayDot} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>{t('schedule.scheduled_outfit')}</Text>

      <View style={styles.body}>
        {selectedDayOutfits.length === 0 ? (
          <View style={styles.emptyState} testID="schedule-empty">
            <Text style={styles.emptyTitle}>{t('schedule.empty_title')}</Text>
            <Text style={styles.emptyBody}>{t('schedule.empty_body')}</Text>
          </View>
        ) : (
          <ScrollView
            testID="schedule-outfit-list"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedDayOutfits.map(outfit =>
              outfit.kind === 'favourite' ? (
                // #164 hoisted per-card actions off FavouriteOutfitCard (now
                // display-only). The Favourite screen replaced them with one
                // sticky bar acting on the snapped outfit, but Schedule lists
                // several outfits per day — each needs its own controls — so a
                // compact per-card Remove (unschedule) + See-on-me row sits
                // beneath the card here (feature-specific, not the snap-one
                // Favourite pattern). The calendar-add button is intentionally
                // absent: the outfit is already on the calendar.
                <View key={outfit.favourite.id} style={styles.scheduledItem}>
                  <FavouriteOutfitCard
                    favourite={outfit.favourite}
                    view="grid"
                    onItemPress={itemId =>
                      navigation.navigate('ItemDetail', { itemId })
                    }
                  />
                  <View style={styles.scheduledActions}>
                    {/* Borderless 24px danger glyph — same reason as the
                        Favourite action bar's remove: no MIconButton variant
                        expresses it. Here Remove means unschedule. */}
                    <TouchableOpacity
                      testID={`schedule-remove-${outfit.favourite.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={t('schedule.remove_a11y')}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.scheduledRemove}
                      onPress={() =>
                        unscheduleOutfit(selectedKey, outfit.favourite.id)
                      }
                    >
                      <IconMinusCircle
                        width={24}
                        height={24}
                        color={theme.colors.figmaItemDetailDanger}
                      />
                    </TouchableOpacity>
                    <MButton
                      variant="secondary"
                      testID={`schedule-self-visualization-${outfit.favourite.id}`}
                      accessibilityLabel={t('favourite.self_visualization')}
                      rightIcon={IconSparkle}
                      iconColor={theme.colors.figmaAiSparkle}
                      onPress={() => handleSelfVisualization(outfit.favourite)}
                    >
                      {t('favourite.self_visualization')}
                    </MButton>
                  </View>
                </View>
              ) : (
                <CreationCollageCard
                  key={outfit.creation.id}
                  creation={outfit.creation}
                  onRemove={id => unscheduleOutfit(selectedKey, id)}
                />
              ),
            )}
          </ScrollView>
        )}
      </View>

      <AddToScheduleSheet
        visible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}
        onSelectFavourite={() => handlePickSource('favourite')}
        onSelectCreations={() => handlePickSource('creations')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  strip: {
    flexGrow: 0,
  },
  stripContent: {
    paddingHorizontal: STRIP_PADDING,
    gap: CELL_GAP,
    paddingVertical: 4,
  },
  dayCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    // Transparent border on every cell so the today-outline / selected-fill
    // states don't shift the cell's content box by 1px.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Today (when NOT the selected day) reads as an outline; the selected day is
  // the solid fill below. If today IS selected it gets the fill, not the outline.
  dayCellToday: {
    borderColor: theme.colors.figmaDivider,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.figmaIconSurface,
  },
  dayNumber: {
    ...theme.typography.aliases.poppinsBodyBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
    color: theme.colors.figmaTextPrimary,
  },
  dayNumberSelected: {
    fontSize: 20,
    lineHeight: 26,
  },
  dayWeekday: {
    ...theme.typography.aliases.interBodySm,
    lineHeight: 18,
    marginTop: 2,
    color: theme.colors.figmaTextSecondary,
  },
  dayWeekdaySelected: {
    color: theme.colors.figmaTextPrimary,
  },
  // Dots row under the weekday — centered, wraps if a day has many outfits.
  // `minHeight` reserves the single-row space so days with no outfits keep the
  // same cell height (weekday baselines stay aligned).
  dayDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    minHeight: 4,
    maxWidth: CELL_WIDTH - 8,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.figmaTextPrimary,
  },
  sectionTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.figmaTextPrimary,
    paddingHorizontal: STRIP_PADDING,
    marginTop: 12,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  // A scheduled favourite = the display-only card + its own action row.
  scheduledItem: {
    gap: theme.spacing.m,
  },
  scheduledActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.l,
  },
  scheduledRemove: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
