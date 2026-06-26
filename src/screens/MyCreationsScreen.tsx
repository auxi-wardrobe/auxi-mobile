import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { useSidebar } from '../context/SidebarContext';
import { useSchedule } from '../context/ScheduleContext';
import { MacgieLoader } from '../components/macgie';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import IconMenu from '../assets/images/icon_menu.svg';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
import { track } from '../services/analytics';
import { toDayKey } from '../utils/dateKey';
import { AppStackParamList } from '../types/navigation';
import {
  CREATIONS_QUERY_KEY,
  creationsService,
  type Creation,
} from '../services/creationsService';
import { CreationCollageCard } from './myCreations/CreationCollageCard';
import { ScheduleDatePickerSheet } from './schedule/ScheduleDatePickerSheet';

// "My Creations" — the saved-canvas list reached from the canvas header's
// My Creations icon. Structurally mirrors FavouriteScreen (blurred menu header
// + scrolling list + loader/empty states); the body reuses the Favourite page's
// COLLAGE presentation via CreationCollageCard, so a saved remix reads the same
// as a saved outfit in collage mode.
export const MyCreationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { open: openSidebar } = useSidebar();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { scheduleOutfit } = useSchedule();
  // The creation awaiting a day in the "Add to Schedule" sheet (null = closed).
  const [scheduleTarget, setScheduleTarget] = useState<Creation | null>(null);

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
  });

  const creations = data?.creations ?? [];

  const handleSchedule = (creation: Creation) => {
    // Open the "Add to Schedule" sheet so the user picks which day.
    track('creation_schedule_opened', { creation_id: creation.id });
    setScheduleTarget(creation);
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
    Toast.show({
      type: 'success',
      text1: t('schedule.added_toast'),
      position: 'bottom',
    });
    setScheduleTarget(null);
    navigation.navigate('Schedule', { focusDate: dayKey });
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
            onRemove={id => removeMutation.mutate(id)}
            onSchedule={handleSchedule}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="my-creations-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Blurred bar background, same treatment as FavouriteScreen. Decorative
            — must not capture touches or it swallows the hamburger tap. */}
        <BlurView
          style={styles.headerBlur}
          blurType="light"
          blurAmount={8}
          reducedTransparencyFallbackColor={theme.colors.figmaItemDetailHeaderBg}
          pointerEvents="none"
        />
        <View style={styles.headerTint} pointerEvents="none" />
        <TopIconButton
          testID="my-creations-header-menu"
          accessibilityRole="button"
          accessibilityLabel={t('myCreations.open_menu')}
          onPress={openSidebar}
          style={styles.menuButton}
          icon={<IconMenu width={24} height={24} />}
        />
        <Text style={styles.headerTitle}>{t('myCreations.title')}</Text>
      </View>

      <View style={styles.body}>{renderBody()}</View>

      <ScheduleDatePickerSheet
        visible={scheduleTarget !== null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.uacDimension12,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.uacDimension12,
    overflow: 'hidden',
  },
  headerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    ...theme.ds.shadow.headerIcon,
  },
  headerTitle: {
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.uacTextBase,
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
