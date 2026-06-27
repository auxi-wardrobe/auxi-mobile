import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { useSidebar } from '../context/SidebarContext';
import { MacgieLoader } from '../components/macgie';
import { Header } from '../components/layout/Header';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
import { track } from '../services/analytics';
import {
  CREATIONS_QUERY_KEY,
  creationsService,
} from '../services/creationsService';
import { CreationCollageCard } from './myCreations/CreationCollageCard';

// "My Creations" — the saved-canvas list reached from the canvas header's
// My Creations icon. Structurally mirrors FavouriteScreen (blurred menu header
// + scrolling list + loader/empty states); the body reuses the Favourite page's
// COLLAGE presentation via CreationCollageCard, so a saved remix reads the same
// as a saved outfit in collage mode.
export const MyCreationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { open: openSidebar } = useSidebar();

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
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="my-creations-screen">
      <Header.MenuTitle
        title={t('myCreations.title')}
        background="blur"
        safeAreaTop
        leftTestID="my-creations-header-menu"
        leftAccessibilityLabel={t('myCreations.open_menu')}
        onBack={openSidebar}
      />

      <View style={styles.body}>{renderBody()}</View>
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
