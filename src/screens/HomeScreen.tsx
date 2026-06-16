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
  Dimensions,
  Image,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import { useSidebar } from '../context/SidebarContext';
import {
  ContextChipId,
  ContextChipOption,
  ContextChipsModal,
} from '../components/features/ContextChipsModal';
import {
  LEGACY_COACHMARK_STORAGE_KEY,
  SwipeCoachMark,
} from '../components/features/SwipeCoachMark';
import { MoodFeedbackSheet } from '../components/features/MoodFeedbackSheet';
import {
  MoodFeedbackOutfitRef,
  useMoodFeedback,
} from '../hooks/use-mood-feedback';
import {
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import IconHomeMenu from '../assets/images/icon_home_menu.svg';
import IconHomeHeartOutline from '../assets/images/icon_home_heart_outline.svg';
import IconHomeHeartFilled from '../assets/images/icon_home_heart_filled.svg';
import IconHomePin from '../assets/images/icon_home_pin.svg';
import { theme } from '../theme/theme';
import { MacgieLoader } from '../components/macgie';
import { Item } from '../types/item';
import {
  DEFAULT_RECOMMENDATION_MODE,
  Outfit,
  RecommendationMode,
} from '../services/recommendationService';
import {
  recommendV05,
  resetV05Session,
  V05OutfitItem,
} from '../services/v05Api';
import { favouriteService } from '../services/favouriteService';
import { track, trackRecommendationViewedOnce } from '../services/analytics';
import { resolveItemImage } from '../utils/url';
import { weatherService } from '../services/weatherService';
import { WeatherWidget } from '../components/features/WeatherWidget';
import { OutfitCardCaption } from '../components/features/OutfitCardCaption';
import { OutfitActionRow } from '../components/features/OutfitActionRow';
import { OutfitSwipeDeck } from '../components/features/OutfitSwipeDeck';
import { motion } from '../theme/motion';
import {
  HomeView,
  HomeViewToggleFooter,
  HOME_VIEW_TOGGLE_FOOTER_HEIGHT,
} from '../components/features/HomeViewToggleFooter';
import { CollageSheetCanvas } from '../components/features/CollageSheetCanvas';
import { COLLAGE_ASPECT } from '../components/features/collage-seed-layout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTFITS_PER_SET } from '../utils/groupOutfitsIntoSets';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GRID_GAP = 4;
const SHEET_GAP = 4;
// Figma grid container horizontal inset (`dimension/12`) → 12px. Content width
// = 414 − 2×12 = 390 on the 414 frame. (Was 16; corrected per home-grid extraction.)
const SHEET_PADDING = 12;
// Figma grid container vertical inset (py = 8). The optionSheet's own
// paddingTop (12) / paddingBottom (24) carries the caption + CTA chrome and
// feeds the snap-paging height math, so the 8px grid py is applied on the grid
// wrap itself (gridWrapVPad) rather than re-tuning the sheet chrome.
const SHEET_PADDING_V = 8;
// Fixed small-card slot (Figma 127.3×169.733, 3:4). Used by the 2-item drop
// card and the narrow 3rd column of 5/6/>6 bottom rows.
const SMALL_CARD_WIDTH = 127.3;
const SMALL_CARD_HEIGHT = 169.733;
const CARD_ASPECT = 0.75; // Figma 3:4 (width / height) — the CEO's tracked metric

// optionSheet vertical chrome that is NOT the grid. Kept explicit so the
// GRID_AREA derivation below stays arithmetically honest.
// - OPTION_SHEET_VPAD: optionSheet paddingTop(12) + paddingBottom(24).
// - OPTION_ACTIONS_HEIGHT: true non-grid CONTENT inside the sheet —
//   caption pill 40 + 2×12 inter-block gaps (flex-start + gap:12) + action
//   row 32 = 96. The "Wear this" CTA (56) moved OUT of the card to the sticky
//   footer, so it's reserved via WEAR_THIS_FOOTER_HEIGHT below (not here).
const OPTION_SHEET_VPAD = 36;
const OPTION_ACTIONS_HEIGHT = 96;

// Widest a tile can be if it filled the content frame edge-to-edge (the old
// full-bleed width). Used only to size the *ideal* (uncapped) sheet height on
// large screens — on iPhone-class devices AVAILABLE_VIEWPORT caps it.
const MAX_CARD_WIDTH = Math.floor(
  (screenWidth - SHEET_PADDING * 2 - GRID_GAP) / 2,
);

// C-5 (2026-05-05): On iPhone 16 the full-bleed sheet height exceeded the
// available viewport by ~31pt, clipping the bottom action cluster. Cap the
// sheet height to the viewport minus the safe-area + header + footer chrome.
// TODO: replace approximated chrome constants with useSafeAreaInsets() +
// measured header heights once the runtime context is hoisted out of module
// scope (would require restructuring the snap-paging math into the component).
// 2026-05-25: mode selector (48pt) is commented out (see JSX ~950), so its
// space must NOT be reserved here — the phantom reservation capped the sheet
// 48pt too short, squashing tiles below the Figma 3:4 ratio. Now: header (63)
// + scrollContent paddingTop (4). Re-add 48 if the mode selector is restored.
const APPROX_TOP_CHROME = 67;
const APPROX_BOTTOM_SAFE = 34; // home indicator
const APPROX_TOP_SAFE = 59; // status bar / notch (iPhone 16)
// AU-253 fix (2026-05-25): the HomeViewToggleFooter bar is a sibling rendered
// BELOW the outfit ScrollView, so it eats into the scrollable viewport. The
// original viewport math omitted it, leaving each sheet ~98px too tall — the
// bottom "Wear this" CTA fell behind the footer line and rendered clipped.
// Subtract the footer height so the full sheet (incl. CTA) fits above it.
// The "Wear this" CTA is now a sticky footer above the toggle (moved out of the
// card), so reserve its height too — card + CTA footer + toggle must all fit.
const WEAR_THIS_FOOTER_HEIGHT = 72; // PillButton 56 + 8/8 vertical padding
const AVAILABLE_VIEWPORT =
  screenHeight -
  APPROX_TOP_SAFE -
  APPROX_BOTTOM_SAFE -
  APPROX_TOP_CHROME -
  HOME_VIEW_TOGGLE_FOOTER_HEIGHT -
  WEAR_THIS_FOOTER_HEIGHT;
// Ideal (uncapped) sheet height: 2 rows of full-bleed-width 3:4 tiles + the
// non-grid chrome + padding. On large screens this wins; on iPhone-class it's
// capped by AVAILABLE_VIEWPORT.
const COMPUTED_SHEET_HEIGHT = Math.round(
  (MAX_CARD_WIDTH / CARD_ASPECT) * 2 +
    GRID_GAP +
    OPTION_ACTIONS_HEIGHT +
    OPTION_SHEET_VPAD,
);
const OPTION_SHEET_HEIGHT = Math.min(COMPUTED_SHEET_HEIGHT, AVAILABLE_VIEWPORT);

// AU-253 (2026-05-25, Direction 1 — CEO-approved): lock tiles to true 3:4.
// INVERT the old logic — derive HEIGHT from the grid area the sheet can afford
// (2 rows + 1 inter-row gap), then WIDTH from the aspect. The old code fixed
// WIDTH at full-bleed (MAX_CARD_WIDTH) and squashed HEIGHT to fit, yielding a
// ~0.91 aspect (22% off Figma's 0.75). Now tiles stay pixel-true 3:4; the
// trade is horizontal fill (tiles are narrower, the row centers with side
// gutters — see cardRow/cardShell/card styles).
const GRID_AREA_H =
  OPTION_SHEET_HEIGHT - OPTION_ACTIONS_HEIGHT - OPTION_SHEET_VPAD;
// Auto-fit fix (2026-05-31): the inner gridScroll's contentContainer adds a
// bottom pad (see styles.gridScrollContent). It was NOT netted out of the
// row-height math, so a 2-row grid (twoRowOneLarge / twoByTwo) measured
// 2×CARD_HEIGHT + GRID_GAP + GRID_CONTENT_PAD — ~GRID_CONTENT_PAD over the
// maxHeight:GRID_AREA_H bound → bottom row clipped (scroll is dormant by C4
// design, so the user couldn't recover it). GRID_FIT_H is the TRUE height the
// grid rows must fit within. Single source of truth: every layout kind
// (CARD_HEIGHT for 2-row, computeHeroRowHeight for 5+) sizes against it, so
// total grid height ≤ GRID_AREA_H for any item count → nothing clips, no
// scroll needed (preserves the collage drag-to-play C4 fix).
const GRID_CONTENT_PAD = 16;
// Also net out the gridWrap vertical inset (SHEET_PADDING_V top+bottom, added for
// the Figma 8px grid py). Without it the extra 16px overflows GRID_AREA_H and the
// dormant (scrollEnabled=false) gridScroll hard-clips the bottom row on smaller
// devices — the same C4 auto-fit regression this math exists to prevent.
const GRID_FIT_H = GRID_AREA_H - GRID_CONTENT_PAD - SHEET_PADDING_V * 2;
const CARD_HEIGHT = Math.floor((GRID_FIT_H - GRID_GAP) / 2);
const CARD_WIDTH = Math.round(CARD_HEIGHT * CARD_ASPECT);

// Home collage-play surface (Figma section 2850:13589). The "Image 3:4" cream
// tile spans the content width (screen − 2×SHEET_PADDING) at a 3:4 aspect; the
// existing gridScroll ScrollView absorbs any overflow below the fold.
const COLLAGE_SURFACE_WIDTH = screenWidth - SHEET_PADDING * 2;
const COLLAGE_SURFACE_HEIGHT = Math.round(
  COLLAGE_SURFACE_WIDTH * COLLAGE_ASPECT,
);

const UNFAVORITED_SWIPE_THRESHOLD = 3;
// AU-303 prefetch pipeline (re-keyed to SET position): keep ≥1 full set (3
// outfits) buffered ahead of the active FLAT position (setIndex*3+outfitIndex).
// `ensureBuffer` fires one `/try_another` whenever the flat-outfit lookahead gap
// drops below this. A batch from /build or /try_another (count 3) ≈ one set, so
// 3 keeps roughly one set buffered ahead.
const TARGET_AHEAD = OUTFITS_PER_SET; // 3 — one full set ahead

type OutfitSheet = {
  items: Item[];
  outfitHash: string;
  // Per-outfit caption text. Sourced from V05 `reasoning_human` (the engine
  // §6.4 template or LLM-3 override) via buildViaV05 → normalizeOutfits.
  // Null when absent → OutfitCardCaption renders DEFAULT_CAPTION fallback.
  caption?: string | null;
};

type OutfitSheetWithGrid = OutfitSheet & {
  gridItems: Array<Item | null>;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// AU-318: payload the "Wear this" CTA hands to useMoodFeedback. Carries the
// original sheet so the policy-gated direct-save branch can reuse the legacy
// handler unchanged.
type WearThisPayload = MoodFeedbackOutfitRef & {
  outfit: OutfitSheet | OutfitSheetWithGrid;
};

// AU-318: success banner auto-dismiss window (~3s per ticket).
const MOOD_BANNER_DURATION_MS = 3000;

// V05 fetch input (260526): the mutation variables shared by `buildViaV05`
// and the `requestRecommendation` guard. Naming the type (instead of
// `Parameters<typeof mutate>[0]`) keeps ESLint's scope analysis happy.
type BuildViaV05Input = {
  mode?: RecommendationMode;
  style_feedback?: string;
  pinned_item_id?: string | null;
  // V05 try_another (260525): the active sheet's hash. The `recommendV05`
  // façade routes the first call to `/build` (no session) and every
  // subsequent call to `/try_another`, threading this as
  // `current_outfit_hash`. Falls back to the service's cached last hash when
  // the call site can't supply it (cold start).
  current_outfit_hash?: string;
  // Prefetch pipeline (260526): session generation captured at mutate time.
  // NOT sent over the wire — consumed only in `onSuccess` (via mutation
  // `variables`) to drop stale-session results. See `fetchGenerationRef`.
  __gen?: number;
};

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
    item => item?.id === pinnedItem.id,
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

// Normalize the API payload into a uniform `OutfitSheet[]` regardless of
// whether the backend returns `{ outfits: Outfit[] }` (per the typed
// contract in recommendationService.ts) or an `Item[][]` shape (what the
// pre-Phase-A code was implicitly assuming via `currentOutfit` indexing).
//
// `indexOffset` ensures fallback hashes are unique across batches — the
// caller passes the existing list length so a second batch starting at
// internal index 0 never collides with a first-batch hash. `Date.now()`
// alone was insufficient on fast machines / StrictMode double-invokes.
const normalizeOutfits = (
  data: unknown,
  indexOffset: number = 0,
): OutfitSheet[] => {
  if (!data) {
    return [];
  }

  const raw = Array.isArray(data)
    ? (data as unknown[])
    : Array.isArray((data as { outfits?: unknown[] }).outfits)
    ? (data as { outfits: unknown[] }).outfits
    : [];

  return raw
    .map((entry, index): OutfitSheet | null => {
      if (!entry) {
        return null;
      }

      // Deterministic fallback — `indexOffset + index` is already unique
      // within a session (callers pass the existing list length as offset).
      // Adding Date.now() here would make the same-data refetch produce a
      // new hash and defeat the saveStateByHash dedup keyed on outfitHash.
      const fallbackHash = `outfit-${indexOffset + index}`;

      // Outfit shape: { items, outfit_hash, ... }
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
          // Carried from V05 `reasoning_human` by buildViaV05 (not on the
          // legacy Outfit type, hence the local widen). Null when absent so
          // OutfitCardCaption falls back to DEFAULT_CAPTION.
          caption: (outfit as { caption?: string | null }).caption ?? null,
        };
      }

      // Legacy shape: a bare Item[] (the pre-Phase-A code path expected this).
      if (Array.isArray(entry)) {
        const items = entry as Item[];
        return {
          items,
          outfitHash: fallbackHash,
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
// parked: the mode-selector JSX that consumes this is commented out (see line
// ~1549), awaiting designer icons/positioning per AU-221. Retained intentionally.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// i18n display keys for chip labels (defaultNS `boilerplate`). The chip `id`
// stays the canonical lookup/selection key; these resolve display copy only.
// Note: two ids deviate from the `chip_<id>` shape (bolder_choice/simpler_look).
const CONTEXT_CHIP_LABEL_KEYS: Record<ContextChipId, string> = {
  more_relaxed: 'home.chip_more_relaxed',
  different_vibe: 'home.chip_different_vibe',
  more_polished: 'home.chip_more_polished',
  more_casual: 'home.chip_more_casual',
  bolder_choice: 'home.chip_bolder',
  simpler_look: 'home.chip_simpler',
};

export const HomeScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { open: openSidebar } = useSidebar();
  // AU-253 / collage-play: Home view mode toggled by the bottom footer bar.
  // 'grid' = adaptive image grid (default); 'collage' = drag-to-play canvas.
  const [homeView, setHomeView] = useState<HomeView>('grid');
  // True while a collage item is being dragged — freezes both the paging
  // ScrollView and the inner grid scroll so a native scroll can't hijack the
  // drag (the long-press arm fires this before any movement).
  const [collageDragActive, setCollageDragActive] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [contextSuggestionSetIndex, setContextSuggestionSetIndex] = useState(0);
  const [selectedContextChipId, setSelectedContextChipId] =
    useState<ContextChipId | null>(null);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [customContextText, setCustomContextText] = useState('');
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listOutfits, setListOutfits] = useState<OutfitSheet[]>([]);
  // Tinder deck: a single active card index into the flat `optionSets`. The
  // deck only advances forward (like/skip); `outfitHash` keys save state so it
  // is position-independent. (Replaces the AU-303 two-axis setIndex/outfitIndex.)
  const [activeIndex, setActiveIndex] = useState(0);
  const [saveStateByHash, setSaveStateByHash] = useState<
    Record<string, SaveState>
  >({});
  // PHASE B (AU-222): pin state lives at HomeScreen level, default null,
  // session-only (cleared on unmount, see effect below). One pin at a time.
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null);
  // PHASE C (AU-221): selected recommendation mode. Per-session (does NOT
  // persist across cold starts — the spec explicitly defers persistence
  // until the designer says otherwise). Defaults to `'safe'`.
  const [selectedMode, setSelectedMode] = useState<RecommendationMode>(
    DEFAULT_RECOMMENDATION_MODE,
  );
  // PHASE D (AU-252): user's active style feedback. `null` = no refinement.
  // Set by `handleSubmitContext`. Read by `valenGetRecommendation` call
  // sites via `styleFeedbackRef`. Per-session, never persisted.
  const [styleFeedback, setStyleFeedback] = useState<string | null>(null);
  // Sustainability (2026-05-27): the backend now re-serves a real (cycled)
  // outfit once uniques are exhausted. `true` once any resolve carries
  // `cycled` — drives a subtle non-blocking "seen them all" hint. Cleared on
  // a fresh build (cold start) so a new context starts clean.
  const [hasCycled, setHasCycled] = useState(false);
  // Sustainability (2026-05-27): set when `/try_another` reports a GENUINE
  // `wardrobe_gap` (wardrobe too small to compose any outfit). Terminal —
  // drives a visible "add items" CTA instead of the silent freeze. Distinct
  // from `startError` (thrown errors) and from transient pool exhaustion
  // (which no longer dead-ends thanks to the backend replenish + cycle).
  const [isWardrobeGap, setIsWardrobeGap] = useState(false);
  // Unfavorited-swipe counter is per-session, never rendered, so we keep it
  // in a ref instead of state to avoid useless re-renders on every swipe.
  const unfavoritedSwipeCountRef = useRef(0);
  // Mirror state into refs so async handlers (mutation onSuccess, momentum
  // scroll end) read the current values without forcing handler recreation.
  const listOutfitsRef = useRef<OutfitSheet[]>([]);
  const saveStateByHashRef = useRef<Record<string, SaveState>>({});
  // Prefetch pipeline (260526): COUNT of in-flight recommendation fetches, not
  // a boolean. A forced refine-submit can briefly overlap a still-draining
  // stale prefetch (2 in flight); a boolean can't represent that and would let
  // a swipe slip a 3rd concurrent call through when the stale one resolves and
  // flips the flag while the forced build is still loading. The counter gates
  // any new fetch until it returns to 0, so swipe-spam never exceeds 1 in
  // flight and a refine overlap is capped at 2 (the stale result is dropped).
  const inFlightCountRef = useRef(0);
  // Prefetch pipeline (260526): set when a `try_another` resolves with an empty
  // outfit (200 + v05_pool_insufficient — the pool has nothing left for this
  // session/context). Stops the chained/swipe prefetch from instantly re-firing
  // an empty pool into the rate limiter (the A2 spam bug). Cleared on cold-start
  // build and on every `resetV05Session()` (refine / mode change) — a new
  // context may replenish the pool.
  const poolDepletedRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  // Prefetch pipeline (260526): generation counter bumped on every
  // `resetV05Session()` (refine submit, mode change). Each in-flight fetch
  // captures the generation at mutate time; on resolve we drop the result if
  // the generation has since advanced, so a prefetch fired against the OLD
  // session can't append stale outfits into the NEW session's list.
  const fetchGenerationRef = useRef(0);
  // Prefetch pipeline (260526): holds the latest `ensureBuffer` so the
  // mutation `onSuccess` can chain the next prefetch without a
  // declaration-order cycle (ensureBuffer depends on the mutation's mutate).
  // `force` bypasses the `ahead < TARGET_AHEAD` gate — used once on cold
  // start to prime the pipeline even though build already returned a full
  // buffer (CEO's "build → +1 try_another" eager kick).
  const ensureBufferRef = useRef<(force?: boolean) => void>(() => {});
  // PHASE B (AU-222): mirror pinnedItemId so the prefetch trigger reads the
  // latest value without recreating callbacks on every pin/unpin tap.
  const pinnedItemIdRef = useRef<string | null>(null);
  // PHASE C (AU-221): mirror selectedMode for the same reason — prefetch
  // and "Show another" callbacks should read the latest mode without
  // re-binding on every tap.
  const selectedModeRef = useRef<RecommendationMode>(
    DEFAULT_RECOMMENDATION_MODE,
  );
  // Bug 3 fix: read the previous active position from a ref instead of inside a
  // setState updater (updaters must be pure; StrictMode invokes them twice).
  const activeIndexRef = useRef(0);
  // PHASE D (AU-252): mirror styleFeedback so prefetch + show-another reads
  // the latest value without recreating callbacks on every submit. Sticky
  // for the session — cleared only when the user re-submits the modal
  // with a different chip / text. Same lifecycle as pinnedItemIdRef.
  const styleFeedbackRef = useRef<string | null>(null);
  // Analytics: `outfit_recommendation_viewed.source`. Flipped to 'refine' when
  // a refine submit repopulates the deck; the next settle fires with 'refine'
  // and the ref then flips back to 'feed' so subsequent advances are 'feed'.
  const recommendationSourceRef = useRef<'feed' | 'refine'>('feed');

  // #1 fix (2026-05-13): weather widget replaces "Auxi" header text per Figma spec.
  const [weather, setWeather] = useState<{ tempC: number; iconCode: string }>({
    tempC: 22,
    iconCode: '01d',
  });

  useEffect(() => {
    // Default coords: Hanoi. Replace with real geolocation when available.
    weatherService
      .getWeather(21.0285, 105.8542)
      .then(w => setWeather({ tempC: w.temp_c, iconCode: w.icon_code }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    listOutfitsRef.current = listOutfits;
  }, [listOutfits]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Analytics §3.3 #22 — outfit_recommendation_viewed (★).
  // Fires when the active outfit hash changes AND the refine modal is closed.
  // The dedup Set in `trackRecommendationViewedOnce` collapses prefetch over-count
  // and re-mounts of the same outfit (per-session). `position` is 1-based.
  useEffect(() => {
    if (isContextModalOpen) {
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
    // First settle after a refine submit is reported as 'refine'; subsequent
    // advances flip back to 'feed' (default).
    if (source === 'refine') {
      recommendationSourceRef.current = 'feed';
    }
    trackRecommendationViewedOnce(hash, {
      position: clamped + 1,
      source,
    });
  }, [activeIndex, listOutfits, isContextModalOpen]);

  // Retire superseded coach-mark keys on mount so existing users see the
  // corrected single left/right deck overlay once: the old single-overlay
  // `swipe-home` and the now-removed vertical `swipe-set`. Fire-and-forget.
  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_COACHMARK_STORAGE_KEY).catch(() => {});
    AsyncStorage.removeItem('@auxi/coachmark/swipe-set').catch(() => {});
  }, []);

  useEffect(() => {
    saveStateByHashRef.current = saveStateByHash;
  }, [saveStateByHash]);

  useEffect(() => {
    pinnedItemIdRef.current = pinnedItemId;
  }, [pinnedItemId]);

  useEffect(() => {
    selectedModeRef.current = selectedMode;
  }, [selectedMode]);

  useEffect(() => {
    styleFeedbackRef.current = styleFeedback;
  }, [styleFeedback]);

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

  // V05 migration (260518): swap the legacy Valen endpoint for v05 build.
  // The Valen request shape `{mode, style_feedback}` is mapped to V05's
  // structured input (weather + user + intent + count). V05 response items
  // need shape-mapping to the legacy `Item` type before normalizeOutfits.
  const buildViaV05 = useCallback(
    async (
      input: BuildViaV05Input,
    ): Promise<{
      outfits: Outfit[];
      cycled?: boolean;
      wardrobeGap?: boolean;
    }> => {
      // H6 fix (2026-05-22): the previous map was keyed on occasion-like
      // strings (casual/work/play/date/weekend) but `input.mode` is the
      // RecommendationMode enum ('safe'|'power'|'creative'). The lookup
      // was always undefined so the mode pill silently sent `mood: null`
      // on every request — V05 received no intent variation between
      // Safe/Power/Creative taps. The `as unknown as` cast was hiding the
      // type mismatch; remove it now that keys are exhaustive.
      const moodMap: Record<RecommendationMode, string | null> = {
        safe: 'calm',
        power: 'confident',
        creative: 'playful',
      };
      // `mode` is optional on the shared input type but every call site
      // supplies it; fall back to the default so the index access stays typed.
      const mode = input.mode ?? DEFAULT_RECOMMENDATION_MODE;
      const mood = moodMap[mode] ?? null;
      const occasion = mode || DEFAULT_RECOMMENDATION_MODE;

      // recommendV05 routes build-vs-try_another internally off the cached
      // V05 session. Build-shaping inputs (weather/user/intent/count) are
      // consumed only on the cold-start `/build`; the variation inputs
      // (mode/style_feedback/pinned_item_id/current_outfit_hash) flow into
      // `/try_another`. RecommendationMode and V05RecommendationMode share
      // the same string union ('safe'|'power'|'creative').
      const v05 = await recommendV05({
        weather: { temp_c: weather.tempC, is_rainy: false },
        user: { gender: 'U', occasion },
        intent: { mood: mood as never },
        count: 3,
        mode,
        style_feedback: input.style_feedback,
        pinned_item_id: input.pinned_item_id ?? undefined,
        current_outfit_hash: input.current_outfit_hash,
      });

      // Map V05Outfit -> legacy Outfit shape. normalizeOutfits picks up
      // `outfit_hash` directly; `items` get shape-coerced for tile rendering.
      const FAMILY_TO_CATEGORY: Record<string, string> = {
        TOP: 'Top',
        BOTTOM: 'Bottom',
        OUTER: 'Outerwear',
        FOOTWEAR: 'Shoes',
        FULL_BODY: 'Dress',
        ACCESSORY: 'Accessory',
      };
      const mapItem = (it: V05OutfitItem): Item => ({
        id: it.id,
        image_url: it.image_url ?? '',
        image_png: it.image_png ?? null,
        // AU-312 review fix: carry the backend display name so the
        // ItemDetail fallback payload can render a real title instead of
        // degrading to the category label.
        name: it.name ?? null,
        category: it.category_family
          ? FAMILY_TO_CATEGORY[it.category_family] ?? it.category_family
          : 'Top',
        color: it.color_code ?? '',
        style: it.style_tags?.[0],
        isSystem: it.source === 'common_essential',
        // AU-351: carry the backend exploration flag so renderTile can show
        // the "Your Piece" badge on newly-uploaded items.
        isExploration: it.is_exploration_item ?? false,
      });

      return {
        outfits: v05.outfits.map(o => ({
          items: o.items.map(mapItem),
          outfit_hash: o.outfit_hash,
          // V05 `reasoning_human` (engine §6.4 template or LLM-3 override) is
          // the per-outfit caption copy — same field on /build and
          // /try_another. Carry it so normalizeOutfits → OutfitCardCaption
          // renders real text instead of the stubbed DEFAULT_CAPTION fallback.
          caption: o.reasoning_human,
        })) as unknown as Outfit[],
        // Sustainability flags (2026-05-27): `cycled` = real re-served outfit
        // (uniques exhausted, show subtle hint); `wardrobeGap` = genuine
        // dead-end (wardrobe too small, surface terminal CTA). See onSuccess.
        cycled: v05.cycled,
        wardrobeGap: v05.wardrobeGap,
      };
    },
    [weather.tempC],
  );

  const {
    mutate: valenGetRecommendation,
    isPending: isStartPending,
    // Error UI fix (2026-05-22): surface mutation error so the screen can
    // render an actionable fallback instead of leaving the user on a blank
    // canvas after a failed cold-start fetch. `reset` clears the error
    // before retry so the fallback toggles back to loading on the next
    // attempt.
    error: startError,
    reset: resetStartMutation,
  } = useMutation({
    mutationFn: buildViaV05,
    onSuccess: (data: unknown, variables) => {
      // Stale-session guard (Change 3): always decrement the in-flight counter
      // first (every mutate is paired with exactly one onSuccess/onError, so
      // this can't leak), THEN drop a result captured against a superseded
      // session (refine/mode reset bumped the generation mid-flight) — never
      // appended/replaced into the new session's list. Decrementing even for
      // dropped results is what lets the mode-change path (no immediate
      // refetch) resume prefetching once its stale call drains.
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
      const capturedGen = variables?.__gen ?? 0;
      if (capturedGen !== fetchGenerationRef.current) {
        return;
      }

      // Sustainability flags (2026-05-27). `data` is typed `unknown` (the
      // mutation erases buildViaV05's return type); read the two optional
      // flags off it without disturbing normalizeOutfits.
      const flags = data as { cycled?: boolean; wardrobeGap?: boolean };
      if (flags?.cycled) {
        setHasCycled(true);
      }

      let isColdStart = false;
      // `addedCount` = how many NEW sheets this resolve actually contributed.
      // 0 means an empty/depleted pool (or an all-duplicate batch) — used below
      // to STOP the chain instead of spam-retrying (the A2 fix).
      let addedCount = 0;
      // First load (cold start) → replace. Subsequent loads (prefetch) →
      // append so the user's scroll position isn't yanked back to 0.
      if (isFirstLoadRef.current || listOutfitsRef.current.length === 0) {
        isFirstLoadRef.current = false;
        isColdStart = true;
        const incoming = normalizeOutfits(data, 0);
        addedCount = incoming.length;
        setListOutfits(incoming);
        // Cold start resets the deck to the first card and clears the
        // per-session unfavourited-skip counter (fresh session = clean slate).
        setActiveIndex(0);
        activeIndexRef.current = 0;
        unfavoritedSwipeCountRef.current = 0;
        // Fresh session/context → the pool may have outfits again. Clear the
        // sustainability flags too — a new build is a clean slate (the gap
        // CTA / cycled hint should not bleed across a refine/mode reset).
        poolDepletedRef.current = false;
        if (addedCount > 0) {
          setHasCycled(false);
          setIsWardrobeGap(false);
        }
      } else {
        // Offset fallback-hash indices by the existing list length so the
        // second batch never collides with first-batch hashes (Bug 1).
        const offset = listOutfitsRef.current.length;
        const incoming = normalizeOutfits(data, offset);
        // De-dup against existing hashes — drop any genuine duplicates the
        // backend returns AND any fallback collisions we couldn't avoid.
        // Compute synchronously so we know whether the list actually grew.
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
      }

      // Eager + chained prefetch (Change 2) — but ONLY when this resolve added
      // an outfit. A `try_another` against a depleted pool returns 200 with an
      // empty outfit (v05_pool_insufficient); it never grows `ahead`, so
      // chaining on it re-fires instantly and spam-loops into the rate limiter
      // (the A2 bug). On a no-progress result, mark the pool depleted and STOP
      // — a later refine/mode reset clears the flag and resumes the pipeline.
      if (addedCount === 0) {
        poolDepletedRef.current = true;
        // Fix D (2026-05-27): distinguish a GENUINE wardrobe gap (terminal —
        // wardrobe too small to compose anything) from transient exhaustion.
        // With the backend replenish + cycle fix, transient exhaustion should
        // no longer reach here (it re-serves a `cycled` outfit). Only a real
        // `wardrobe_gap` produces an empty batch now → surface the CTA so the
        // user isn't left staring at a silently frozen list. We do NOT
        // auto-rebuild — the backend owns sustainability.
        if (flags?.wardrobeGap) {
          setIsWardrobeGap(true);
        }
        return;
      }
      // The cold-start branch force-primes one prefetch (build returns 3 →
      // ahead=2, which `ensureBuffer` treats as full); every other resolve
      // re-checks the buffer so the next prefetch chains while the user is
      // paused. listOutfitsRef is synced from listOutfits in an effect, so
      // defer to the next tick.
      setTimeout(() => {
        ensureBufferRef.current(isColdStart);
      }, 0);
    },
    onError: error => {
      console.error('Failed to load recommendation', error);
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
    },
  });

  // Single in-flight guard (Change 1, 260526): the ONE entry point for every
  // fetch. Increments the in-flight counter before mutating and stamps the
  // current session generation so `onSuccess` can drop stale results. Without
  // `force` it no-ops while any call is in flight (spam guard: rapid swipes /
  // taps can never produce two concurrent `/try_another` calls). With `force`
  // (user intent — refine submit) it proceeds even if a stale prefetch is still
  // draining; the counter caps the overlap at 2 and the stale result is dropped
  // via the generation guard, so no swipe can sneak in a 3rd concurrent call.
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
    // First fetch — pin is null at cold start so no need to thread it here.
    // Pass `mode` consistently with the prefetch call site (Bug 2). The
    // service strips it when it equals DEFAULT_RECOMMENDATION_MODE so the
    // wire body shape stays identical between cold start and prefetch.
    // PHASE D (AU-252): style_feedback is null at cold start (refs init
    // null, only set after `handleSubmitContext`). Thread anyway so the
    // call shape stays consistent across all 3 fetch sites.
    requestRecommendation({
      mode: selectedModeRef.current,
      style_feedback: styleFeedbackRef.current ?? undefined,
    });
  }, [requestRecommendation]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(snackbarTimeoutRef);
    };
  }, []);

  const loading = isStartPending && listOutfits.length === 0;
  // Canonical (English) chip set — `label` is consumed by the backend engine
  // prompt verbatim (see handleSubmitContext). Keep raw, do NOT localize here.
  // A display-only localized copy (`displayContextChipOptions`) is derived
  // below, after the `t` instance is available.
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
      const found = outfit.items.find(item => item?.id === pinnedItemId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [listOutfits, pinnedItemId]);

  const optionSets = useMemo<OutfitSheetWithGrid[]>(
    () =>
      listOutfits.map(outfit =>
        buildGridOutfitSheetWithPin(outfit, pinnedItem),
      ),
    [listOutfits, pinnedItem],
  );

  // Tinder deck: clamp the active index into the available data (prefetch
  // append / a depleted pool can momentarily shrink bounds).
  const clampedActiveIndex =
    optionSets.length > 0 ? Math.min(activeIndex, optionSets.length - 1) : 0;
  const activeOutfit = optionSets[clampedActiveIndex];
  const activeOutfitHash = activeOutfit?.outfitHash;
  const activeSaveState: SaveState = activeOutfitHash
    ? saveStateByHash[activeOutfitHash] ?? 'idle'
    : 'idle';

  // Prefetch pipeline (Change 2, 260526): the buffer check. Fires ONE
  // `/try_another` when the lookahead gap drops below TARGET_AHEAD (or always,
  // when `force` — the eager cold-start kick). Reads everything from refs so
  // it can run from swipe, from `onSuccess` chaining, and from the eager
  // build-prime without re-binding. The single in-flight guard lives in
  // `requestRecommendation`, so a no-op-while-in-flight call here is harmless
  // and naturally stops the chain once TARGET_AHEAD is met (no infinite loop).
  const ensureBuffer = useCallback(
    (force = false) => {
      const total = listOutfitsRef.current.length;
      if (total === 0) {
        return;
      }
      if (inFlightCountRef.current > 0) {
        return;
      }
      // Pool depleted for this session/context — don't keep probing an empty
      // pool on every swipe (A2 fix). Cleared on cold-start build / session
      // reset (refine, mode change).
      if (poolDepletedRef.current) {
        return;
      }
      // Lookahead is measured against the active deck index. Keeping
      // TARGET_AHEAD outfits buffered ahead means the next swipe always has a
      // card ready.
      const activeFlat = activeIndexRef.current;
      const ahead = total - 1 - activeFlat;
      if (!force && ahead >= TARGET_AHEAD) {
        return;
      }
      // V05 try_another (260525): thread the active sheet's hash as
      // `current_outfit_hash` so the prefetch hits `/try_another` (cheap
      // pool serve) instead of a full `/build`. The first prefetch after
      // a cold start still rebuilds (no session yet); after that every
      // prefetch is a variation. The service falls back to its own cached
      // last-hash when this is undefined.
      const currentHash = listOutfitsRef.current[activeFlat]?.outfitHash;
      // PHASE B (AU-222): thread `pinned_item_id` through the prefetch.
      // Note: pin changes intentionally do NOT auto-refetch — the next
      // prefetch (or a "Show another" tap that reaches the lookahead
      // window) picks up the latest value via the ref.
      // PHASE C (AU-221): same pattern for `mode` — changing the mode does
      // NOT trigger an immediate refetch; the next prefetch picks it up.
      requestRecommendation({
        pinned_item_id: pinnedItemIdRef.current ?? undefined,
        mode: selectedModeRef.current,
        // PHASE D (AU-252): inherit active style feedback. BE
        // session_manager sliding-windows last 3 notes, so re-sending on
        // every prefetch is redundant but cheap and contract-clean.
        style_feedback: styleFeedbackRef.current ?? undefined,
        current_outfit_hash: currentHash,
      });
    },
    [requestRecommendation],
  );

  // Keep the ref pointing at the latest `ensureBuffer` so the mutation
  // `onSuccess` (declared above) can chain the next prefetch.
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

      // Reset the unfavorited-swipe counter on any heart tap.
      unfavoritedSwipeCountRef.current = 0;

      if (previousState === 'saving' || previousState === 'saved') {
        // Already saving / already saved — no-op (matches the legacy heart
        // button which disabled itself in those states).
        return;
      }

      console.info('home.swipe.favorite', { outfitHash: hash });
      // TODO(analytics): replace console.info with the real telemetry hook.

      setSaveStateByHash(current => ({ ...current, [hash]: 'saving' }));

      // favouriteService currently only exposes `saveFavourite` — no toggle/
      // delete. PHASE B/D follow-up: extend the service with a real `toggle`
      // (or `removeFavourite`) once the Love Collection screen lands.
      favouriteService
        .saveFavourite({
          outfit_hash: hash,
          item_ids: items.map(item => item.id).filter(Boolean),
          source: 'home',
        })
        .then(() => {
          setSaveStateByHash(current => ({ ...current, [hash]: 'saved' }));
          // Value Moment: a recommended outfit the user actively saved.
          track('outfit_favorited', {
            outfit_hash: hash,
            item_count: items.length,
            source: 'home',
          });
        })
        .catch(error => {
          console.warn('saveFavourite failed', error);
          setSaveStateByHash(current => ({ ...current, [hash]: 'error' }));
        });
    },
    [],
  );

  const handleHeartTapActive = useCallback(() => {
    handleHeartTapForOutfit(activeOutfit);
  }, [activeOutfit, handleHeartTapForOutfit]);

  // ── AU-318 mood feedback flow ────────────────────────────────────────────
  // "Wear this" no longer saves immediately: the policy-gated mood sheet
  // opens first, and Done saves outfit + mood_tags atomically. All flow state
  // (policy cache, modal lock, pending outfit, state machine, analytics)
  // lives in useMoodFeedback — this screen is wiring only. The header heart
  // (handleHeartTapActive above) keeps the legacy immediate-save path.
  const { t } = useTranslation();
  // Display-only copy of the active chip set: same ids, labels resolved via
  // t() for the modal UI. Selection + API payload still flow through the
  // canonical `activeContextChipOptions` (see handleSubmitContext).
  const displayContextChipOptions = useMemo<ContextChipOption[]>(
    () =>
      activeContextChipOptions.map(option => ({
        ...option,
        label: t(CONTEXT_CHIP_LABEL_KEYS[option.id], {
          defaultValue: option.label,
        }),
      })),
    [activeContextChipOptions, t],
  );
  const [moodBannerText, setMoodBannerText] = useState<string | null>(null);

  // Reuses the pre-existing snackbarTimeoutRef (declared with the other
  // refs; cleared on unmount by the effect at the top of the component).
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
      // Same post-save semantics as the legacy path: the CTA flips to
      // "Saved to favourite" via saveStateByHash.
      setSaveStateByHash(current => ({ ...current, [outfitHash]: 'saved' }));
      showMoodBanner(
        t(updated ? 'mood.moodUpdatedBanner' : 'mood.savedBanner'),
      );
    },
    [showMoodBanner, t],
  );

  const { onWearThisPress, sheetProps: moodSheetProps } =
    useMoodFeedback<WearThisPayload>({
      saveDirectly: pending => handleHeartTapForOutfit(pending.outfit),
      onSaveSuccess: handleMoodSaveSuccess,
    });

  // AU-318: the OptionSheet "Wear this" CTA routes here instead of straight
  // into the save. Zero changes to swipe/prefetch paths.
  const handleWearThisForOutfit = useCallback(
    (outfit: OutfitSheetWithGrid | OutfitSheet | undefined) => {
      if (!outfit) {
        return;
      }
      // Parity with the legacy handler: an explicit positive action resets
      // the unfavorited-swipe counter.
      unfavoritedSwipeCountRef.current = 0;
      onWearThisPress({
        outfitHash: outfit.outfitHash,
        itemIds: (outfit.items || []).map(item => item.id).filter(Boolean),
        // The build request sends the selected mode as `user.occasion`
        // (see buildViaV05) — thread the same value so contextual chip sets
        // light up if/when real occasions flow through it.
        occasion: selectedModeRef.current,
        outfit,
      });
    },
    [onWearThisPress],
  );

  // PHASE B (AU-222): tap-or-long-press a tile's pin badge to toggle pin.
  // Only one pin at a time — pinning a new item swaps out the prior one.
  // Tapping the currently-pinned item unpins it.
  const handleToggleItemPin = useCallback((item: Item) => {
    if (!item?.id) {
      return;
    }
    setPinnedItemId(current => {
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
  // parked: wired to the commented-out mode selector (line ~1549), AU-221.
  // Kept intentionally.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectMode = useCallback((next: RecommendationMode) => {
    setSelectedMode(current => {
      if (current === next) {
        return current;
      }
      console.info('home.mode.change', { from: current, to: next });
      // TODO(analytics): replace console.info with the real telemetry hook.
      // Analytics §3.3 #26 — context_chip_changed. Mode is the live home-level
      // contextual chip outside the refine modal (currently parked UI, kept
      // wired so the event fires when the mode-selector is re-enabled).
      track('context_chip_changed', {
        chip_type: 'mode',
        value: next,
      });
      // V05 try_another (260525): `mode` is a no-op on `/try_another` in the
      // MVP engine, so a mode change can only take effect on a fresh
      // `/build`. Reset the session here (lazy) — the next prefetch / "Show
      // another" rebuilds with the new mode. We do NOT refetch immediately
      // (would feel jarring mid-swipe loop), matching the existing
      // pick-up-on-next-prefetch behaviour.
      resetV05Session();
      // Bump the generation (Change 3, 260526): a mode change resets the
      // session, so any prefetch still in flight against the OLD session is
      // stale and must be dropped on arrival (it would otherwise append
      // old-mode outfits to the list). We do NOT touch the in-flight counter
      // here — there's no immediate refetch, and the in-flight call decrements
      // the counter itself on resolve (its result is just discarded), which
      // lets the next swipe resume prefetching against the new session.
      fetchGenerationRef.current += 1;
      // New context may replenish the pool — let prefetch resume.
      poolDepletedRef.current = false;
      return next;
    });
  }, []);

  const handleClearPin = useCallback(() => {
    setPinnedItemId(current => {
      if (!current) {
        return current;
      }
      console.info('home.pin.clear', { itemId: current });
      // TODO(analytics): replace console.info with the real telemetry hook.
      return null;
    });
  }, []);

  // Tinder deck: advance to the next card. End of deck keeps the last card on
  // screen (re-likeable) per spec §2.5, and nudges a prefetch.
  const advanceDeck = useCallback(() => {
    const next = activeIndexRef.current + 1;
    if (next < listOutfitsRef.current.length) {
      activeIndexRef.current = next;
      setActiveIndex(next);
    }
    ensureBuffer();
  }, [ensureBuffer]);

  // Tinder deck — like (swipe right / header heart / a11y action): quick-save
  // the active outfit (the header-heart path already flips saveStateByHash,
  // tracks `outfit_favorited`, and resets the unfavourited-skip counter), then
  // advance to the next card.
  const handleLike = useCallback(
    (outfit: OutfitSheetWithGrid) => {
      // Analytics §3.3 #23 — outfit_swiped. Right-swipe always advances forward;
      // the deck has no "previous" direction, so `direction` is always 'next'.
      if (outfit?.outfitHash) {
        track('outfit_swiped', {
          outfit_hash: outfit.outfitHash,
          direction: 'next',
          method: 'gesture',
        });
      }
      handleHeartTapForOutfit(outfit);
      advanceDeck();
    },
    [handleHeartTapForOutfit, advanceDeck],
  );

  // Tinder deck — skip (swipe left / a11y action): advance without saving. A
  // skip off an unfavourited outfit counts toward the refine nudge (3rd skip →
  // ContextChipsModal). The counter resets on any positive action (like / Wear
  // this / refine submit).
  const handleSkip = useCallback(
    (outfit: OutfitSheetWithGrid) => {
      const fromHash = outfit?.outfitHash;
      const fromState = fromHash
        ? saveStateByHashRef.current[fromHash] ?? 'idle'
        : 'idle';
      const wasFavorited = fromState === 'saved' || fromState === 'saving';
      console.info('home.swipe.miss', { from: activeIndexRef.current });
      // TODO(analytics): replace console.info with the real telemetry hook.
      // Analytics §3.3 #23 — outfit_swiped. Left-swipe advances forward too
      // (the deck is forward-only); `direction: 'next'` matches the deck's
      // semantics (no "previous" card to return to).
      if (fromHash) {
        track('outfit_swiped', {
          outfit_hash: fromHash,
          direction: 'next',
          method: 'gesture',
        });
      }
      if (!wasFavorited) {
        const nextCount = unfavoritedSwipeCountRef.current + 1;
        if (nextCount >= UNFAVORITED_SWIPE_THRESHOLD) {
          unfavoritedSwipeCountRef.current = 0;
          setIsContextModalOpen(true);
          track('refine_modal_opened', { source: 'unfavorited_swipe' });
        } else {
          unfavoritedSwipeCountRef.current = nextCount;
        }
      }
      advanceDeck();
    },
    [advanceDeck],
  );

  const handleOpenContextEditModal = useCallback(() => {
    Keyboard.dismiss();
    setIsContextModalOpen(true);
    track('refine_modal_opened', { source: 'card_button' });
  }, []);

  const handleShuffleSuggestions = () => {
    Keyboard.dismiss();
    setContextSuggestionSetIndex(
      currentIndex => (currentIndex + 1) % CONTEXT_CHIP_SETS.length,
    );
    setSelectedContextChipId(null);
    setIsEditingContext(false);
    setCustomContextText('');
  };

  const handleSelectContextChip = (chipId: ContextChipId) => {
    Keyboard.dismiss();
    setSelectedContextChipId(currentChipId =>
      currentChipId === chipId ? null : chipId,
    );
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
    // PHASE D (AU-252): resolve payload from chip selection or custom text.
    // Chip label is the natural-English string the engine prompt consumes
    // directly (see wardrobe-backend/blueprints/recommendation/engine_v2.py
    // lines 1305-1312 — last 3 style_notes injected into Gemini prompt).
    const chipLabel = selectedContextChipId
      ? activeContextChipOptions.find(c => c.id === selectedContextChipId)
          ?.label
      : null;
    const payload = chipLabel ?? (trimmedCustomContextText || null);

    if (!payload) {
      // Cancel-equivalent: no chip + no text. Should be unreachable because
      // OK button is disabled via `isContextConfirmDisabled`, but guard
      // anyway so a programmatic submit can't sneak through.
      closeContextModal();
      return;
    }

    // Update both state (for UI consumers) and ref (read by fetch sites).
    setStyleFeedback(payload);
    styleFeedbackRef.current = payload;

    // Reset the soft-nudge counter so the user gets a fresh window after
    // they've actively given feedback. Without this, the modal would
    // re-open after another N swipes regardless of submit.
    unfavoritedSwipeCountRef.current = 0;

    track('refine_submitted', {
      mode: chipLabel ? 'chip' : 'custom',
      // Truncate custom text so PII / long input doesn't bloat events.
      value: payload.slice(0, 100),
    });

    // Analytics §3.3 #22 — the next deck settle after a refine submit reports
    // `source: 'refine'`. Flag is consumed once by the settle effect, then
    // resets to 'feed' for subsequent advances.
    recommendationSourceRef.current = 'refine';

    closeContextModal();

    // V05 try_another (260525): a refine/context submit is a fresh dressing
    // intent → start a NEW session so the next fetch rebuilds via `/build`
    // (and re-seeds the pool) rather than serving a variation off the stale
    // session. Mirrors recommendationService's reset-on-context-change.
    resetV05Session();
    // Bump the generation (Change 3, 260526): any prefetch still in flight
    // against the OLD session is now stale and will be dropped on arrival.
    fetchGenerationRef.current += 1;
    // Fresh dressing intent re-seeds the pool — let prefetch resume.
    poolDepletedRef.current = false;
    // Do NOT touch the in-flight counter here. `force: true` below bypasses the
    // guard so this user-intent build starts even while a stale prefetch is
    // still draining; the counter then reflects both (capped at 2). The stale
    // result is discarded via the generation guard, and no further fetch starts
    // until the counter returns to 0 — so a swipe mid-refine can't add a 3rd.
    // Cold-start path so the new session replaces (not appends) the list.
    isFirstLoadRef.current = true;

    // Trigger an immediate fetch carrying the new feedback (force: user
    // intent wins over any in-flight prefetch). Subsequent prefetches inherit
    // via `styleFeedbackRef` automatically (Task 4).
    requestRecommendation(
      {
        style_feedback: payload,
        pinned_item_id: pinnedItemIdRef.current ?? undefined,
        mode: selectedModeRef.current,
      },
      { force: true },
    );
  };

  const handleLeadingAction = () => {
    openSidebar();
  };

  // CEO re-enabled the Home "Remix" button (overrides AU-253 omission). It
  // opens the Outfit Canvas (AU-285 Remix editor), seeded with the CURRENT
  // outfit's real items so the editor no longer shows mock jeans.
  const handleRemix = useCallback(() => {
    const current = listOutfitsRef.current[activeIndexRef.current];
    const items = (current?.items ?? [])
      .filter((it): it is Item => !!it)
      .map(it => ({
        id: it.id,
        imageUrl: resolveItemImage(it) || it.image_url,
      }));
    navigation.navigate('OutfitCanvas', items.length ? { items } : undefined);
  }, [navigation]);

  // AU-312: item tap PUSHES the full ItemDetail screen (Back header) instead
  // of opening the old ItemDetailBottomSheet modal — the designer rejected
  // the popup presentation. `fallbackItem` ships the tile payload so V05
  // `common_essential` injections (ids absent from the user's wardrobe
  // list → getWardrobeItem misses) still render instead of bouncing back
  // with a "not found" toast (extraction note Q7).
  const handleOpenItemDetail = useCallback(
    (item: Item) => {
      // Analytics §3.3 #24 — outfit_card_tapped. Item tile within the active
      // outfit card is the only tap-to-detail surface; position is the tile's
      // index within the active sheet (1-based).
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
          accessibilityLabel={t('home.a11y_open_menu')}
          onPress={handleLeadingAction}
          icon={<IconHomeMenu width={24} height={24} />}
        />

        <WeatherWidget tempC={weather.tempC} iconCode={weather.iconCode} />

        <TouchableOpacity
          testID={
            activeSaveState === 'saved'
              ? 'home-heart-toggle-saved'
              : 'home-heart-toggle'
          }
          accessibilityRole="button"
          accessibilityLabel={
            activeSaveState === 'saved'
              ? t('home.a11y_saved_fav')
              : t('home.a11y_fav_this')
          }
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
          ) : activeSaveState === 'saved' ? (
            <IconHomeHeartFilled width={24} height={24} />
          ) : (
            <IconHomeHeartOutline width={24} height={24} />
          )}
        </TouchableOpacity>
      </View>

      {/* PHASE C (AU-221): mode selector (Safe / Power / Creative). Lives
          below the header band per the plan in HOME_SWIPE_PLAN.md §4 phase C.
          Visual spec is text-only — no dedicated Figma frame yet — refine when
          designer provides icons / colors / position. */}
      {/* <View style={styles.modeSelectorRow}>
        {RECOMMENDATION_MODE_OPTIONS.map(option => {
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
                isSelected
                  ? styles.modePillSelected
                  : styles.modePillUnselected,
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
      </View> */}

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
          <IconHomePin width={24} height={24} />
          <Text style={styles.pinHeaderLabelText} numberOfLines={1}>
            {t('home.pinned_label', {
              label:
                pinnedItem.category ||
                pinnedItem.color ||
                t('home.pinned_item_fallback'),
            })}
          </Text>
          <Text style={styles.pinHeaderLabelClear}>{t('home.clear')}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Sustainability (2026-05-27): subtle, non-blocking hint once the
          backend starts cycling (uniques exhausted, real outfits re-served).
          Does NOT gate swiping — purely informational. Hidden once a fresh
          build resets the session. Not shown during the wardrobe-gap dead-end
          (that has its own CTA) or while loading. */}
      {hasCycled && !isWardrobeGap && optionSets.length > 0 ? (
        <View style={styles.cycledHint} testID="home-cycled-hint">
          <Text style={styles.cycledHintText} numberOfLines={1}>
            {t('home.seen_all_hint')}
          </Text>
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
        // Genuine wardrobe gap with nothing to show — a terminal dead-end the
        // user CAN act on: a CTA to add items (backend owns sustainability).
        <HomeWardrobeGapState
          onAddItems={() => navigation.navigate('Wardrobe')}
        />
      ) : optionSets.length === 0 && startError ? (
        // Recoverable cold-start failure — Retry restarts the mutation so a
        // timeout / 5xx never leaves the screen blank.
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
        // Tinder-style swipe deck (replaces the AU-303 two-axis pager). One
        // active card follows the finger; right = like, left = skip. See
        // docs/superpowers/specs/2026-06-12-home-tinder-swipe-design.md.
        <View style={styles.deckWrap}>
          <OutfitSwipeDeck
            testID="home-swipe-deck"
            items={optionSets}
            activeIndex={clampedActiveIndex}
            cardHeight={OPTION_SHEET_HEIGHT}
            swipeEnabled={!collageDragActive}
            keyOf={outfit => outfit.outfitHash}
            onLike={handleLike}
            onSkip={handleSkip}
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
                onEditContext={handleOpenContextEditModal}
                onRemix={handleRemix}
                homeView={homeView}
                onCollageDragActiveChange={setCollageDragActive}
              />
            )}
            renderCue={(likeOpacity, skipOpacity) => (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.deckCue,
                    styles.deckCueLike,
                    { opacity: likeOpacity },
                  ]}
                >
                  <IconHomeHeartFilled width={28} height={28} />
                </Animated.View>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.deckCue,
                    styles.deckCueSkip,
                    { opacity: skipOpacity },
                  ]}
                >
                  <Text style={styles.deckCueSkipText}>
                    {t('home.skip_label')}
                  </Text>
                </Animated.View>
              </>
            )}
          />
        </View>
      )}

      {/* Sticky "Wear this" CTA — belongs to the footer (acts on the ACTIVE
          outfit), not inside the swipeable card. Routes through the mood
          feedback flow exactly like the old per-card CTA. */}
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
            disabled={!activeOutfit || activeSaveState === 'saved'}
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

      {/* AU-253: Home grid-view toggle bar (Figma footer 2464:17348). Tab 1
          = current grid view (active). Tab 2 = alternate view (not yet built
          — see Q3 in extraction artifact); rendered faithfully, no-op for now. */}
      <HomeViewToggleFooter
        testID="home-footer-view-toggle"
        activeView={homeView}
        onSelectView={setHomeView}
      />

      <ContextChipsModal
        visible={isContextModalOpen}
        chipOptions={displayContextChipOptions}
        selectedChipId={selectedContextChipId}
        isEditing={isEditingContext}
        customContextText={customContextText}
        isSubmitting={false}
        confirmDisabled={isContextConfirmDisabled}
        onSelectChip={handleSelectContextChip}
        onShuffle={handleShuffleSuggestions}
        onEdit={handleOpenContextChipEdit}
        onChangeText={handleChangeContextText}
        onCancel={() => {
          track('refine_cancelled', {
            had_selection:
              !!selectedContextChipId || trimmedCustomContextText.length > 0,
          });
          closeContextModal();
        }}
        onConfirm={handleSubmitContext}
      />

      {/* First-time guidance — single overlay for the left/right deck.
          "Swipe right to save, swipe left to skip." Dismissed by "Got it"
          only. Fires the first time Home shows outfits. */}
      <SwipeCoachMark variant="horizontal" enabled={optionSets.length > 0} />

      {/* AU-318: policy-gated mood feedback sheet — opened by the "Wear this"
          CTA in place of the old immediate save. The OptionSheet is an inline
          pager cell (not a modal), so no close-sequencing is needed before
          opening this; the ContextChipsModal can never be open at the same
          time (the CTA is unreachable behind it). */}
      <MoodFeedbackSheet {...moodSheetProps} />

      {/* AU-318: auto-dismissing save-success banner. No house snackbar
          exists (success today = CTA label flip), so this is the minimal
          inline toast — theme tokens only, non-interactive. */}
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

