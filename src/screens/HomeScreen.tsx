import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Sidebar } from '../components/layout/Sidebar';
import {
  ContextChipId,
  ContextChipOption,
  ContextChipsModal,
} from '../components/features/ContextChipsModal';
import { ItemDetailBottomSheet } from '../components/features/ItemDetailBottomSheet';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { Icons } from '../assets/icons';
import IconHomePin from '../assets/images/icon_home_pin.svg';
import { theme } from '../theme/theme';
import { Item } from '../types/item';
import {
  DEFAULT_RECOMMENDATION_MODE,
  Outfit,
  RecommendationMode,
  recommendationService,
} from '../services/recommendationService';
import { favouriteService } from '../services/favouriteService';
import { getImageUrl } from '../utils/url';

const { width: screenWidth } = Dimensions.get('window');

const GRID_GAP = 4;
const SHEET_GAP = 4;
const SHEET_PADDING = 12;
const OPTION_ACTIONS_HEIGHT = 188;
const CARD_WIDTH = Math.floor((screenWidth - SHEET_PADDING * 2 - GRID_GAP) / 2);
const OPTION_SHEET_HEIGHT = Math.round(CARD_WIDTH * (8 / 3) + OPTION_ACTIONS_HEIGHT);
const OPTION_SHEET_SNAP_INTERVAL = OPTION_SHEET_HEIGHT + SHEET_GAP;

const UNFAVORITED_SWIPE_THRESHOLD = 3;
const PREFETCH_LOOKAHEAD = 2;

type OutfitSheet = {
  items: Item[];
  outfitHash: string;
  stylingNote: string;
};

type OutfitSheetWithGrid = OutfitSheet & {
  gridItems: Array<Item | null>;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// H2 fix (2026-05-05 QA sweep): previously hardcoded `Math.max(4, items.length)`
// which forced a 4-tile grid even when the backend returned 3 items, leaving
// an empty gray bottom-right tile that read as a layout bug. Now the grid
// matches the actual item count; if a trailing odd-row placeholder is needed
// for column symmetry, it renders transparently (see `placeholderCard`).
const buildGrid = (items: Item[]): Array<Item | null> =>
  Array.from({ length: items.length }, (_, index) => items[index] || null);

const buildGridOutfitSheet = (outfit: OutfitSheet): OutfitSheetWithGrid => ({
  ...outfit,
  gridItems: buildGrid(outfit.items),
});

// PHASE B (AU-222): MOBILE FALLBACK — until the backend honours
// `pinned_item_id` and reshuffles around it, we splice the pinned item into
// position 0 of the local grid for any sheet that doesn't already contain it.
// Tracked as a backend follow-up: "valen-get-recommendations-offical: mix
// around `pinned_item_id`".
const buildGridOutfitSheetWithPin = (
  outfit: OutfitSheet,
  pinnedItem: Item | null,
): OutfitSheetWithGrid => {
  if (!pinnedItem) {
    return buildGridOutfitSheet(outfit);
  }

  const alreadyContainsPinned = outfit.items.some(
    (item) => item?.id === pinnedItem.id,
  );

  if (alreadyContainsPinned) {
    return buildGridOutfitSheet(outfit);
  }

  // Splice the pinned item into position 0; drop the last item to keep the
  // 4-tile grid shape. Server-side mixing will replace this once available.
  const mixed: Item[] = [pinnedItem, ...outfit.items.slice(0, 3)];
  return {
    ...outfit,
    items: mixed,
    gridItems: buildGrid(mixed),
  };
};

const getSheetIndexFromOffset = (offsetY: number) =>
  Math.max(0, Math.round(offsetY / OPTION_SHEET_SNAP_INTERVAL));

// Normalize the API payload into a uniform `OutfitSheet[]` regardless of
// whether the backend returns `{ outfits: Outfit[] }` (per the typed
// contract in recommendationService.ts) or an `Item[][]` shape (what the
// pre-Phase-A code was implicitly assuming via `currentOutfit` indexing).
//
// `indexOffset` ensures fallback hashes are unique across batches — the
// caller passes the existing list length so a second batch starting at
// internal index 0 never collides with a first-batch hash. `Date.now()`
// alone was insufficient on fast machines / StrictMode double-invokes.
const normalizeOutfits = (data: unknown, indexOffset: number = 0): OutfitSheet[] => {
  if (!data) {
    return [];
  }

  const raw = Array.isArray(data)
    ? (data as unknown[])
    : Array.isArray((data as { outfits?: unknown[] }).outfits)
    ? ((data as { outfits: unknown[] }).outfits)
    : [];

  return raw
    .map((entry, index): OutfitSheet | null => {
      if (!entry) {
        return null;
      }

      const fallbackHash = `outfit-${indexOffset + index}-${Date.now()}`;

      // Outfit shape: { items, outfit_hash, styling_note, ... }
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'items' in entry &&
        Array.isArray((entry as Outfit).items)
      ) {
        const outfit = entry as Outfit;
        return {
          items: outfit.items || [],
          outfitHash: outfit.outfit_hash || fallbackHash,
          stylingNote: outfit.styling_note || '',
        };
      }

      // Legacy shape: a bare Item[] (the pre-Phase-A code path expected this).
      if (Array.isArray(entry)) {
        const items = entry as Item[];
        return {
          items,
          outfitHash: fallbackHash,
          stylingNote: '',
        };
      }

      return null;
    })
    .filter((sheet): sheet is OutfitSheet => sheet !== null);
};

