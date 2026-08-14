// useUsageLimitGate — the reactive "free-tier daily/lifetime limit reached"
// gate for the soft-paywall MVP (AU-442).
//
// Mirrors the useAiLimitGate shape (`open` + `dismiss` + `sheetProps`) so the
// gate logic lives in ONE place (DRY) and every usage-limited surface (See on
// Me, wardrobe items, enhance photo) composes the same pattern. Unlike
// useAiLimitGate, this gate is feature-parameterised: `open(feature)` both
// shows the sheet AND selects which copy variant it renders.
//
// `UsageLimitFeature` is declared HERE (not duplicated) — this exact string
// vocabulary is shared with the backend's `GET /api/me/usage` response keys
// (phase 01) and with `UsageLimitSheet` / `NotifyMeScreen`. Import it from
// this module everywhere.
//
// Usage:
//   const gate = useUsageLimitGate();
//   gate.open('see_on_me'); // e.g. from a 429 / usage-exhausted response
//   // render <UsageLimitSheet {...gate.sheetProps} onUpgrade={...} /> in the tree.

import { useCallback, useState } from 'react';

/**
 * The three free-tier surfaces gated by this MVP. Shared vocabulary with the
 * backend's usage response (see `wardrobe-backend/API_DOCUMENTATION.md`
 * §Usage) — do not rename without updating both sides.
 */
export type UsageLimitFeature = 'see_on_me' | 'wardrobe_items' | 'enhance_photo';

const DEFAULT_FEATURE: UsageLimitFeature = 'see_on_me';

export interface UsageLimitGate {
  /**
   * Opens the sheet for the given feature. Idempotent while already visible —
   * re-calling `open()` (even with a different feature) never toggles the
   * sheet closed; it stays open and simply re-targets the copy.
   */
  open: (feature: UsageLimitFeature) => void;
  /** Hides the sheet. */
  dismiss: () => void;
  /** Spread onto <UsageLimitSheet />. */
  sheetProps: {
    visible: boolean;
    feature: UsageLimitFeature;
    onDismiss: () => void;
  };
}

export const useUsageLimitGate = (): UsageLimitGate => {
  const [visible, setVisible] = useState(false);
  const [feature, setFeature] = useState<UsageLimitFeature>(DEFAULT_FEATURE);

  const open = useCallback((next: UsageLimitFeature) => {
    setFeature(next);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    open,
    dismiss,
    sheetProps: { visible, feature, onDismiss: dismiss },
  };
};
