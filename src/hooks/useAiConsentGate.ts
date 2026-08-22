// useAiConsentGate — App Store blocker B1 (Guideline 5.1.1/5.1.2).
//
// Wraps an AI photo-upload action behind explicit, persisted consent. Both
// try-on photo-upload call sites (BodyScreen try-on + the "See this on me"
// generation flow) route through this hook so the gate logic lives in ONE
// place (DRY).
//
// Usage:
//   const consentGate = useAiConsentGate();
//   const onPress = () => consentGate.run(() => actuallyGenerate());
//   // render <AiConsentDialog {...consentGate.dialogProps} /> in the tree.
//
// run(): if consent is already granted → invoke the action immediately. If not
// → open the consent dialog and stash the action; Accept grants + runs it,
// Decline persists the decline and drops it (the app stays usable).

import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import {
  declineAiDataSharingConsent,
  grantAiDataSharingConsent,
  hasAiDataSharingConsent,
} from '../services/aiConsent';

type GateNavigation = NativeStackNavigationProp<AppStackParamList>;

export interface AiConsentGate {
  /**
   * Run `action` only if AI data-sharing consent is granted. Otherwise prompt;
   * Accept grants + runs, Decline aborts. `action` may be async — errors are
   * the caller's to handle (run() does not await it).
   *
   * `onDecline` runs instead of `action` when the user declines. Callers that
   * have ALREADY moved the UI into the state the action was going to fill
   * (e.g. a screen that mounted straight onto its loading step) MUST pass it —
   * without it, declining leaves that UI stranded with no job behind it.
   */
  run: (action: () => void, onDecline?: () => void) => void;
  /** Spread onto <AiConsentDialog />. */
  dialogProps: {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onOpenPrivacyPolicy: () => void;
  };
}

export const useAiConsentGate = (): AiConsentGate => {
  const navigation = useNavigation<GateNavigation>();
  const [visible, setVisible] = useState(false);
  // The action awaiting a consent decision. Held in a ref so re-renders don't
  // drop it and Accept/Decline read the latest.
  const pendingActionRef = useRef<(() => void) | null>(null);
  // The caller's decline branch, paired with `pendingActionRef` — both are set
  // and cleared together so a decision can never run one against a stale other.
  const pendingDeclineRef = useRef<(() => void) | null>(null);

  const run = useCallback((action: () => void, onDecline?: () => void) => {
    hasAiDataSharingConsent().then(granted => {
      if (granted) {
        action();
        return;
      }
      pendingActionRef.current = action;
      pendingDeclineRef.current = onDecline ?? null;
      setVisible(true);
    });
  }, []);

  const onAccept = useCallback(() => {
    setVisible(false);
    const action = pendingActionRef.current;
    const declined = pendingDeclineRef.current;
    pendingActionRef.current = null;
    pendingDeclineRef.current = null;
    grantAiDataSharingConsent()
      .then(() => action?.())
      .catch(() => {
        /* persist failure is non-fatal — do NOT run the action without a
           recorded consent; the user can retry. But the caller may have
           already committed UI to the action (a loading step), so run its
           decline branch to unwind: the action is not going to happen. */
        declined?.();
      });
  }, []);

  const onDecline = useCallback(() => {
    setVisible(false);
    const declined = pendingDeclineRef.current;
    pendingActionRef.current = null;
    pendingDeclineRef.current = null;
    // Fire-and-forget: declining must never block the UI.
    declineAiDataSharingConsent().catch(() => {});
    declined?.();
  }, []);

  const onOpenPrivacyPolicy = useCallback(() => {
    navigation.navigate('LegalDocument', {
      documentType: 'privacy',
      source: 'settings',
    });
  }, [navigation]);

  return {
    run,
    dialogProps: { visible, onAccept, onDecline, onOpenPrivacyPolicy },
  };
};
