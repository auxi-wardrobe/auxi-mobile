// useAiLimitGate — the reactive "AI daily-limit reached" gate.
//
// Mirrors the useAiConsentGate shape (a `check` + `sheetProps` pair) so the
// gate logic lives in ONE place (DRY). When an AI job resolves with the backend
// `ai_daily_limit_reached` 429 code, `check()` opens the AiLimitSheet and
// returns true so the caller can SKIP its generic "Try again" error view —
// killing the retry storm at the UI (prod 2026-07-13).
//
// Feature-agnostic on purpose: no navigation, no try-on imports. The dismiss
// side-effect (e.g. `navigation.goBack()`) is the caller's — it passes it via
// the sheet's own onDismiss composition at the screen. `onDismiss` here only
// hides the sheet.
//
// Usage:
//   const gate = useAiLimitGate();
//   if (gate.check(generation.errorCode)) { /* limit UI, not generic error */ }
//   // render <AiLimitSheet {...gate.sheetProps} /> in the tree.

import { useCallback, useState } from 'react';
import { AI_DAILY_LIMIT_CODE } from '../utils/aiError';

export interface AiLimitGate {
  /**
   * True + opens the sheet iff `errorCode` is the daily-limit code; else false
   * (the caller handles the error normally). Idempotent while the sheet is
   * already visible — re-calling with the limit code stays open, never re-opens.
   */
  check: (errorCode: string | null | undefined) => boolean;
  /**
   * Open the sheet directly, with no error code in hand — for the proactive
   * entry gate (a surface that already KNOWS the limit is reached, via
   * `aiLimitStore`, and wants to show the sheet up front rather than wait for
   * its own job to 429). Idempotent while already visible.
   */
  open: () => void;
  /** Spread onto <AiLimitSheet />. */
  sheetProps: { visible: boolean; onDismiss: () => void };
}

export const useAiLimitGate = (): AiLimitGate => {
  const [visible, setVisible] = useState(false);

  const check = useCallback((errorCode: string | null | undefined): boolean => {
    if (errorCode === AI_DAILY_LIMIT_CODE) {
      setVisible(true);
      return true;
    }
    return false;
  }, []);

  const open = useCallback(() => {
    setVisible(true);
  }, []);

  const onDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    check,
    open,
    sheetProps: { visible, onDismiss },
  };
};
