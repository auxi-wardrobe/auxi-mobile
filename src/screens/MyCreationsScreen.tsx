import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { useCreationsSeen } from '../context/CreationsSeenContext';
import { MacgieLoader } from '../components/macgie';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import { AppStackParamList } from '../types/navigation';
import { Icons } from '../assets/icons';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
import { track } from '../services/analytics';
import {
  CREATIONS_QUERY_KEY,
  creationsService,
} from '../services/creationsService';
import { CreationCollageCard } from './myCreations/CreationCollageCard';
import { RemoveCreationDialog } from './myCreations/RemoveCreationDialog';

// "My Creations" — the saved-canvas list reached from the canvas header's
// My Creations icon. Structurally mirrors FavouriteScreen (blurred menu header
// + scrolling list + loader/empty states); the body reuses the Favourite page's
// COLLAGE presentation via CreationCollageCard, so a saved remix reads the same
// as a saved outfit in collage mode.
export const MyCreationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { markSeen: markCreationsSeen } = useCreationsSeen();

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
    onSettled: () => setPendingRemovalId(null),
  });

  const confirmRemove = () => {
    if (pendingRemovalId) {
      removeMutation.mutate(pendingRemovalId);
    }
  };

  const creations = data?.creations ?? [];

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
        {/* Back chevron — My Creations is pushed from the canvas header, so the
            leading control returns to the previous screen rather than opening
            the sidebar. */}
        <TopIconButton
          testID="my-creations-header-back"
          accessibilityRole="button"
          accessibilityLabel={t('myCreations.back')}
          onPress={() => navigation.goBack()}
          style={styles.menuButton}
          icon={<Icons.ChevronLeft width={24} height={24} />}
        />
        {/* Centred screen title — matches the Wardrobe/Favourite header title
            (body/sm semibold). Absolutely centred + pointerEvents none so it
            stays optically centred and never swallows the hamburger tap. */}
        <Text
          style={[styles.headerTitle, { top: insets.top + 8 }]}
          testID="my-creations-header-title"
          pointerEvents="none"
        >
          {t('myCreations.title')}
        </Text>
      </View>

      <View style={styles.body}>{renderBody()}</View>

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
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
    position: 'absolute',
    left: 0,
    right: 0,
    // `top` is supplied inline (insets.top + 8) to match the header paddingTop;
    // height 44 + line centering aligns the title with the 44×44 hamburger.
    height: 44,
    lineHeight: 44,
    textAlign: 'center',
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
