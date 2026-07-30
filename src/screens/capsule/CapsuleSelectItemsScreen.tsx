import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { MButton, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { trackCapsuleItemsAdded } from '../../services/analytics';
import { wardrobeKeys, wardrobeService } from '../../services/wardrobeService';
import type { AddItemsResult } from '../../services/capsuleService';
import type { AppStackParamList } from '../../types/navigation';
import { useAddCapsuleItems, useCapsule } from './hooks';
import { capsuleItemIdSet, capsuleTileSize } from './capsule-format';
import { toastCapsuleNetworkError } from './capsule-toast';
import { CapsuleItemTile } from './components/CapsuleItemTile';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleSelectItems'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleSelectItems'>;

// Full-page picker grid: 3-up 3:4 cards on a 16pt gutter, matching the
// Wardrobe page's proportions (the sheet version was a cramped 4-up).
const COLUMNS = 3;
const GAP = 8;
const H_PADDING = 16;

/**
 * "My Wardrobe" picker — a full PAGE (not a sheet) reached from the capsule
 * add-source sheet, so the user browses their wardrobe with room to see it.
 *
 * Two modes:
 *  • `add` (default) — multi-select. Items already in the capsule are dimmed +
 *    tagged and can't be re-picked (the backend dedups again). Confirm adds
 *    them and returns to the capsule.
 *  • `replace` — single-select for the change-item flow. Confirm hands the
 *    chosen id back to CapsuleItemDetail (which owns the scope dialog) rather
 *    than mutating here.
 */
export const CapsuleSelectItemsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId, mode = 'add', itemId } = route.params;
  const isReplace = mode === 'replace';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: capsule } = useCapsule(capsuleId);
  const addItems = useAddCapsuleItems(capsuleId);

  const { data: items = [], isLoading } = useQuery({
    queryKey: wardrobeKeys.list(),
    queryFn: wardrobeService.getWardrobeItems,
  });

  const tileSize = useMemo(
    () =>
      capsuleTileSize(Dimensions.get('window').width, COLUMNS, GAP, H_PADDING),
    [],
  );

  // Add mode dims what's already in the capsule; replace mode only needs to
  // exclude the item being swapped out.
  const existingItemIds = useMemo(
    () => (isReplace ? new Set<string>() : capsuleItemIdSet(capsule)),
    [capsule, isReplace],
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      if (isReplace) {
        return prev.has(id) ? new Set() : new Set([id]);
      }
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      return;
    }

    // Replace: hand the pick back to CapsuleItemDetail — `navigate` with the
    // route already in the stack pops back to it and merges the param.
    if (isReplace) {
      navigation.navigate({
        name: 'CapsuleItemDetail',
        params: { capsuleId, itemId: itemId ?? '', replacementItemId: ids[0] },
        merge: true,
      });
      return;
    }

    addItems.mutate(ids, {
      onSuccess: (result: AddItemsResult) => {
        trackCapsuleItemsAdded({
          source: 'wardrobe',
          items_added: result.items_added,
          new_outfits: result.new_outfits,
          already_existed: result.already_existed,
        });
        toast.show({
          type: 'success',
          text1: t('capsule.add_wardrobe_items', { items: result.items_added }),
          text2: t('capsule.add_wardrobe_outfits', {
            outfits: result.new_outfits,
          }),
        });
        navigation.goBack();
      },
      onError: () => toastCapsuleNetworkError(t),
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={t('capsule.source_wardrobe')}
        leftTestID="capsule-select-items-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="capsule-select-loading" />
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>{t('capsule.select_items_empty')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.grid}>
            {items.map(item => (
              <CapsuleItemTile
                key={item.id}
                item={item}
                size={tileSize}
                selected={selected.has(item.id)}
                disabled={
                  existingItemIds.has(item.id) ||
                  (isReplace && item.id === itemId)
                }
                alreadyLabel={t('capsule.already_in_capsule')}
                onPress={() => toggle(item.id)}
                testID={`capsule-select-item-${item.id}`}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <View style={s.footerCta}>
        <MButton
          variant="primary"
          onPress={handleConfirm}
          disabled={selected.size === 0}
          loading={addItems.isPending}
          testID="capsule-select-items-confirm"
        >
          {isReplace ? t('capsule.change') : t('capsule.confirm_add')}
        </MButton>
      </View>
    </SafeAreaView>
  );
};
