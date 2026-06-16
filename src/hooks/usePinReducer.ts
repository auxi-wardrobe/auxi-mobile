// AU-307 — Pin Item & Build Around Outfit
// State machine (canonical) for pin / build-around. Spec §5.
//
// Pure reducer + hook. No side effects here — the HomeScreen consumes
// `state.outfit === 'generating'` via a useEffect (phase 04) to fire the
// actual `/build` (or `/try_another`) network call. The reducer ONLY tracks
// state transitions.
//
// Coverage vs UAC:
//   PIN_TAP        — primary (open confirm modal)
//   PIN_TAP same   — UNPIN (queued while generating)
//   PIN_TAP diff   — replace modal
//   CONFIRM_PIN    — snapshot, set pinned, outfit=generating
//   CONFIRM_REPLACE — same as CONFIRM_PIN but from `pinReplaceCandidate`
//   CANCEL_MODAL   — clear pending + replace candidate
//   GENERATE_*     — wired by phase 04 effect
//   PINNED_ITEM_GONE — wardrobe sync (BE 410 Gone)
//   AUTH_BLOCK     — guest blocker

import { useReducer } from 'react';
import type { Outfit } from '../services/recommendationService';
import { snapshotOutfit } from '../utils/snapshotOutfit';

export type PinModal = 'closed' | 'confirm' | 'replace';
export type PinOutfitStatus =
  | 'idle'
  | 'generating'
  | 'fallback'
  | 'error'
  | 'auth_required';

export type PinState = {
  pinnedItemId: string | null;
  pendingPinnedItemId: string | null;
  pinReplaceCandidate: string | null;
  modal: PinModal;
  outfit: PinOutfitStatus;
  lastOutfitSnapshot: Outfit | null;
  pendingUnpin: boolean;
};

export type PinAction =
  | { type: 'PIN_TAP'; itemId: string }
  | { type: 'CONFIRM_PIN' }
  | { type: 'CONFIRM_REPLACE' }
  | { type: 'CANCEL_MODAL' }
  | { type: 'UNPIN' }
  | { type: 'GENERATE_START'; snapshot: Outfit }
  | { type: 'GENERATE_SUCCESS' }
  | { type: 'GENERATE_FALLBACK' }
  | { type: 'GENERATE_ERROR' }
  | { type: 'RETRY' }
  | { type: 'PINNED_ITEM_GONE' }
  | { type: 'AUTH_BLOCK' }
  // AU-307 phase 05 — ItemDetail "Build around this" entry. Combines
  // PIN_TAP + CONFIRM_PIN in one shot, bypassing the modal because the
  // user already expressed intent on the detail screen. Overwrites any
  // existing pin (replace semantics; spec §3 row "ItemDetail entry").
  | { type: 'CONFIRM_PIN_FROM_DETAIL'; itemId: string };

export const initialPinState: PinState = {
  pinnedItemId: null,
  pendingPinnedItemId: null,
  pinReplaceCandidate: null,
  modal: 'closed',
  outfit: 'idle',
  lastOutfitSnapshot: null,
  pendingUnpin: false,
};

export const makeInitialPinState = (
  pinnedItemId: string | null = null,
): PinState => ({
  ...initialPinState,
  pinnedItemId,
});

export function pinReducer(state: PinState, action: PinAction): PinState {
  switch (action.type) {
    case 'PIN_TAP': {
      const { itemId } = action;
      // Guard: ignore taps while a generation is mid-flight to prevent
      // duplicate requests from rapid taps (spec §9 risk row 1).
      if (state.outfit === 'generating') {
        return state;
      }
      // Same id pinned → unpin (no modal).
      if (state.pinnedItemId === itemId) {
        return {
          ...state,
          pinnedItemId: null,
          pendingPinnedItemId: null,
          pinReplaceCandidate: null,
          modal: 'closed',
        };
      }
      // No pin set → open confirm modal.
      if (state.pinnedItemId === null) {
        return {
          ...state,
          modal: 'confirm',
          pendingPinnedItemId: itemId,
          pinReplaceCandidate: null,
        };
      }
      // Different id already pinned → open replace modal.
      return {
        ...state,
        modal: 'replace',
        pinReplaceCandidate: itemId,
        pendingPinnedItemId: null,
      };
    }

    case 'CONFIRM_PIN': {
      const pendingId = state.pendingPinnedItemId;
      if (!pendingId) {
        return state;
      }
      return {
        ...state,
        pinnedItemId: pendingId,
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
        modal: 'closed',
        outfit: 'generating',
      };
    }

    case 'CONFIRM_REPLACE': {
      const candidate = state.pinReplaceCandidate;
      if (!candidate) {
        return state;
      }
      return {
        ...state,
        pinnedItemId: candidate,
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
        modal: 'closed',
        outfit: 'generating',
      };
    }

    case 'CANCEL_MODAL':
      return {
        ...state,
        modal: 'closed',
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
      };

    case 'UNPIN': {
      // If generating, queue the unpin to apply after success — keeps the
      // in-flight `/build` request consistent with what the user saw when
      // they tapped (spec §9 row "Race remix vs unpin").
      if (state.outfit === 'generating') {
        return { ...state, pendingUnpin: true };
      }
      return {
        ...state,
        pinnedItemId: null,
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
        pendingUnpin: false,
      };
    }

    case 'GENERATE_START':
      // Effect (phase 04) snapshots the current outfit before firing the
      // request so GENERATE_ERROR can restore it.
      return {
        ...state,
        outfit: 'generating',
        lastOutfitSnapshot: snapshotOutfit(action.snapshot),
      };

    case 'GENERATE_SUCCESS': {
      // Drain a queued unpin if the user tapped unpin mid-generation.
      const next: PinState = {
        ...state,
        outfit: 'idle',
        lastOutfitSnapshot: null,
      };
      if (state.pendingUnpin) {
        next.pinnedItemId = null;
        next.pendingUnpin = false;
      }
      return next;
    }

    case 'GENERATE_FALLBACK':
      return {
        ...state,
        outfit: 'fallback',
        lastOutfitSnapshot: null,
      };

    case 'GENERATE_ERROR':
      // Snapshot is read by the HomeScreen effect to restore the outfit list;
      // we leave it on state so the consumer can pull it.
      return {
        ...state,
        outfit: 'error',
      };

    case 'RETRY':
      return {
        ...state,
        outfit: 'generating',
      };

    case 'PINNED_ITEM_GONE':
      return {
        ...state,
        pinnedItemId: null,
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
        lastOutfitSnapshot: null,
        outfit: 'idle',
      };

    case 'AUTH_BLOCK':
      return {
        ...state,
        outfit: 'auth_required',
        modal: 'closed',
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
      };

    case 'CONFIRM_PIN_FROM_DETAIL': {
      // Phase 05: skip the confirm modal because the ItemDetail CTA itself
      // is the user's confirmation. Atomically set pinnedItemId + drop any
      // pending/replace refs + transition outfit=generating so the phase 04
      // effect fires `/build` with `pinned_item_id`. Snapshot stays null on
      // a cold-start ItemDetail entry — the error path tolerates that.
      return {
        ...state,
        pinnedItemId: action.itemId,
        pendingPinnedItemId: null,
        pinReplaceCandidate: null,
        modal: 'closed',
        outfit: 'generating',
      };
    }

    default: {
      // Exhaustiveness check — if a new action is added, TS will error here.
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

export function usePinReducer(initialPinnedItemId: string | null = null) {
  return useReducer(pinReducer, makeInitialPinState(initialPinnedItemId));
}
