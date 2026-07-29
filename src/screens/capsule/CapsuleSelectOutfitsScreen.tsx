import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { MButton, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { theme } from '../../theme/theme';
import { trackCapsuleItemsAdded } from '../../services/analytics';
import { favouriteService } from '../../services/favouriteService';
import { creationsService } from '../../services/creationsService';
import { resolveItemImage } from '../../utils/url';
import type { AddItemsResult } from '../../services/capsuleService';
import type { AppStackParamList } from '../../types/navigation';
import { useAddFromOutfits } from './hooks';
import { toastCapsuleNetworkError } from './capsule-toast';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleSelectOutfits'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleSelectOutfits'>;

/** Normalised selectable-outfit row (favourite or creation). */
interface OutfitRow {
  id: string;
  thumbUris: string[];
}

/**
 * "My Favourites" / "My Creations" picker — a full PAGE (not a sheet) reached
 * from the capsule add-source sheet. Multi-select saved outfits; confirm sends
 * the outfit ids up to the backend, which extracts + dedups their items into
 * the capsule, then returns to the capsule.
 */
export const CapsuleSelectOutfitsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId, source } = route.params;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addFromOutfits = useAddFromOutfits(capsuleId);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['capsule-outfit-picker', source],
    queryFn: async (): Promise<OutfitRow[]> => {
      if (source === 'favourites') {
        const res = await favouriteService.listFavourites();
        return res.favorites.map(fav => ({
          id: fav.id,
          thumbUris: fav.outfit_items
            .map(item => resolveItemImage(item))
            .filter((u): u is string => !!u),
        }));
      }
      const res = await creationsService.listCreations();
      return res.creations.map(creation => ({
        id: creation.id,
        thumbUris: creation.items.map(i => i.imageUri).filter(Boolean),
      }));
    },
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const title =
    source === 'favourites'
      ? t('capsule.source_favourites')
      : t('capsule.source_creations');

  const handleConfirm = () => {
    const outfitIds = Array.from(selected);
    if (outfitIds.length === 0) {
      return;
    }
    addFromOutfits.mutate(
      { source, outfitIds },
      {
        onSuccess: (result: AddItemsResult) => {
          trackCapsuleItemsAdded({
            source,
            items_added: result.items_added,
            new_outfits: result.new_outfits,
            already_existed: result.already_existed,
          });
          if (result.items_added === 0 && result.new_outfits === 0) {
            toast.show({ type: 'info', text1: t('capsule.all_existing') });
          } else {
            toast.show({
              type: 'success',
              text1: t('capsule.add_fav_items', { items: result.items_added }),
              text2:
                result.new_outfits > 0
                  ? t('capsule.add_fav_outfits', { outfits: result.new_outfits })
                  : result.already_existed > 0
                  ? t('capsule.add_fav_existed', {
                      existed: result.already_existed,
                    })
                  : undefined,
            });
          }
          navigation.goBack();
        },
        onError: () => toastCapsuleNetworkError(t),
      },
    );
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={title}
        leftTestID="capsule-select-outfits-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="capsule-outfits-loading" />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>{t('capsule.select_outfits_empty')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {rows.map(row => {
            const isSelected = selected.has(row.id);
            return (
              <Pressable
                key={row.id}
                onPress={() => toggle(row.id)}
                testID={
                  isSelected
                    ? `capsule-select-outfit-${row.id}-selected`
                    : `capsule-select-outfit-${row.id}`
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={title}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                {row.thumbUris.slice(0, 4).map((uri, i) => (
                  <Image
                    key={`${row.id}-${i}`}
                    source={{ uri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ))}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={s.footerCta}>
        <MButton
          variant="primary"
          onPress={handleConfirm}
          disabled={selected.size === 0}
          loading={addFromOutfits.isPending}
          testID="capsule-select-outfits-confirm"
        >
          {t('capsule.confirm_add')}
        </MButton>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.figmaTile,
    marginBottom: theme.spacing.s,
    backgroundColor: theme.colors.figmaCardSurface,
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaTextDark,
  },
  thumb: {
    width: 72,
    height: 96,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
  },
});
