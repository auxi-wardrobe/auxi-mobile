import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { MButton } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';

// "Add to Schedule" date picker — a month calendar (Figma: big selected-date
// header → month nav → day grid → Cancel / Schedule). Self-contained: the
// consumer controls `visible` and gets the chosen Date back via `onConfirm`.
// Sunday-first grid to match the design's "S M T W T F S". The calendar grid is
// bespoke (a specific Figma layout the generic MCalendar can't reproduce), but
// it rides the shared ContextualBottomSheet shell (full-width, "Refine
// suggestions" reveal motion) so motion / scrim / reduce-motion / safe-area all
// match the app's other contextual sheets, not a bespoke sheet stack.

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// Single-letter weekday headers (Sunday-first). Duplicates ("S"/"T") are
// intentional — they mirror the design and a calendar header reads fine.
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const sameYMD = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatSelected = (d: Date): string =>
  `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;

// The calendar cells for a given year/month: leading blanks (so the 1st lands
// under its weekday) followed by the day numbers, padded to whole weeks.
const buildGrid = (year: number, month: number): Array<number | null> => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay(); // 0 = Sunday
  const cells: Array<number | null> = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
};

interface Props {
  visible: boolean;
  /** Date the sheet opens on (selected + month in view). Defaults to today. */
  initialDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
  testID?: string;
}

export const ScheduleDatePickerSheet: React.FC<Props> = ({
  visible,
  initialDate,
  onCancel,
  onConfirm,
  testID = 'schedule-date-picker',
}) => {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const seed = initialDate ?? today;

  const [selected, setSelected] = useState<Date>(seed);
  // The year/month currently shown in the grid (may differ from the selected
  // date once the user pages through months).
  const [viewYear, setViewYear] = useState<number>(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(seed.getMonth());

  // Re-seed each time the sheet (re)opens so it always starts on the intended
  // date rather than wherever the user last paged to.
  useEffect(() => {
    if (visible) {
      const d = initialDate ?? new Date();
      setSelected(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    // initialDate is intentionally not a dep — we only re-seed on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const grid = useMemo(
    () => buildGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const goPrevMonth = () => {
    setViewMonth(prev => {
      if (prev === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goNextMonth = () => {
    setViewMonth(prev => {
      if (prev === 11) {
        setViewYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  return (
    <ContextualBottomSheet visible={visible} onDismiss={onCancel} testID={testID}>
      <Text style={styles.eyebrow}>{t('schedule.picker.title')}</Text>
      <Text style={styles.selectedDate} testID={`${testID}-selected-label`}>
        {formatSelected(selected)}
      </Text>

      <View style={styles.divider} />

      <View style={styles.monthRow}>
        <Text style={styles.monthLabel}>
          {`${MONTHS_FULL[viewMonth]} ${viewYear}`}
        </Text>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goPrevMonth}
            style={styles.navButton}
            testID={`${testID}-prev-month`}
            accessibilityRole="button"
            accessibilityLabel={t('schedule.picker.prev_month')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.ChevronLeft
              width={24}
              height={24}
              color={theme.colors.figmaTextPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goNextMonth}
            style={styles.navButton}
            testID={`${testID}-next-month`}
            accessibilityRole="button"
            accessibilityLabel={t('schedule.picker.next_month')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.ChevronRight
              width={24}
              height={24}
              color={theme.colors.figmaTextPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dowRow}>
        {DOW_LABELS.map((d, i) => (
          <Text key={`dow-${i}`} style={styles.dowLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((day, i) => {
          if (day === null) {
            return <View key={`blank-${i}`} style={styles.dayCell} />;
          }
          const date = new Date(viewYear, viewMonth, day);
          const isSelected = sameYMD(date, selected);
          const isToday = sameYMD(date, today);
          return (
            <View key={`day-${day}`} style={styles.dayCell}>
              <TouchableOpacity
                onPress={() => setSelected(date)}
                style={[
                  styles.dayCircle,
                  isToday && !isSelected && styles.dayCircleToday,
                  isSelected && styles.dayCircleSelected,
                ]}
                testID={`${testID}-day-${day}${isSelected ? '-selected' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={formatSelected(date)}
              >
                <Text
                  style={[styles.dayText, isSelected && styles.dayTextSelected]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelButton}
          testID={`${testID}-cancel`}
          accessibilityRole="button"
          accessibilityLabel={t('schedule.picker.cancel')}
        >
          <Text style={styles.cancelText}>{t('schedule.picker.cancel')}</Text>
        </TouchableOpacity>
        <MButton
          variant="primary"
          onPress={() => onConfirm(selected)}
          testID={`${testID}-confirm`}
          accessibilityLabel={t('schedule.picker.confirm')}
        >
          {t('schedule.picker.confirm')}
        </MButton>
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  selectedDate: {
    ...theme.typography.aliases.poppinsBodyBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    color: theme.colors.uacTextBase,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
    marginTop: 16,
    marginBottom: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  monthLabel: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.uacTextBase,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dowRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
  },
  dowLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
  dayCircleSelected: {
    backgroundColor: theme.colors.uacTextBase,
  },
  dayText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
  },
  dayTextSelected: {
    color: theme.colors.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    height: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
});
