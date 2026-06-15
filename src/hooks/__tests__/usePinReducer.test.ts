// AU-307 phase 03 — reducer unit tests.
//
// Covers the state machine transitions in spec §5. Pure-function tests; no RN
// runtime needed. Each test asserts only the fields it cares about.

import {
  initialPinState,
  makeInitialPinState,
  pinReducer,
  type PinState,
} from '../usePinReducer';
import type { Outfit } from '../../services/recommendationService';

const fakeOutfit = (id: string = 'outfit-1'): Outfit => ({
  items: [
    {
      id: 'item-a',
      image_url: 'https://example.test/a.jpg',
    } as Outfit['items'][number],
    {
      id: 'item-b',
      image_url: 'https://example.test/b.jpg',
    } as Outfit['items'][number],
  ],
  styling_note: 'note',
  outfit_hash: id,
  fallback_flags: [],
});

describe('pinReducer', () => {
  describe('PIN_TAP', () => {
    it('opens the confirm modal and stores pending id when nothing is pinned', () => {
      const next = pinReducer(initialPinState, {
        type: 'PIN_TAP',
        itemId: 'item-a',
      });
      expect(next.modal).toBe('confirm');
      expect(next.pendingPinnedItemId).toBe('item-a');
      expect(next.pinReplaceCandidate).toBeNull();
      expect(next.pinnedItemId).toBeNull();
    });

    it('unpins when the tapped id matches the already-pinned id', () => {
      const pinned: PinState = { ...initialPinState, pinnedItemId: 'item-a' };
      const next = pinReducer(pinned, { type: 'PIN_TAP', itemId: 'item-a' });
      expect(next.pinnedItemId).toBeNull();
      expect(next.modal).toBe('closed');
      expect(next.pendingPinnedItemId).toBeNull();
    });

    it('opens the replace modal when a different id is pinned', () => {
      const pinned: PinState = { ...initialPinState, pinnedItemId: 'item-a' };
      const next = pinReducer(pinned, { type: 'PIN_TAP', itemId: 'item-b' });
      expect(next.modal).toBe('replace');
      expect(next.pinReplaceCandidate).toBe('item-b');
      expect(next.pinnedItemId).toBe('item-a'); // stays until CONFIRM_REPLACE
    });

    it('is a no-op while a generation is in flight', () => {
      const generating: PinState = {
        ...initialPinState,
        outfit: 'generating',
      };
      const next = pinReducer(generating, {
        type: 'PIN_TAP',
        itemId: 'item-x',
      });
      expect(next).toBe(generating); // referential equality — guard hit
    });
  });

  describe('CONFIRM_PIN', () => {
    it('promotes pending → pinnedItemId, closes modal, transitions outfit=generating', () => {
      const pre: PinState = {
        ...initialPinState,
        modal: 'confirm',
        pendingPinnedItemId: 'item-a',
      };
      const next = pinReducer(pre, { type: 'CONFIRM_PIN' });
      expect(next.pinnedItemId).toBe('item-a');
      expect(next.pendingPinnedItemId).toBeNull();
      expect(next.modal).toBe('closed');
      expect(next.outfit).toBe('generating');
    });

    it('no-ops if pendingPinnedItemId is unset', () => {
      const next = pinReducer(initialPinState, { type: 'CONFIRM_PIN' });
      expect(next).toBe(initialPinState);
    });
  });

  describe('CONFIRM_REPLACE', () => {
    it('swaps pinned id from candidate, closes modal, transitions outfit=generating', () => {
      const pre: PinState = {
        ...initialPinState,
        pinnedItemId: 'item-a',
        modal: 'replace',
        pinReplaceCandidate: 'item-b',
      };
      const next = pinReducer(pre, { type: 'CONFIRM_REPLACE' });
      expect(next.pinnedItemId).toBe('item-b');
      expect(next.pinReplaceCandidate).toBeNull();
      expect(next.modal).toBe('closed');
      expect(next.outfit).toBe('generating');
    });
  });

  describe('CANCEL_MODAL', () => {
    it('closes modal and clears pending/candidate refs', () => {
      const pre: PinState = {
        ...initialPinState,
        modal: 'confirm',
        pendingPinnedItemId: 'item-a',
        pinReplaceCandidate: 'item-b',
      };
      const next = pinReducer(pre, { type: 'CANCEL_MODAL' });
      expect(next.modal).toBe('closed');
      expect(next.pendingPinnedItemId).toBeNull();
      expect(next.pinReplaceCandidate).toBeNull();
    });
  });

  describe('UNPIN', () => {
    it('queues pendingUnpin while generating', () => {
      const pre: PinState = {
        ...initialPinState,
        pinnedItemId: 'item-a',
        outfit: 'generating',
      };
      const next = pinReducer(pre, { type: 'UNPIN' });
      expect(next.pendingUnpin).toBe(true);
      expect(next.pinnedItemId).toBe('item-a'); // not cleared yet
    });

    it('clears pinnedItemId immediately when idle', () => {
      const pre: PinState = { ...initialPinState, pinnedItemId: 'item-a' };
      const next = pinReducer(pre, { type: 'UNPIN' });
      expect(next.pinnedItemId).toBeNull();
      expect(next.pendingUnpin).toBe(false);
    });
  });

  describe('GENERATE_SUCCESS', () => {
    it('clears snapshot and returns outfit to idle', () => {
      const pre: PinState = {
        ...initialPinState,
        outfit: 'generating',
        lastOutfitSnapshot: fakeOutfit(),
      };
      const next = pinReducer(pre, { type: 'GENERATE_SUCCESS' });
      expect(next.outfit).toBe('idle');
      expect(next.lastOutfitSnapshot).toBeNull();
    });

    it('drains a queued unpin', () => {
      const pre: PinState = {
        ...initialPinState,
        pinnedItemId: 'item-a',
        outfit: 'generating',
        pendingUnpin: true,
        lastOutfitSnapshot: fakeOutfit(),
      };
      const next = pinReducer(pre, { type: 'GENERATE_SUCCESS' });
      expect(next.pinnedItemId).toBeNull();
      expect(next.pendingUnpin).toBe(false);
    });
  });

  describe('GENERATE_ERROR', () => {
    it('keeps snapshot on state so the consumer can restore it', () => {
      const snapshot = fakeOutfit('err-1');
      const pre: PinState = {
        ...initialPinState,
        outfit: 'generating',
        lastOutfitSnapshot: snapshot,
      };
      const next = pinReducer(pre, { type: 'GENERATE_ERROR' });
      expect(next.outfit).toBe('error');
      expect(next.lastOutfitSnapshot).toBe(snapshot);
    });
  });

  describe('GENERATE_FALLBACK', () => {
    it('transitions outfit=fallback and clears the snapshot', () => {
      const pre: PinState = {
        ...initialPinState,
        outfit: 'generating',
        lastOutfitSnapshot: fakeOutfit(),
      };
      const next = pinReducer(pre, { type: 'GENERATE_FALLBACK' });
      expect(next.outfit).toBe('fallback');
      expect(next.lastOutfitSnapshot).toBeNull();
    });
  });

  describe('PINNED_ITEM_GONE', () => {
    it('clears pinnedItemId, snapshot and returns outfit to idle', () => {
      const pre: PinState = {
        ...initialPinState,
        pinnedItemId: 'item-a',
        outfit: 'generating',
        lastOutfitSnapshot: fakeOutfit(),
      };
      const next = pinReducer(pre, { type: 'PINNED_ITEM_GONE' });
      expect(next.pinnedItemId).toBeNull();
      expect(next.lastOutfitSnapshot).toBeNull();
      expect(next.outfit).toBe('idle');
    });
  });

  describe('AUTH_BLOCK', () => {
    it('sets outfit=auth_required and closes any open modal', () => {
      const pre: PinState = {
        ...initialPinState,
        modal: 'confirm',
        pendingPinnedItemId: 'item-a',
      };
      const next = pinReducer(pre, { type: 'AUTH_BLOCK' });
      expect(next.outfit).toBe('auth_required');
      expect(next.modal).toBe('closed');
      expect(next.pendingPinnedItemId).toBeNull();
    });
  });

  describe('RETRY', () => {
    it('puts outfit back into generating from error', () => {
      const pre: PinState = { ...initialPinState, outfit: 'error' };
      const next = pinReducer(pre, { type: 'RETRY' });
      expect(next.outfit).toBe('generating');
    });
  });

  describe('CONFIRM_PIN_FROM_DETAIL', () => {
    // AU-307 phase 05 — ItemDetail "Build around this" entry.

    it('pins the item and transitions outfit=generating from a clean state', () => {
      const next = pinReducer(initialPinState, {
        type: 'CONFIRM_PIN_FROM_DETAIL',
        itemId: 'item-detail-1',
      });
      expect(next.pinnedItemId).toBe('item-detail-1');
      expect(next.modal).toBe('closed');
      expect(next.outfit).toBe('generating');
      expect(next.pendingPinnedItemId).toBeNull();
      expect(next.pinReplaceCandidate).toBeNull();
    });

    it('atomically replaces an existing pinned id (overwrite semantics)', () => {
      const pre: PinState = {
        ...initialPinState,
        pinnedItemId: 'item-old',
        modal: 'closed',
      };
      const next = pinReducer(pre, {
        type: 'CONFIRM_PIN_FROM_DETAIL',
        itemId: 'item-new',
      });
      expect(next.pinnedItemId).toBe('item-new');
      expect(next.outfit).toBe('generating');
      expect(next.modal).toBe('closed');
    });

    it('clears any in-flight pending pin / replace refs', () => {
      const pre: PinState = {
        ...initialPinState,
        modal: 'replace',
        pendingPinnedItemId: 'item-pending',
        pinReplaceCandidate: 'item-cand',
      };
      const next = pinReducer(pre, {
        type: 'CONFIRM_PIN_FROM_DETAIL',
        itemId: 'item-detail-2',
      });
      expect(next.pinnedItemId).toBe('item-detail-2');
      expect(next.pendingPinnedItemId).toBeNull();
      expect(next.pinReplaceCandidate).toBeNull();
      expect(next.modal).toBe('closed');
    });
  });

  describe('makeInitialPinState', () => {
    it('seeds pinnedItemId when provided', () => {
      const state = makeInitialPinState('item-z');
      expect(state.pinnedItemId).toBe('item-z');
      expect(state.modal).toBe('closed');
    });
  });
});
