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
import { useAddCapsuleItems, useAddFromOutfits } from './hooks';
import { creationWardrobeItemIds } from './capsule-format';
import { toastCapsuleNetworkError } from './capsule-toast';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleSelectOutfits'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleSelectOutfits'>;

/** Normalised selectable-outfit row (favourite or creation). */
interface OutfitRow {
  id: string;
  thumbUris: string[];
  /** Wardrobe item ids behind the outfit — empty ⇒ nothing addable. */
  itemIds: string[];
}

/**
 * "My Favourites" / "My Creations" picker — a full PAGE reached from the
 * capsule add-source sheet.
 *
 * The two sources add along DIFFERENT paths, deliberately:
 *
 *  • favourites — server outfit records, so `POST /items/from-outfits` lets the
 *    backend extract the items AND build new capsule outfits from them.
 *  • creations — canvas layouts, NOT server outfits. A creation's items carry a
 *    synthetic canvas id (`item-<wardrobeId>-<stamp>-<i>`) with the real
 *    wardrobe id in `wardrobeItemId`, and a creation saved while the server was
 *    unreachable lives on-device only with a client-generated id the backend
 *    has never seen. Sending those ids to from-outfits resolves nothing, which
 *    is why "add from My Creations" silently added zero items. So we resolve
 *    the wardrobe ids on the client — exactly like My Creations and Schedule do
 *    (`resolveWardrobeItemId`) — and add them via the plain `POST /items`
 *    endpoint the wardrobe picker already uses.
 */
export const CapsuleSelectOutfitsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId, source } = route.params;
  const isCreations = source === 'creations';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addFromOutfits = useAddFromOutfits(capsuleId);
  const addItems = useAddCapsuleItems(capsuleId);
  const busy = addFromOutfits.isPending || addItems.isPending;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['capsule-outfit-picker', source],
    queryFn: async (): Promise<OutfitRow[]> => {
      if (!isCreations) {
        const res = await favouriteService.listFavourites();
        return res.favorites.map(fav => ({
          id: fav.id,
          thumbUris: fav.outfit_items
            .map(item => resolveItemImage(item))
            .filter((u): u is string => !!u),
          itemIds: fav.outfit_items.map(item => item.id).filter(Boolean),
        }));
      }
      const res = await creationsService.listCreations();
      return res.creations.map(creation => ({
        id: creation.id,
        thumbUris: creation.items.map(i => i.imageUri).filter(Boolean),
        itemIds: creationWardrobeItemIds(creation),
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

  const title = isCreations
    ? t('capsule.source_creations')
    : t('capsule.source_favourites');

  const onAdded = (result: AddItemsResult) => {
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
            ? t('capsule.add_fav_existed', { existed: result.already_existed })
            : undefined,
      });
    }
    navigation.goBack();
  };

  const handleConfirm = () => {
    const chosen = rows.filter(row => selected.has(row.id));
    if (chosen.length === 0 || busy) {
      return;
    }

    if (isCreations) {
      const itemIds = Array.from(
        new Set(chosen.flatMap(row => row.itemIds)),
      );
      if (itemIds.length === 0) {
        toast.show({ type: 'info', text1: t('capsule.creation_no_items') });
        return;
      }
      addItems.mutate(itemIds, {
        onSuccess: onAdded,
        onError: () => toastCapsuleNetworkError(t),
      });
      return;
    }

    addFromOutfits.mutate(
      { source, outfitIds: chosen.map(row => row.id) },
      { onSuccess: onAdded, onError: () => toastCapsuleNetworkError(t) },
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
            // Nothing resolvable (e.g. a creation whose pieces were deleted
            // from the wardrobe) — say so instead of adding zero items.
            const unusable = row.itemIds.length === 0;
            return (
              <Pressable
                key={row.id}
                onPress={unusable ? undefined : () => toggle(row.id)}
                disabled={unusable}
                testID={
                  isSelected
                    ? `capsule-select-outfit-${row.id}-selected`
                    : `capsule-select-outfit-${row.id}`
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: unusable }}
                accessibilityLabel={title}
                style={[
                  styles.row,
                  isSelected && styles.rowSelected,
                  unusable && styles.rowUnusable,
                ]}
              >
                {row.thumbUris.slice(0, 4).map((uri, i) => (
                  <Image
                    key={`${row.id}-${i}`}
                    source={{ uri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ))}
                {unusable && (
                  <Text style={styles.rowUnusableText}>
                    {t('capsule.creation_no_items')}
                  </Text>
                )}
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
          loading={busy}
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
    alignItems: 'center',
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
  rowUnusable: {
    opacity: 0.5,
  },
  rowUnusableText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
    flex: 1,
  },
  thumb: {
    width: 72,
    height: 96,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
  },
});
