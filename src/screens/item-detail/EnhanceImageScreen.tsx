import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { toast } from '../../components/design-system/lib';
import {
  PillButton,
  TopIconButton,
} from '../../components/primitives/FigmaPrimitives';
import { MacgieLoader } from '../../components/macgie';
import { Icons } from '../../assets/icons';
import { wardrobeKeys, wardrobeService } from '../../services/wardrobeService';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import { getImageUrl } from '../../utils/url';
import type { AppStackParamList } from '../../types/navigation';
import {
  classifyEnhanceError,
  ENHANCE_ERROR_KEYS,
  ENHANCE_POLL_MS,
  ENHANCE_TIMEOUT_MS,
  EnhanceFailureReason,
} from './enhance-session';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'EnhanceImage'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'EnhanceImage'>;

type Phase = 'loading' | 'ready' | 'error';

// Matches ItemDetail's image frame + sheet metrics so the push reads as the
// same surface (18px side margins around a 3:4 frame; 36 = home-indicator
// allowance — see ItemDetailScreen's one-off-literal note).
const IMAGE_SIDE_MARGIN = 18;
const FOOTER_BOTTOM_PADDING = 36;

/**
 * AI Image Enhancement preview (Item Detail → sparkle FAB → here).
 *
 * On mount it fires POST /items/{id}/beautify (the same decoupled backend
 * branch the upload-time flow uses) and polls the status fast — the wait is
 * synchronous ("Preparing this item in under 10 seconds"), unlike the
 * leave-and-come-back BeautifyPending flow. Nothing is persisted until the
 * user taps "Replace original": the candidate lives server-side in
 * `image_studio_candidate` and never leaks into any list (trust-first: the
 * original is never overwritten before explicit confirmation).
 *
 * Leaving mid-generation is safe by design: polling stops, the job finishes
 * server-side into the uncommitted candidate slot, and the next session's
 * POST regenerates over it (previous temporary image is never reused).
 */
