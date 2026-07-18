import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/layout/Header';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { MButton } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { Icons } from '../../assets/icons';
import { useSidebar } from '../../context/SidebarContext';
import { trackCapsuleCreationStarted } from '../../services/analytics';
import type { AppStackParamList } from '../../types/navigation';
import type { Capsule } from '../../services/capsuleService';
import { useCapsules } from './hooks';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleWardrobe'>;

export const CapsuleWardrobeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { open: openSidebar } = useSidebar();
  const { data: capsules = [], isLoading } = useCapsules();

  const startCreate = () => {
    trackCapsuleCreationStarted('list');
    navigation.navigate('CapsuleCreate');
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.MenuTitleAction
        title={t('capsule.title')}
        leftTestID="capsule-menu-button"
        leftAccessibilityLabel={t('capsule.a11y_open_menu')}
        onBack={openSidebar}
        right={
          <TopIconButton
            onPress={startCreate}
            testID="capsule-list-add"
            accessibilityLabel={t('capsule.create_cta')}
            icon={<Icons.Plus width={24} height={24} />}
          />
        }
      />

      {isLoading ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="capsule-list-loading" />
        </View>
      ) : capsules.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>{t('capsule.empty_title')}</Text>
          <Text style={s.emptyBody}>{t('capsule.empty_body')}</Text>
          <MButton
            variant="primary"
            onPress={startCreate}
            testID="capsule-empty-create"
          >
            {t('capsule.create_cta')}
          </MButton>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {capsules.map(capsule => (
            <CapsuleListRow
              key={capsule.id}
              capsule={capsule}
              onPress={() =>
                navigation.navigate('CapsuleDetail', {
                  capsuleId: capsule.id,
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const CapsuleListRow: React.FC<{
  capsule: Capsule;
  onPress: () => void;
}> = ({ capsule, onPress }) => {
  const { t } = useTranslation();
  return (
    <Pressable
      style={s.card}
      onPress={onPress}
      testID={`capsule-list-card-${capsule.id}`}
      accessibilityRole="button"
      accessibilityLabel={capsule.name}
    >
      <Text style={s.cardTitle}>{capsule.name}</Text>
      <Text style={s.cardMeta}>
        {t('capsule.items_count', { count: capsule.item_count })} ·{' '}
        {t('capsule.outfits_count', { count: capsule.outfit_count })}
      </Text>
    </Pressable>
  );
};
