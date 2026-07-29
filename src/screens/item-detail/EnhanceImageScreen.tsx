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
import { AiContentDisclosure } from '../../components/features/AiContentDisclosure';
import { Icons } from '../../assets/icons';
import { wardrobeKeys, wardrobeService } from '../../services/wardrobeService';
import { goToWardrobe, markItemBeautifying } from '../wardrobe/beautify-status';
import { EnhanceLoadingView } from './EnhanceLoadingView';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import { getImageUrl } from '../../utils/url';
import type { AppStackParamList } from '../../types/navigation';
import {
  classifyEnhanceError,
  ENHANCE_ERROR_KEYS,
  ENHANCE_POLL_MS,
  ENHANCE_REGEN_CAP,
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

// Hold-to-compare dwell. RN's default (500ms) fires on an ordinary firm tap;
// the design asks for a deliberate one-second hold.
const COMPARE_HOLD_MS = 1000;

/**
 * AI Image Enhancement — the single surface for a studio shot, from "generate
 * it" to "look at it again three days later". Reached from Item Detail's
 * sparkle FAB, a ready Wardrobe tile, the beautify-ready snackbar, a push
 * deep link, and the upload-time BeautifyPending hand-off (it replaced the
 * separate "Studio shot ready" review screen for all of them).
 *
 * Mount is a *probe*, not a job: whatever already exists server-side wins — a
 * ready candidate opens straight as a result, a running job is joined, and only
 * an item with nothing in flight starts a POST /items/{id}/beautify. That's
 * what makes re-entering after "Leave — notify me when ready" free, and what
 * stops a second tap on the sparkle icon from burning another generation.
 *
 * Nothing is persisted until the user taps "Replace original": the candidate
 * lives server-side in `image_studio_candidate` and never leaks into any list
 * (trust-first: the original is never overwritten before explicit
 * confirmation). Discard is the "keep the original" exit; Regenerate spends
 * another of the ENHANCE_REGEN_CAP attempts on a new candidate.
 *
 * Three phases, three bodies under a shared header: `loading` hands the whole
 * body to EnhanceLoadingView (mascot + staggered progress rows + the leave
 * CTA), `ready` shows the candidate over the warm surface with hold-to-compare
 * and the action block, `error` shows the reason plus retry.
 *
 * Leaving mid-generation is safe by design: polling stops and the job finishes
 * server-side into the uncommitted candidate slot. The item is already flagged
 * `beautify_status: 'pending'` in the Wardrobe cache, so the beautify-ready
 * snackbar there is what "we'll let you know the second it's ready" actually
 * means — and tapping it comes right back here, onto the result.
 */
export const EnhanceImageScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { itemId, displayUri, origin = 'itemDetail' } = route.params;

  const [phase, setPhase] = useState<Phase>('loading');
  const [candidateUri, setCandidateUri] = useState<string | null>(null);
  const [errorReason, setErrorReason] =
    useState<EnhanceFailureReason>('server_error');
  // Generations spent on this item so far — drives the Regenerate cap.
  const [attempts, setAttempts] = useState(0);
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

  /**
   * Opens a session on this item's beautify job.
   *
   * `resume` (mount + Retry) asks the server what already exists before
   * spending anything: a ready candidate is shown as-is — this is what makes
   * re-entering the screen after "Leave — notify me when ready" a *result*
   * view rather than a second generation — and a still-running job is simply
   * polled. Only an item with nothing in flight starts a new job.
   *
   * `regenerate` always fires a fresh job, replacing the current candidate.
   */
  const startSession = useCallback(
    (mode: 'resume' | 'regenerate' = 'resume') => {
      stopPolling();
      const session = ++sessionRef.current;
      const startedAt = Date.now();
      setPhase('loading');
      setCandidateUri(null);

      const isStale = () => session !== sessionRef.current;

      const fail = (reason: EnhanceFailureReason) => {
        stopPolling();
        if (isStale()) {
          return;
        }
        track('enhance_failed', { item_id: itemId, reason });
        setErrorReason(reason);
        setPhase('error');
      };

      const showCandidate = (candidateUrl: string, spent: number) => {
        stopPolling();
        setAttempts(spent);
        setCandidateUri(candidateUrl);
        setPhase('ready');
      };

      const poll = () => {
        pollRef.current = setInterval(async () => {
          if (isStale()) {
            stopPolling();
            return;
          }
          if (Date.now() - startedAt > ENHANCE_TIMEOUT_MS) {
            fail('timeout');
            return;
          }
          try {
            const status = await wardrobeService.getBeautifyStatus(itemId);
            if (isStale()) {
              stopPolling();
              return;
            }
            if (status.status === 'ready' && status.candidate_url) {
              track('enhance_completed', {
                item_id: itemId,
                duration_ms: Date.now() - startedAt,
              });
              showCandidate(status.candidate_url, status.attempts);
            } else if (status.status === 'failed') {
              fail('server_error');
            }
          } catch {
            // Transient poll error — keep polling; the timeout is the backstop.
          }
        }, ENHANCE_POLL_MS);
      };

      const run = async () => {
        if (mode === 'resume') {
          try {
            const status = await wardrobeService.getBeautifyStatus(itemId);
            if (isStale()) {
              return;
            }
            if (status.status === 'ready' && status.candidate_url) {
              track('enhance_resumed', { item_id: itemId, state: 'ready' });
              showCandidate(status.candidate_url, status.attempts);
              return;
            }
            if (status.status === 'pending') {
              // Someone (this user, a previous session) already paid for a
              // job that's still running — attach to it instead of stacking
              // a second one on top.
              track('enhance_resumed', { item_id: itemId, state: 'pending' });
              setAttempts(status.attempts);
              markItemBeautifying(queryClient, itemId);
              poll();
              return;
            }
          } catch {
            // The probe is best-effort: if it can't be answered, fall through
            // and submit — the submit error path classifies the failure.
          }
          if (isStale()) {
            return;
          }
        }

        try {
          const job = await wardrobeService.beautifyItem(itemId);
          if (isStale()) {
            return;
          }
          track('enhance_started', { item_id: itemId, mode });
          setAttempts(job.attempts);
          // The item is now `beautify_status: 'pending'` server-side — patch
          // it into the cached list directly (no round trip) so the pending
          // badge + tap-routing (WardrobeScreen.handleItemPress) are correct
          // the moment the user returns to Wardrobe.
          markItemBeautifying(queryClient, itemId);
          poll();
        } catch (error) {
          fail(classifyEnhanceError(error));
        }
      };

      // Every await inside is wrapped, so this never rejects.
      run();
    },
    [itemId, stopPolling, queryClient],
  );

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

  /**
   * Where accept/discard land. Reached from ItemDetail (the sparkle FAB) the
   * detail screen is still underneath, so we return to it; reached from the
   * Wardrobe grid, the ready snackbar or a push there is nothing to pop back
   * to, so the grid is the destination.
   */
  const leaveAfterResolution = () => {
    if (origin === 'wardrobe') {
      goToWardrobe(navigation);
      return;
    }
    navigation.goBack();
  };

  const handleDiscard = () => {
    if (saving || phase !== 'ready') {
      return;
    }
    setSaving(true);
    track('enhance_discarded', { item_id: itemId });
    // Fire-and-forget: the candidate is server-side temp state. Even if this
    // call fails, the candidate is never displayed anywhere and the next
    // enhance session regenerates over it. The original image is untouched —
    // this is the "keep the original" exit.
    wardrobeService.discardBeautify(itemId).catch(() => {});
    // The tile is no longer `ready`; drop the cached status so the grid stops
    // routing taps here and stops badging the item.
    queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
    leaveAfterResolution();
  };

  const handleRegenerate = () => {
    if (saving || phase !== 'ready' || attempts >= ENHANCE_REGEN_CAP) {
      return;
    }
    track('enhance_regenerated', { item_id: itemId, attempt: attempts + 1 });
    startSession('regenerate');
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
      if (origin === 'wardrobe') {
        // No ItemDetail underneath (tile / snackbar / push entry) — the grid,
        // already invalidated above, is where the accepted shot shows up.
        goToWardrobe(navigation);
        return;
      }
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

  const handleBack = () => {
    if (phase === 'loading') {
      // Going back to ItemDetail mid-generation would show a stale image
      // (ItemDetail doesn't poll beautify_status), so land on Wardrobe
      // instead, where the item's "beautifying" badge is now visible — and
      // where the beautify-ready snackbar makes good on the loading screen's
      // "we'll let you know the second it's ready" promise. `goToWardrobe`
      // resets the stack rather than navigating: a plain
      // `navigate('Wardrobe')` only pops to an existing Wardrobe route if one
      // is already in this stack's history — reached via Home instead, it
      // would PUSH a new instance on top, leaving ItemDetail/EnhanceImage
      // mounted underneath (squished, not the full-screen root) and their
      // effects — including this screen's own poll — never cleaned up.
      goToWardrobe(navigation);
      return;
    }
    navigation.goBack();
  };

  // "Leave — notify me when ready": same exit as the header back button
  // mid-generation, tracked separately so the escape hatch's usage is
  // distinguishable from a plain back-out.
  const handleLeaveWaiting = () => {
    track('enhance_left_waiting', { item_id: itemId });
    goToWardrobe(navigation);
  };

  const enhancedUri = getImageUrl(candidateUri ?? undefined);
  const showEnhanced = phase === 'ready' && !comparing && !!enhancedUri;
  const imageUri = showEnhanced ? enhancedUri : displayUri;
  const atRegenCap = attempts >= ENHANCE_REGEN_CAP;

  return (
    <View testID="enhance-image-screen-root" style={styles.container}>
      {/* Header mirrors ItemDetail's pinned bar: back button + centred title. */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TopIconButton
          testID="enhance-back-btn"
          accessibilityLabel={t('uac.common.back')}
          onPress={handleBack}
          style={styles.backButton}
          icon={<Icons.ChevronLeft width={24} height={24} />}
        />
        <Text style={styles.headerTitle}>{t('wardrobe.enhance.title')}</Text>
        {/* Spacer balances the back button so the title stays centred. */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Loading owns the whole body: no preview, no actions — just the
          progress rows and the leave-and-be-notified escape hatch. */}
      {phase === 'loading' ? (
        <EnhanceLoadingView
          onLeave={handleLeaveWaiting}
          bottomInset={Math.max(FOOTER_BOTTOM_PADDING, insets.bottom)}
        />
      ) : (
        <>
          <View style={styles.imageRegion}>
            {/* Long-press compare (ready only): hold a full second → original,
                release → enhanced. */}
            <Pressable
              testID="enhance-image-preview"
              accessibilityLabel={t('wardrobe.enhance.a11y_preview')}
              disabled={phase !== 'ready'}
              delayLongPress={COMPARE_HOLD_MS}
              onLongPress={() => setComparing(true)}
              onPressOut={() => setComparing(false)}
              style={styles.imageFrame}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : null}
            </Pressable>

            {phase === 'ready' ? (
              <View testID="enhance-compare-hint" style={styles.hintRow}>
                {/* Gesture cue for the hold-to-compare affordance; the label
                    next to it carries the meaning, so it stays decorative. */}
                <Icons.SwipeHand width={20} height={20} />
                <Text style={styles.hintText}>
                  {t('wardrobe.enhance.compare_hint')}
                </Text>
              </View>
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
                  onPress={() => startSession('resume')}
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
              <>
                {/* AI-generated disclosure — the preview is an AI-generated
                    image (App Store AI rules). */}
                <AiContentDisclosure
                  surface="enhance"
                  testID="enhance-ai-disclosure"
                />
                <PillButton
                  testID="enhance-replace-btn"
                  variant="filled"
                  title={t('wardrobe.enhance.replace_original')}
                  style={styles.footerButton}
                  trailing={<Icons.Change width={20} height={20} />}
                  onPress={handleReplace}
                  disabled={saving}
                />
                <View style={styles.footerRow}>
                  {/* Discard keeps the original untouched; Regenerate spends
                      another attempt on a new candidate. Both read as text
                      actions under the primary CTA. */}
                  <PillButton
                    testID="enhance-discard-btn"
                    variant="text"
                    title={t('wardrobe.enhance.discard')}
                    style={styles.textAction}
                    textStyle={styles.discardText}
                    onPress={handleDiscard}
                    disabled={saving}
                  />
                  <PillButton
                    testID={
                      atRegenCap
                        ? 'enhance-regenerate-btn-capped'
                        : 'enhance-regenerate-btn'
                    }
                    variant="text"
                    title={
                      atRegenCap
                        ? t('wardrobe.enhance.regenerate_capped')
                        : t('wardrobe.enhance.regenerate')
                    }
                    style={styles.textAction}
                    onPress={handleRegenerate}
                    disabled={saving || atRegenCap}
                  />
                </View>
              </>
            )}
          </View>
        </>
      )}
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
  // The result sits on the warm surface the rest of the app uses for
  // garment imagery; the action block below it stays on white so the CTA
  // reads as a separate footer (design: enhance result screen).
  imageRegion: {
    flex: 1,
    backgroundColor: theme.colors.figmaCardSurface,
    paddingHorizontal: IMAGE_SIDE_MARGIN,
    paddingTop: theme.spacing.m,
    alignItems: 'center',
  },
  imageFrame: {
    flex: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.uacDimension12,
  },
  hintText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaItemDetailDanger,
    textAlign: 'center',
    paddingVertical: theme.spacing.uacDimension12,
  },
  footer: {
    backgroundColor: theme.colors.figmaBackground,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.uacDimension12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  footerButton: {
    borderRadius: theme.borderRadius.uacButtonCta,
  },
  textAction: {
    flex: 1,
  },
  discardText: {
    color: theme.colors.uacTextDangerBase,
  },
});