const clearTimeoutRef = (
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) => {
  if (!timeoutRef.current) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
};

// PHASE C (AU-221): copy comes from the Figma sticky `1752:28109` (verbatim
// "Safe Choice / Power Choice / Creative Choice"). No dedicated visual frame
// exists in Figma yet — copy/order/intent only. Refine when the designer
// supplies icons + final positioning.
const RECOMMENDATION_MODE_OPTIONS: ReadonlyArray<{
  id: RecommendationMode;
  label: string;
}> = [
  { id: 'safe', label: 'Safe Choice' },
  { id: 'power', label: 'Power Choice' },
  { id: 'creative', label: 'Creative Choice' },
];

const CONTEXT_CHIP_SETS: ContextChipOption[][] = [
  [
    { id: 'more_relaxed', label: 'More relaxed' },
    { id: 'different_vibe', label: 'Different vibe' },
  ],
  [
    { id: 'more_polished', label: 'More polished' },
    { id: 'more_casual', label: 'More casual' },
  ],
  [
    { id: 'bolder_choice', label: 'Bolder choice' },
    { id: 'simpler_look', label: 'Simpler look' },
  ],
];

export const HomeScreen = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [contextSuggestionSetIndex, setContextSuggestionSetIndex] = useState(0);
  const [selectedContextChipId, setSelectedContextChipId] = useState<ContextChipId | null>(null);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [customContextText, setCustomContextText] = useState('');
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listOutfits, setListOutfits] = useState<OutfitSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [saveStateByHash, setSaveStateByHash] = useState<Record<string, SaveState>>({});
  // PHASE B (AU-222): pin state lives at HomeScreen level, default null,
  // session-only (cleared on unmount, see effect below). One pin at a time.
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null);
  // PHASE C (AU-221): selected recommendation mode. Per-session (does NOT
  // persist across cold starts — the spec explicitly defers persistence
  // until the designer says otherwise). Defaults to `'safe'`.
  const [selectedMode, setSelectedMode] = useState<RecommendationMode>(
    DEFAULT_RECOMMENDATION_MODE,
  );
  // Unfavorited-swipe counter is per-session, never rendered, so we keep it
  // in a ref instead of state to avoid useless re-renders on every swipe.
  const unfavoritedSwipeCountRef = useRef(0);

  const scrollViewRef = useRef<ScrollView>(null);
  // Mirror state into refs so async handlers (mutation onSuccess, momentum
  // scroll end) read the current values without forcing handler recreation.
  const listOutfitsRef = useRef<OutfitSheet[]>([]);
  const saveStateByHashRef = useRef<Record<string, SaveState>>({});
  const isPrefetchingRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  // PHASE B (AU-222): mirror pinnedItemId so the prefetch trigger reads the
  // latest value without recreating callbacks on every pin/unpin tap.
  const pinnedItemIdRef = useRef<string | null>(null);
  // PHASE C (AU-221): mirror selectedMode for the same reason — prefetch
  // and "Show another" callbacks should read the latest mode without
  // re-binding on every tap.
  const selectedModeRef = useRef<RecommendationMode>(DEFAULT_RECOMMENDATION_MODE);
  // Bug 3 fix: read the previous active index from a ref instead of inside
  // a setState updater (updaters must be pure; StrictMode invokes them
  // twice which double-incremented the unfavorited-swipe counter).
  const activeSheetIndexRef = useRef(0);

  useEffect(() => {
    listOutfitsRef.current = listOutfits;
  }, [listOutfits]);

  useEffect(() => {
    activeSheetIndexRef.current = activeSheetIndex;
  }, [activeSheetIndex]);

  useEffect(() => {
    saveStateByHashRef.current = saveStateByHash;
  }, [saveStateByHash]);

  useEffect(() => {
    pinnedItemIdRef.current = pinnedItemId;
  }, [pinnedItemId]);

  useEffect(() => {
    selectedModeRef.current = selectedMode;
  }, [selectedMode]);

  // PHASE B (AU-222): pin is session-only — cleared when Home unmounts,
  // matching Phase A's `unfavoritedSwipeCountRef` reset behaviour.
  useEffect(() => {
    return () => {
      setPinnedItemId(null);
    };
  }, []);

  const resetContextDraft = useCallback(() => {
    setContextSuggestionSetIndex(0);
    setSelectedContextChipId(null);
    setIsEditingContext(false);
    setCustomContextText('');
  }, []);

  const closeContextModal = useCallback(() => {
    Keyboard.dismiss();
    setIsContextModalOpen(false);
    resetContextDraft();
  }, [resetContextDraft]);

  const { mutate: valenGetRecommendation, isPending: isStartPending } = useMutation({
    mutationFn: recommendationService.valenGetRecommendation,
    onSuccess: (data: unknown) => {
      // First load (cold start) → replace. Subsequent loads (prefetch) →
      // append so the user's scroll position isn't yanked back to 0.
      if (isFirstLoadRef.current || listOutfitsRef.current.length === 0) {
        isFirstLoadRef.current = false;
        const incoming = normalizeOutfits(data, 0);
        setListOutfits(incoming);
        setActiveSheetIndex(0);
      } else {
        // Offset fallback-hash indices by the existing list length so the
        // second batch never collides with first-batch hashes (Bug 1).
        const offset = listOutfitsRef.current.length;
        const incoming = normalizeOutfits(data, offset);
        // De-dup against existing hashes — drop any genuine duplicates the
        // backend returns AND any fallback collisions we couldn't avoid.
        setListOutfits((current) => {
          const existingHashes = new Set(current.map((o) => o.outfitHash));
          const deduped = incoming.filter(
            (sheet) => !existingHashes.has(sheet.outfitHash),
          );
          return [...current, ...deduped];
        });
      }

      isPrefetchingRef.current = false;
    },
    onError: (error) => {
      console.error('Failed to load recommendation', error);
      isPrefetchingRef.current = false;
    },
  });

  useEffect(() => {
    // First fetch — pin is null at cold start so no need to thread it here.
    // Pass `mode` consistently with the prefetch call site (Bug 2). The
    // service strips it when it equals DEFAULT_RECOMMENDATION_MODE so the
    // wire body shape stays identical between cold start and prefetch.
    valenGetRecommendation({ mode: selectedModeRef.current });
  }, [valenGetRecommendation]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(snackbarTimeoutRef);
    };
  }, []);

  const loading = isStartPending && listOutfits.length === 0;
  const activeContextChipOptions =
    CONTEXT_CHIP_SETS[contextSuggestionSetIndex] ?? CONTEXT_CHIP_SETS[0];
  const trimmedCustomContextText = customContextText.trim();
  const isContextConfirmDisabled =
    !selectedContextChipId && trimmedCustomContextText.length === 0;

  // PHASE B (AU-222): resolve the pinned item from whatever sheet still has it
  // in its raw payload. We search the unfiltered listOutfits so the lookup
  // survives even if the user has scrolled past the originating sheet.
  const pinnedItem = useMemo<Item | null>(() => {
    if (!pinnedItemId) {
      return null;
    }
    for (const outfit of listOutfits) {
      const found = outfit.items.find((item) => item?.id === pinnedItemId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [listOutfits, pinnedItemId]);

  const optionSets = useMemo<OutfitSheetWithGrid[]>(
    () => listOutfits.map((outfit) => buildGridOutfitSheetWithPin(outfit, pinnedItem)),
    [listOutfits, pinnedItem],
  );

  const activeOutfit = optionSets[activeSheetIndex];
  const activeOutfitHash = activeOutfit?.outfitHash;
  const activeSaveState: SaveState = activeOutfitHash
    ? saveStateByHash[activeOutfitHash] ?? 'idle'
    : 'idle';

  const triggerPrefetchIfNeeded = useCallback(
    (nextIndex: number) => {
      const total = listOutfitsRef.current.length;
      if (total === 0) {
        return;
      }
      if (isPrefetchingRef.current || isStartPending) {
        return;
      }
      if (nextIndex >= total - PREFETCH_LOOKAHEAD) {
        isPrefetchingRef.current = true;
        // PHASE B (AU-222): thread `pinned_item_id` through the prefetch.
        // Note: pin changes intentionally do NOT auto-refetch — the next
        // regular prefetch (or a "Show another" tap that reaches the
        // lookahead window) picks up the latest value via the ref.
        // PHASE C (AU-221): same pattern for `mode` — changing the mode
        // does NOT trigger an immediate refetch (would feel jarring inside
        // the swipe loop); the next prefetch picks it up via the ref.
        valenGetRecommendation({
          pinned_item_id: pinnedItemIdRef.current ?? undefined,
          mode: selectedModeRef.current,
        });
      }
    },
    [isStartPending, valenGetRecommendation],
  );

  const handleHeartTapForOutfit = useCallback(
    (outfit: OutfitSheetWithGrid | OutfitSheet | undefined) => {
      if (!outfit) {
        return;
      }

      const hash = outfit.outfitHash;
      const items = outfit.items || [];
      const previousState = saveStateByHashRef.current[hash] ?? 'idle';

      // Reset the unfavorited-swipe counter on any heart tap.
      unfavoritedSwipeCountRef.current = 0;

      if (previousState === 'saving' || previousState === 'saved') {
        // Already saving / already saved — no-op (matches the legacy heart
        // button which disabled itself in those states).
        return;
      }

      console.info('home.swipe.favorite', { outfitHash: hash });
      // TODO(analytics): replace console.info with the real telemetry hook.

      setSaveStateByHash((current) => ({ ...current, [hash]: 'saving' }));

      // favouriteService currently only exposes `saveFavourite` — no toggle/
      // delete. PHASE B/D follow-up: extend the service with a real `toggle`
      // (or `removeFavourite`) once the Love Collection screen lands.
      favouriteService
        .saveFavourite({
          outfit_hash: hash,
          item_ids: items.map((item) => item.id).filter(Boolean),
          source: 'home',
        })
        .then(() => {
          setSaveStateByHash((current) => ({ ...current, [hash]: 'saved' }));
        })
        .catch((error) => {
          console.warn('saveFavourite failed', error);
          setSaveStateByHash((current) => ({ ...current, [hash]: 'error' }));
        });
    },
    [],
  );

  const handleHeartTapActive = useCallback(() => {
    handleHeartTapForOutfit(activeOutfit);
  }, [activeOutfit, handleHeartTapForOutfit]);

  // PHASE B (AU-222): tap-or-long-press a tile's pin badge to toggle pin.
  // Only one pin at a time — pinning a new item swaps out the prior one.
  // Tapping the currently-pinned item unpins it.
  const handleToggleItemPin = useCallback((item: Item) => {
    if (!item?.id) {
      return;
    }
    setPinnedItemId((current) => {
      if (current === item.id) {
        console.info('home.pin.clear', { itemId: item.id });
        // TODO(analytics): replace console.info with the real telemetry hook.
        return null;
      }
      console.info('home.pin.set', { itemId: item.id });
      // TODO(analytics): replace console.info with the real telemetry hook.
      return item.id;
    });
  }, []);

  // PHASE C (AU-221): mode selection. Per-session, default `'safe'`. Does
  // NOT auto-refetch — picked up by the next prefetch (or "Show another"
  // tap that reaches the lookahead window) via `selectedModeRef`. This
  // mirrors the Phase B pin-change behaviour and avoids a jarring reset
  // mid-swipe.
  const handleSelectMode = useCallback((next: RecommendationMode) => {
    setSelectedMode((current) => {
      if (current === next) {
        return current;
      }
      console.info('home.mode.change', { from: current, to: next });
      // TODO(analytics): replace console.info with the real telemetry hook.
      return next;
    });
  }, []);

  const handleClearPin = useCallback(() => {
    setPinnedItemId((current) => {
      if (!current) {
        return current;
      }
      console.info('home.pin.clear', { itemId: current });
      // TODO(analytics): replace console.info with the real telemetry hook.
      return null;
    });
  }, []);

  // Bug 3 + Bug 4 fix: shared advance helper. Pure ref reads + a single
  // plain setState (not an updater) so StrictMode double-invocations can't
  // double-increment the unfavorited-swipe counter. Called from both the
  // momentum-end callback (real swipe) and "Show another" (programmatic
  // scroll, which does NOT fire onMomentumScrollEnd on iOS).
  const advanceToSheet = useCallback(
    (nextIndex: number, source: 'swipe' | 'showAnother') => {
      const previousIndex = activeSheetIndexRef.current;

      // Counter increments only on transitions to a HIGHER index where the
      // sheet we are leaving was NOT favorited. Scroll-back is ignored.
      if (nextIndex > previousIndex) {
        const fromOutfit = listOutfitsRef.current[previousIndex];
        const fromHash = fromOutfit?.outfitHash;
        const fromState = fromHash
          ? saveStateByHashRef.current[fromHash] ?? 'idle'
          : 'idle';
        const wasFavorited = fromState === 'saved' || fromState === 'saving';

        console.info('home.swipe.miss', {
          fromIndex: previousIndex,
          toIndex: nextIndex,
          source,
        });
        // TODO(analytics): replace console.info with the real telemetry hook.

        if (!wasFavorited) {
          const nextCount = unfavoritedSwipeCountRef.current + 1;
          if (nextCount >= UNFAVORITED_SWIPE_THRESHOLD) {
            unfavoritedSwipeCountRef.current = 0;
            setIsContextModalOpen(true);
          } else {
            unfavoritedSwipeCountRef.current = nextCount;
          }
        }
      }

      if (nextIndex !== previousIndex) {
        activeSheetIndexRef.current = nextIndex;
        setActiveSheetIndex(nextIndex);
      }
      // Always run prefetch — at the tail end the user can rebound on the
      // same sheet and we still want to top up the buffer.
      triggerPrefetchIfNeeded(nextIndex);
    },
    [triggerPrefetchIfNeeded],
  );

  const handleShowAnother = useCallback(() => {
    const total = listOutfitsRef.current.length;
    if (total === 0) {
      return;
    }
    const currentIndex = activeSheetIndexRef.current;
    const nextIndex = Math.min(currentIndex + 1, total - 1);
    if (nextIndex === currentIndex) {
      // Already on last sheet — proactively prefetch so swiping forward
      // works without a stall.
      triggerPrefetchIfNeeded(nextIndex);
      return;
    }
    scrollViewRef.current?.scrollTo({
      y: nextIndex * OPTION_SHEET_SNAP_INTERVAL,
      animated: true,
    });
    // Bug 4 fix: iOS RN does NOT fire onMomentumScrollEnd for programmatic
    // scrollTo, so manually advance the index + run counter logic here.
    advanceToSheet(nextIndex, 'showAnother');
  }, [advanceToSheet, triggerPrefetchIfNeeded]);

  const handleOpenContextEditModal = useCallback(() => {
    Keyboard.dismiss();
    setIsContextModalOpen(true);
  }, []);

  const handleShuffleSuggestions = () => {
    Keyboard.dismiss();
    setContextSuggestionSetIndex(
      (currentIndex) => (currentIndex + 1) % CONTEXT_CHIP_SETS.length,
    );
    setSelectedContextChipId(null);
    setIsEditingContext(false);
    setCustomContextText('');
  };

  const handleSelectContextChip = (chipId: ContextChipId) => {
    Keyboard.dismiss();
    setSelectedContextChipId((currentChipId) => (
      currentChipId === chipId ? null : chipId
    ));
    setIsEditingContext(false);
    setCustomContextText('');
  };

  const handleOpenContextChipEdit = () => {
    setSelectedContextChipId(null);
    setIsEditingContext(true);
  };

  const handleChangeContextText = (text: string) => {
    setSelectedContextChipId(null);
    setIsEditingContext(true);
    setCustomContextText(text);
  };

  const handleSubmitContext = () => {
    // PHASE B/C follow-up: thread `style_feedback` (and `mode`,
    // `pinned_item_id`) into the next valenGetRecommendation call.
    closeContextModal();
  };

  const handleLeadingAction = () => {
    setIsSidebarOpen(true);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = getSheetIndexFromOffset(event.nativeEvent.contentOffset.y);
    // Bug 3 fix: counter mutation lives in advanceToSheet (outer function
    // body), NOT inside a setState updater.
    advanceToSheet(nextIndex, 'swipe');
  };

  return (
    <SafeAreaView testID="home-screen-root" style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <View style={styles.header}>
        <TopIconButton
          onPress={handleLeadingAction}
          icon={<MenuGlyph />}
        />

        <Text style={styles.headerTitle}>Auxi</Text>

        <TouchableOpacity
          testID={activeSaveState === 'saved' ? 'home-heart-toggle-saved' : 'home-heart-toggle'}
          accessibilityLabel={activeSaveState === 'saved' ? 'home-heart-toggle-saved' : 'home-heart-toggle'}
          activeOpacity={0.82}
          style={[
            styles.heartButton,
            activeSaveState === 'saved' && styles.heartButtonSaved,
            activeSaveState === 'error' && styles.heartButtonError,
          ]}
          disabled={
            !activeOutfit ||
            activeSaveState === 'saving' ||
            activeSaveState === 'saved'
          }
          onPress={handleHeartTapActive}
        >
          {activeSaveState === 'saving' ? (
            <ActivityIndicator size="small" color={theme.colors.figmaAction} />
          ) : (
            <Icons.Heart width={24} height={24} />
          )}
        </TouchableOpacity>
      </View>

      {/* PHASE C (AU-221): mode selector (Safe / Power / Creative). Lives
          below the header band per the plan in HOME_SWIPE_PLAN.md §4 phase C.
          Visual spec is text-only — no dedicated Figma frame yet — refine when
          designer provides icons / colors / position. */}
      <View style={styles.modeSelectorRow}>
        {RECOMMENDATION_MODE_OPTIONS.map((option) => {
          const isSelected = option.id === selectedMode;
          return (
            <TouchableOpacity
              key={option.id}
              testID={`home-mode-pill-${option.id}`}
              activeOpacity={0.82}
              onPress={() => handleSelectMode(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
              style={[
                styles.modePill,
                isSelected ? styles.modePillSelected : styles.modePillUnselected,
              ]}
            >
              <Text
                style={[
                  styles.modePillText,
                  isSelected
                    ? styles.modePillTextSelected
                    : styles.modePillTextUnselected,
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* PHASE B (AU-222): subtle pin label below the header — tap to clear.
          Figma 1711:17062's header band itself is unchanged; we render this
          micro-affordance just under it so the user always knows what they
          have pinned and can undo it without hunting for the tile. */}
      {pinnedItem ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleClearPin}
          style={styles.pinHeaderLabel}
        >
          <IconHomePin width={12} height={12} />
          <Text style={styles.pinHeaderLabelText} numberOfLines={1}>
            {`Pinned: ${pinnedItem.category || pinnedItem.color || 'item'}`}
          </Text>
          <Text style={styles.pinHeaderLabelClear}>Clear</Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToAlignment="start"
        snapToInterval={OPTION_SHEET_SNAP_INTERVAL}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {loading ? (
          <HomeLoadingState />
        ) : (
          <>
            {optionSets.map((outfit, sheetIndex) => {
              const sheetSaveState: SaveState =
                saveStateByHash[outfit.outfitHash] ?? 'idle';
              return (
                <OptionSheet
                  key={outfit.outfitHash}
                  sheetIndex={sheetIndex}
                  outfit={outfit}
                  saveState={sheetSaveState}
                  pinnedItemId={pinnedItemId}
                  onShowAnother={handleShowAnother}
                  onItemPress={(item) => setSelectedItem(item)}
                  onTogglePin={handleToggleItemPin}
                  onConfirm={() => handleHeartTapForOutfit(outfit)}
                  onEditContext={handleOpenContextEditModal}
                />
              );
            })}
            {isStartPending && listOutfits.length > 0 ? (
              <LoadingMoreIndicator />
            ) : null}
          </>
        )}
      </ScrollView>

      <ItemDetailBottomSheet
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      <ContextChipsModal
        visible={isContextModalOpen}
        chipOptions={activeContextChipOptions}
        selectedChipId={selectedContextChipId}
        isEditing={isEditingContext}
        customContextText={customContextText}
        isSubmitting={false}
        confirmDisabled={isContextConfirmDisabled}
        onSelectChip={handleSelectContextChip}
        onShuffle={handleShuffleSuggestions}
        onEdit={handleOpenContextChipEdit}
        onChangeText={handleChangeContextText}
        onCancel={closeContextModal}
        onConfirm={handleSubmitContext}
      />
    </SafeAreaView>
  );
};

const OptionSheet = ({
  sheetIndex,
  outfit,
  saveState,
  pinnedItemId,
  onShowAnother,
  onItemPress,
  onTogglePin,
  onConfirm,
  onEditContext,
}: {
  sheetIndex: number;
  outfit: OutfitSheetWithGrid;
  saveState: SaveState;
  pinnedItemId: string | null;
  onShowAnother: () => void;
  onItemPress: (item: Item) => void;
  onTogglePin: (item: Item) => void;
  onConfirm: () => void;
  onEditContext: () => void;
}) => {
  const totalItems = outfit.gridItems.length;
  const rows = [];

  for (let i = 0; i < totalItems; i += 2) {
    const isLastRowWithSingleItem = (i + 1 >= totalItems) && (totalItems % 2 === 1);
    if (isLastRowWithSingleItem) {
      rows.push([outfit.gridItems[i], null]);
    } else {
      rows.push(outfit.gridItems.slice(i, i + 2));
    }
  }

  return (
    <View testID={`home-outfit-sheet-${sheetIndex}`} style={styles.optionSheet}>
      {/* Top action band (Frame 2033 in Figma) — "Show another" */}
      <View style={styles.topActionBand}>
        <PillButton
          testID="home-show-another"
          title="Show another"
          variant="outline"
          onPress={onShowAnother}
          style={styles.topAction}
        />
      </View>

      <ScrollView
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridScrollContent}
      >
        <View style={styles.gridWrap}>
          {rows.map((row, rowIndex) => (
            <View key={`row-${outfit.outfitHash}-${rowIndex}`} style={styles.cardRow}>
              {row.map((item, itemIndex) => {
                const isPinned = !!item && item.id === pinnedItemId;
                const flatTileIndex = rowIndex * 2 + itemIndex;
                return (
                  <View
                    key={`card-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                    style={styles.cardShell}
                  >
                    {item ? (
                      <TouchableOpacity
                        testID={`home-tile-${flatTileIndex}`}
                        accessibilityLabel={`home-tile-${flatTileIndex}`}
                        activeOpacity={0.86}
                        style={[styles.card, isPinned && styles.cardPinned]}
                        onPress={() => onItemPress(item)}
                        // PHASE B (AU-222): long-press as a secondary
                        // affordance for pin toggle. Primary tap target is
                        // the pin badge overlay below — long-press is the
                        // "tap anywhere on the tile" fallback per the spec.
                        onLongPress={() => onTogglePin(item)}
                        delayLongPress={500}
                      >
                        <GarmentPreview item={item} />
                        {/* PHASE B (AU-222): pin badge tap target — Figma
                            1711:17062 places this at the top-right of every
                            tile. Tapping toggles pin for this item. */}
                        <TouchableOpacity
                          testID={isPinned ? `home-tile-pin-${flatTileIndex}-set` : undefined}
                          activeOpacity={0.7}
                          onPress={() => onTogglePin(item)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={[
                            styles.pinBadge,
                            isPinned && styles.pinBadgeActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPinned
                              ? `home-tile-pin-${flatTileIndex}-set`
                              : 'Pin item'
                          }
                        >
                          <IconHomePin width={14} height={14} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.card, styles.placeholderCard]} />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom action cluster (Frame 2017 in Figma) — "This works" + "Edit context" */}
      <View style={styles.actionCluster}>
        <PillButton
          testID="home-this-works"
          title={saveState === 'saved' ? 'Saved to favourite' : 'This works'}
          variant="filled"
          onPress={onConfirm}
          disabled={saveState === 'saved'}
          loading={saveState === 'saving'}
          style={styles.primaryAction}
        />

        {saveState === 'error' ? (
          <Text style={styles.saveErrorText}>
            {"Couldn't save this look. Tap \"This works\" to retry."}
          </Text>
        ) : null}

        <PillButton
          testID="home-edit-context"
          title="Edit context"
          variant="text"
          onPress={onEditContext}
          style={styles.secondaryAction}
          textStyle={styles.secondaryActionText}
        />
      </View>
    </View>
  );
};

const HomeLoadingState = () => (
  <View style={styles.optionSheet}>
    <View style={styles.loadingCards}>
      {[0, 1].map((row) => (
        <View key={`loading-row-${row}`} style={styles.cardRow}>
          {[0, 1].map((column) => (
            <View key={`loading-card-${row}-${column}`} style={styles.cardShell}>
              <View style={[styles.card, styles.loadingCard]} />
            </View>
          ))}
        </View>
      ))}
    </View>

    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" color={theme.colors.figmaAction} />
      <Text style={styles.loadingFooterText}>Building your next looks</Text>
    </View>
  </View>
);

const LoadingMoreIndicator = () => (
  <View style={styles.loadingMoreIndicator}>
    <ActivityIndicator size="small" color={theme.colors.figmaAction} />
    <Text style={styles.loadingMoreText}>Loading more options...</Text>
  </View>
);

const MenuGlyph = () => (
  <View style={styles.menuGlyph}>
    <View style={styles.menuGlyphLine} />
    <View style={styles.menuGlyphLine} />
    <View style={styles.menuGlyphLine} />
  </View>
);

const GarmentPreview = ({ item }: { item: Item }) => {
  const imageUrl = getImageUrl(item.image_url) || item.image_url;

  return (
    <>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="contain" />
      ) : (
        <View style={styles.cardFallback} />
      )}
      <View style={styles.cardTag}>
        <Text style={styles.cardTagText}>common items</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaText,
  },
  heartButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  heartButtonSaved: {
    borderWidth: 1.5,
    borderColor: theme.colors.figmaAction,
  },
  heartButtonError: {
    borderWidth: 1.5,
    borderColor: theme.colors.figmaRed,
  },
  // PHASE C (AU-221): visual spec is text-only; refine when designer
  // provides icons/colors/position. Matches the header's 22px horizontal
  // gutter, 36px pill height, 8px gap, 14px horizontal pill padding.
  modeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
  },
  modePill: {
    flex: 1,
    height: 36,
    // H1 fix (2026-05-05 QA sweep): reduced from 14 to 6. With three pills
    // sharing the row width on iPhone 16 (~111pt each), 14px padding left
    // only ~80pt for "Creative Choice" and the label truncated to
    // "Creative...". 6px each side combined with the 12px text size below
    // gives "Creative Choice" enough room to render in full.
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modePillSelected: {
    backgroundColor: theme.colors.figmaAction,
    borderColor: theme.colors.figmaAction,
  },
  modePillUnselected: {
    backgroundColor: theme.colors.figmaSurface,
    borderColor: theme.colors.figmaAction,
  },
  // H1 fix (2026-05-05 QA sweep): explicit 12px font size overrides the
  // archivoButton alias's 16px. At 16px SemiBold, "Creative Choice"
  // (~95pt) overflowed the available text width and got clipped by
  // numberOfLines={1}. 12px combined with the reduced 6px horizontal
  // padding above keeps all three labels readable and unclipped on the
  // iPhone 16 width (~111pt per pill, ~99pt of text room).
  modePillText: {
    ...theme.typography.aliases.archivoButton,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  modePillTextSelected: {
    color: theme.colors.white,
  },
  modePillTextUnselected: {
    color: theme.colors.figmaAction,
  },
  // PHASE B (AU-222): subtle "Pinned: <category>" hint just below the header
  // band. Tap to clear the pin. Kept tasteful — Figma 1711:17062's header
  // band itself is unchanged; this lives in the gap above the first sheet.
  pinHeaderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    marginHorizontal: 24,
    marginBottom: 4,
  },
  pinHeaderLabelText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextPrimary,
    maxWidth: 200,
  },
  pinHeaderLabelClear: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaAction,
    fontFamily: 'Manrope-Medium',
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: SHEET_GAP,
  },
  optionSheet: {
    height: OPTION_SHEET_HEIGHT,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  topActionBand: {
    paddingBottom: 8,
  },
  topAction: {
    alignSelf: 'stretch',
  },
  gridWrap: {
    gap: GRID_GAP,
  },
  gridScroll: {
    flex: 1,
  },
  gridScrollContent: {
    paddingBottom: 16,
  },
  loadingCards: {
    gap: GRID_GAP,
  },
  cardRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  cardShell: {
    flex: 1,
  },
  card: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: '#ECEEF2',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // PHASE B (AU-222): pinned tile gets a 2px action-coloured ring.
  // Figma 1711:17062 communicates pin via the badge rather than a border;
  // the ring is a small extra cue the spec asked for explicitly.
  cardPinned: {
    borderWidth: 2,
    borderColor: theme.colors.figmaAction,
  },
  // PHASE B (AU-222): pin badge — small rounded pill in the top-right of
  // each tile. Inactive state mirrors the SVG's beige fill on a translucent
  // surface; active state flips to the action colour for clear feedback.
  pinBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.figmaSurface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  pinBadgeActive: {
    backgroundColor: theme.colors.figmaAction,
  },
  loadingCard: {
    backgroundColor: '#E4E7ED',
  },
  // H2 fix (2026-05-05 QA sweep): trailing odd-row placeholder is now
  // transparent so the grid reads as "3 items, balanced layout" rather than
  // "4-tile grid with one missing tile". Only used when the row builder
  // pads an odd item count for column symmetry.
  placeholderCard: {
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#DDE2EA',
  },
  cardTag: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    marginLeft: -28.5,
    width: 57,
    height: 19,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(39,42,50,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 8,
    lineHeight: 12,
    color: theme.colors.white,
  },
  actionCluster: {
    gap: 8,
    alignItems: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
  },
  saveErrorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  secondaryAction: {
    height: 40,
  },
  secondaryActionText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  loadingFooter: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingFooterText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  loadingMoreIndicator: {
    marginHorizontal: 24,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingMoreText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  menuGlyph: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  menuGlyphLine: {
    width: '100%',
    height: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaAction,
  },
});
