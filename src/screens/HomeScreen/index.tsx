import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { useFavouritesSeen } from '../../context/FavouritesSeenContext';
import { useAuth } from '../../context/AuthContext';
import { useSchedule } from '../../context/ScheduleContext';
import { toDayKey } from '../../utils/dateKey';
import { ContextChipsModal } from '../../components/features/ContextChipsModal';
import { EditContextModal } from '../../components/features/EditContextModal';
import { OutfitLimitSheet } from '../../components/features/OutfitLimitSheet';
import { WelcomeDialog } from '../../components/features/WelcomeDialog';
import { MoodFeedbackSheet } from '../../components/features/MoodFeedbackSheet';
import { FeedbackSheet } from '../../components/features/FeedbackSheet';
import { useMoodFeedback } from '../../hooks/use-mood-feedback';
import { Item } from '../../types/item';
import {
  DEFAULT_RECOMMENDATION_MODE,
  Outfit,
  RecommendationMode,
} from '../../services/recommendationService';
import { recommendV05, resetV05Session } from '../../services/v05Api';
import { moodForMode } from '../../services/mood/mood-vocabulary';
import { favouriteService } from '../../services/favouriteService';
import { wardrobeService, wardrobeKeys } from '../../services/wardrobeService';
import {
  track,
  trackRecommendationViewedOnce,
  trackTemperatureModalOpened,
  trackTemperatureOptionSelected,
  trackTemperatureApplyClicked,
  trackTemperatureOverrideActive,
  trackTemperatureOverrideRemoved,
  trackRecommendationGeneratedByTemperatureOnce,
} from '../../services/analytics';
import { resolveItemImage } from '../../utils/url';
import {
  TemperatureOverrideSheet,
  type TemperatureSheetErrorKey,
} from '../../components/features/TemperatureOverrideSheet';
import { useTemperatureOverride } from '../../hooks/useTemperatureOverride';
import {
  isOverrideBucket,
  repTempCFor,
  type TemperatureBucketKey,
} from '../../config/temperature-buckets';
import { InfoSnackbar } from '../../components/feedback/InfoSnackbar';
import { OutfitSwipeDeck } from '../../components/features/OutfitSwipeDeck';
import { HomeView } from '../../components/features/HomeViewToggleFooter';
import { HomeWardrobeNavFooter } from '../../components/features/HomeWardrobeNavFooter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTFITS_PER_SET } from '../../utils/groupOutfitsIntoSets';
import { usePinReducer } from '../../hooks/usePinReducer';
import { PinConfirmModal } from '../../components/features/PinConfirmModal';
import { type PinErrorKind } from '../../components/features/PinGenerationError';
import { snapshotOutfit } from '../../utils/snapshotOutfit';
import {
  PIN_DONT_SHOW_STORAGE_KEY,
  REFINE_AFTER_OUTFITS,
  TARGET_AHEAD,
} from './constants';
import {
  BuildViaV05Input,
  OutfitSheet,
  OutfitSheetWithGrid,
  SaveState,
  WearThisPayload,
} from './types';
import {
  buildGridOutfitSheetWithPin,
  mapV05Item,
  normalizeOutfits,
} from './outfit-normalize';
import {
  buildScheduledOutfitSheets,
  withScheduledPrefix,
} from './scheduled-outfits';
import { styles } from './styles';
import { useWeather } from './hooks/useWeather';
import { useContextRefineModal } from './hooks/useContextRefineModal';
import { useHomeToasts } from './hooks/useHomeToasts';
import { EDIT_CONTEXT_SUGGESTIONS } from './context-chips';
import { HomeErrorState } from './components/HomeErrorState';
import { HomeWardrobeGapState } from './components/HomeWardrobeGapState';
import { DeckCue } from './components/DeckCue';
import { HomeHeader } from './components/HomeHeader';
import { HomeLoadingState } from './components/HomeLoadingState';
import { HomeToastLayer } from './components/HomeToastLayer';
import { PinStatusBanners } from './components/PinStatusBanners';
import { WearThisFooter } from './components/WearThisFooter';
import { OptionSheet } from './components/OptionSheet';
import { OutfitActionRow } from '../../components/features/OutfitActionRow';

