import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/layout/Header';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { MButton, MDialog, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { Icons } from '../../assets/icons';
import {
  trackCapsuleDeleted,
  trackCapsuleViewedOnce,
} from '../../services/analytics';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsule, useDeleteCapsule, useRetryGeneration } from './hooks';
import { capsuleItemIdSet, categoryRows } from './capsule-format';
import { CapsuleItemTile } from './components/CapsuleItemTile';
import { CapsuleSummaryPanel } from './components/CapsuleSummaryPanel';
import { GapsBanner } from './components/GapsBanner';
import { CapsuleAddFlow } from './components/CapsuleAddFlow';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleDetail'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleDetail'>;

const COLUMNS = 4;
const GAP = 8;

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  outer: 'capsule.cat_outer',
  top: 'capsule.cat_top',
  bottom: 'capsule.cat_bottom',
  footwear: 'capsule.cat_footwear',
  accessory: 'capsule.cat_accessory',
};

export const CapsuleDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId } = route.params;

  const { data: capsule, isLoading } = useCapsule(capsuleId);
  const deleteCapsule = useDeleteCapsule();
  const retry = useRetryGeneration(capsuleId);

  const [addVisible, setAddVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useEffect(() => {
    if (capsule) {
      trackCapsuleViewedOnce(capsule.id, {
        item_count: capsule.item_count,
        outfit_count: capsule.outfit_count,
      });
    }
  }, [capsule]);

  const tileSize = useMemo(() => {
    const width = Dimensions.get('window').width - 16 * 2;
    return Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  }, []);

  const existingItemIds = useMemo(
    () => capsuleItemIdSet(capsule),
    [capsule],
  );

  const handleDelete = () => {
    deleteCapsule.mutate(capsuleId, {
      onSuccess: () => {
        trackCapsuleDeleted();
        toast.success(t('capsule.deleted_toast'));
        setDeleteVisible(false);
        navigation.goBack();
      },
      onError: () =>
        toast.show({ type: 'error', text1: t('capsule.network_error') }),
    });
  };

  const rows = categoryRows(capsule?.category_groups);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={capsule?.name ?? t('capsule.title')}
        leftTestID="capsule-detail-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
        right={
          <TopIconButton
            onPress={() => setAddVisible(true)}
            testID="capsule-detail-add"
            accessibilityLabel={t('capsule.add')}
            icon={<Icons.Plus width={24} height={24} />}
          />
        }
      />

      {isLoading || !capsule ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="capsule-detail-loading" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.detailName}>{capsule.name}</Text>
          <Text style={s.detailMeta}>
            {t('capsule.items_count', { count: capsule.item_count })} ·{' '}
            {t('capsule.outfits_count', { count: capsule.outfit_count })}
          </Text>

          {capsule.status === 'failed' && (
            <MButton
              variant="primary"
              onPress={() => retry.mutate()}
              loading={retry.isPending}
              testID="capsule-detail-retry"
            >
              {t('capsule.retry')}
            </MButton>
          )}

          <GapsBanner capsule={capsule} />
          <CapsuleSummaryPanel capsule={capsule} />

          {rows.length > 0 && (
            <>
              <Text style={s.sectionTitle}>{t('capsule.section_items')}</Text>
              {rows.map(row => (
                <Text
                  key={row.key}
                  style={s.summaryLabel}
                  testID={`capsule-detail-group-${row.key}`}
                >
                  {t(CATEGORY_LABEL_KEYS[row.key])}: {row.count}
                </Text>
              ))}
            </>
          )}

          <View style={[s.grid, { marginTop: GAP }]}>
            {capsule.items.map(item => (
              <CapsuleItemTile
                key={item.id}
                item={item}
                size={tileSize}
                onPress={() =>
                  navigation.navigate('CapsuleItemDetail', {
                    capsuleId,
                    itemId: item.id,
                  })
                }
                testID={`capsule-detail-item-${item.id}`}
              />
            ))}
          </View>

          <View style={s.deleteWrap}>
            <MButton
              variant="dangerOutline"
              onPress={() => setDeleteVisible(true)}
              testID="capsule-detail-delete"
            >
              {t('capsule.delete_title')}
            </MButton>
          </View>
        </ScrollView>
      )}

      <CapsuleAddFlow
        capsuleId={capsuleId}
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        existingItemIds={existingItemIds}
      />

      <MDialog
        visible={deleteVisible}
        title={t('capsule.delete_title')}
        message={t('capsule.delete_msg')}
        confirmLabel={t('capsule.delete')}
        cancelLabel={t('capsule.cancel')}
        destructive
        busy={deleteCapsule.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
        testID="capsule-delete-dialog"
      />
    </SafeAreaView>
  );
};