// 2026-05-22 (AU-242 Figma spec): variable-item-count grid layouts per
// Figma node 2849:11340 children. Designer confirmed: "We have layouts to
// present 3-4-5-6 and >6 items in an outfit". All cards are aspect 3:4 with
// 12px border radius, 4px gap. The three layout shapes cover every count:
//   - 'twoRowOneLarge' (3 items): row1 = 2 equal flex cards · row2 = 1
//     half-width card (left-aligned), all aspect 3:4
//   - 'twoByTwo' (4 items): 2×2 grid, all flex-1 cards aspect 3:4
//   - 'heroStackPlusRows' (5/6/7+): row1 = hero (≈2/3 width) + 2 stacked
//     cards (≈1/3 width); subsequent rows = up to 3 flex cards each, all
//     aspect 3:4. No truncation, no overflow badge — Figma frame
//     2850:9542 shows all 9 items for the >6 case.
type GridLayout =
  | {
      // Figma 2-item rule (3230:35901): item0 spans the full content width
      // (390 @ aspect 3:4); item1 is a fixed 127.3×169.733 small card that
      // drops to the next row, CENTERED under item0 (qa-ui C1 correction —
      // inner column items-center/justify-center, NOT left-aligned).
      kind: 'fullPlusSmall';
      full: Item;
      small: Item | null;
    }
  | {
      kind: 'twoRowOneLarge';
      row1: [Item | null, Item | null];
      row2Large: Item | null;
    }
  | {
      kind: 'twoByTwo';
      rows: [[Item | null, Item | null], [Item | null, Item | null]];
    }
  | {
      kind: 'heroStackPlusRows';
      hero: Item;
      stack: [Item, Item];
      rest: Item[];
    };