export const HomeScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Home'>>();
  const queryClient = useQueryClient();
  const { open: openSidebar } = useSidebar();
  const { user } = useAuth();
  const { hasUnseen: hasUnseenFavourites, markSaved: markFavouriteSaved } =
    useFavouritesSeen();
  const { scheduledByDay } = useSchedule();

  // Today's calendar day, captured once per mount. Not reactive to a midnight
  // rollover mid-session — reopening the app re-captures it, which is enough for
  // "the outfit you planned for today leads the deck".
  const todayKey = useMemo(() => toDayKey(new Date()), []);
  // The user's outfits planned for today (favourites only — see
  // scheduled-outfits.ts), synthesised into deck sheets flagged `scheduled` so
  // they render the calendar badge. These lead the recommendation deck.
  const scheduledSheets = useMemo(
    () => buildScheduledOutfitSheets(scheduledByDay[todayKey]),
    [scheduledByDay, todayKey],
  );
  // Read by the recommendation onSuccess (cold start) so it can prepend the
  // plan without depending on it directly.
  const scheduledSheetsRef = useRef<OutfitSheet[]>(scheduledSheets);
  useEffect(() => {
    scheduledSheetsRef.current = scheduledSheets;
  }, [scheduledSheets]);

  // Persona preferences threaded into every `/build` `user` payload so the
  // engine biases formality (style_direction) + statement level
  // (confidence_level). Omit unset keys so the backend keeps its defaults.
  // Mirrored into a ref for the pin-regenerate effect, which reads from refs.
  const buildPersona = useMemo(() => {
    const meta = user?.user_metadata;
    return {
      ...(meta?.style_direction
        ? { style_direction: meta.style_direction }
        : {}),
      ...(meta?.confidence_level
        ? { confidence_level: meta.confidence_level }
        : {}),
    };
  }, [user?.user_metadata]);
  const buildPersonaRef = useRef(buildPersona);
  useEffect(() => {
    buildPersonaRef.current = buildPersona;
  }, [buildPersona]);
  const [homeView, setHomeView] = useState<HomeView>('grid');
  const [collageDragActive, setCollageDragActive] = useState(false);

  const [listOutfits, setListOutfits] = useState<OutfitSheet[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // Progressive refinement (Outfit Discovery & Refinement spec). Distinct
  // outfit hashes viewed within the current tier — once this hits
  // REFINE_AFTER_OUTFITS, auto-generation pauses and the Refine sheet opens.
  // The Set dedups re-lands on the same outfit; reset on submit/skip.
  const tierViewedHashesRef = useRef<Set<string>>(new Set());
  const [tierViewedCount, setTierViewedCount] = useState(0);
  // Session counter — how many times the user deferred the refine gate.
  const refinementSkippedRef = useRef(0);
  const [saveStateByHash, setSaveStateByHash] = useState<
    Record<string, SaveState>
  >({});
  const [pinState, pinDispatch] = usePinReducer(null);
  const pinnedItemId = pinState.pinnedItemId;
  const [pinErrorKind, setPinErrorKind] = useState<PinErrorKind>('generic');
  const [pinnedItemGoneAt, setPinnedItemGoneAt] = useState<number | null>(null);
  const pinDontShowAgainRef = useRef(false);
  const [pinDontShowAgainPending, setPinDontShowAgainPending] = useState(false);
  const pinDontShowAgainPendingRef = useRef(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(PIN_DONT_SHOW_STORAGE_KEY)
      .then(value => {
        if (mounted && value === 'true') {
          pinDontShowAgainRef.current = true;
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const v05SessionRef = useRef<string | null>(null);
  const pinAbortRef = useRef<AbortController | null>(null);
  const setPinnedItemId = useCallback(
    (next: string | null) => {
      if (next === null) {
        pinDispatch({ type: 'UNPIN' });
      }
    },
    [pinDispatch],
  );
  const [styleFeedback, setStyleFeedback] = useState<string | null>(null);
  const [hasCycled, setHasCycled] = useState(false);
  const [cycledHintDismissed, setCycledHintDismissed] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isWardrobeGap, setIsWardrobeGap] = useState(false);
  // "You've explored most combinations" sheet — shown when the user reaches the
  // end of the available outfits (pool depleted). `shownRef` keeps it to once
  // per depletion episode so repeated end-swipes don't re-pop it.
  const [limitSheetVisible, setLimitSheetVisible] = useState(false);
  const limitSheetShownRef = useRef(false);
  const unfavoritedSwipeCountRef = useRef(0);
  const listOutfitsRef = useRef<OutfitSheet[]>([]);
  const saveStateByHashRef = useRef<Record<string, SaveState>>({});
  const inFlightCountRef = useRef(0);
  const poolDepletedRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  const fetchGenerationRef = useRef(0);
  const ensureBufferRef = useRef<(force?: boolean) => void>(() => {});
  const pinnedItemIdRef = useRef<string | null>(null);
  const lastPinnedItemRef = useRef<Item | null>(null);
  const pinDialogItemRef = useRef<Item | null>(null);
  const selectedModeRef = useRef<RecommendationMode>(
    DEFAULT_RECOMMENDATION_MODE,
  );
  const activeIndexRef = useRef(0);
  const styleFeedbackRef = useRef<string | null>(null);
  const recommendationSourceRef = useRef<'feed' | 'refine'>('feed');
  // Refine feedback awaiting the next batch — set on submit, consumed in the
  // mutation's onSuccess so the "applied" toast fires only once the refreshed
  // outfits have actually loaded. `isChip` is carried so analytics can ship the
  // label for chips only and never the custom free-text (PII), mirroring
  // `refine_submitted`.
  const pendingRefineToastRef = useRef<{
    text: string;
    isChip: boolean;
  } | null>(null);

  const {
    moodBannerText,
    refineToastText,
    tempToastText,
    tempToastVisible,
    dismissRefineToast,
    showMoodBanner,
    showRefineToastRef,
    showTempToastRef,
  } = useHomeToasts();

  const { weather } = useWeather();

  const {
    activeBucketKey,
    overrideTempCRef,
    isOverrideActive,
    apply: applyTemperatureBucket,
  } = useTemperatureOverride();
  const [isTempSheetOpen, setIsTempSheetOpen] = useState(false);
  const [isApplyingTemp, setIsApplyingTemp] = useState(false);
  const [tempErrorKey, setTempErrorKey] =
    useState<TemperatureSheetErrorKey | null>(null);
  const tempApplyIdRef = useRef(0);
  const pendingTempApplyRef = useRef<{
    key: TemperatureBucketKey;
    previousBucket: TemperatureBucketKey;
  } | null>(null);
  const activeBucketForAnalyticsRef = useRef<TemperatureBucketKey>('weather');
  useEffect(() => {
    activeBucketForAnalyticsRef.current = activeBucketKey;
  }, [activeBucketKey]);

  useEffect(() => {
    listOutfitsRef.current = listOutfits;
  }, [listOutfits]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    saveStateByHashRef.current = saveStateByHash;
  }, [saveStateByHash]);

  useEffect(() => {
    pinnedItemIdRef.current = pinnedItemId;
  }, [pinnedItemId]);

  useEffect(() => {
    styleFeedbackRef.current = styleFeedback;
  }, [styleFeedback]);

  useEffect(() => {
    return () => {
      setPinnedItemId(null);
    };
  }, [setPinnedItemId]);

  // Keep today's scheduled outfit(s) seated as the leading card(s) of the deck.
  // The schedule store loads asynchronously (and can change while Home is up as
  // the user plans/removes outfits), so this reconciles whenever the plan
  // changes — prepending new scheduled sheets and dropping ones that were
  // unscheduled. Guarded to the first card so a late-arriving plan can never
  // yank the user back from a recommendation they've already swiped to; the
  // recommendation cold-start also prepends (see the mutation onSuccess) to
  // cover the common case where the plan is already loaded on first render.
  useEffect(() => {
    if (activeIndexRef.current !== 0) {
      return;
    }
    setListOutfits(current => {
      const next = withScheduledPrefix(current, scheduledSheets);
      const unchanged =
        current.length === next.length &&
        current.every((o, i) => o.outfitHash === next[i].outfitHash);
      return unchanged ? current : next;
    });
    // Scheduled outfits are already saved favourites — seed their save state so
    // the heart reads "saved" and re-tapping is a no-op (their namespaced
    // `scheduled-*` hash is never a valid save payload).
    if (scheduledSheets.length > 0) {
      setSaveStateByHash(current => {
        let changed = false;
        const next = { ...current };
        for (const sheet of scheduledSheets) {
          if (next[sheet.outfitHash] !== 'saved') {
            next[sheet.outfitHash] = 'saved';
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }
  }, [scheduledSheets]);

  const buildViaV05 = useCallback(
    async (
      input: BuildViaV05Input,
    ): Promise<{
      outfits: Outfit[];
      cycled?: boolean;
      wardrobeGap?: boolean;
    }> => {
      const mode = input.mode ?? DEFAULT_RECOMMENDATION_MODE;
      // Mode pill → engine mood, via the shared mood-vocabulary bridge (single
      // source of truth shared with the feedback→intent mapping).
      const mood = moodForMode(mode);
      const occasion = mode || DEFAULT_RECOMMENDATION_MODE;

      const v05 = await recommendV05({
        weather: {
          temp_c: overrideTempCRef.current ?? weather.tempC,
          is_rainy: false,
        },
        user: { gender: 'U', occasion, ...buildPersona },
        intent: { mood: mood as never },
        count: 3,
        mode,
        style_feedback: input.style_feedback,
        pinned_item_id: input.pinned_item_id ?? undefined,
        current_outfit_hash: input.current_outfit_hash,
      });

      return {
        outfits: v05.outfits.map(o => ({
          items: o.items.map(mapV05Item),
          outfit_hash: o.outfit_hash,
          caption: o.reasoning_human,
        })) as unknown as Outfit[],
        cycled: v05.cycled,
        wardrobeGap: v05.wardrobeGap,
      };
    },
    [weather.tempC, overrideTempCRef, buildPersona],
  );

  const {
    mutate: valenGetRecommendation,
    isPending: isStartPending,
    error: startError,
    reset: resetStartMutation,
  } = useMutation({
    mutationFn: buildViaV05,
    onSuccess: (data: unknown, variables) => {
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
      const capturedGen = variables?.__gen ?? 0;
      if (capturedGen !== fetchGenerationRef.current) {
        return;
      }

      const tempApplyId = variables?.__tempApplyId;
      const isLatestTempApply =
        tempApplyId != null && tempApplyId === tempApplyIdRef.current;
      if (isLatestTempApply) {
        setIsApplyingTemp(false);
        setTempErrorKey(null);
        setIsTempSheetOpen(false);
        const ctx = pendingTempApplyRef.current;
        if (ctx) {
          if (isOverrideBucket(ctx.key)) {
            trackTemperatureOverrideActive(ctx.key, repTempCFor(ctx.key) ?? 0);
          } else if (isOverrideBucket(ctx.previousBucket)) {
            trackTemperatureOverrideRemoved(ctx.previousBucket);
          }
          showTempToastRef.current(ctx.key);
          pendingTempApplyRef.current = null;
        }
      }

      const flags = data as { cycled?: boolean; wardrobeGap?: boolean };
      if (flags?.cycled) {
        setHasCycled(true);
      }

      let isColdStart = false;
      let addedCount = 0;
      let settledHash: string | undefined;
      if (isFirstLoadRef.current || listOutfitsRef.current.length === 0) {
        isFirstLoadRef.current = false;
        isColdStart = true;
        const incoming = normalizeOutfits(data, 0);
        // Lead the fresh deck with the user's outfit(s) scheduled for today.
        // `withScheduledPrefix` is a no-op when nothing is planned, so the deck
        // is recommendations-only on ordinary days.
        const scheduled = scheduledSheetsRef.current;
        const combined = withScheduledPrefix(incoming, scheduled);
        addedCount = combined.length;
        settledHash = combined[0]?.outfitHash;
        setListOutfits(combined);
        if (scheduled.length > 0) {
          setSaveStateByHash(current => {
            const next = { ...current };
            for (const sheet of scheduled) {
              next[sheet.outfitHash] = 'saved';
            }
            return next;
          });
        }
        setActiveIndex(0);
        activeIndexRef.current = 0;
        unfavoritedSwipeCountRef.current = 0;
        poolDepletedRef.current = false;
        limitSheetShownRef.current = false;
        if (addedCount > 0) {
          setHasCycled(false);
          setIsWardrobeGap(false);
        }
      } else {
        const offset = listOutfitsRef.current.length;
        const incoming = normalizeOutfits(data, offset);
        const existingHashes = new Set(
          listOutfitsRef.current.map(o => o.outfitHash),
        );
        const deduped = incoming.filter(
          sheet => !existingHashes.has(sheet.outfitHash),
        );
        addedCount = deduped.length;
        if (deduped.length > 0) {
          setListOutfits(current => [...current, ...deduped]);
        }
        settledHash =
          listOutfitsRef.current[activeIndexRef.current]?.outfitHash;
      }

      if (addedCount === 0) {
        poolDepletedRef.current = true;
        // Nothing new surfaced — drop any queued refine toast so it can't fire
        // against an unrelated batch later.
        pendingRefineToastRef.current = null;
        if (flags?.wardrobeGap) {
          setIsWardrobeGap(true);
        }
        return;
      }
      const tempBucket = activeBucketForAnalyticsRef.current;
      if (isOverrideBucket(tempBucket) && settledHash) {
        trackRecommendationGeneratedByTemperatureOnce(
          settledHash,
          tempBucket,
          addedCount,
        );
      }

      // The refreshed deck has landed — now confirm the refine that produced it
      // so the user understands why the suggestions just changed.
      const pendingToast = pendingRefineToastRef.current;
      if (pendingToast) {
        pendingRefineToastRef.current = null;
        showRefineToastRef.current(pendingToast.text, pendingToast.isChip);
      }

      setTimeout(() => {
        ensureBufferRef.current(isColdStart);
      }, 0);
    },
    onError: (error, variables) => {
      console.error('Failed to load recommendation', error);
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);

      const tempApplyId = variables?.__tempApplyId;
      if (tempApplyId != null && tempApplyId === tempApplyIdRef.current) {
        const code = (error as { code?: string })?.code;
        const isOffline =
          code === 'ERR_NETWORK' ||
          code === 'ERR_CANCELED' ||
          code === 'ECONNABORTED';
        setIsApplyingTemp(false);
        setTempErrorKey(isOffline ? 'offline' : 'recommend_failed');
      }
    },
  });

  const requestRecommendation = useCallback(
    (params: BuildViaV05Input, opts?: { force?: boolean }) => {
      if (inFlightCountRef.current > 0 && !opts?.force) {
        return;
      }
      inFlightCountRef.current += 1;
      valenGetRecommendation({ ...params, __gen: fetchGenerationRef.current });
    },
    [valenGetRecommendation],
  );

  useEffect(() => {
    requestRecommendation({
      mode: selectedModeRef.current,
      style_feedback: styleFeedbackRef.current ?? undefined,
    });
  }, [requestRecommendation]);

  // Reset the progressive-refinement tier (run synchronously on submit/skip so
  // the gate effect can't re-fire in the window before the new batch resolves).
  const resetRefineTier = useCallback(() => {
    tierViewedHashesRef.current.clear();
    setTierViewedCount(0);
  }, []);

  const onSubmitFeedback = useCallback(
    (payload: string, isChip: boolean) => {
      setStyleFeedback(payload);
      styleFeedbackRef.current = payload;
      // Queue the confirmation toast; it fires once the new batch resolves.
      // `isChip` gates whether the label is safe to ship to analytics.
      pendingRefineToastRef.current = { text: payload, isChip };
      unfavoritedSwipeCountRef.current = 0;
      resetRefineTier();
      recommendationSourceRef.current = 'refine';
      resetV05Session();
      fetchGenerationRef.current += 1;
      poolDepletedRef.current = false;
      limitSheetShownRef.current = false;
      isFirstLoadRef.current = true;
      requestRecommendation(
        {
          style_feedback: payload,
          pinned_item_id: pinnedItemIdRef.current ?? undefined,
          mode: selectedModeRef.current,
        },
        { force: true },
      );
    },
    [requestRecommendation, resetRefineTier],
  );

  // "Skip for now" on the refine gate: record the skip, reset the tier, and
  // force-generate the next batch of 6 (no new style feedback).
  const onSkipRefinement = useCallback(() => {
    refinementSkippedRef.current += 1;
    track('refine_skipped', {
      skipped_count: refinementSkippedRef.current,
    });
    resetRefineTier();
    recommendationSourceRef.current = 'feed';
    resetV05Session();
    fetchGenerationRef.current += 1;
    poolDepletedRef.current = false;
    limitSheetShownRef.current = false;
    isFirstLoadRef.current = true;
    requestRecommendation(
      {
        mode: selectedModeRef.current,
        pinned_item_id: pinnedItemIdRef.current ?? undefined,
        style_feedback: styleFeedbackRef.current ?? undefined,
      },
      { force: true },
    );
  }, [requestRecommendation, resetRefineTier]);

  const refine = useContextRefineModal({ onSubmitFeedback, onSkipRefinement });

  useEffect(() => {
    if (refine.isOpen) {
      return;
    }
    const total = listOutfitsRef.current.length;
    if (total === 0) {
      return;
    }
    const clamped =
      activeIndex >= total ? total - 1 : activeIndex < 0 ? 0 : activeIndex;
    const settled = listOutfitsRef.current[clamped];
    const hash = settled?.outfitHash;
    if (!hash) {
      return;
    }
    const source = recommendationSourceRef.current;
    if (source === 'refine') {
      recommendationSourceRef.current = 'feed';
    }
    trackRecommendationViewedOnce(hash, {
      position: clamped + 1,
      source,
    });

    // Progressive refinement: tally distinct outfits the user has actually
    // landed on this tier. Reaching REFINE_AFTER_OUTFITS arms the gate effect.
    if (!tierViewedHashesRef.current.has(hash)) {
      tierViewedHashesRef.current.add(hash);
      setTierViewedCount(tierViewedHashesRef.current.size);
    }
  }, [activeIndex, listOutfits, refine.isOpen]);

  // Progressive refinement gate — after REFINE_AFTER_OUTFITS distinct outfits
  // viewed (2 batches), open the Refine sheet instead of generating more. The
  // `ensureBuffer` length cap has already paused generation; submitting
  // feedback or skipping resets the tier and unlocks the next 6.
  const { isOpen: refineIsOpen, open: openRefine } = refine;
  useEffect(() => {
    if (refineIsOpen) {
      return;
    }
    if (tierViewedCount < REFINE_AFTER_OUTFITS) {
      return;
    }
    openRefine('viewed_threshold');
  }, [tierViewedCount, refineIsOpen, openRefine]);

  useEffect(() => {
    if (pinState.outfit !== 'generating') {
      return;
    }
    const controller = new AbortController();
    pinAbortRef.current = controller;

    const activeSheet = listOutfitsRef.current[activeIndexRef.current];
    if (activeSheet) {
      const snapshot = snapshotOutfit(activeSheet as unknown as Outfit);
      pinDispatch({ type: 'GENERATE_START', snapshot });
    }

    const timeoutId = setTimeout(() => {
      controller.abort();
      if (pinAbortRef.current === controller) {
        pinAbortRef.current = null;
        setPinErrorKind('network');
        pinDispatch({ type: 'GENERATE_ERROR' });
      }
    }, 30000);

    const currentHash = activeSheet?.outfitHash;
    const params = {
      weather: {
        temp_c: overrideTempCRef.current ?? weather.tempC,
        is_rainy: false,
      },
      user: {
        gender: 'U' as const,
        occasion: selectedModeRef.current,
        ...buildPersonaRef.current,
      },
      count: 3,
      mode: selectedModeRef.current,
      pinned_item_id: pinState.pinnedItemId ?? undefined,
      style_feedback: styleFeedbackRef.current ?? undefined,
      current_outfit_hash: currentHash,
    };

    recommendV05(params, { signal: controller.signal })
      .then(result => {
        if (pinAbortRef.current !== controller) {
          return;
        }
        v05SessionRef.current = result.sessionId ?? v05SessionRef.current;
        if (result.outfits.length > 0) {
          isFirstLoadRef.current = true;
          const mapped: OutfitSheet[] = result.outfits.map(o => ({
            items: o.items.map(mapV05Item),
            outfitHash: o.outfit_hash,
            caption: o.reasoning_human,
          }));
          setListOutfits(mapped);
          setActiveIndex(0);
          activeIndexRef.current = 0;
          // A fresh pinned deck is a new generation cycle: clear the
          // depletion/limit flags so buffering resumes for the pinned context
          // and the limit sheet can fire again once the pinned pool is truly
          // exhausted. Without this, pinning after a prior depletion leaves the
          // user on a dead-end swipe with no OutfitLimitSheet. Mirrors the
          // cold-start reset above.
          unfavoritedSwipeCountRef.current = 0;
          poolDepletedRef.current = false;
          limitSheetShownRef.current = false;
          setHasCycled(false);
          setIsWardrobeGap(false);
        }
        pinDispatch({
          type: result.lowConfidence ? 'GENERATE_FALLBACK' : 'GENERATE_SUCCESS',
        });
      })
      .catch(error => {
        if (pinAbortRef.current !== controller) {
          return;
        }
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401) {
          pinDispatch({ type: 'AUTH_BLOCK' });
        } else if (status === 410) {
          setPinErrorKind('item_unavailable');
          setPinnedItemGoneAt(Date.now());
          pinDispatch({ type: 'PINNED_ITEM_GONE' });
        } else if (status === 422) {
          setPinErrorKind('item_unavailable');
          setPinnedItemGoneAt(Date.now());
          pinDispatch({ type: 'PINNED_ITEM_GONE' });
        } else {
          const code = (error as { code?: string })?.code;
          const isNetwork =
            code === 'ERR_NETWORK' ||
            code === 'ERR_CANCELED' ||
            code === 'ECONNABORTED';
          setPinErrorKind(isNetwork ? 'network' : 'generic');
          pinDispatch({ type: 'GENERATE_ERROR' });
        }
      })
      .finally(() => {
        if (pinAbortRef.current === controller) {
          pinAbortRef.current = null;
        }
        clearTimeout(timeoutId);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinState.outfit]);

  useEffect(() => {
    const pinFromDetail = route.params?.pinFromDetail;
    if (!pinFromDetail) {
      return;
    }
    if (pinState.pinnedItemId !== pinFromDetail) {
      pinDispatch({
        type: 'CONFIRM_PIN_FROM_DETAIL',
        itemId: pinFromDetail,
      });
    }
    navigation.setParams({ pinFromDetail: undefined });
  }, [
    route.params?.pinFromDetail,
    navigation,
    pinDispatch,
    pinState.pinnedItemId,
  ]);

  // "Change" item swap (ItemDetail → wardrobe picker). A one-off, local
  // replacement of the viewed item in the ACTIVE outfit with the chosen
  // wardrobe item — explicitly NOT a pin: the item is not anchored and
  // suggestions are not regenerated around it. Swiping to another outfit
  // leaves it untouched.
  useEffect(() => {
    const swap = route.params?.swapItem;
    if (!swap) {
      return;
    }
    const { fromItemId, toItem } = swap;
    const replacement: Item = {
      id: toItem.id,
      image_url: toItem.image_url ?? '',
      image_png: toItem.image_png ?? null,
      name: toItem.name ?? null,
      category: toItem.category ?? 'Top',
      color: toItem.color_hex ?? '',
      isSystem: toItem.is_common_item ?? false,
      isExploration: false,
    };
    setListOutfits(current => {
      if (current.length === 0) {
        return current;
      }
      const idx = Math.min(
        Math.max(activeIndexRef.current, 0),
        current.length - 1,
      );
      const target = current[idx];
      const items = target?.items ?? [];
      const pos = items.findIndex(it => it?.id === fromItemId);
      if (pos < 0) {
        return current;
      }
      const nextItems = items.slice();
      nextItems[pos] = replacement;
      const nextList = current.slice();
      nextList[idx] = { ...target, items: nextItems };
      return nextList;
    });
    track('outfit_item_swapped', {
      from_item_id: fromItemId,
      to_item_id: toItem.id,
    });
    navigation.setParams({ swapItem: undefined });
  }, [route.params?.swapItem, navigation]);

  const { data: wardrobeItemsData } = useQuery({
    // Shared with the Wardrobe screen's "All" tab (wardrobeKeys.list('All')) so
    // the two screens reuse one cache entry. Home keeps its tighter 30s stale.
    queryKey: wardrobeKeys.list(),
    queryFn: () => wardrobeService.getWardrobeItems(),
    staleTime: 30_000,
  });
  useEffect(() => {
    if (!pinState.pinnedItemId) {
      return;
    }
    if (!wardrobeItemsData) {
      return;
    }
    const stillExists = wardrobeItemsData.some(
      i => i.id === pinState.pinnedItemId,
    );
    if (!stillExists) {
      pinDispatch({ type: 'PINNED_ITEM_GONE' });
      setPinnedItemGoneAt(Date.now());
    }
  }, [wardrobeItemsData, pinState.pinnedItemId, pinDispatch]);

  useEffect(() => {
    if (pinnedItemGoneAt === null) {
      return;
    }
    const handle = setTimeout(() => {
      setPinnedItemGoneAt(null);
    }, 5000);
    return () => clearTimeout(handle);
  }, [pinnedItemGoneAt]);

  useEffect(() => {
    if (pinState.outfit === 'auth_required') {
      console.info('home.pin.auth_required');
    }
  }, [pinState.outfit]);

  const loading = isStartPending && listOutfits.length === 0;

  const pinnedItem = useMemo<Item | null>(() => {
    if (!pinnedItemId) {
      lastPinnedItemRef.current = null;
      return null;
    }
    for (const outfit of listOutfits) {
      const found = outfit.items.find(item => item?.id === pinnedItemId);
      if (found) {
        lastPinnedItemRef.current = found;
        return found;
      }
    }
    if (lastPinnedItemRef.current?.id === pinnedItemId) {
      return lastPinnedItemRef.current;
    }
    // "Build around this" pins a WARDROBE item that isn't in any current
    // outfit, so the loops above miss it and pinnedItem would be null —
    // leaving the local fallback unable to inject it. Resolve it from the
    // wardrobe list so it gets mixed into every suggestion.
    const fromWardrobe = wardrobeItemsData?.find(w => w.id === pinnedItemId);
    if (fromWardrobe) {
      const mapped: Item = {
        id: fromWardrobe.id,
        image_url: fromWardrobe.image_url ?? '',
        image_png: fromWardrobe.image_png ?? null,
        name: fromWardrobe.name ?? null,
        category: fromWardrobe.category ?? 'Top',
        color: fromWardrobe.color_hex ?? '',
        isSystem: fromWardrobe.is_common_item ?? false,
        isExploration: false,
      };
      lastPinnedItemRef.current = mapped;
      return mapped;
    }
    return null;
  }, [listOutfits, pinnedItemId, wardrobeItemsData]);

  const pinDialogItem = useMemo<Item | null>(() => {
    const targetId =
      pinState.pendingPinnedItemId ?? pinState.pinReplaceCandidate;
    if (!targetId) {
      return null;
    }
    for (const outfit of listOutfits) {
      const found = outfit.items.find(item => item?.id === targetId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [listOutfits, pinState.pendingPinnedItemId, pinState.pinReplaceCandidate]);
  const pinDialogImageUrl = pinDialogItem
    ? resolveItemImage(pinDialogItem) ?? null
    : null;

  useEffect(() => {
    pinDialogItemRef.current = pinDialogItem;
  }, [pinDialogItem]);

  const optionSets = useMemo<OutfitSheetWithGrid[]>(
    () =>
      listOutfits.map(outfit =>
        buildGridOutfitSheetWithPin(outfit, pinnedItem),
      ),
    [listOutfits, pinnedItem],
  );

  const clampedActiveIndex =
    optionSets.length > 0 ? Math.min(activeIndex, optionSets.length - 1) : 0;
  const activeOutfit = optionSets[clampedActiveIndex];
  const activeOutfitHash = activeOutfit?.outfitHash;
  const activeSaveState: SaveState = activeOutfitHash
    ? saveStateByHash[activeOutfitHash] ?? 'idle'
    : 'idle';

  const ensureBuffer = useCallback(
    (force = false) => {
      const total = listOutfitsRef.current.length;
      if (total === 0) {
        return;
      }
      if (inFlightCountRef.current > 0) {
        return;
      }
      if (poolDepletedRef.current) {
        return;
      }
      // Progressive refinement gate: once a tier's worth of outfits
      // (REFINE_AFTER_OUTFITS) exists, stop auto-generating so the Refine sheet
      // can collect a preference signal first. A forced fetch (cold-start
      // prime, refine submit, skip) deliberately bypasses this to seed the
      // next tier.
      if (!force && total >= REFINE_AFTER_OUTFITS) {
        return;
      }
      const activeFlat = activeIndexRef.current;
      const ahead = total - 1 - activeFlat;
      if (!force && ahead >= TARGET_AHEAD) {
        return;
      }
      const currentHash = listOutfitsRef.current[activeFlat]?.outfitHash;
      requestRecommendation({
        pinned_item_id: pinnedItemIdRef.current ?? undefined,
        mode: selectedModeRef.current,
        style_feedback: styleFeedbackRef.current ?? undefined,
        current_outfit_hash: currentHash,
      });
    },
    [requestRecommendation],
  );

  useEffect(() => {
    ensureBufferRef.current = ensureBuffer;
  }, [ensureBuffer]);

  const handleHeartTapForOutfit = useCallback(
    (outfit: OutfitSheetWithGrid | OutfitSheet | undefined) => {
      if (!outfit) {
        return;
      }
      dismissRefineToast();

      const hash = outfit.outfitHash;
      const items = outfit.items || [];
      const previousState = saveStateByHashRef.current[hash] ?? 'idle';

      unfavoritedSwipeCountRef.current = 0;

      if (previousState === 'saving' || previousState === 'saved') {
        return;
      }

      console.info('home.swipe.favorite', { outfitHash: hash });

      setSaveStateByHash(current => ({ ...current, [hash]: 'saving' }));

      favouriteService
        .saveFavourite({
          outfit_hash: hash,
          item_ids: items.map(item => item.id).filter(Boolean),
          source: 'home',
          ...(outfit.caption ? { title: outfit.caption } : {}),
        })
        .then(() => {
          setSaveStateByHash(current => ({ ...current, [hash]: 'saved' }));
          track('outfit_favorited', {
            outfit_hash: hash,
            item_count: items.length,
            source: 'home',
          });
          // Light the header "unseen saved looks" dot and keep the Favourite
          // list cache fresh for when the user opens it.
          markFavouriteSaved();
          queryClient.invalidateQueries({ queryKey: ['favourites'] });
        })
        .catch(error => {
          console.warn('saveFavourite failed', error);
          setSaveStateByHash(current => ({ ...current, [hash]: 'error' }));
        });
    },
    [queryClient, markFavouriteSaved, dismissRefineToast],
  );

  const handleOpenFavourites = useCallback(() => {
    track('home_favourites_shortcut_tapped', {
      had_unseen: hasUnseenFavourites,
    });
    navigation.navigate('Favourite');
  }, [navigation, hasUnseenFavourites]);

  const { t } = useTranslation();

  const handleMoodSaveSuccess = useCallback(
    (outfitHash: string, updated: boolean) => {
      setSaveStateByHash(current => ({ ...current, [outfitHash]: 'saved' }));
      showMoodBanner(
        t(updated ? 'mood.moodUpdatedBanner' : 'mood.savedBanner'),
      );
      // "Wear this" with a mood saved a look → light the unseen dot and keep
      // the Favourite list cache fresh.
      markFavouriteSaved();
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
    },
    [showMoodBanner, t, queryClient, markFavouriteSaved],
  );

  // "Not quite me" → the outfit is intentionally NOT saved; acknowledge the
  // feedback without a "saved" confirmation and leave the save state untouched.
  const handleMoodRejected = useCallback(() => {
    showMoodBanner(t('mood.notLovedBanner'));
  }, [showMoodBanner, t]);

  const { onWearThisPress, sheetProps: moodSheetProps } =
    useMoodFeedback<WearThisPayload>({
      saveDirectly: pending => handleHeartTapForOutfit(pending.outfit),
      onSaveSuccess: handleMoodSaveSuccess,
      onRejected: handleMoodRejected,
    });

  const handleWearThisForOutfit = useCallback(
    (outfit: OutfitSheetWithGrid | OutfitSheet | undefined) => {
      if (!outfit) {
        return;
      }
      dismissRefineToast();
      unfavoritedSwipeCountRef.current = 0;
      onWearThisPress({
        outfitHash: outfit.outfitHash,
        itemIds: (outfit.items || []).map(item => item.id).filter(Boolean),
        occasion: selectedModeRef.current,
        ...(outfit.caption ? { title: outfit.caption } : {}),
        outfit,
      });
    },
    [onWearThisPress, dismissRefineToast],
  );

  const handleToggleItemPin = useCallback(
    (item: Item) => {
      if (!item?.id) {
        return;
      }
      if (pinnedItemIdRef.current === item.id) {
        track('item_unpinned', { source: 'home_tile_pill' });
        lastPinnedItemRef.current = null;
        pinDispatch({ type: 'PIN_TAP', itemId: item.id });
        return;
      }
      if (pinnedItemIdRef.current === null && pinDontShowAgainRef.current) {
        track('item_pinned', {
          source: 'home_tile_pill',
          confirm_skipped: true,
        });
        lastPinnedItemRef.current = item;
        pinDispatch({ type: 'CONFIRM_PIN_FROM_DETAIL', itemId: item.id });
        return;
      }
      setPinDontShowAgainPending(false);
      pinDontShowAgainPendingRef.current = false;
      pinDispatch({ type: 'PIN_TAP', itemId: item.id });
    },
    [pinDispatch],
  );

  const handleConfirmPinFromModal = useCallback(() => {
    const isReplace = pinState.modal === 'replace';
    if (pinDontShowAgainPendingRef.current) {
      pinDontShowAgainRef.current = true;
      AsyncStorage.setItem(PIN_DONT_SHOW_STORAGE_KEY, 'true').catch(() => {});
    }
    if (pinDialogItemRef.current) {
      lastPinnedItemRef.current = pinDialogItemRef.current;
    }
    track('item_pinned', {
      source: isReplace ? 'home_confirm_sheet_replace' : 'home_confirm_sheet',
      confirm_skipped: false,
    });
    pinDispatch({ type: isReplace ? 'CONFIRM_REPLACE' : 'CONFIRM_PIN' });
  }, [pinState.modal, pinDispatch]);

  const handleToggleDontShowAgain = useCallback(() => {
    setPinDontShowAgainPending(prev => {
      const next = !prev;
      pinDontShowAgainPendingRef.current = next;
      track('pin_dont_show_again_toggled', { checked: next });
      return next;
    });
  }, []);

  // Surface the "explored most combinations" sheet once per depletion episode,
  // unless the Refine sheet is already up.
  const openLimitSheet = useCallback(() => {
    if (limitSheetShownRef.current || refineIsOpen) {
      return;
    }
    limitSheetShownRef.current = true;
    setLimitSheetVisible(true);
    track('outfit_limit_reached');
  }, [refineIsOpen]);

  const advanceDeck = useCallback(() => {
    const next = activeIndexRef.current + 1;
    if (next < listOutfitsRef.current.length) {
      activeIndexRef.current = next;
      setActiveIndex(next);
      ensureBuffer();
      return;
    }
    // Already on the last card. If the backend has no more combinations for the
    // current selections, inform the user instead of a dead-end swipe;
    // otherwise keep buffering ahead.
    if (poolDepletedRef.current) {
      openLimitSheet();
      return;
    }
    ensureBuffer();
  }, [ensureBuffer, openLimitSheet]);

  const handleLimitRefine = useCallback(() => {
    setLimitSheetVisible(false);
    track('outfit_limit_refine_tapped');
    openRefine('explore_limit');
  }, [openRefine]);

  const handleLimitKeepBrowsing = useCallback(() => {
    setLimitSheetVisible(false);
    track('outfit_limit_keep_browsing');
  }, []);

  // Swipe RIGHT = step back to the previous suggestion. No favouriting here —
  // the heart button / "Wear this" own that — and the deck blocks this gesture
  // at index 0, so by the time we run there is always a previous card.
  const handleSwipeBack = useCallback(
    (outfit: OutfitSheetWithGrid) => {
      dismissRefineToast();
      const prev = activeIndexRef.current - 1;
      if (prev < 0) {
        return;
      }
      if (outfit?.outfitHash) {
        track('outfit_swiped', {
          outfit_hash: outfit.outfitHash,
          direction: 'previous',
          method: 'gesture',
        });
      }
      activeIndexRef.current = prev;
      setActiveIndex(prev);
    },
    [dismissRefineToast],
  );

  const handleSkip = useCallback(
    (outfit: OutfitSheetWithGrid) => {
      dismissRefineToast();
      const fromHash = outfit?.outfitHash;
      console.info('home.swipe.miss', { from: activeIndexRef.current });
      if (fromHash) {
        track('outfit_swiped', {
          outfit_hash: fromHash,
          direction: 'next',
          method: 'gesture',
        });
      }
      // The refine prompt is now driven by the after-6-outfits gate
      // (tierViewedCount), not a raw skip counter.
      advanceDeck();
    },
    [advanceDeck, dismissRefineToast],
  );

  const openTempSheet = useCallback(() => {
    setTempErrorKey(null);
    setIsTempSheetOpen(true);
    trackTemperatureModalOpened(isOverrideActive);
  }, [isOverrideActive]);

  const closeTempSheet = useCallback(() => {
    if (isApplyingTemp) {
      return;
    }
    setIsTempSheetOpen(false);
    setTempErrorKey(null);
  }, [isApplyingTemp]);

  const handleTempSelect = useCallback((key: TemperatureBucketKey) => {
    trackTemperatureOptionSelected(key);
  }, []);

  const applyTemperature = useCallback(
    (key: TemperatureBucketKey) => {
      trackTemperatureApplyClicked(key);

      if (key === activeBucketKey) {
        setIsTempSheetOpen(false);
        setTempErrorKey(null);
        return;
      }

      const previousBucket = activeBucketKey;

      applyTemperatureBucket(key);

      tempApplyIdRef.current += 1;
      const applyId = tempApplyIdRef.current;
      pendingTempApplyRef.current = { key, previousBucket };
      setTempErrorKey(null);
      setIsApplyingTemp(true);

      resetV05Session();
      fetchGenerationRef.current += 1;
      poolDepletedRef.current = false;
      limitSheetShownRef.current = false;
      isFirstLoadRef.current = true;
      requestRecommendation(
        {
          mode: selectedModeRef.current,
          pinned_item_id: pinnedItemIdRef.current ?? undefined,
          style_feedback: styleFeedbackRef.current ?? undefined,
          __tempApplyId: applyId,
        },
        { force: true },
      );
    },
    [activeBucketKey, applyTemperatureBucket, requestRecommendation],
  );

  const handleLeadingAction = () => {
    openSidebar();
  };

  const handleRemix = useCallback(() => {
    if (pinState.outfit === 'generating') {
      return;
    }
    const current = listOutfitsRef.current[activeIndexRef.current];
    const items = (current?.items ?? [])
      .filter((it): it is Item => !!it)
      .map(it => ({
        id: it.id,
        imageUrl: resolveItemImage(it) || it.image_url,
        category: it.category,
      }));
    navigation.navigate(
      'OutfitCanvas',
      items.length ? { items, entry: 'remix' } : { entry: 'remix' },
    );
  }, [navigation, pinState.outfit]);

  const handleOpenItemDetail = useCallback(
    (item: Item) => {
      const activeSheet = listOutfitsRef.current[activeIndexRef.current];
      const activeHash = activeSheet?.outfitHash;
      if (activeHash) {
        const pos = (activeSheet?.items ?? []).findIndex(
          candidate => candidate?.id === item.id,
        );
        track('outfit_card_tapped', {
          outfit_hash: activeHash,
          ...(pos >= 0 ? { position: pos + 1 } : {}),
        });
      }
      navigation.navigate('ItemDetail', {
        itemId: item.id,
        fallbackItem: {
          id: item.id,
          image_url: item.image_url,
          image_png: item.image_png ?? undefined,
          name: item.name ?? undefined,
          category: item.category,
          is_common_item: item.isSystem,
        },
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView
      testID="home-screen-root"
      style={styles.container}
      edges={['top']}
    >
      <HomeHeader
        onOpenMenu={handleLeadingAction}
        isOverrideActive={isOverrideActive}
        activeBucketKey={activeBucketKey}
        weather={weather}
        onOpenTemp={openTempSheet}
        homeView={homeView}
        onSelectView={setHomeView}
      />

      {/* Floating toast layer (z-index tier 5) — sits on top of the grid,
          never stacks with the cards. */}
      <View style={styles.noticeStack} pointerEvents="box-none">
        {hasCycled &&
        !isWardrobeGap &&
        optionSets.length > 0 &&
        !cycledHintDismissed ? (
          <InfoSnackbar
            message={t('home.seen_all_hint')}
            onClose={() => setCycledHintDismissed(true)}
            testID="home-cycled-hint"
          />
        ) : null}
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
        >
          <HomeLoadingState />
        </ScrollView>
      ) : optionSets.length === 0 && isWardrobeGap ? (
        <HomeWardrobeGapState
          onAddItems={() => navigation.navigate('Wardrobe')}
        />
      ) : optionSets.length === 0 && startError ? (
        <HomeErrorState
          onRetry={() => {
            resetStartMutation();
            requestRecommendation({
              mode: selectedModeRef.current,
              style_feedback: styleFeedbackRef.current ?? undefined,
            });
          }}
        />
      ) : (
        <View style={styles.deckWrap}>
          <OutfitSwipeDeck
            testID="home-swipe-deck"
            items={optionSets}
            activeIndex={clampedActiveIndex}
            swipeEnabled={!collageDragActive}
            keyOf={outfit => outfit.outfitHash}
            onSwipeNext={handleSkip}
            onSwipeBack={handleSwipeBack}
            renderCard={(outfit, role) => (
              <OptionSheet
                cellKey={outfit.outfitHash}
                outfit={outfit}
                pinnedItemId={pinnedItemId}
                reveal={
                  role === 'peek'
                    ? 'none'
                    : clampedActiveIndex === 0
                    ? 'full'
                    : 'light'
                }
                onItemPress={handleOpenItemDetail}
                onTogglePin={handleToggleItemPin}
                homeView={homeView}
                onCollageDragActiveChange={setCollageDragActive}
                isGenerating={
                  role !== 'peek' && pinState.outfit === 'generating'
                }
              />
            )}
            renderCue={(backOpacity, nextOpacity) => (
              <DeckCue
                backOpacity={backOpacity}
                nextOpacity={nextOpacity}
                showBack={clampedActiveIndex > 0}
                backLabel={t('home.back_label')}
                skipLabel={t('home.skip_label')}
              />
            )}
          />
          {/* Fixed action row — Remix · dots · Refine stay put while only the
              card photo swipes beneath them (it lives outside the deck). */}
          <View style={styles.deckActionRow}>
            <OutfitActionRow
              testID="home-action-row"
              onRemix={handleRemix}
              onRefine={() => {
                refine.open('refine_button');
              }}
              dotCount={OUTFITS_PER_SET}
              activeDot={clampedActiveIndex % OUTFITS_PER_SET}
            />
          </View>
        </View>
      )}

      <PinStatusBanners
        pinOutfit={pinState.outfit}
        pinErrorKind={pinErrorKind}
        onRetry={() => {
          setPinErrorKind('generic');
          pinDispatch({ type: 'RETRY' });
        }}
        onSignIn={() => {
          navigation.navigate('Auth', {
            screen: 'EmailInput',
            params: { mode: 'signin' },
          });
        }}
        pinnedItemGoneAt={pinnedItemGoneAt}
      />

      <WearThisFooter
        visible={optionSets.length > 0}
        activeSaveState={activeSaveState}
        pinOutfit={pinState.outfit}
        activeOutfit={activeOutfit}
        onOpenFavourites={handleOpenFavourites}
        onWearThis={handleWearThisForOutfit}
        onOpenFeedback={() => setFeedbackVisible(true)}
      />

      <HomeWardrobeNavFooter active="home" testID="home-footer-nav-toggle" />

      <ContextChipsModal
        visible={refine.isOpen && !refine.isEditing}
        chipOptions={refine.displayChipOptions}
        selectedChipId={refine.selectedChipId}
        isSubmitting={false}
        confirmDisabled={refine.confirmDisabled}
        onSelectChip={refine.onSelectChip}
        onShuffle={refine.onShuffle}
        onEdit={refine.onEdit}
        onCancel={refine.onCancel}
        onConfirm={refine.onConfirm}
        onSkip={refine.onSkip}
      />

      {/* Full-screen "Edit context" view — opened from the refine sheet's Edit
          chip. Submitting applies the typed context through the same feedback
          path; backing out returns to the chip row. */}
      <EditContextModal
        visible={refine.isOpen && refine.isEditing}
        value={refine.customText}
        suggestions={EDIT_CONTEXT_SUGGESTIONS}
        submitDisabled={refine.confirmDisabled}
        onChangeText={refine.onChangeText}
        onSelectSuggestion={refine.onChangeText}
        onBack={refine.onCancelEdit}
        onSubmit={refine.onConfirm}
      />

      <OutfitLimitSheet
        visible={limitSheetVisible}
        onRefine={handleLimitRefine}
        onKeepBrowsing={handleLimitKeepBrowsing}
      />

      <PinConfirmModal
        visible={pinState.modal !== 'closed'}
        variant={pinState.modal === 'replace' ? 'replace' : 'confirm'}
        itemImageUrl={pinDialogImageUrl}
        itemLabel={pinDialogItem?.name ?? undefined}
        isCommonItem={pinDialogItem?.isSystem ?? false}
        dontShowAgain={pinDontShowAgainPending}
        onToggleDontShowAgain={handleToggleDontShowAgain}
        onConfirm={handleConfirmPinFromModal}
        onCancel={() => pinDispatch({ type: 'CANCEL_MODAL' })}
      />

      <WelcomeDialog enabled={optionSets.length > 0} />

      <MoodFeedbackSheet {...moodSheetProps} />

      <TemperatureOverrideSheet
        visible={isTempSheetOpen}
        activeBucketKey={activeBucketKey}
        liveTempC={weather.tempC}
        isApplying={isApplyingTemp}
        errorKey={tempErrorKey}
        onApply={applyTemperature}
        onSelect={handleTempSelect}
        onCancel={closeTempSheet}
      />

      <FeedbackSheet
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />

      <HomeToastLayer
        refineToastText={refineToastText}
        moodBannerText={moodBannerText}
        tempToastVisible={tempToastVisible}
        tempToastText={tempToastText}
      />
    </SafeAreaView>
  );
};
