import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { MacgieLoader } from '../components/macgie';
import { AppStackParamList } from '../types/navigation';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import {
  HomeView,
  HomeViewToggleFooter,
} from '../components/features/HomeViewToggleFooter';
import { Icons } from '../assets/icons';
import { track } from '../services/analytics';
import { Favourite, favouriteService } from '../services/favouriteService';
import { FavouriteEmptyState } from './favourite/EmptyState';
import { FavouriteOutfitCard } from './favourite/FavouriteOutfitCard';
import { RemoveFavouriteDialog } from './favourite/RemoveFavouriteDialog';
import { groupFavouritesByDate } from './favourite/group-by-date';

const FAVOURITES_QUERY_KEY = ['favourites'] as const;

export const FavouriteScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();

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

  const handleSelfVisualization = (favourite: Favourite) => {
    // Build the serializable TryOnOutfitContext the "See this on me" flow needs
    // from the saved favourite: outfit hash, the garment ids + their image urls,
    // and the human-readable styling note.
    const items = favourite.outfit_items ?? [];
    navigation.navigate('SeeThisOnMe', {
      outfit: {
        outfitHash: favourite.outfit_context?.outfit_hash ?? favourite.id,
        itemIds: items.map(item => item.id),
        itemImageUrls: items
          .map(item => item.image_url)
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
      >
        {groups.map(group => (
          <View key={group.dayKey} style={styles.dateGroup}>
            <Text style={styles.dateLabel}>{group.label}</Text>
            {group.favourites.map(favourite => (
              <FavouriteOutfitCard
                key={favourite.id}
                favourite={favourite}
                view={view}
                onRemove={setPendingRemovalId}
                onSelfVisualization={handleSelfVisualization}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="favourite-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TopIconButton
          testID="favourite-back-button"
          accessibilityLabel={t('favourite.back')}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          icon={<Icons.ChevronLeft width={24} height={24} />}
        />
        <Text style={styles.title}>{t('favourite.title')}</Text>
        {/* Invisible spacer keeps the title optically centred (Figma header
            renders a 44×44 opacity-0 trailing slot). */}
        <View style={styles.headerSpacer} />
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.uacDimension12,
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
  },
  backButton: {
    backgroundColor: theme.colors.transparent,
  },
  title: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  // Match the 45×45 TopIconButton footprint so the title stays centred.
  headerSpacer: {
    width: 45,
    height: 45,
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
  dateLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
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