const pickLayout = (items: Item[]): GridLayout | null => {
  // Drop sparse slots so the count reflects renderable items; sparse
  // outfits still get a layout (with placeholders) instead of a blank
  // sheet — count 0 alone returns null because there's nothing to draw.
  const filled = items.filter((it): it is Item => !!it);
  const count = filled.length;

  if (count === 0) return null;

  // 1–2 items: item0 full-width, item1 (if present) a fixed small card on the
  // next row, centered (Figma 2-item variant + qa-ui C1).
  if (count <= 2) {
    return {
      kind: 'fullPlusSmall',
      full: filled[0],
      small: filled[1] ?? null,
    };
  }
  if (count === 3) {
    return {
      kind: 'twoRowOneLarge',
      row1: [filled[0], filled[1]],
      row2Large: filled[2],
    };
  }
  if (count === 4) {
    return {
      kind: 'twoByTwo',
      rows: [
        [filled[0], filled[1]],
        [filled[2], filled[3]],
      ],
    };
  }
  return {
    kind: 'heroStackPlusRows',
    hero: filled[0],
    stack: [filled[1], filled[2]],
    rest: filled.slice(3),
  };
};

// C4 fix (2026-05-22): variant grids must stay inside OPTION_SHEET_HEIGHT
// or the inner gridScroll activates and re-introduces the nested-scroll
// bug the 2026-05-18 fix was tracking. For 2-row layouts the existing
// CARD_HEIGHT constant is already sized for exactly 2 rows. For
// heroStackPlusRows (1 hero row + N rest rows of 3) the row height must
// shrink proportionally. Aspect ratio 3:4 is the Figma intent but
// available height wins on smaller phones.
const computeHeroRowHeight = (restCount: number): number => {
  const rows = 1 + Math.ceil(restCount / 3);
  // Same grid area the 2-row layouts size against. GRID_FIT_H already nets out
  // OPTION_ACTIONS_HEIGHT + OPTION_SHEET_VPAD AND the gridScroll content pad
  // (GRID_CONTENT_PAD), so dividing across all rows keeps the whole grid inside
  // the sheet — inner gridScroll stays dormant for 5/6/>6-item outfits too (no
  // nested-scroll regression, no bottom clip).
  const available = GRID_FIT_H - GRID_GAP;
  return Math.floor((available - (rows - 1) * GRID_GAP) / rows);
};

