import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WardrobeItem } from '../../services/wardrobeService';
import { track } from '../../services/analytics';
import { READY_SNACKBAR_MS, isPreparing } from './wardrobe-grid';

interface UseItemReadySnackbar {
  readySnackbarVisible: boolean;
  readySnackbarMessage: string;
  showReadySnackbar: (message: string) => void;
  reconcileReadyItems: (data: WardrobeItem[]) => void;
  // Beautify-ready snackbar state. Non-null while the snackbar is visible; the
  // screen drives the overlay and navigates on press using these values.
  beautifySnackbarVisible: boolean;
  beautifySnackbarItemId: string | null;
  beautifySnackbarOriginalUri: string | null;
}

/**
 * AU-361: detects preparing→ready transitions across fetches/polls and drives a
 * self-controlled "item ready" snackbar (dedup + auto-hide timer). Extracted
 * verbatim from WardrobeScreen — same ref/timer/dedup semantics, so an item
 * only ever fires one "ready" snackbar per session. `showReadySnackbar` is also
 * reused by the add-item flow for the "item added" confirmation.
 *
 * Extended (Task 14): also detects beautify_status `pending → ready` transitions
 * and exposes a separate beautify-ready snackbar state that the screen uses to
 * render an actionable "Studio shot ready — Review" overlay → BeautifyReview.
 */
export const useItemReadySnackbar = (): UseItemReadySnackbar => {
  const { t } = useTranslation();

  // `preparingIdsRef` holds IDs that were still preparing on the previous fetch;
  // `readyToastedIdsRef` dedups so an item only ever fires one "ready" snackbar
  // per session even across refetches/polls.
  const preparingIdsRef = useRef<Set<string>>(new Set());
  const readyToastedIdsRef = useRef<Set<string>>(new Set());

  // Self-controlled in-screen snackbar state. The library's custom-config render
  // path never mounted the snackbar, so the screen renders it itself as an
  // absolute overlay (see ItemReadySnackbar). `snackbarTimerRef` holds the
  // auto-hide timeout so it can be cleared on re-trigger / unmount.
  const [readySnackbarVisible, setReadySnackbarVisible] = useState(false);
  const [readySnackbarMessage, setReadySnackbarMessage] = useState('');
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showReadySnackbar = useCallback((message: string) => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    setReadySnackbarMessage(message);
    setReadySnackbarVisible(true);
    snackbarTimerRef.current = setTimeout(() => {
      setReadySnackbarVisible(false);
      snackbarTimerRef.current = null;
    }, READY_SNACKBAR_MS);
  }, []);

  // --- Beautify-ready snackbar (Task 14) ---
  // `beautifyStatusRef` maps item.id → last-seen beautify_status so we can
  // detect the pending→ready transition across polls without re-mounting.
  // `beautifyReadyToastedRef` dedups so each item fires at most one snackbar.
  const beautifyStatusRef = useRef<Map<string, string>>(new Map());
  const beautifyReadyToastedRef = useRef<Set<string>>(new Set());

  const [beautifySnackbarVisible, setBeautifySnackbarVisible] = useState(false);
  const [beautifySnackbarItemId, setBeautifySnackbarItemId] = useState<
    string | null
  >(null);
  const [beautifySnackbarOriginalUri, setBeautifySnackbarOriginalUri] = useState<
    string | null
  >(null);
  const beautifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBeautifySnackbar = useCallback(
    (itemId: string, originalUri: string) => {
      if (beautifyTimerRef.current) {
        clearTimeout(beautifyTimerRef.current);
      }
      setBeautifySnackbarItemId(itemId);
      setBeautifySnackbarOriginalUri(originalUri);
      setBeautifySnackbarVisible(true);
      beautifyTimerRef.current = setTimeout(() => {
        setBeautifySnackbarVisible(false);
        beautifyTimerRef.current = null;
      }, READY_SNACKBAR_MS);
    },
    [],
  );

  // Clear any pending auto-hide timers on unmount.
  useEffect(
    () => () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      if (beautifyTimerRef.current) {
        clearTimeout(beautifyTimerRef.current);
      }
    },
    [],
  );

  // Detect preparing→ready transitions and surface the toast once per item.
  // Compares this fetch against the prior fetch's preparing set.
  // Also detects beautify_status pending→ready and fires the studio-shot snackbar.
  const reconcileReadyItems = useCallback(
    (data: WardrobeItem[]) => {
      const prevPreparing = preparingIdsRef.current;
      const nextPreparing = new Set<string>();

      for (const item of data) {
        if (!item.id) {
          continue;
        }

        // --- preparing→ready (existing logic, unchanged) ---
        if (isPreparing(item)) {
          nextPreparing.add(item.id);
        } else if (
          prevPreparing.has(item.id) &&
          !readyToastedIdsRef.current.has(item.id)
        ) {
          readyToastedIdsRef.current.add(item.id);
          // Self-controlled M3 snackbar (Figma node 3915:30077) — see
          // ItemReadySnackbar. The library's custom-config render path never
          // mounted, so we drive an in-screen overlay instead. Visual only; the
          // transition-detection / dedup / analytics logic is unchanged.
          showReadySnackbar(t('wardrobe.list.item_ready_title'));
          const readyProps: Record<string, unknown> = {};
          if (item.category) {
            readyProps.item_category = item.category;
          }
          track('item_ready_toast_shown', readyProps);
        }

        // --- beautify_status pending→ready (Task 14) ---
        const prevBeautifyStatus = beautifyStatusRef.current.get(item.id);
        const currBeautifyStatus = item.beautify_status;

        if (
          prevBeautifyStatus === 'pending' &&
          currBeautifyStatus === 'ready' &&
          !beautifyReadyToastedRef.current.has(item.id)
        ) {
          beautifyReadyToastedRef.current.add(item.id);
          showBeautifySnackbar(item.id, item.image_url ?? '');
        }

        // Update the last-seen beautify status for this item. Only track
        // actionable statuses; omit undefined (item pre-dates the field) to
        // avoid clobbering a previously stored status on a partial response.
        if (currBeautifyStatus !== undefined) {
          beautifyStatusRef.current.set(item.id, currBeautifyStatus);
        }
      }

      preparingIdsRef.current = nextPreparing;
    },
    [t, showReadySnackbar, showBeautifySnackbar],
  );

  return {
    readySnackbarVisible,
    readySnackbarMessage,
    showReadySnackbar,
    reconcileReadyItems,
    beautifySnackbarVisible,
    beautifySnackbarItemId,
    beautifySnackbarOriginalUri,
  };
};
