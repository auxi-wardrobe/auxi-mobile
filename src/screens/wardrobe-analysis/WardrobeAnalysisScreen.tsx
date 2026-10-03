/**
 * Wardrobe Analysis (Figma "Analysis"). Reached from the Wardrobe grid's
 * "Analysis" chip.
 *
 *   - Stat tiles: total items + tops / bottoms / shoes / others.
 *   - Color distribution: stacked bar + the top colour families.
 *   - Item types: per-category subtype counts.
 *   - Skin tone: the user's self-reported tone, the colours that flatter it
 *     and tips; "change" opens the skin-tone sheet, whose portraits follow the
 *     user's wardrobe gender (men / women).
 *
 * Everything is computed client-side from the shared wardrobe list cache
 * (`wardrobeKeys.list('All')`), so arriving from Wardrobe renders instantly.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { MButton, toast } from '../../components/design-system/lib';
import { DotsLoader } from '../../components/atoms/DotsLoader';
import { useAuth } from '../../context/AuthContext';
import { useSkinTone } from '../../hooks/useSkinTone';
import { track } from '../../services/analytics';
import { wardrobeKeys, wardrobeService } from '../../services/wardrobeService';
import { theme } from '../../theme/theme';
import type { SkinToneId } from '../../content/skin-tones';
import type { AppStackParamList } from '../../types/navigation';
import {
  AnalysisStatTiles,
  ColorDistributionCard,
  ItemTypesCard,
} from './AnalysisCards';
import { SkinToneCard } from './SkinToneCard';
import { SkinToneSheet } from './SkinToneSheet';
import { resolveSkinToneGender } from './skin-tone-gender';
import {
  analysableItems,
  computeCategoryCounts,
  computeColorDistribution,
  computeItemTypes,
} from './wardrobe-analysis';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'WardrobeAnalysis'
>;

export const WardrobeAnalysisScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const gender = resolveSkinToneGender(user);
  const {
    skinTone,
    isLoading: skinToneLoading,
    setSkinTone,
    isSaving,
  } = useSkinTone();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Same query (key + fn) as the Wardrobe grid, so this reads its cache.
  const wardrobeQuery = useQuery({
    queryKey: wardrobeKeys.list('All'),
    queryFn: () => wardrobeService.getWardrobeItems(),
    staleTime: 60_000,
  });

  const items = useMemo(
    () => analysableItems(wardrobeQuery.data ?? []),
    [wardrobeQuery.data],
  );
  const counts = useMemo(() => computeCategoryCounts(items), [items]);
  const colorShares = useMemo(() => computeColorDistribution(items), [items]);
  const itemTypes = useMemo(() => computeItemTypes(items), [items]);

  // One `wardrobe_analysis_viewed` per visit, once the numbers are known.
  const trackedView = useRef(false);
  useEffect(() => {
    if (trackedView.current || !wardrobeQuery.data || skinToneLoading) return;
    trackedView.current = true;
    track('wardrobe_analysis_viewed', {
      item_count: counts.total,
      color_family_count: colorShares.length,
      has_skin_tone: skinTone !== null,
      skin_tone_variant: gender,
    });
  }, [
    wardrobeQuery.data,
    skinToneLoading,
    counts.total,
    colorShares.length,
    skinTone,
    gender,
  ]);

  const openSheet = () => {
    track('skin_tone_sheet_opened', {
      skin_tone_variant: gender,
      ...(skinTone ? { current_skin_tone: skinTone } : {}),
    });
    setSheetVisible(true);
  };

  const applySkinTone = async (next: SkinToneId) => {
    if (next === skinTone) {
      setSheetVisible(false);
      return;
    }
    try {
      await setSkinTone(next);
      track('skin_tone_selected', {
        skin_tone: next,
        skin_tone_variant: gender,
        ...(skinTone ? { previous_skin_tone: skinTone } : {}),
      });
      setSheetVisible(false);
    } catch {
      toast.show({
        type: 'error',
        text1: t('wardrobe.analysis.sheet.save_error'),
        position: 'bottom',
      });
    }
  };

  const renderBody = () => {
    if (wardrobeQuery.isLoading) {
      return (
        <View style={styles.centerState} testID="analysis-loading">
          <DotsLoader color={theme.colors.figmaAction} />
        </View>
      );
    }
    if (wardrobeQuery.isError && !wardrobeQuery.data) {
      return (
        <View style={styles.centerState} testID="analysis-error-state">
          <Text style={styles.stateTitle}>
            {t('common.load_wardrobe_failed_title')}
          </Text>
          <Text style={styles.stateBody}>{t('wardrobe.list.error_body')}</Text>
          <MButton
            variant="secondary"
            onPress={() => wardrobeQuery.refetch()}
            testID="analysis-error-retry"
            accessibilityLabel={t('wardrobe.analysis.a11y_retry')}
          >
            {t('wardrobe.analysis.retry')}
          </MButton>
        </View>
      );
    }
    return (
      <>
        <AnalysisStatTiles counts={counts} />
        {counts.total === 0 ? (
          <Text style={styles.stateBody} testID="analysis-empty">
            {t('wardrobe.analysis.empty_body')}
          </Text>
        ) : (
          <>
            <ColorDistributionCard shares={colorShares} />
            <ItemTypesCard groups={itemTypes} />
          </>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('wardrobe.analysis.title')}
        leftTestID="analysis-back"
        leftAccessibilityLabel={t('uac.common.back')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="analysis-scroll"
      >
        {renderBody()}
        <SkinToneCard
          skinTone={skinTone}
          gender={gender}
          onChange={openSheet}
        />
      </ScrollView>

      <SkinToneSheet
        visible={sheetVisible}
        gender={gender}
        value={skinTone}
        saving={isSaving}
        onDismiss={() => setSheetVisible(false)}
        onApply={applySkinTone}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.l,
  },
  centerState: {
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.xl,
  },
  stateTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  stateBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