type OutfitReveal = 'full' | 'light' | 'none';

const OptionSheet = React.memo(
  ({
    cellKey,
    outfit,
    pinnedItemId,
    reveal,
    onItemPress,
    onTogglePin,
    // parked: only consumed by the commented-out "Edit context +" button
    // (AU-252 refine flow). The card CTA (onConfirm) and dots/"Show another"
    // (onShowAnother) were removed when "Wear this" moved to the sticky footer
    // and the Tinder deck replaced the dots. Aliased with `_` so lint passes
    // while the prop stays in the contract for when the button is re-enabled.
    onEditContext: _onEditContext,
    onRemix,
    homeView,
    onCollageDragActiveChange,
  }: {
    // testID namespace = the outfit hash so Maestro can address a card.
    cellKey: string;
    outfit: OutfitSheetWithGrid;
    pinnedItemId: string | null;
    // Item-assembly entrance: 'full' (first/Daily-Reveal card), 'light'
    // (subsequent cards), or 'none' (peek card / no animation).
    reveal: OutfitReveal;
    onItemPress: (item: Item) => void;
    onTogglePin: (item: Item) => void;
    onEditContext: () => void;
    onRemix: () => void;
    homeView: HomeView;
    onCollageDragActiveChange: (active: boolean) => void;
  }) => {
    const { t } = useTranslation();
    const items = outfit.items;
    const layout = pickLayout(items);
    const itemCount = items.length;

    // Outfit-assembly entrance (docs/MOTION_SYSTEM.md Pattern 05/06): the grid
    // fades + rises on mount. 'full' = signature reveal duration, 'light' = fast,
    // 'none' = instant (peek card). Interruptible by construction — a new card
    // remounts; an outgoing card unmounts mid-animation.
    const revealAnim = useRef(
      new Animated.Value(reveal === 'none' ? 1 : 0),
    ).current;
    useEffect(() => {
      if (reveal === 'none') {
        revealAnim.setValue(1);
        return;
      }
      Animated.timing(revealAnim, {
        toValue: 1,
        duration:
          reveal === 'full' ? motion.duration.reveal : motion.duration.fast,
        easing: motion.easing.enter,
        useNativeDriver: true,
      }).start();
    }, [reveal, revealAnim]);
    const revealStyle = {
      opacity: revealAnim,
      transform: [
        {
          translateY: revealAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [motion.distance.sm, 0],
          }),
        },
      ],
    };

    const renderTile = (
      item: Item | null,
      flatTileIndex: number,
      style?: object,
    ) => {
      // C1 fix (2026-05-22): nullable slot for sparse outfits (count 1/2)
      // and the row2 spacer in twoRowOneLarge. Renders a transparent card
      // shell that preserves grid geometry without crashing on item.id.
      if (!item) {
        return (
          <View
            key={`card-placeholder-${outfit.outfitHash}-${flatTileIndex}`}
            style={[styles.card, style, styles.cardPlaceholder]}
          />
        );
      }
      const isPinned = item.id === pinnedItemId;
      return (
        <TouchableOpacity
          key={`card-${outfit.outfitHash}-${flatTileIndex}`}
          testID={`home-tile-${cellKey}-${flatTileIndex}`}
          accessibilityLabel={`home-tile-${cellKey}-${flatTileIndex}`}
          activeOpacity={0.86}
          style={[styles.card, style, isPinned && styles.cardPinned]}
          onPress={() => onItemPress(item)}
          // PHASE B (AU-222): long-press as a secondary affordance for pin
          // toggle. Primary tap target is the pin badge overlay below.
          onLongPress={() => onTogglePin(item)}
          delayLongPress={500}
        >
          <GarmentPreview item={item} />
          {item.isExploration ? (
            // AU-351: "Your Piece" badge for newly-uploaded items in the active
            // exploration window. Top-left so it never collides with the
            // top-right pin badge overlay. Non-interactive text pill.
            <View
              testID={`home-tile-yourpiece-${cellKey}-${flatTileIndex}`}
              style={styles.yourPieceBadge}
              accessibilityLabel={t('home.a11y_your_piece')}
            >
              <Text style={styles.yourPieceBadgeText}>
                {t('home.your_piece_badge')}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            testID={
              isPinned
                ? `home-tile-pin-${cellKey}-${flatTileIndex}-set`
                : `home-tile-pin-${cellKey}-${flatTileIndex}`
            }
            activeOpacity={0.7}
            onPress={e => {
              e.stopPropagation();
              onTogglePin(item);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.pinBadge, isPinned && styles.pinBadgeActive]}
            accessibilityRole="button"
            accessibilityLabel={
              isPinned ? t('home.a11y_unpin_item') : t('home.a11y_pin_item')
            }
          >
            <IconHomePin width={17} height={17} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    };

    const renderLayout = () => {
      if (!layout) {
        return null;
      }

      if (layout.kind === 'fullPlusSmall') {
        // 2 items (Figma 3230:35901): item0 full content width (390 @ 3:4);
        // item1 a fixed 127.3×169.733 small card on the next row, CENTERED
        // under it (qa-ui C1 — inner column items-center/justify-center).
        // count 1 renders just the full tile (small omitted).
        return (
          <View style={[styles.gridWrap, styles.gridWrapCenter]}>
            {renderTile(layout.full, 0, styles.cardFull)}
            {layout.small
              ? renderTile(layout.small, 1, styles.cardFixedSmall)
              : null}
          </View>
        );
      }

      if (layout.kind === 'twoRowOneLarge') {
        // 3 items (Figma 3227:18826): 2×2 grid, both cols flex-1 (~193 @ 3:4).
        // Row2 = lone 3rd tile (left) + opacity-0 placeholder (right) so the
        // 3rd item stays LEFT-aligned, not centred (Figma items-start rule).
        // C4: card height defaults to CARD_HEIGHT (sized for exactly 2 rows
        // in the available grid area) — no aspect-ratio override.
        return (
          <View style={[styles.gridWrap, styles.gridWrapStart]}>
            <View style={styles.cardRow}>
              <View style={styles.cardShell}>
                {renderTile(layout.row1[0], 0)}
              </View>
              <View style={styles.cardShell}>
                {renderTile(layout.row1[1], 1)}
              </View>
            </View>
            <View style={styles.cardRow}>
              <View style={styles.cardShell}>
                {renderTile(layout.row2Large, 2)}
              </View>
              {/* opacity-0 placeholder holds the right column so the lone 3rd
                  tile stays left-aligned (non-interactive, no testID). */}
              <View style={[styles.cardShell, styles.cardCellHidden]} />
            </View>
          </View>
        );
      }

      if (layout.kind === 'twoByTwo') {
        // 4 items (Figma swipe-card default page): static 2×2 grid, every tile
        // flex-1 (~193 @ 3:4). NOT a carousel — pure grid.
        return (
          <View style={[styles.gridWrap, styles.gridWrapStart]}>
            {layout.rows.map((row, rowIndex) => (
              <View
                key={`row-${outfit.outfitHash}-${rowIndex}`}
                style={styles.cardRow}
              >
                {row.map((item, itemIndex) => (
                  <View
                    key={`shell-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                    style={styles.cardShell}
                  >
                    {renderTile(item, rowIndex * 2 + itemIndex)}
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      }

      // heroStackPlusRows (5/6/>6 items) — Figma 3227:18976 / 19147 / 19318.
      // Row 1: hero (258.5×343.5, ~flex 2) + right column of 2 stacked small
      //   cards (127.3×169.733, ~flex 1).
      // Subsequent rows: ALWAYS 3 cells = [flex-1][flex-1][fixed-127]. The
      //   narrow 3rd cell is the intended 2-wide+1-narrow asymmetry (NOT 3
      //   equal columns). A missing 3rd item renders as an opacity-0
      //   placeholder (e.g. the 5-item case → 2 visible, left-aligned).
      // >6: rows repeat for every additional 3 items; the grid scrolls.
      // C4: row height computed dynamically so total grid fits available
      // sheet space — prevents inner gridScroll from activating.
      const heroRowHeight = computeHeroRowHeight(layout.rest.length);
      const heroRowStyle = { height: heroRowHeight };
      const heroStackCellHeight = Math.floor((heroRowHeight - GRID_GAP) / 2);
      const heroStackCellStyle = { height: heroStackCellHeight };
      // Pad rest into rows of exactly 3 (null = opacity-0 placeholder cell).
      const restRows: (Item | null)[][] = [];
      for (let i = 0; i < layout.rest.length; i += 3) {
        const slice: (Item | null)[] = layout.rest.slice(i, i + 3);
        while (slice.length < 3) slice.push(null);
        restRows.push(slice);
      }
      return (
        <View style={[styles.gridWrap, styles.gridWrapStart]}>
          <View style={[styles.heroRow, { height: heroRowHeight }]}>
            <View style={styles.heroCol}>
              {renderTile(layout.hero, 0, heroRowStyle)}
            </View>
            <View style={styles.heroStackCol}>
              <View style={styles.heroStackCell}>
                {renderTile(layout.stack[0], 1, heroStackCellStyle)}
              </View>
              <View style={styles.heroStackCell}>
                {renderTile(layout.stack[1], 2, heroStackCellStyle)}
              </View>
            </View>
          </View>
          {restRows.map((row, rowIndex) => (
            <View
              key={`rest-row-${outfit.outfitHash}-${rowIndex}`}
              style={styles.cardRow}
            >
              {row.map((item, itemIndex) => {
                // Cols 0/1 flex-1; col 2 is the fixed narrow 127.3 cell.
                const isNarrow = itemIndex === 2;
                const cellStyle = isNarrow
                  ? styles.cardShellNarrow
                  : styles.cardShell;
                // A missing 3rd cell is a non-interactive opacity-0
                // placeholder (no testID) so cols 0/1 stay left-aligned.
                if (!item) {
                  return (
                    <View
                      key={`rest-pad-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                      style={[cellStyle, styles.cardCellHidden]}
                    />
                  );
                }
                return (
                  <View
                    key={`rest-shell-${outfit.outfitHash}-${rowIndex}-${itemIndex}`}
                    style={cellStyle}
                  >
                    {renderTile(
                      item,
                      3 + rowIndex * 3 + itemIndex,
                      isNarrow ? styles.cardFixedSmall : heroRowStyle,
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    };

    return (
      // AU-303: each OptionSheet is now a horizontal-pager CELL of fixed
      // screen width so the inner FlatList pages one outfit at a time.
      <View testID={`home-outfit-sheet-${cellKey}`} style={styles.outfitCell}>
        <View style={styles.optionSheet}>
          {/* AU-253: caption + insight title row (Figma Frame 2104). Caption
            text is the V05 `reasoning_human` threaded via buildViaV05;
            OutfitCardCaption falls back to DEFAULT_CAPTION only when absent. */}
          <OutfitCardCaption
            testID={`home-card-caption-${cellKey}`}
            caption={outfit.caption}
          />

          <ScrollView
            style={styles.gridScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridScrollContent}
            // AU-303 fix: this inner grid ScrollView is DORMANT by derivation —
            // every layout is sized to fit GRID_AREA_H exactly (see gridScroll
            // style note), so it never actually needs to scroll. While enabled,
            // though, it claimed the vertical pan responder and starved the
            // outer `home-set-pager` FlatList, killing vertical set paging
            // (it also let stray long swipes mis-arbitrate to the hamburger).
            // Disabling scroll lets the vertical pan bubble to the set-pager.
            // Collage-item drag is owned by CollageSheetCanvas (its own
            // PanResponder over a fixed-height surface), not this ScrollView,
            // so freezing on collageDragActive is no longer needed here.
            scrollEnabled={false}
          >
            <Animated.View
              testID={`home-outfit-grid-${itemCount}`}
              style={revealStyle}
            >
              {homeView === 'collage' ? (
                <CollageSheetCanvas
                  testID={`home-collage-${cellKey}`}
                  outfitItems={items}
                  surfaceWidth={COLLAGE_SURFACE_WIDTH}
                  surfaceHeight={COLLAGE_SURFACE_HEIGHT}
                  onDragActiveChange={onCollageDragActiveChange}
                />
              ) : (
                renderLayout()
              )}
            </Animated.View>
          </ScrollView>

          {/* Action row — [Remix | swipe glyph]. Dots + "Show another" removed
            with the move to the Tinder deck (swipe handles browse/skip). */}
          {/* "Wear this" CTA lives in the sticky footer now (see HomeScreen
              render) — it acts on the ACTIVE outfit and must not ride inside the
              swipeable card. */}
          <OutfitActionRow
            testID={`home-action-row-${cellKey}`}
            onRemix={onRemix}
          />
        </View>
      </View>
    );
  },
);
OptionSheet.displayName = 'OptionSheet';

// Error UI fix (2026-05-22): rendered when the cold-start V05 fetch
// fails and the user is left without any outfit to display. A simple
// Retry restarts the same mutation; deeper diagnosis lives in console
// logs (onError) and Sentry.
const HomeErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorState} testID="home-error-state">
      <Text style={styles.errorStateTitle}>{t('home.error_load_title')}</Text>
      <Text style={styles.errorStateBody}>{t('home.error_load_body')}</Text>
      <TouchableOpacity
        testID="home-error-retry"
        onPress={onRetry}
        style={styles.errorStateRetry}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_retry_load')}
      >
        <Text style={styles.errorStateRetryLabel}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// Fix D (2026-05-27): terminal dead-end when the wardrobe is genuinely too
// small to compose any outfit (backend `wardrobe_gap`). Reuses the error-state
// layout/tokens — a focused message + one CTA into the wardrobe. No retry/
// rebuild affordance (adding items is the only real fix; backend owns the rest).
const HomeWardrobeGapState: React.FC<{ onAddItems: () => void }> = ({
  onAddItems,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorState} testID="home-wardrobe-gap-state">
      <Text style={styles.errorStateTitle}>{t('home.wardrobe_gap_title')}</Text>
      <Text style={styles.errorStateBody}>{t('home.wardrobe_gap_body')}</Text>
      <TouchableOpacity
        testID="home-wardrobe-gap-add-items"
        onPress={onAddItems}
        style={styles.errorStateRetry}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_add_to_wardrobe')}
      >
        <Text style={styles.errorStateRetryLabel}>
          {t('home.add_to_wardrobe')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const HomeLoadingState = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.optionSheet}>
      <View style={styles.loadingCards}>
        {[0, 1].map(row => (
          <View key={`loading-row-${row}`} style={styles.cardRow}>
            {[0, 1].map(column => (
              <View
                key={`loading-card-${row}-${column}`}
                style={styles.cardShellFixed}
              >
                <View style={[styles.card, styles.loadingCard]} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.loadingFooter}>
        <MacgieLoader variant="inline" size={28} testID="home-loading-macgie" />
        <Text style={styles.loadingFooterText}>{t('home.building_next')}</Text>
      </View>
    </View>
  );
};

const GarmentPreview = ({ item }: { item: Item }) => {
  const { t } = useTranslation();
  const imageUrl = resolveItemImage(item);

  return (
    <>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.cardFallback} />
      )}
      <View style={styles.cardTag} pointerEvents="none">
        <View style={styles.cardTagPill}>
          <Text style={styles.cardTagText}>{t('common.badge_common')}</Text>
        </View>
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
    // Figma header content bar: 12px padding all sides (3227:19826).
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  heartButton: {
    width: 44,
    height: 44,
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
  // AU-303: outer vertical pager row — one SET. Snap height matches the set
  // pager's snapToInterval so each vertical page lands on one set.
  // Tinder deck wrapper. flex:1 so the deck absorbs any leftover viewport —
  // the sticky CTA + toggle footer then sit flush at the bottom (no dead space
  // below the toggle when the approximated sheet height under-fills).
  deckWrap: {
    flex: 1,
    paddingTop: 4,
  },
  // Like/Skip cue badge shown during a drag (calm, premium — not a Tinder
  // stamp). Opacity is driven by the live drag distance (OutfitSwipeDeck).
  deckCue: {
    position: 'absolute',
    top: 16,
    // Content tier — drag cue floats above the swipe-deck cards (same stacking
    // context; cards render after the cue). See docs/Z_INDEX_LAYERING.md §1.
    zIndex: theme.zIndex.content,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.uacTextBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deckCueLike: {
    right: 24,
  },
  deckCueSkip: {
    left: 24,
  },
  deckCueSkipText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // AU-303: horizontal pager cell — one OUTFIT. Fixed screen width so the inner
  // FlatList pages exactly one outfit per swipe. The white optionSheet fills the
  // cell edge-to-edge (it carries its own SHEET_PADDING internally), matching
  // the pre-AU-303 full-bleed sheet width.
  outfitCell: {
    width: screenWidth,
  },
  optionSheet: {
    height: OPTION_SHEET_HEIGHT,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    paddingTop: 12,
    paddingHorizontal: SHEET_PADDING,
    paddingBottom: 24,
    // A2 (AU-253 2026-05-25): Figma uniform 12pt rhythm between the sheet's
    // blocks (caption · grid · action row · CTA). Was 'space-between', which
    // distributed leftover slack as a ~36pt void between the grid and the
    // "Wear this" CTA. flex-start + gap:12 makes the stack content-sized so
    // there is no slack to dump → void eliminated by construction.
    justifyContent: 'flex-start',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  gridWrap: {
    gap: GRID_GAP,
    // Figma grid container vertical inset (py = 8). Horizontal inset is the
    // optionSheet's SHEET_PADDING (12); this adds the matching 8px top/bottom.
    paddingVertical: SHEET_PADDING_V,
  },
  // 2-item (fullPlusSmall): column with the small drop-card CENTERED under the
  // full card (qa-ui C1 — items-center/justify-center, not left-aligned).
  gridWrapCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 3 / 4 / 5 / 6 / >6: rows are left-aligned; lone tiles hold their column via
  // opacity-0 placeholder cells, so the visible tiles stay LEFT (items-start).
  gridWrapStart: {
    alignItems: 'stretch',
  },
  // AU-253 (2026-05-25): was `flex:1`, which over-claimed the leftover sheet
  // height and (with space-between) produced the ~36pt void. Now content-sized
  // with a hard `maxHeight` bound. By derivation every layout fits GRID_AREA_H
  // exactly (2×CARD_HEIGHT+gap for 2-row; computeHeroRowHeight for 5/6/>6), so
  // the inner scroll stays DORMANT on iPhone 16 — no nested-scroll regression.
  // The bound is retained purely as a safety net: should a future
  // >6-item / smaller-device case exceed GRID_AREA_H, it scrolls inside the
  // grid block instead of pushing the CTA off-sheet.
  gridScroll: {
    maxHeight: GRID_AREA_H,
  },
  gridScrollContent: {
    paddingBottom: GRID_CONTENT_PAD,
  },
  loadingCards: {
    gap: GRID_GAP,
  },
  cardRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    // AU-253 (2026-05-25): centre rows horizontally. For the 2-row layouts
    // (twoRowOneLarge / twoByTwo) the tiles are fixed-width 3:4 and narrower
    // than the content frame, so this centres them with symmetric side
    // gutters. For heroStackPlusRows the cells flex to fill the row, so
    // centring is a no-op there.
    justifyContent: 'center',
  },
  cardShell: {
    flex: 1,
  },
  // AU-253 (2026-05-25): fixed-width shell for the 2-row layouts. The tile
  // takes its intrinsic CARD_WIDTH (true 3:4 of CARD_HEIGHT) instead of
  // stretching full-bleed, and the centred cardRow gives it side gutters.
  // Hero/stack/rest tiles keep the flex `cardShell` so they still fill rows.
  cardShellFixed: {
    flexGrow: 0,
    width: CARD_WIDTH,
  },
  // 5/6/>6 bottom-row narrow 3rd column: holds the fixed-127 tile (or its
  // opacity-0 placeholder). flexGrow:0 so cols 0/1 (flex-1) keep the width.
  cardShellNarrow: {
    flexGrow: 0,
    width: SMALL_CARD_WIDTH,
  },
  // 2-item full card: spans the full content width at true 3:4. Overrides the
  // default `card` fixed height so the aspect ratio drives the height.
  cardFull: {
    width: '100%',
    height: undefined,
    aspectRatio: CARD_ASPECT,
  },
  // Fixed small card (Figma 127.3×169.733, 3:4) — 2-item drop card + the narrow
  // 3rd column of 5/6/>6 bottom rows. Overrides the default `card` height.
  cardFixedSmall: {
    width: SMALL_CARD_WIDTH,
    height: SMALL_CARD_HEIGHT,
  },
  // Non-interactive opacity-0 placeholder cell that holds a grid column so the
  // visible tiles stay left-aligned (3-item R2C2, 5-item bottom R3 3rd cell).
  cardCellHidden: {
    opacity: 0,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 12, // Figma border-radius/xl = 12
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // C1 fix (2026-05-22): transparent placeholder shell for nullable slots
  // (sparse outfits + row2 spacer in twoRowOneLarge). Keeps grid geometry
  // without rendering the dark card surface so the empty slot reads as
  // "intentionally blank" rather than "missing tile".
  cardPlaceholder: {
    backgroundColor: 'transparent',
  },
  // 5/6/7+ item layout — row1 = hero (≈2/3 width) + right column (≈1/3
  // width) stacked into 2 cards. Figma `2850:9580` shows hero at 253×339
  // inside the 414-content frame ⇒ ~69% width; the right column stack
  // mirrors the hero height with a 4px internal gap. RN flex (2 : 1)
  // approximates the ratio cleanly without hardcoding pixel widths.
  heroRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  heroCol: {
    flex: 2,
  },
  heroStackCol: {
    flex: 1,
    gap: GRID_GAP,
  },
  heroStackCell: {
    flex: 1,
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
    right: 9,
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.m,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // background/overlay/light/30
    alignItems: 'center',
    justifyContent: 'center',
    // Figma 3399:18455 — drop-shadow 4/4, blur 5.3, #070707 @ 5%.
    shadowColor: 'rgba(7, 7, 7, 0.05)',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 5.3,
    elevation: 3,
  },
  pinBadgeActive: {
    backgroundColor: theme.colors.figmaAction,
  },
  // AU-351: "Your Piece" exploration badge — small text pill in the TOP-LEFT
  // of each tile (opposite corner from the top-right pin badge so they never
  // overlap). Dark translucent surface + light text mirrors the caption-tag
  // treatment. All values from theme tokens (no hex literals).
  yourPieceBadge: {
    position: 'absolute',
    top: theme.spacing.s,
    left: theme.spacing.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaCardTag,
  },
  yourPieceBadgeText: {
    ...theme.typography.aliases.interSemiboldXs,
    color: theme.colors.uacTextPrimaryBase,
  },
  loadingCard: {
    backgroundColor: theme.colors.figmaCardSurface,
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
    backgroundColor: theme.colors.figmaBackground,
  },
  // Figma 3438:22534 — "common" badge is a floating, fully-rounded dark pill
  // centered 8px above the card's bottom edge (NOT a tab glued to the edge).
  // Wrapper spans the card width so the pill self-centers regardless of label
  // length (e.g. vi "món chung" is wider than en "common").
  cardTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  cardTagPill: {
    height: 19,
    paddingHorizontal: 12, // Figma px-[12px], py-[0px]
    borderRadius: 8,
    backgroundColor: theme.colors.figmaCardTag, // color/neutral/black/Alpha300
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 12,
    color: theme.colors.white,
    textAlign: 'center',
  },
  actionCluster: {
    gap: 12, // Figma dimension/12
    alignItems: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
  },
  // Sticky "Wear this" footer wrapper — the CTA acts on the active outfit and
  // sits above the grid/collage toggle (moved out of each swipeable card).
  wearThisFooter: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: theme.spacing.uacDimension8,
    paddingBottom: theme.spacing.uacDimension8,
  },
  // #2 fix (2026-05-13): Figma spec borderRadius=16 (not pill/100), outline variant.
  primaryActionFull: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderColor: theme.colors.uacBorderBase, // border/neutral/base #1d1f23
  },
  // AU-253: "Wear this" label color = border/primary/bold_600 (#262421).
  primaryActionLabel: {
    color: theme.colors.figmaCtaLabel,
  },
  saveErrorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  // C-3 (2026-05-05): Figma "bottom secondary ~327×56" spec for the Edit
  // context button. Override the textButton variant default (40) which is
  // shared with other screens (LocationPermission) where 40 is intentional.
  secondaryAction: {
    height: 56,
  },
  secondaryActionText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  loadingFooter: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingFooterText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  // Error UI fix (2026-05-22): cold-start fetch failure fallback.
  errorState: {
    flex: 1,
    minHeight: 320,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorStateTitle: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 18,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  errorStateBody: {
    ...theme.typography.aliases.poppinsBody,
    fontSize: 14,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  errorStateRetry: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaText,
  },
  errorStateRetryLabel: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 16,
    color: theme.colors.figmaText,
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
  // Sustainability (2026-05-27): subtle non-blocking "seen them all" hint.
  // Mirrors the pinHeaderLabel micro-affordance — muted, single line, does
  // not gate interaction.
  cycledHint: {
    marginHorizontal: SHEET_PADDING,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    alignSelf: 'center',
  },
  cycledHintText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  // AU-318: save-success toast — floats above the view-toggle footer,
  // inverted surface (dark pill, light text) so it reads over any grid.
  moodBanner: {
    position: 'absolute',
    // Toast tier — must paint above the grid + view-toggle footer regardless of
    // render order (see docs/Z_INDEX_LAYERING.md §1, §4).
    zIndex: theme.zIndex.toast,
    left: theme.spacing.m,
    right: theme.spacing.m,
    bottom: HOME_VIEW_TOGGLE_FOOTER_HEIGHT + theme.spacing.l,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    borderRadius: 12,
    backgroundColor: theme.colors.figmaAction,
  },
  moodBannerText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaSurface,
    textAlign: 'center',
  },
});