export const EnhanceImageScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { itemId, displayUri } = route.params;

  const [phase, setPhase] = useState<Phase>('loading');
  const [candidateUri, setCandidateUri] = useState<string | null>(null);
  const [errorReason, setErrorReason] =
    useState<EnhanceFailureReason>('server_error');
  // Long-press compare: original shown while the finger stays down.
  const [comparing, setComparing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Session token guards against the late-response race: a stale poll (or a
  // retry racing the session it replaced) can never overwrite newer state.
  const sessionRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startSession = useCallback(() => {
    stopPolling();
    const session = ++sessionRef.current;
    const startedAt = Date.now();
    setPhase('loading');
    setCandidateUri(null);
    track('enhance_started', { item_id: itemId });

    const fail = (reason: EnhanceFailureReason) => {
      stopPolling();
      if (session !== sessionRef.current) {
        return;
      }
      track('enhance_failed', { item_id: itemId, reason });
      setErrorReason(reason);
      setPhase('error');
    };

    wardrobeService
      .beautifyItem(itemId)
      .then(() => {
        if (session !== sessionRef.current) {
          return;
        }
        pollRef.current = setInterval(async () => {
          if (session !== sessionRef.current) {
            stopPolling();
            return;
          }
          if (Date.now() - startedAt > ENHANCE_TIMEOUT_MS) {
            fail('timeout');
            return;
          }
          try {
            const status = await wardrobeService.getBeautifyStatus(itemId);
            if (session !== sessionRef.current) {
              stopPolling();
              return;
            }
            if (status.status === 'ready' && status.candidate_url) {
              stopPolling();
              track('enhance_completed', {
                item_id: itemId,
                duration_ms: Date.now() - startedAt,
              });
              setCandidateUri(status.candidate_url);
              setPhase('ready');
            } else if (status.status === 'failed') {
              fail('server_error');
            }
          } catch {
            // Transient poll error — keep polling; the timeout is the backstop.
          }
        }, ENHANCE_POLL_MS);
      })
      .catch(error => fail(classifyEnhanceError(error)));
  }, [itemId, stopPolling]);

  useEffect(() => {
    startSession();
    return () => {
      // Invalidate the session so any in-flight response is dropped, then
      // stop the poll loop. The server-side job may still complete into the
      // uncommitted candidate slot — never accepted, never shown.
      sessionRef.current += 1;
      stopPolling();
    };
  }, [startSession, stopPolling]);

  const handleDiscard = () => {
    if (saving || phase !== 'ready') {
      return;
    }
    setSaving(true);
    track('enhance_discarded', { item_id: itemId });
    // Fire-and-forget: the candidate is server-side temp state. Even if this
    // call fails, the candidate is never displayed anywhere and the next
    // enhance session regenerates over it.
    wardrobeService.discardBeautify(itemId).catch(() => {});
    navigation.goBack();
  };

  const handleReplace = async () => {
    if (saving || phase !== 'ready') {
      return;
    }
    setSaving(true);
    try {
      const updated = await wardrobeService.acceptBeautify(itemId);
      track('enhance_applied', { item_id: itemId });
      // Wardrobe list is cached (60s stale, no focus-refetch) — invalidate so
      // the grid/Home pick up the accepted studio shot.
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
      toast.show({
        type: 'success',
        text1: t('wardrobe.enhance.toast_saved'),
        position: 'bottom',
      });
      const acceptedStudio =
        typeof updated?.image_studio === 'string' && updated.image_studio
          ? updated.image_studio
          : candidateUri ?? undefined;
      // Pop back to the detail screen with the accepted image merged into its
      // params (merge keeps itemId/fallbackItem intact so the load effect
      // does not refire) — ItemDetail consumes + clears `enhancedItem`.
      navigation.popTo(
        'ItemDetail',
        {
          itemId,
          enhancedItem: {
            id: itemId,
            image_studio: acceptedStudio,
            beautify_status: 'accepted',
          },
        },
        { merge: true },
      );
    } catch (error) {
      console.error('Failed to apply enhanced image', error);
      // Stay on the preview: the candidate is preserved server-side and
      // "Replace original" stays enabled for another attempt.
      track('enhance_apply_failed', { item_id: itemId });
      toast.show({
        type: 'error',
        text1: t('wardrobe.enhance.toast_save_failed'),
        position: 'bottom',
      });
      setSaving(false);
    }
  };

  const enhancedUri = getImageUrl(candidateUri ?? undefined);
  const showEnhanced = phase === 'ready' && !comparing && !!enhancedUri;
  const imageUri = showEnhanced ? enhancedUri : displayUri;

  return (
    <View testID="enhance-image-screen-root" style={styles.container}>
      {/* Header mirrors ItemDetail's pinned bar: back button + centred title. */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TopIconButton
          testID="enhance-back-btn"
          accessibilityLabel={t('uac.common.back')}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          icon={<Icons.ChevronLeft width={24} height={24} />}
        />
        <Text style={styles.headerTitle}>{t('wardrobe.enhance.title')}</Text>
        {/* Spacer balances the back button so the title stays centred. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.imageRegion}>
        {/* Long-press compare (ready only): hold → original, release →
            enhanced. While loading the press surface is inert, so an early
            long press performs no comparison. */}
        <Pressable
          testID="enhance-image-preview"
          accessibilityLabel={t('wardrobe.enhance.a11y_preview')}
          disabled={phase !== 'ready'}
          onLongPress={() => setComparing(true)}
          onPressOut={() => setComparing(false)}
          style={styles.imageFrame}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, phase === 'loading' && styles.imageDimmed]}
              resizeMode="contain"
            />
          ) : null}

          {phase === 'loading' ? (
            <View testID="enhance-loading-overlay" style={styles.overlay}>
              <MacgieLoader variant="inline" testID="enhance-loading-macgie" />
              <Text style={styles.overlayText}>
                {t('wardrobe.enhance.loading')}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {phase === 'ready' ? (
          <Text testID="enhance-compare-hint" style={styles.hintText}>
            {t('wardrobe.enhance.compare_hint')}
          </Text>
        ) : null}

        {phase === 'error' ? (
          <Text testID="enhance-error-message" style={styles.errorText}>
            {t(ENHANCE_ERROR_KEYS[errorReason])}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(FOOTER_BOTTOM_PADDING, insets.bottom) },
        ]}
      >
        {phase === 'error' ? (
          <>
            <PillButton
              testID="enhance-retry-btn"
              variant="filled"
              title={t('wardrobe.enhance.retry')}
              style={styles.footerButton}
              onPress={startSession}
            />
            <PillButton
              testID="enhance-cancel-btn"
              variant="outline"
              title={t('wardrobe.enhance.cancel')}
              style={styles.footerButton}
              onPress={() => navigation.goBack()}
            />
          </>
        ) : (
          <View style={styles.footerRow}>
            {/* Both actions render (disabled) during loading per the design —
                the state is visible, not hidden. */}
            <PillButton
              testID="enhance-discard-btn"
              variant="outline"
              title={t('wardrobe.enhance.discard')}
              style={styles.footerButton}
              onPress={handleDiscard}
              disabled={phase !== 'ready' || saving}
            />
            <PillButton
              testID="enhance-replace-btn"
              variant="filled"
              title={t('wardrobe.enhance.replace_original')}
              style={styles.footerButton}
              onPress={handleReplace}
              disabled={phase !== 'ready' || saving}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  header: {
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.uacDimension12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    ...theme.ds.shadow.headerIcon,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    alignSelf: 'center',
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  imageRegion: {
    flex: 1,
    paddingHorizontal: IMAGE_SIDE_MARGIN,
    paddingTop: theme.spacing.m,
    alignItems: 'center',
  },
  imageFrame: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.figmaBackground,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageDimmed: {
    opacity: 0.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  overlayText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  hintText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.uacDimension12,
  },
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaItemDetailDanger,
    textAlign: 'center',
    paddingVertical: theme.spacing.uacDimension12,
  },
  footer: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.uacDimension12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  footerButton: {
    flex: 1,
    borderRadius: theme.borderRadius.uacButtonCta,
  },
});
