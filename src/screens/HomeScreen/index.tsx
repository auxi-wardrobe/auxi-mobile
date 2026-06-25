import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { ContextChipsModal } from '../../components/features/ContextChipsModal';
import { WelcomeDialog } from '../../components/features/WelcomeDialog';
import { MoodFeedbackSheet } from '../../components/features/MoodFeedbackSheet';
import { FeedbackSheet } from '../../components/features/FeedbackSheet';
import { useMoodFeedback } from '../../hooks/use-mood-feedback';
import {
  PillButton,
  TopIconButton,
} from '../../components/primitives/FigmaPrimitives';
import IconMenu from '../../assets/images/icon_menu.svg';
import IconHomeHeartOutline from '../../assets/images/icon_home_heart_outline.svg';
import IconFeedback from '../../assets/images/feedback.svg';
import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
import { theme } from '../../theme/theme';
import { Item } from '../../types/item';
import {
  DEFAULT_RECOMMENDATION_MODE,
  Outfit,
  RecommendationMode,
} from '../../services/recommendationService';
import { recommendV05, resetV05Session } from '../../services/v05Api';
import { favouriteService } from '../../services/favouriteService';
import { wardrobeService } from '../../services/wardrobeService';
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
import { WeatherWidget } from '../../components/features/WeatherWidget';
import {
  TemperatureOverrideSheet,
  type TemperatureSheetErrorKey,
} from '../../components/features/TemperatureOverrideSheet';
import { TemperatureOverrideIndicator } from '../../components/features/TemperatureOverrideIndicator';
import { useTemperatureOverride } from '../../hooks/useTemperatureOverride';
import {
  bucketLabel,
  isOverrideBucket,
  repTempCFor,
  type TemperatureBucketKey,
} from '../../config/temperature-buckets';
import { InfoSnackbar } from '../../components/feedback/InfoSnackbar';
import { OutfitSwipeDeck } from '../../components/features/OutfitSwipeDeck';
import {
  HomeView,
  HomeViewToggleFooter,
} from '../../components/features/HomeViewToggleFooter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTFITS_PER_SET } from '../../utils/groupOutfitsIntoSets';
import { usePinReducer } from '../../hooks/usePinReducer';
import { PinConfirmModal } from '../../components/features/PinConfirmModal';
import {
  PinGenerationError,
  type PinErrorKind,
} from '../../components/features/PinGenerationError';
import { PinFallbackNotice } from '../../components/features/PinFallbackNotice';
import { PinnedItemUnavailableNotice } from '../../components/features/PinnedItemUnavailableNotice';
import { snapshotOutfit } from '../../utils/snapshotOutfit';
import {
  MOOD_BANNER_DURATION_MS,
  AI_NOTICE_DISMISSED_KEY,
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
import { styles } from './styles';
import { useWeather } from './hooks/useWeather';
import { useContextRefineModal } from './hooks/useContextRefineModal';
import { HomeErrorState } from './components/HomeErrorState';
import { HomeWardrobeGapState } from './components/HomeWardrobeGapState';
import { HomeLoadingState } from './components/HomeLoadingState';
import { OptionSheet } from './components/OptionSheet';
import { OutfitActionRow } from '../../components/features/OutfitActionRow';

const clearTimeoutRef = (
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) => {
  if (!timeoutRef.current) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
};

export const HomeScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Home'>>();
  const queryClient = useQueryClient();
  const { open: openSidebar } = useSidebar();
  const { hasUnseen: hasUnseenFavourites, markSaved: markFavouriteSaved } =
    useFavouritesSeen();
  const [homeView, setHomeView] = useState<HomeView>('grid');
  const [collageDragActive, setCollageDragActive] = useState(false);
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // True while the open Refine sheet was triggered by the after-6 gate (vs the
  // manual "edit context" button) — drives the Skip affordance + copy.
  const [refineGated, setRefineGated] = useState(false);
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
  const [aiNoticeDismissed, setAiNoticeDismissed] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  // Persist the AI notice dismissal so the toast appears only the first time;
  // the floating feedback button remains as the ongoing affordance.
  useEffect(() => {
    AsyncStorage.getItem(AI_NOTICE_DISMISSED_KEY)
      .then(v => {
        if (v === 'true') {
          setAiNoticeDismissed(true);
        }
      })
      .catch(() => {});
  }, []);
  const dismissAiNotice = useCallback(() => {
    setAiNoticeDismissed(true);
    AsyncStorage.setItem(AI_NOTICE_DISMISSED_KEY, 'true').catch(() => {});
  }, []);
  const [isWardrobeGap, setIsWardrobeGap] = useState(false);
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

  const buildViaV05 = useCallback(
    async (
      input: BuildViaV05Input,
    ): Promise<{
      outfits: Outfit[];
      cycled?: boolean;
      wardrobeGap?: boolean;
    }> => {
      const moodMap: Record<RecommendationMode, string | null> = {
        safe: 'calm',
        power: 'confident',
        creative: 'playful',
      };
      const mode = input.mode ?? DEFAULT_RECOMMENDATION_MODE;
      const mood = moodMap[mode] ?? null;
      const occasion = mode || DEFAULT_RECOMMENDATION_MODE;

      const v05 = await recommendV05({
        weather: {
          temp_c: overrideTempCRef.current ?? weather.tempC,
          is_rainy: false,
        },
        user: { gender: 'U', occasion },
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
    [weather.tempC, overrideTempCRef],
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
        addedCount = incoming.length;
        settledHash = incoming[0]?.outfitHash;
        setListOutfits(incoming);
        setActiveIndex(0);
        activeIndexRef.current = 0;
        unfavoritedSwipeCountRef.current = 0;
        poolDepletedRef.current = false;
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
    setRefineGated(false);
  }, []);

  const onSubmitFeedback = useCallback(
    (payload: string) => {
      setStyleFeedback(payload);
      styleFeedbackRef.current = payload;
      unfavoritedSwipeCountRef.current = 0;
      resetRefineTier();
      recommendationSourceRef.current = 'refine';
      resetV05Session();
      fetchGenerationRef.current += 1;
      poolDepletedRef.current = false;
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
    setRefineGated(true);
    openRefine('viewed_threshold');
  }, [tierViewedCount, refineIsOpen, openRefine]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(snackbarTimeoutRef);
    };
  }, []);

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
      user: { gender: 'U' as const, occasion: selectedModeRef.current },
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

  const { data: wardrobeItemsData } = useQuery({
    queryKey: ['home-wardrobe-items'],
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
    [queryClient, markFavouriteSaved],
  );

  const handleOpenFavourites = useCallback(() => {
    track('home_favourites_shortcut_tapped', {
      had_unseen: hasUnseenFavourites,
    });
    navigation.navigate('Favourite');
  }, [navigation, hasUnseenFavourites]);

  const { t } = useTranslation();
  const [moodBannerText, setMoodBannerText] = useState<string | null>(null);

  const showMoodBanner = useCallback((text: string) => {
    clearTimeoutRef(snackbarTimeoutRef);
    setMoodBannerText(text);
    snackbarTimeoutRef.current = setTimeout(() => {
      setMoodBannerText(null);
      snackbarTimeoutRef.current = null;
    }, MOOD_BANNER_DURATION_MS);
  }, []);

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

  const { onWearThisPress, sheetProps: moodSheetProps } =
    useMoodFeedback<WearThisPayload>({
      saveDirectly: pending => handleHeartTapForOutfit(pending.outfit),
      onSaveSuccess: handleMoodSaveSuccess,
    });

  const handleWearThisForOutfit = useCallback(
    (outfit: OutfitSheetWithGrid | OutfitSheet | undefined) => {
      if (!outfit) {
        return;
      }
      unfavoritedSwipeCountRef.current = 0;
      onWearThisPress({
        outfitHash: outfit.outfitHash,
        itemIds: (outfit.items || []).map(item => item.id).filter(Boolean),
        occasion: selectedModeRef.current,
        ...(outfit.caption ? { title: outfit.caption } : {}),
        outfit,
      });
    },
    [onWearThisPress],
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

  const advanceDeck = useCallback(() => {
    const next = activeIndexRef.current + 1;
    if (next < listOutfitsRef.current.length) {
      activeIndexRef.current = next;
      setActiveIndex(next);
    }
    ensureBuffer();
  }, [ensureBuffer]);

  // Swipe RIGHT = step back to the previous suggestion. No favouriting here —
  // the heart button / "Wear this" own that — and the deck blocks this gesture
  // at index 0, so by the time we run there is always a previous card.
  const handleSwipeBack = useCallback((outfit: OutfitSheetWithGrid) => {
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
  }, []);

  const handleSkip = useCallback(
    (outfit: OutfitSheetWithGrid) => {
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
    [advanceDeck],
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
    <SafeAreaView testID="home-screen-root" style={styles.container}>
      <View style={styles.header}>
        <TopIconButton
          testID="home-menu-button"
          accessibilityRole="button"
          accessibilityLabel={t('home.a11y_open_menu')}
          onPress={handleLeadingAction}
          icon={<IconMenu width={24} height={24} />}
          style={styles.headerIconButton}
        />

        {isOverrideActive ? (
          <TemperatureOverrideIndicator
            label={bucketLabel(t, activeBucketKey, weather.tempC)}
            onPress={openTempSheet}
          />
        ) : (
          <WeatherWidget tempC={weather.tempC} iconCode={weather.iconCode} />
        )}

        <TouchableOpacity
          testID="home-favourites-shortcut"
          accessibilityRole="button"
          accessibilityLabel={
            hasUnseenFavourites
              ? t('home.a11y_open_favourites_new')
              : t('home.a11y_open_favourites')
          }
          activeOpacity={0.82}
          style={styles.headerIconButton}
          onPress={handleOpenFavourites}
        >
          <IconHomeHeartOutline width={24} height={24} />
          {hasUnseenFavourites ? (
            <View
              testID="home-favourites-badge"
              style={styles.favDot}
              pointerEvents="none"
            />
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Floating toast layer (z-index tier 5) — sits on top of the grid,
          never stacks with the cards. */}
      <View style={styles.noticeStack} pointerEvents="box-none">
        {optionSets.length > 0 && !aiNoticeDismissed ? (
          <InfoSnackbar
            message={t('aiDisclosure.label')}
            onClose={dismissAiNotice}
            testID="home-ai-disclosure"
          />
        ) : null}
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

      {pinState.outfit === 'generating' ? (
        <View
          style={styles.pinGeneratingHeader}
          testID="home-pin-generating-header"
        >
          <Text style={styles.pinGeneratingHeaderText} numberOfLines={1}>
            {t('pin.generating_header')}
          </Text>
          <ActivityIndicator
            size="small"
            color={theme.colors.figmaTextPrimary}
            testID="home-pin-generating-spinner"
          />
        </View>
      ) : null}

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
                onPressInsight={openTempSheet}
                insightActive={isOverrideActive}
              />
            )}
            renderCue={(backOpacity, nextOpacity) => (
              <>
                {/* Swipe right → previous: back chevron on the right edge
                    (hidden on the first card — nothing to return to). */}
                {clampedActiveIndex > 0 ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.deckCue,
                      styles.deckCueLike,
                      { opacity: backOpacity },
                    ]}
                  >
                    <IconChevronLeft width={20} height={20} />
                    <Text style={styles.deckCueSkipText}>
                      {t('home.back_label')}
                    </Text>
                  </Animated.View>
                ) : null}
                {/* Swipe left → next: cue on the left edge. */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.deckCue,
                    styles.deckCueSkip,
                    { opacity: nextOpacity },
                  ]}
                >
                  <Text style={styles.deckCueSkipText}>
                    {t('home.skip_label')}
                  </Text>
                </Animated.View>
              </>
            )}
          />
          {/* Fixed action row — Remix · dots · Refine stay put while only the
              card photo swipes beneath them (it lives outside the deck). */}
          <View style={styles.deckActionRow}>
            <OutfitActionRow
              testID="home-action-row"
              onRemix={handleRemix}
              onRefine={() => {
                setRefineGated(false);
                refine.open('refine_button');
              }}
              dotCount={OUTFITS_PER_SET}
              activeDot={clampedActiveIndex % OUTFITS_PER_SET}
            />
          </View>
        </View>
      )}

      {pinState.outfit === 'error' ? (
        <View pointerEvents="box-none" style={styles.pinBannerFloat}>
          <PinGenerationError
            kind={pinErrorKind}
            onRetry={() => {
              setPinErrorKind('generic');
              pinDispatch({ type: 'RETRY' });
            }}
          />
        </View>
      ) : pinState.outfit === 'fallback' ? (
        <View pointerEvents="box-none" style={styles.pinBannerFloat}>
          <PinFallbackNotice />
        </View>
      ) : pinState.outfit === 'auth_required' ? (
        <View
          testID="pin-guest-banner"
          pointerEvents="box-none"
          style={styles.pinBannerFloat}
        >
          <View style={styles.pinGuestBox} accessibilityRole="alert">
            <Text style={styles.pinGuestText} numberOfLines={3}>
              {t('pin.guest_blocker')}
            </Text>
            <TouchableOpacity
              testID="pin-guest-signin-cta"
              accessibilityRole="button"
              accessibilityLabel={t('pin.guest_blocker')}
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('Auth', {
                  screen: 'EmailInput',
                  params: { mode: 'signin' },
                });
              }}
              style={styles.pinGuestCta}
            >
              <Text style={styles.pinGuestCtaText}>
                {t('pin.guest_signin_cta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {pinnedItemGoneAt !== null ? (
        <View pointerEvents="box-none" style={styles.pinBannerFloat}>
          <PinnedItemUnavailableNotice />
        </View>
      ) : null}

      {optionSets.length > 0 ? (
        <View style={styles.wearThisFooter}>
          <PillButton
            testID="home-wear-this"
            title={
              activeSaveState === 'saved'
                ? t('home.saved_to_favourite')
                : t('home.wear_this')
            }
            variant="outline"
            onPress={() =>
              activeOutfit && handleWearThisForOutfit(activeOutfit)
            }
            disabled={
              !activeOutfit ||
              activeSaveState === 'saved' ||
              pinState.outfit === 'generating'
            }
            loading={activeSaveState === 'saving'}
            trailing={<IconHomeHeartOutline width={24} height={24} />}
            style={styles.primaryActionFull}
            textStyle={styles.primaryActionLabel}
          />
          {activeSaveState === 'error' ? (
            <Text style={styles.saveErrorText}>
              {t('home.save_failed_retry')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Feedback affordance — 44px floating button, bottom-left of the
          footer, Home only. Opens the in-app Feedback bottom sheet. AI-result
          feedback now lives on the try-on result (see OutfitPreview). */}
      {optionSets.length > 0 ? (
        <TouchableOpacity
          testID="home-feedback-fab"
          accessibilityRole="button"
          accessibilityLabel={t('feedback.title')}
          activeOpacity={0.85}
          onPress={() => setFeedbackVisible(true)}
          style={styles.aiFeedbackFab}
        >
          <IconFeedback
            width={24}
            height={24}
            color={theme.colors.uacTextBase}
          />
        </TouchableOpacity>
      ) : null}

      <HomeViewToggleFooter
        testID="home-footer-view-toggle"
        activeView={homeView}
        onSelectView={setHomeView}
      />

      <ContextChipsModal
        visible={refine.isOpen}
        chipOptions={refine.displayChipOptions}
        selectedChipId={refine.selectedChipId}
        isEditing={refine.isEditing}
        customContextText={refine.customText}
        isSubmitting={false}
        confirmDisabled={refine.confirmDisabled}
        onSelectChip={refine.onSelectChip}
        onShuffle={refine.onShuffle}
        onEdit={refine.onEdit}
        onChangeText={refine.onChangeText}
        onCancel={refine.onCancel}
        onConfirm={refine.onConfirm}
        onSkip={refineGated ? refine.onSkip : undefined}
        title={refineGated ? t('contextChips.refine_title') : undefined}
        subtitle={refineGated ? t('contextChips.refine_subtitle') : undefined}
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

      {moodBannerText ? (
        <View
          testID="mood-feedback-banner"
          accessibilityRole="alert"
          pointerEvents="none"
          style={styles.moodBanner}
        >
          <Text style={styles.moodBannerText}>{moodBannerText}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};
