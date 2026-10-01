import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header, HEADER_ICON_INSET } from '../../components/layout/Header';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
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
import {
  DISCOVERY_ACTION_BAR_HEIGHT,
  DiscoveryDetailActionBar,
} from './DiscoveryDetailActionBar';
import { MakeItYoursActions } from '../make-it-yours/MakeItYoursActions';
import { MakeItYoursBody } from '../make-it-yours/MakeItYoursBody';
import { useMakeItYoursPanel } from '../make-it-yours/useMakeItYoursPanel';
import { useRevealPanelScroll } from '../make-it-yours/useRevealPanelScroll';
import { canSeeOutfitOnMe, discoverySeeOnMeParams } from './discovery-see-on-me';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'DiscoveryOutfitDetail'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'DiscoveryOutfitDetail'>;

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

  const canSeeOnMe = canSeeOutfitOnMe(outfit);
  // AU-458: "Make it yours" swaps the body + footer in place (Figma 5456:18648).
  const makeItYours = useMakeItYoursPanel(outfit?.id);
  const { scrollRef, onContentSizeChange } = useRevealPanelScroll(makeItYours.mode.kind);

  const handleBrowseDiscovery = () => {
    toast.show({
      type: 'info',
      text1: t('discovery.outfit_unavailable_toast'),
      position: 'bottom',
    });
    // popTo, NOT navigate (AU-457 retry #4): after a deep link, `navigate`
    // can leave popped screens torn down only in JS, not natively, so their
    // stale touch handlers swallow taps on the revealed Discovery header.
    // Same fix as ItemDetailScreen.handleBuildAround / try-on-completion-notice.
    navigation.popTo('Discovery');
  };

  const handleSeeOnMe = () => {
    if (!outfit || !canSeeOnMe) {
      return;
    }
    track('discovery_see_on_me_tapped', {
      outfit_id: outfit.id,
      item_count: outfit.items.length,
    });
    // Reuse-confirm gate owns consent/AI-limit/usage gating — never navigate
    // straight to `SeeThisOnMe` (see FavouriteScreen.tsx:260 worked example).
    navigation.navigate('SeeThisOnMeConfirm', discoverySeeOnMeParams(outfit));
  };

  // Make It Yours "Find another inspiration" — same popTo rationale as above.
  const handleFindAnother = () => navigation.popTo('Discovery');

  // While Make It Yours is open, Back closes it instead of leaving (Scenario 12).
  const back = () => (makeItYours.isOpen ? makeItYours.back() : navigation.goBack());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* The loaded screen has NO header bar: the cover image is the top of the
          screen and the back chip floats on it (design call — same treatment as
          `BodyPhotoDetailView`, the other image-hero detail view — though that
          one is still on its own pre-canonical 8/22 offset). The empty states
          have no image to float on, so they keep the canonical
          `Header.BackTitle`. Exactly one of the two renders at a time, so
          `discovery-detail-back` stays a unique Maestro selector either way —
          and both land the chip on the SAME pixel (`HEADER_ICON_INSET`, see
          `styles.floatingBack`), so it never jumps between the two branches or
          against any other screen's back button. */}
      {outfit && !loading ? null : (
        <Header.BackTitle
          title={t('discovery.title')}
          onBack={back}
          leftTestID="discovery-detail-back"
          leftAccessibilityLabel={t('uac.common.back')}
        />
      )}

      {loading ? (
        <DiscoveryDetailLoading />
      ) : notFound ? (
        <DiscoveryDetailUnavailable onBrowse={handleBrowseDiscovery} />
      ) : outfitQuery.isError ? (
        <DiscoveryDetailError onRetry={() => outfitQuery.refetch()} />
      ) : outfit ? (
        <>
          <ScrollView
            ref={scrollRef}
            onContentSizeChange={onContentSizeChange}
            testID="discovery-detail-scroll"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + DISCOVERY_ACTION_BAR_HEIGHT + theme.spacing.l },
            ]}
          >
            <DiscoveryOutfitSummary outfit={outfit} showDetails={!makeItYours.isOpen} />
            {makeItYours.isOpen ? (
              <MakeItYoursBody panel={makeItYours} />
            ) : (
              <DiscoveryItemStrip outfitId={outfit.id} items={outfit.items} />
            )}
          </ScrollView>

          {/* `top` comes from the inset at runtime — see `styles.floatingBack`:
              absolute children ignore the SafeAreaView's top padding, so
              without this the chip sits under the Dynamic Island. */}
          <View
            style={[
              styles.floatingBack,
              { top: insets.top + HEADER_ICON_INSET },
            ]}
          >
            <TopIconButton
              testID="discovery-detail-back"
              accessibilityLabel={t('uac.common.back')}
              onPress={back}
              icon={<Icons.ChevronLeft width={24} height={24} />}
            />
          </View>

          <DiscoveryDetailActionBar
            hint={
              !makeItYours.isOpen && !canSeeOnMe
                ? t('discovery.see_on_me_unavailable')
                : undefined
            }
          >
            <MakeItYoursActions
              panel={makeItYours}
              onSeeOnMe={handleSeeOnMe}
              canSeeOnMe={canSeeOnMe}
              onFindAnother={handleFindAnother}
            />
          </DiscoveryDetailActionBar>
        </>
      ) : null}
    </SafeAreaView>
  );
};
