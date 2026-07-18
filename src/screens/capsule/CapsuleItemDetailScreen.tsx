import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/layout/Header';
import { MButton, MDialog, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import {
  trackCapsuleItemChanged,
  trackCapsuleItemRemoved,
} from '../../services/analytics';
import type { CapsuleChangeScope } from '../../services/capsuleService';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsule, useChangeCapsuleItem, useRemoveCapsuleItem } from './hooks';
import { resolveWardrobeItemImage } from './capsule-format';
import { ChangeScopeDialog } from './components/ChangeScopeDialog';
import { SelectWardrobeItemsSheet } from './components/SelectWardrobeItemsSheet';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleItemDetail'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleItemDetail'>;

const EMPTY_EXISTING = new Set<string>();

export const CapsuleItemDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId, itemId } = route.params;

  const { data: capsule, isLoading } = useCapsule(capsuleId);
  const removeItem = useRemoveCapsuleItem(capsuleId);
  const changeItem = useChangeCapsuleItem(capsuleId);

  const [replaceVisible, setReplaceVisible] = useState(false);
  const [scopeVisible, setScopeVisible] = useState(false);
  const [removeUsedVisible, setRemoveUsedVisible] = useState(false);
  const [replacementId, setReplacementId] = useState<string | null>(null);

  const item = useMemo(
    () => capsule?.items.find(it => it.id === itemId),
    [capsule, itemId],
  );

  // Which capsule outfits use this item — drives "used in N outfits" + the
  // remove path (unused → immediate; used → confirm modal).
  const outfitsUsing = useMemo(
    () => (capsule?.outfits ?? []).filter(o => o.item_ids.includes(itemId)),
    [capsule, itemId],
  );
  const usedCount = outfitsUsing.length;

  const excludeSelf = useMemo(() => new Set([itemId]), [itemId]);

  const onRemoveSuccess = (unused: boolean) => {
    trackCapsuleItemRemoved(usedCount);
    toast.success(
      unused ? t('capsule.remove_unused_toast') : t('capsule.removed_toast'),
    );
    setRemoveUsedVisible(false);
    navigation.goBack();
  };

  const handleRemovePress = () => {
    if (usedCount === 0) {
      removeItem.mutate(itemId, {
        onSuccess: () => onRemoveSuccess(true),
        onError: () =>
          toast.show({ type: 'error', text1: t('capsule.network_error') }),
      });
    } else {
      setRemoveUsedVisible(true);
    }
  };

  const confirmRemoveUsed = () =>
    removeItem.mutate(itemId, {
      onSuccess: () => onRemoveSuccess(false),
      onError: () =>
        toast.show({ type: 'error', text1: t('capsule.network_error') }),
    });

  const handlePickReplacement = (itemIds: string[]) => {
    if (itemIds.length === 0) {
      return;
    }
    setReplacementId(itemIds[0]);
    setReplaceVisible(false);
    setScopeVisible(true);
  };

  const handleConfirmChange = (scope: CapsuleChangeScope) => {
    if (!replacementId) {
      return;
    }
    changeItem.mutate(
      {
        itemId,
        replacementItemId: replacementId,
        scope,
        outfitId: scope === 'outfit' ? outfitsUsing[0]?.id : undefined,
      },
      {
        onSuccess: () => {
          trackCapsuleItemChanged(scope);
          toast.success(t('capsule.changed_toast'));
          setScopeVisible(false);
          navigation.goBack();
        },
        onError: () =>
          toast.show({ type: 'error', text1: t('capsule.network_error') }),
      },
    );
  };

  const uri = item ? resolveWardrobeItemImage(item) : undefined;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={item?.name ?? t('capsule.title')}
        leftTestID="capsule-item-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
      />

      {isLoading || !item ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="capsule-item-loading" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {uri ? (
            <Image source={{ uri }} style={s.itemDetailImage} />
          ) : (
            <View style={s.itemDetailImage} />
          )}
          <Text style={s.itemDetailName}>{item.name ?? item.category}</Text>
          <Text style={s.detailMeta}>
            {t('capsule.item_used_in', { count: usedCount })}
          </Text>

          <View style={s.itemDetailActions}>
            <View style={s.flex1}>
              <MButton
                variant="secondary"
                onPress={() => setReplaceVisible(true)}
                testID="capsule-item-change"
              >
                {t('capsule.item_change_cta')}
              </MButton>
            </View>
            <View style={s.flex1}>
              <MButton
                variant="dangerOutline"
                onPress={handleRemovePress}
                loading={removeItem.isPending && !removeUsedVisible}
                testID="capsule-item-remove"
              >
                {t('capsule.item_remove_cta')}
              </MButton>
            </View>
          </View>
        </ScrollView>
      )}

      <SelectWardrobeItemsSheet
        visible={replaceVisible}
        mode="single"
        existingItemIds={EMPTY_EXISTING}
        excludeItemIds={excludeSelf}
        confirmLabel={t('capsule.change')}
        onDismiss={() => setReplaceVisible(false)}
        onConfirm={handlePickReplacement}
      />

      <ChangeScopeDialog
        visible={scopeVisible}
        busy={changeItem.isPending}
        onCancel={() => setScopeVisible(false)}
        onConfirm={handleConfirmChange}
      />

      <MDialog
        visible={removeUsedVisible}
        title={t('capsule.remove_used_title')}
        message={t('capsule.remove_used_msg', { count: usedCount })}
        confirmLabel={t('capsule.remove')}
        cancelLabel={t('capsule.cancel')}
        destructive
        busy={removeItem.isPending}
        onConfirm={confirmRemoveUsed}
        onCancel={() => setRemoveUsedVisible(false)}
        testID="capsule-remove-used-dialog"
      />
    </SafeAreaView>
  );
};
