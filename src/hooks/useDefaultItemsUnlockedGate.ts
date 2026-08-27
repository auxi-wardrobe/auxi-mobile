// useDefaultItemsUnlockedGate — the "you can now remove Macgie's default
// items" celebration gate.
//
// Mirrors `useUsageLimitGate` (`open` + `dismiss` + `sheetProps`) so every
// milestone/limit surface in the app composes the same shape. The payload
// (`own_item_count` / `threshold`) is carried through `open()` because the
// sheet interpolates it into the copy — the gate itself never fetches.
//
// Usage:
//   const gate = useDefaultItemsUnlockedGate();
//   maybeCelebrateDefaultItemsUnlocked(user).then(r => r && gate.open(r));
//   // render <DefaultItemsUnlockedSheet {...gate.sheetProps} /> in the tree.

import { useCallback, useState } from 'react';
import { motion } from '../theme/motion';
import type { DefaultItemsUnlockedResult } from '../services/defaultItemsMilestone';

export interface DefaultItemsUnlockedGate {
  /** Shows the sheet with the milestone numbers. Idempotent while visible. */
  open: (result: DefaultItemsUnlockedResult) => void;
  /** Hides the sheet. */
  dismiss: () => void;
  /**
   * Hides the sheet, then invokes `after` once the sheet's close animation has
   * settled — same rationale as `useUsageLimitGate.dismissThenNavigate`:
   * navigating mid-close leaves a stray transition snapshot on the
   * destination screen.
   */
  dismissThenNavigate: (after: () => void) => void;
  /** Spread onto <DefaultItemsUnlockedSheet />. */
  sheetProps: {
    visible: boolean;
    ownItemCount: number;
    threshold: number;
    onDismiss: () => void;
  };
}

// Only ever rendered while `visible` — the zeroes never reach the screen, they
// just keep the props non-optional for the sheet.
const EMPTY_RESULT: DefaultItemsUnlockedResult = {
  own_item_count: 0,
  threshold: 0,
};

export const useDefaultItemsUnlockedGate = (): DefaultItemsUnlockedGate => {
  const [visible, setVisible] = useState(false);
  const [result, setResult] =
    useState<DefaultItemsUnlockedResult>(EMPTY_RESULT);

  const open = useCallback((next: DefaultItemsUnlockedResult) => {
    setResult(next);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const dismissThenNavigate = useCallback((after: () => void) => {
    setVisible(false);
    setTimeout(after, motion.duration.normal);
  }, []);

  return {
    open,
    dismiss,
    dismissThenNavigate,
    sheetProps: {
      visible,
      ownItemCount: result.own_item_count,
      threshold: result.threshold,
      onDismiss: dismiss,
    },
  };
};
