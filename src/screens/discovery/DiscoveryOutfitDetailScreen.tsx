import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/layout/Header';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { toast } from '../../components/design-system/lib';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { AppStackParamList } from '../../types/navigation';
import { useDiscoveryOutfit } from '../../hooks/useDiscovery';
import { DiscoveryItemStrip } from './DiscoveryItemStrip';
import { DiscoveryOutfitSummary } from './DiscoveryOutfitSummary';
import {
  DiscoveryDetailError,
  DiscoveryDetailLoading,
  DiscoveryDetailUnavailable,
} from './DiscoveryDetailStates';
import { discoveryOutfitDetailStyles as styles } from './discoveryOutfitDetailStyles';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'DiscoveryOutfitDetail'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'DiscoveryOutfitDetail'>;

const STICKY_CTA_HEIGHT = 88;

export const DiscoveryOutfitDetailScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const { outfitId, source } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const outfitQuery = useDiscoveryOutfit(outfitId);
  const outfit = outfitQuery.data;
  const loading = outfitQuery.isLoading;
  // `data === null` (not undefined) is the 404 signal from
  // `discoveryService.getOutfit` — missing OR unpublished, indistinguishable
  // by design (backend §Discovery). `isError` is a genuine transport failure.
  const notFound = !loading && !outfitQuery.isError && outfit === null;

  // Phase 09: only a `discovery-outfit` deep link sets `source: 'deep_link'`
  // — a feed-card tap already fires `discovery_outfit_opened` (phase 07), so
  // this fires once per outfit id, only for the deep-link entry, once the
  // fetch has settled either way (`resolved: false` covers both the 404 and
  // the transport-error branch — the link simply didn't land the user on a
  // real outfit).
  const deepLinkTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (source !== 'deep_link' || loading) {
      return;
    }
    if (deepLinkTrackedRef.current === outfitId) {
      return;
    }
    deepLinkTrackedRef.current = outfitId;
    track('discovery_deep_link_opened', {
      outfit_id: outfitId,
      resolved: !!outfit,
    });
  }, [source, loading, outfit, outfitId]);

  const itemCount = outfit?.items.length ?? 0;
  const canSeeOnMe = itemCount >= 1 && itemCount <= 4;

  const handleBrowseDiscovery = () => {
    toast.show({
      type: 'info',
      text1: t('discovery.outfit_unavailable_toast'),
      position: 'bottom',
    });
    // popTo (not navigate) — mirrors ItemDetailScreen.handleBuildAround /
    // try-on-completion-notice's showTryOnCompletionNotice: this screen was
    // reached via the discovery-outfit deep link, which can land here after
    // popping through an arbitrary number of screens (whatever the deep link
    // pushed). A plain `navigate('Discovery')` updates the JS nav state (pop
    // to an existing `Discovery` instance, or push a fresh one) but — per the
    // same react-native-screens desync this codebase already hit and fixed
    // twice — can leave the screen(s) it popped past only torn down at the JS
    // level, not the native one, so the OLD screen's still-registered native
    // touch handling can keep intercepting taps meant for the newly-revealed
    // `Discovery` header (reported: hamburger stops opening the drawer, only
    // on the instance reached this way — AU-457 retry #4 finding). `popTo`
    // issues real pop semantics so the removed screen(s) are properly torn
    // down; resolution (existing instance vs fresh push) is identical to
    // plain `navigate` — same as SidebarMenu's `go('Discovery', close)`.
    navigation.popTo('Discovery');
  };

  const handleSeeOnMe = () => {
    if (!outfit || !canSeeOnMe) {
      return;
    }
    track('discovery_see_on_me_tapped', {
      outfit_id: outfit.id,
      item_count: itemCount,
    });
    // Reuse-confirm gate owns consent/AI-limit/usage gating — never navigate
    // straight to `SeeThisOnMe` (see FavouriteScreen.tsx:260 worked example).
    navigation.navigate('SeeThisOnMeConfirm', {
      outfit: {
        outfitHash: `discovery_${outfit.id}`,
        itemIds: outfit.items.map(item => item.id),
        itemImageUrls: outfit.items
          .map(item => item.image_png ?? item.image_url)
          .filter((url): url is string => !!url),
        stylingNote: outfit.description,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={outfit?.title ?? t('discovery.title')}
        onBack={() => navigation.goBack()}
        leftTestID="discovery-detail-back"
        leftAccessibilityLabel={t('uac.common.back')}
      />

      {loading ? (
        <DiscoveryDetailLoading />
      ) : notFound ? (
        <DiscoveryDetailUnavailable onBrowse={handleBrowseDiscovery} />
      ) : outfitQuery.isError ? (
        <DiscoveryDetailError onRetry={() => outfitQuery.refetch()} />
      ) : outfit ? (
        <>
          <ScrollView
            testID="discovery-detail-scroll"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + STICKY_CTA_HEIGHT + theme.spacing.m },
            ]}
          >
            <DiscoveryOutfitSummary outfit={outfit} />
            <DiscoveryItemStrip outfitId={outfit.id} items={outfit.items} />
          </ScrollView>

          <View style={[styles.stickyCta, { paddingBottom: insets.bottom + theme.spacing.s }]}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={4}
              reducedTransparencyFallbackColor={theme.colors.figmaItemDetailHeaderBg}
              pointerEvents="none"
            />
            <View style={styles.stickyCtaTint} pointerEvents="none" />
            <PillButton
              testID="discovery-detail-see-on-me-cta"
              variant="filled"
              title={t('discovery.see_on_me_cta')}
              onPress={handleSeeOnMe}
              disabled={!canSeeOnMe}
              style={styles.ctaButton}
            />
            {!canSeeOnMe ? (
              <Text style={styles.ctaHint} testID="discovery-detail-see-on-me-unavailable">
                {t('discovery.see_on_me_unavailable')}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
};
