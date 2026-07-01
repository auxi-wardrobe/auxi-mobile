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
}

/**
 * AU-361: detects preparing→ready transitions across fetches/polls and drives a
 * self-controlled "item ready" snackbar (dedup + auto-hide timer). Extracted
 * verbatim from WardrobeScreen — same ref/timer/dedup semantics, so an item
 * only ever fires one "ready" snackbar per session. `showReadySnackbar` is also
 * reused by the add-item flow for the "item added" confirmation.
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

  // Clear any pending auto-hide timer on unmount.
  useEffect(
    () => () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    },
    [],
  );

  // Detect preparing→ready transitions and surface the toast once per item.
  // Compares this fetch against the prior fetch's preparing set.
  const reconcileReadyItems = useCallback(
    (data: WardrobeItem[]) => {
      const prevPreparing = preparingIdsRef.current;
      const nextPreparing = new Set<string>();

      for (const item of data) {
        if (!item.id) {
          continue;
        }
        if (isPreparing(item)) {
          nextPreparing.add(item.id);
          continue;
        }
        // Item is ready now. Toast only if it was preparing last fetch and
        // hasn't been toasted yet (dedup across polls/refocus).
        if (
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
      }

      preparingIdsRef.current = nextPreparing;
    },
    [t, showReadySnackbar],
  );

  return {
    readySnackbarVisible,
    readySnackbarMessage,
    showReadySnackbar,
    reconcileReadyItems,
  };
};
