import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSidebar } from '../context/SidebarContext';
import { useSchedule } from '../context/ScheduleContext';
import { theme } from '../theme/theme';
import { Icons } from '../assets/icons';
import { track } from '../services/analytics';
import { toDayKey } from '../utils/dateKey';
import { AppStackParamList } from '../types/navigation';
import { Favourite } from '../services/favouriteService';
import { FavouriteOutfitCard } from './favourite/FavouriteOutfitCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Week-strip metrics. Cells are fixed-width so we can deterministically scroll
// the selected day toward the centre on mount.
const CELL_WIDTH = 52;
const CELL_GAP = 8;
const STRIP_PADDING = 16;

// The strip is a horizontal, swipeable rail. It spans a couple of weeks of
// history (reachable by swiping right→left... i.e. dragging left) plus several
// weeks ahead, anchored so today sits in the middle and the rail opens centred
// on it (see handleStripLayout). Matches Figma 4252:26702, which opens on the
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

const buildStripDays = (today: Date): ScheduleDay[] => {
  const todayKey = toDayKey(today);
  const sow = startOfWeek(today);
  // Back up a couple of weeks from this week's Monday so past days are
  // swipe-reachable to the left of today.
  const start = new Date(
    sow.getFullYear(),
    sow.getMonth(),
    sow.getDate() - STRIP_DAYS_BEFORE,
  );
  return Array.from({ length: STRIP_TOTAL_DAYS }, (_, i) => {
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
  const days = useMemo(() => buildStripDays(today), [today]);

  // Start on the day passed from the Favourite date-picker (if any), else today.
  const [selectedKey, setSelectedKey] = useState<string>(
    () => focusDate ?? toDayKey(today),
  );

  // Re-focus when arriving again with a new `focusDate` (the screen may already
  // be mounted in the stack).
  useEffect(() => {
    if (focusDate) {
      setSelectedKey(focusDate);
    }
  }, [focusDate]);

  // Outfits planned for the selected day (from the local ScheduleContext store,
  // written by the Favourite page's "add to schedule" action).
  const selectedDayOutfits = scheduledByDay[selectedKey] ?? [];

  // Centre the selected day on first layout so today is in view even when it
  // sits a few cells into the strip.
  const handleStripLayout = () => {
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
  };

  const handleSelectDay = (day: ScheduleDay) => {
    setSelectedKey(day.key);
    track('schedule_day_selected', { date: day.key, is_today: day.isToday });
  };

  const handleAddOutfit = () => {
    // Outfits are added to a day from the Favourite page (the calendar-add
    // button on each saved outfit). The header "+" sends the user there to
    // pick one; it also records intent for analytics.
    track('schedule_add_tapped', { date: selectedKey });
    navigation.navigate('Favourite');
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
      <Header
        title={t('schedule.title')}
        titleTextStyle={styles.headerTitle}
        leftIconStyle={styles.headerIconButton}
        leftIconTestID="schedule-header-menu"
        leftIconAccessibilityLabel={t('schedule.a11y_open_menu')}
        onBack={openSidebar}
        rightComponent={
          <TopIconButton
            testID="schedule-header-add"
            accessibilityLabel={t('schedule.a11y_add')}
            onPress={handleAddOutfit}
            style={styles.headerIconButton}
            icon={<Icons.Plus width={24} height={24} />}
          />
        }
      />

      <ScrollView
        ref={stripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={handleStripLayout}
        contentContainerStyle={styles.stripContent}
        style={styles.strip}
        testID="schedule-week-strip"
      >
        {days.map(day => {
          const isSelected = day.key === selectedKey;
          const hasDot = (scheduledByDay[day.key]?.length ?? 0) > 0;
          return (
            <TouchableOpacity
              key={day.key}
              activeOpacity={0.8}
              onPress={() => handleSelectDay(day)}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
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
              {/* Reserve the dot's space on every cell so weekday baselines stay
                  aligned whether or not a day has a scheduled outfit. */}
              <View style={[styles.dayDot, hasDot && styles.dayDotActive]} />
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
            {selectedDayOutfits.map(outfit => (
              <FavouriteOutfitCard
                key={outfit.id}
                favourite={outfit}
                view="grid"
                // No `onSchedule` here — the calendar-add button is hidden once
                // an outfit is already on the calendar. Remove = unschedule.
                onRemove={id => unscheduleOutfit(selectedKey, id)}
                onSelfVisualization={handleSelfVisualization}
                onItemPress={itemId =>
                  navigation.navigate('ItemDetail', { itemId })
                }
              />
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  headerTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  headerIconButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.m,
    ...theme.ds.shadow.headerIcon,
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
  },
  dayCellSelected: {
    backgroundColor: theme.colors.figmaIconSurface,
  },
  dayNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.figmaTextPrimary,
  },
  dayNumberSelected: {
    fontSize: 20,
    lineHeight: 26,
  },
  dayWeekday: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
    color: theme.colors.figmaTextSecondary,
  },
  dayWeekdaySelected: {
    color: theme.colors.figmaTextPrimary,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  dayDotActive: {
    backgroundColor: theme.colors.figmaTextPrimary,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
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
