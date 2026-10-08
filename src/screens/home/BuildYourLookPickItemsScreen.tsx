import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { CategoryTabs } from '../../components/features/CategoryTabs';
import { MButton, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { track } from '../../services/analytics';
import { BUILD_LOOK_MAX_ITEMS } from '../../services/buildAroundMatchService';
import { wardrobeKeys, wardrobeService } from '../../services/wardrobeService';
import type { AppStackParamList } from '../../types/navigation';
import { capsuleTileSize } from '../capsule/capsule-format';
import { CapsuleItemTile } from '../capsule/components/CapsuleItemTile';
import { capsuleStyles as s } from '../capsule/styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'BuildYourLookPickItems'>;
type Rt = RouteProp<AppStackParamList, 'BuildYourLookPickItems'>;

// Same 3-up 3:4 picker grid as the capsule "My Wardrobe" page, so picking an
// item for a look feels like picking one for a capsule.
const COLUMNS = 3;
const GAP = 8;
const H_PADDING = 16;
const ALL = 'All';

/**
 * Home "Build your look" → "Add item": the user's wardrobe as a full-page
 * multi-select picker. Items already on the Home section are dimmed and
 * tagged "Added"; the pick is capped at the room left under
 * `BUILD_LOOK_MAX_ITEMS`. Confirm hands the chosen ids back to HomeLanding
 * (`navigate` + `merge` onto the route already in the stack pops back to it)
 * — the picker never owns the look.
 */
export const BuildYourLookPickItemsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { selectedIds } = useRoute<Rt>().params;
  const alreadyAdded = useMemo(() => new Set(selectedIds), [selectedIds]);
  const room = Math.max(0, BUILD_LOOK_MAX_ITEMS - alreadyAdded.size);

  const [picked, setPicked] = useState<string[]>([]);
  const [category, setCategory] = useState(ALL);

  const { data: items = [], isLoading } = useQuery({
    queryKey: wardrobeKeys.list(),
    queryFn: wardrobeService.getWardrobeItems,
  });

  const categories = useMemo(() => {
    const seen = new Set<string>();
    items.forEach(item => {
      if (item.category) seen.add(item.category);
    });
    return [ALL, ...seen];
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter(
        item => !item.is_deleted && (category === ALL || item.category === category),
      ),
    [items, category],
  );

  const tileSize = useMemo(
    () => capsuleTileSize(Dimensions.get('window').width, COLUMNS, GAP, H_PADDING),
    [],
  );

  const toggle = (id: string) => {
    setPicked(prev => {
      if (prev.includes(id)) {
        return prev.filter(other => other !== id);
      }
      if (prev.length >= room) {
        toast.show({
          type: 'info',
          text1: t('homeLanding.build_look_pick_limit', { count: BUILD_LOOK_MAX_ITEMS }),
          position: 'bottom',
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const confirm = () => {
    if (picked.length === 0) return;
    track('home_build_look_items_added', {
      added_count: picked.length,
      item_count: alreadyAdded.size + picked.length,
    });
    navigation.navigate({
      name: 'HomeLanding',
      params: { buildLookAddItemIds: picked },
      merge: true,
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']} testID="home-build-look-pick">
      <Header.BackTitle
        title={t('homeLanding.build_look_pick_title')}
        leftTestID="home-build-look-pick-back"
        leftAccessibilityLabel={t('uac.common.back')}
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="home-build-look-pick-loading" />
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyWrap} testID="home-build-look-pick-empty">
          <Text style={s.emptyTitle}>{t('homeLanding.build_look_pick_empty')}</Text>
        </View>
      ) : (
        <>
          <CategoryTabs
            categories={categories}
            selectedCategory={category}
            onSelectCategory={setCategory}
          />
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.grid}>
              {visible.map(item => (
                <CapsuleItemTile
                  key={item.id}
                  item={item}
                  size={tileSize}
                  selected={picked.includes(item.id)}
                  disabled={alreadyAdded.has(item.id)}
                  alreadyLabel={t('homeLanding.build_look_pick_added')}
                  onPress={() => toggle(item.id)}
                  testID={`home-build-look-pick-item-${item.id}`}
                />
              ))}
            </View>
          </ScrollView>
        </>
      )}

      <View style={s.footerCta}>
        <MButton
          variant="primary"
          onPress={confirm}
          disabled={picked.length === 0}
          testID="home-build-look-pick-confirm"
        >
          {t('homeLanding.build_look_pick_confirm')}
        </MButton>
      </View>
    </SafeAreaView>
  );
};
